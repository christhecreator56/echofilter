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

  const groqKey = process.env.GROQ_API_KEY;
  const groqKeyConfigured = !!groqKey && groqKey !== 'placeholder-key';
  const groqKeyStatus = groqKeyConfigured ? 'Active' : 'Missing';

  try {
    const { data: logs, error: logsError } = await supabase
      .from('usage_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (logsError) {
      // If table doesn't exist or other db error, check if it's the schema cache issue
      if (logsError.message?.includes('does not exist') || logsError.message?.includes('Could not find the table')) {
        return Response.json({
          tableExists: false,
          totalUsers: 0,
          totalCalls: 0,
          totalCreditsUsed: 0,
          groqKeyConfigured,
          groqKeyStatus,
          topUsers: [],
          dailyStats: [],
        });
      }
      throw logsError;
    }

    let totalCalls = 0;
    let totalCreditsUsed = 0;
    const uniqueUsers = new Set<string>();
    const userStatsMap: Record<string, { calls: number; credits: number }> = {};
    const dailyStatsMap: Record<string, { calls: number; credits: number }> = {};

    if (logs) {
      for (const log of logs) {
        totalCalls++;
        totalCreditsUsed += log.credits_consumed || 0;
        uniqueUsers.add(log.user_id);

        // User stats
        if (!userStatsMap[log.user_id]) {
          userStatsMap[log.user_id] = { calls: 0, credits: 0 };
        }
        userStatsMap[log.user_id].calls++;
        userStatsMap[log.user_id].credits += log.credits_consumed || 0;

        // Daily stats
        const dateStr = new Date(log.created_at).toISOString().split('T')[0];
        if (!dailyStatsMap[dateStr]) {
          dailyStatsMap[dateStr] = { calls: 0, credits: 0 };
        }
        dailyStatsMap[dateStr].calls++;
        dailyStatsMap[dateStr].credits += log.credits_consumed || 0;
      }
    }

    const totalUsers = uniqueUsers.size;
    const topUsers = Object.entries(userStatsMap)
      .map(([userId, stats]) => ({
        userId,
        callsCount: stats.calls,
        creditsUsed: Math.round(stats.credits * 100) / 100,
      }))
      .sort((a, b) => b.creditsUsed - a.creditsUsed || b.callsCount - a.callsCount)
      .slice(0, 10);

    const dailyStats = Object.entries(dailyStatsMap).map(([date, stats]) => ({
      date,
      callsCount: stats.calls,
      creditsUsed: Math.round(stats.credits * 100) / 100,
    }));

    return Response.json({
      tableExists: true,
      totalUsers,
      totalCalls,
      totalCreditsUsed: Math.round(totalCreditsUsed * 100) / 100,
      groqKeyConfigured,
      groqKeyStatus,
      topUsers,
      dailyStats,
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch admin stats.' },
      { status: 500 }
    );
  }
}
