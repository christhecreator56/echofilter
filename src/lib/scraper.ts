import { YoutubeTranscript } from 'youtube-transcript';

export interface RawTranscriptSegment {
  text: string;
  start: number; // In seconds
  duration: number; // In seconds
}

/**
 * Fetches the transcript segments for a given YouTube video ID using the youtube-transcript package
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<RawTranscriptSegment[]> {
  try {
    // Fetch using the library which handles all User-Agent, cookie and parsing edge cases
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      throw new Error(`No transcript segments returned by YouTube API.`);
    }

    return transcript.map((segment) => ({
      text: segment.text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim(),
      start: segment.offset / 1000,
      duration: segment.duration / 1000,
    }));
  } catch (error) {
    console.error(`[Scraper] Failed to fetch transcript for video ${videoId}:`, error);
    throw new Error(`Failed to extract any text segments from transcript for video ${videoId}: ${(error as Error).message}`);
  }
}
