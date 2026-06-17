import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  const healthStatus: {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
      supabase: { status: 'up' | 'down'; error?: string };
      redis: { status: 'up' | 'down'; error?: string };
      groq: { status: 'configured' | 'missing' };
    };
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: { status: 'down' },
      redis: { status: 'down' },
      groq: { status: 'missing' },
    },
  };

  // 1. Verify Supabase
  try {
    // Attempt a basic query to check connectivity
    const { error } = await supabase.from('video_analyses').select('*').limit(1);
    
    // Check if error is related to table not existing (that's fine, connection works) or actual connection error
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      healthStatus.services.supabase = { status: 'down', error: error.message };
      healthStatus.status = 'unhealthy';
    } else {
      healthStatus.services.supabase = { status: 'up' };
    }
  } catch (err) {
    healthStatus.services.supabase = { status: 'down', error: (err as Error).message };
    healthStatus.status = 'unhealthy';
  }

  // 2. Verify Redis
  try {
    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      healthStatus.services.redis = { status: 'up' };
    } else {
      healthStatus.services.redis = { status: 'down', error: `Unexpected ping response: ${pingResult}` };
      healthStatus.status = 'unhealthy';
    }
  } catch (err) {
    healthStatus.services.redis = { status: 'down', error: (err as Error).message };
    healthStatus.status = 'unhealthy';
  }

  // 3. Verify Groq Configuration
  const hasGroqKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'placeholder-key';
  healthStatus.services.groq = {
    status: hasGroqKey ? 'configured' : 'missing',
  };
  if (!hasGroqKey) {
    healthStatus.status = 'unhealthy';
  }

  return NextResponse.json(healthStatus, {
    status: healthStatus.status === 'healthy' ? 200 : 500,
    headers: corsHeaders,
  });
}
