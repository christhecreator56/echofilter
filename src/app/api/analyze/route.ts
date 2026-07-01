import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { supabase } from '@/lib/supabase';
import { fetchYouTubeTranscript } from '@/lib/scraper';
import { chunkTranscript, analyzeTranscript, VideoDensityReport } from '@/lib/analyzer';

// Helper to set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, searchQuery, videoIds, userApiKey } = body as {
      userId: string;
      searchQuery: string;
      videoIds: string[];
      userApiKey?: string;
    };

    if (!searchQuery || !videoIds || !Array.isArray(videoIds)) {
      return Response.json(
        { error: 'Invalid payload parameters.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const results: Record<string, VideoDensityReport & { communityConfirmations: number }> = {};

    // Fetch community confirmation counts for all videos in a single query to avoid N roundtrips
    const communityTagCounts: Record<string, number> = {};
    try {
      const { data: tagData, error: tagError } = await supabase
        .from('community_tags')
        .select('video_id')
        .in('video_id', videoIds);

      if (!tagError && tagData) {
        for (const row of tagData) {
          communityTagCounts[row.video_id] = (communityTagCounts[row.video_id] || 0) + 1;
        }
      }
    } catch (tagErr) {
      console.warn('Failed to pre-fetch community tag counts:', tagErr);
    }

    // Process each video in parallel
    const analysisPromises = videoIds.map(async (videoId) => {
      const cacheKey = `echofilter:cache:${videoId}:${normalizedQuery}`;
      let report: VideoDensityReport | null = null;

      // 1. Try Redis cache
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          // If cached is string, parse it. If it is already parsed object, use it directly.
          report = typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
      } catch (err) {
        console.warn(`Redis fetch error for video ${videoId}:`, err);
      }

      // 2. Try Supabase DB cache
      if (!report) {
        try {
          const { data, error } = await supabase
            .from('video_analyses')
            .select('*')
            .eq('video_id', videoId)
            .eq('search_query', normalizedQuery)
            .maybeSingle();

          if (data && !error) {
            report = {
              videoId: data.video_id,
              metrics: {
                infoDensityScore: data.info_density_score,
                fillerRatio: data.filler_ratio,
                confidenceScore: data.confidence_score,
              },
              keyTimestamps: typeof data.key_timestamps === 'string' 
                ? JSON.parse(data.key_timestamps) 
                : data.key_timestamps,
              verdict: data.verdict,
              verdictReason: data.verdict_reason,
            };

            // Save to Redis cache
            try {
              await redis.set(cacheKey, JSON.stringify(report), { ex: 86400 * 7 }); // Cache for 7 days
            } catch (redisErr) {
              console.warn('Failed to write to Redis:', redisErr);
            }
          }
        } catch (dbErr) {
          console.warn(`Supabase fetch error for video ${videoId}:`, dbErr);
        }
      }

      // 3. Scrape & Analyze (Cache Miss)
      if (!report) {
        try {
          console.log(`Cache miss. Processing video: ${videoId}`);
          
          let segments = null;
          const transcriptCacheKey = `echofilter:transcript:${videoId}`;
          try {
            const cachedTranscript = await redis.get<string>(transcriptCacheKey);
            if (cachedTranscript) {
              segments = typeof cachedTranscript === 'string' ? JSON.parse(cachedTranscript) : cachedTranscript;
              console.log(`Transcript cache hit for video: ${videoId}`);
            }
          } catch (cacheErr) {
            console.warn(`Failed to fetch cached transcript for ${videoId}:`, cacheErr);
          }

          if (!segments) {
            segments = await fetchYouTubeTranscript(videoId);
            try {
              await redis.set(transcriptCacheKey, JSON.stringify(segments), { ex: 86400 * 30 }); // Cache for 30 days
            } catch (cacheErr) {
              console.warn(`Failed to cache transcript for ${videoId} in Redis:`, cacheErr);
            }
          }

          const chunks = chunkTranscript(segments, videoId);
          const result = await analyzeTranscript(videoId, searchQuery, chunks, userApiKey);
          report = result.report;
          const tokensUsed = result.tokensUsed;

          // Save to Supabase DB
          try {
            await supabase.from('video_analyses').upsert({
              video_id: videoId,
              search_query: normalizedQuery,
              info_density_score: report.metrics.infoDensityScore,
              filler_ratio: report.metrics.fillerRatio,
              confidence_score: report.metrics.confidenceScore,
              key_timestamps: report.keyTimestamps,
              verdict: report.verdict,
              verdict_reason: report.verdictReason,
            });
          } catch (dbUpsertErr) {
            console.error(`Failed to upsert to Supabase for ${videoId}:`, dbUpsertErr);
          }

          // Save to Redis
          try {
            await redis.set(cacheKey, JSON.stringify(report), { ex: 86400 * 7 });
          } catch (redisSetErr) {
            console.warn('Failed to set Redis cache:', redisSetErr);
          }

          // Save usage log
          try {
            const usingCustomKey = !!(userApiKey && userApiKey !== 'placeholder-key');
            const creditsConsumed = usingCustomKey ? 0.0 : 0.05;
            await supabase.from('usage_logs').insert({
              user_id: userId || 'anonymous',
              video_id: videoId,
              search_query: normalizedQuery,
              tokens_used: tokensUsed,
              credits_consumed: creditsConsumed,
              using_custom_key: usingCustomKey,
            });
          } catch (logErr) {
            console.error(`Failed to log usage to Supabase for ${videoId}:`, logErr);
          }
        } catch (err: unknown) {
          console.error(`Pipeline failure for video ${videoId}:`, err);
          const errMessage = err instanceof Error ? err.message : 'Unknown pipeline error';
          let reason = 'Analysis failed due to an internal pipeline error.';
          if (errMessage.includes('No transcript segments') || errMessage.includes('Failed to extract any text')) {
            reason = 'Transcripts/captions are unavailable for this video.';
          } else if (errMessage.includes('rate-limit') || errMessage.includes('429')) {
            reason = 'Groq LLM rate-limit hit. Please try again shortly.';
          }

          // Return a failure report instead of throwing to allow other videos to succeed
          report = {
            videoId,
            metrics: { infoDensityScore: 0, fillerRatio: 1, confidenceScore: 0 },
            keyTimestamps: [],
            verdict: 'CLICKBAIT_WASTE',
            verdictReason: `Analysis Unavailable: ${reason}`,
          };
        }
      }

      // 4. Get community confirmation count from pre-fetched map
      const communityConfirmations = communityTagCounts[videoId] || 0;

      results[videoId] = {
        ...report,
        communityConfirmations,
      };
    });

    await Promise.all(analysisPromises);

    return Response.json(
      {
        searchQuery,
        results,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in /api/analyze route:', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
