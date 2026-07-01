import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'admin123';

  if (!adminSecret || adminSecret !== expectedSecret) {
    return Response.json(
      { error: 'Unauthorized. Invalid admin secret.' },
      { status: 401 }
    );
  }

  try {
    const { data: logs, error } = await supabase
      .from('usage_logs')
      .select('id, user_id, video_id, search_query, tokens_used, credits_consumed, using_custom_key, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const formattedLogs = (logs || []).map((log: {
      id: number;
      user_id: string;
      video_id: string;
      search_query: string;
      tokens_used: number;
      credits_consumed: number;
      using_custom_key: boolean;
      created_at: string;
    }) => ({
      id: log.id,
      userId: log.user_id,
      videoId: log.video_id,
      searchQuery: log.search_query,
      tokensUsed: log.tokens_used,
      creditsConsumed: log.credits_consumed,
      usingCustomKey: log.using_custom_key,
      createdAt: log.created_at,
    }));

    return Response.json(formattedLogs);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching admin logs:', err);
    return Response.json(
      { error: err.message || 'Failed to fetch admin logs.' },
      { status: 500 }
    );
  }
}
