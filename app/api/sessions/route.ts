import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generatePin } from '@/lib/game';

export async function POST(req: Request) {
  try {
    const { passphrase, roundDuration } = await req.json();
    if (!passphrase) return NextResponse.json({ error: 'Passphrase required' }, { status: 400 });

    const sessionId = generatePin();
    await sql`
      INSERT INTO sessions (id, passphrase, round_duration)
      VALUES (${sessionId}, ${passphrase}, ${roundDuration || 300})
    `;

    return NextResponse.json({ sessionId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
