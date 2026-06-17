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
    const { userId, searchQuery, videoIds } = body as {
      userId: string;
      searchQuery: string;
      videoIds: string[];
    };

    if (!searchQuery || !videoIds || !Array.isArray(videoIds)) {
      return Response.json(
        { error: 'Invalid payload parameters.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const results: Record<string, VideoDensityReport & { communityConfirmations: number }> = {};

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
          const segments = await fetchYouTubeTranscript(videoId);
          const chunks = chunkTranscript(segments, videoId);
          report = await analyzeTranscript(videoId, searchQuery, chunks);

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
        } catch (err) {
          console.error(`Pipeline failure for video ${videoId}:`, err);
          // Return a failure report instead of throwing to allow other videos to succeed
          report = {
            videoId,
            metrics: { infoDensityScore: 0, fillerRatio: 1, confidenceScore: 0 },
            keyTimestamps: [],
            verdict: 'CLICKBAIT_WASTE',
          };
        }
      }

      // 4. Fetch community confirmation counts
      let communityConfirmations = 0;
      try {
        const { count, error } = await supabase
          .from('community_tags')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', videoId);
        
        if (!error && count !== null) {
          communityConfirmations = count;
        }
      } catch (tagErr) {
        console.warn(`Failed to fetch community confirmations count for ${videoId}:`, tagErr);
      }

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
