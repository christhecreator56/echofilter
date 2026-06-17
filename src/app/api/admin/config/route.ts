import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'admin123';

  if (!adminSecret || adminSecret !== expectedSecret) {
    return Response.json(
      { error: 'Unauthorized. Invalid admin secret.' },
      { status: 401 }
    );
  }

  try {
    const { groqApiKey } = await req.json();
    if (!groqApiKey || typeof groqApiKey !== 'string') {
      return Response.json(
        { error: 'Invalid Groq API key.' },
        { status: 400 }
      );
    }

    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const newKeyLine = `GROQ_API_KEY=${groqApiKey.trim()}`;
    let updatedContent = '';

    // Regex to match GROQ_API_KEY=... including possible leading/trailing spaces
    const groqKeyRegex = /^(GROQ_API_KEY\s*=.*)$/m;

    if (groqKeyRegex.test(envContent)) {
      updatedContent = envContent.replace(groqKeyRegex, newKeyLine);
    } else {
      updatedContent = envContent.trim() + `\n${newKeyLine}\n`;
    }

    fs.writeFileSync(envPath, updatedContent, 'utf8');

    // Update process.env directly for immediate effect in this running session
    process.env.GROQ_API_KEY = groqApiKey.trim();

    return Response.json({ success: true, message: 'Groq API Key updated successfully.' });
  } catch (error: any) {
    console.error('Error updating config:', error);
    return Response.json(
      { error: error.message || 'Failed to update configuration.' },
      { status: 500 }
    );
  }
}
