import { RawTranscriptSegment } from './scraper';
import { generateEmbedding, generateEmbeddings, cosineSimilarity } from './vector';
import { Groq } from 'groq-sdk';

export interface TranscriptChunk {
  id: string; // Format: ${videoId}_ch_${index}
  videoId: string;
  text: string; // Normalized and cleaned transcript text
  startTime: number; // In seconds
  duration: number; // Window duration in seconds
  embedding?: number[];
}

export interface VideoDensityReport {
  videoId: string;
  metrics: {
    infoDensityScore: number;
    fillerRatio: number;
    confidenceScore: number;
  };
  keyTimestamps: {
    timeInSeconds: number;
    relevanceReason: string;
  }[];
  verdict: 'HIGH_DENSITY' | 'SURFACE_LEVEL' | 'CLICKBAIT_WASTE';
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'placeholder-key',
});

/**
 * Chunks raw transcript segments into semantic/temporal windows of approximately 60 seconds
 * or a maximum of 150 words.
 */
export function chunkTranscript(segments: RawTranscriptSegment[], videoId: string): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let currentSegments: RawTranscriptSegment[] = [];
  let currentWordsCount = 0;
  let chunkIndex = 0;

  for (const seg of segments) {
    const wordCount = seg.text.split(/\s+/).length;
    
    // Check if we need to flush the current chunk
    const currentDuration = currentSegments.length > 0 
      ? (seg.start + seg.duration) - currentSegments[0].start
      : 0;

    if (currentSegments.length > 0 && (currentDuration >= 60 || currentWordsCount + wordCount > 150)) {
      // Flush chunk
      const text = currentSegments.map(s => s.text).join(' ').trim().replace(/\s+/g, ' ');
      const startTime = currentSegments[0].start;
      const duration = (currentSegments[currentSegments.length - 1].start + currentSegments[currentSegments.length - 1].duration) - startTime;
      
      chunks.push({
        id: `${videoId}_ch_${chunkIndex++}`,
        videoId,
        text,
        startTime: Math.round(startTime * 100) / 100,
        duration: Math.round(duration * 100) / 100,
      });
      currentSegments = [];
      currentWordsCount = 0;
    }

    currentSegments.push(seg);
    currentWordsCount += wordCount;
  }

  // Flush remaining segments
  if (currentSegments.length > 0) {
    const text = currentSegments.map(s => s.text).join(' ').trim().replace(/\s+/g, ' ');
    const startTime = currentSegments[0].start;
    const duration = (currentSegments[currentSegments.length - 1].start + currentSegments[currentSegments.length - 1].duration) - startTime;
    
    chunks.push({
      id: `${videoId}_ch_${chunkIndex}`,
      videoId,
      text,
      startTime: Math.round(startTime * 100) / 100,
      duration: Math.round(duration * 100) / 100,
    });
  }

  return chunks;
}

interface LLMChunkGrade {
  technicalScore: number;
  fillerDetected: number;
  justification: string;
}

/**
 * Runs the analysis pipeline on the transcript chunks
 */
