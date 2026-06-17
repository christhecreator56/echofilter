import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { videoId, tag, userId } = body as {
      videoId: string;
      tag: string;
      userId: string;
    };

    if (!videoId || !tag || !userId) {
      return Response.json(
        { error: 'Missing parameters. videoId, tag, and userId are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Insert community tag into Supabase. Ignore duplicates (conflict on constraint)
    const { error } = await supabase
      .from('community_tags')
      .upsert(
        {
          video_id: videoId,
          tag,
          user_id: userId,
        },
        { onConflict: 'video_id,user_id,tag' }
      );

    if (error) {
      console.error('Error inserting community tag:', error);
      return Response.json(
        { error: `Database error: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(
      {
        status: 'success',
        message: 'Community tag recorded. Security weights updated.',
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in /api/tag route:', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