export async function analyzeTranscript(
  videoId: string,
  searchQuery: string,
  chunks: TranscriptChunk[]
): Promise<VideoDensityReport> {
  if (chunks.length === 0) {
    return {
      videoId,
      metrics: { infoDensityScore: 0, fillerRatio: 1, confidenceScore: 0 },
      keyTimestamps: [],
      verdict: 'CLICKBAIT_WASTE',
    };
  }

  // Generate embedding for search query
  const queryEmbedding = await generateEmbedding(searchQuery);

  // Generate embeddings for all transcript chunks in a single batched run (highly efficient)
  const chunkTexts = chunks.map(c => c.text);
  const chunkEmbeddings = await generateEmbeddings(chunkTexts);

  // Filter chunks using vector alignment (Stage 1)
  const matchedChunks: { chunk: TranscriptChunk; similarity: number }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkEmbedding = chunkEmbeddings[i];
    chunk.embedding = chunkEmbedding;
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    if (similarity >= 0.55) {
      matchedChunks.push({ chunk, similarity });
    }
  }

  // If no chunks match, classify as clickbait waste
  if (matchedChunks.length === 0) {
    return {
      videoId,
      metrics: { infoDensityScore: 0.0, fillerRatio: 1.0, confidenceScore: 0.5 },
      keyTimestamps: [],
      verdict: 'CLICKBAIT_WASTE',
    };
  }

  // Sort matched chunks by similarity descending and take the top 2 to optimize tokens/cost/rate-limits
  const sortedMatches = matchedChunks
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 2);

  // LLM Grading (Stage 2) using Groq API
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'placeholder-key') {
    // If no API key is set, return a mock response based on vector similarity
    const avgSim = sortedMatches.reduce((sum, m) => sum + m.similarity, 0) / sortedMatches.length;
    const infoDensityScore = Math.min(1, Math.max(0, (avgSim - 0.5) * 2));
    const fillerRatio = 1 - infoDensityScore;
    const verdict = infoDensityScore >= 0.70 ? 'HIGH_DENSITY' : infoDensityScore >= 0.35 ? 'SURFACE_LEVEL' : 'CLICKBAIT_WASTE';
    
    return {
      videoId,
      metrics: {
        infoDensityScore: Math.round(infoDensityScore * 100) / 100,
        fillerRatio: Math.round(fillerRatio * 100) / 100,
        confidenceScore: Math.round(avgSim * 100) / 100,
      },
      keyTimestamps: sortedMatches.map(m => ({
        timeInSeconds: m.chunk.startTime,
        relevanceReason: `Mock justification: highly relevant content matched query (sim: ${m.similarity.toFixed(2)})`,
      })),
      verdict,
    };
  }

  // Helper function to call Groq with retry on 429 rate limits
  const callGroqWithRetry = async (params: any, retries = 3, delay = 2000): Promise<any> => {
    try {
      return await groq.chat.completions.create(params);
    } catch (err: any) {
      if (err?.status === 429 && retries > 0) {
        console.warn(`[Groq Rate Limit] 429 hit. Retrying in ${delay}ms... (${retries} attempts remaining)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return callGroqWithRetry(params, retries - 1, delay * 1.5);
      }
      throw err;
    }
  };

  const gradingPromises = sortedMatches.map(async (match) => {
    const systemPrompt = `You are an elite, highly critical Technical Code Auditor. Your job is to evaluate the transcript segment objectively. You must score the text based purely on technical utility, depth of code explanation, and presence of concrete examples vs generic filler, sponsors, or intro fluff.
[User Query]: ${searchQuery}
[Transcript Segment]: ${match.chunk.text}

Analyze the transcript segment objectively. You must score the text based purely on this transcript segment and return a raw, syntactically flawless JSON object matching the schema below:
JSON Schema:
{
 "technicalScore": <float between 0.00 and 1.00 indicating raw factual content>,
 "fillerDetected": <float between 0.00 and 1.00 indicating fluff/sponsor content>,
 "justification": "<string; 15-word maximum summarizing the specific technical content>"
}`;

    try {
      const chatCompletion = await callGroqWithRetry({
        messages: [
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = chatCompletion.choices[0]?.message?.content || '{}';
      const parsed: LLMChunkGrade = JSON.parse(content);
      
      return {
        chunk: match.chunk,
        similarity: match.similarity,
        technicalScore: typeof parsed.technicalScore === 'number' ? parsed.technicalScore : 0,
        fillerDetected: typeof parsed.fillerDetected === 'number' ? parsed.fillerDetected : 1,
        justification: parsed.justification || 'Analyzed segment.',
      };
    } catch (err) {
      console.error(`Error grading chunk ${match.chunk.id} with Groq:`, err);
      // Fallback grade
      return {
        chunk: match.chunk,
        similarity: match.similarity,
        technicalScore: 0.5,
        fillerDetected: 0.5,
        justification: 'Error parsing LLM response.',
      };
    }
  });

  const gradedChunks = await Promise.all(gradingPromises);

  // Aggregate scores
  const totalChunks = gradedChunks.length;
  const avgTechnicalScore = gradedChunks.reduce((sum, g) => sum + g.technicalScore, 0) / totalChunks;
  const avgFillerRatio = gradedChunks.reduce((sum, g) => sum + g.fillerDetected, 0) / totalChunks;
  const avgConfidence = gradedChunks.reduce((sum, g) => sum + g.similarity, 0) / totalChunks;

  // Key timestamps: filter high technical score chunks, sort chronologically
  const keyTimestamps = gradedChunks
    .filter(g => g.technicalScore >= 0.4)
    .map(g => ({
      timeInSeconds: g.chunk.startTime,
      relevanceReason: g.justification,
    }))
    .sort((a, b) => a.timeInSeconds - b.timeInSeconds);

  // Verdict calculation
  let verdict: 'HIGH_DENSITY' | 'SURFACE_LEVEL' | 'CLICKBAIT_WASTE' = 'CLICKBAIT_WASTE';
  if (avgTechnicalScore >= 0.70) {
    verdict = 'HIGH_DENSITY';
  } else if (avgTechnicalScore >= 0.35) {
    verdict = 'SURFACE_LEVEL';
  }

  return {
    videoId,
    metrics: {
      infoDensityScore: Math.round(avgTechnicalScore * 100) / 100,
      fillerRatio: Math.round(avgFillerRatio * 100) / 100,
      confidenceScore: Math.round(avgConfidence * 100) / 100,
    },
    keyTimestamps,
    verdict,
  };
}
