import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const sessions = await sql`SELECT * FROM sessions WHERE id = ${id}`;
    if (sessions.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const session = sessions[0];

    const currentRounds = await sql`
      SELECT * FROM rounds
      WHERE session_id = ${id}
      ORDER BY round_number DESC
      LIMIT 1
    `;
    const currentRound = currentRounds[0] || null;

    const players = await sql`SELECT COUNT(*) as count FROM players WHERE session_id = ${id}`;
    const playerCount = parseInt(players[0].count);

    const pendingShocks = await sql`
      SELECT * FROM shocks
      WHERE session_id = ${id} AND applied_to_round IS NULL
    `;

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        round_duration: session.round_duration
      },
      currentRound: currentRound ? {
        id: currentRound.id,
        roundNumber: currentRound.round_number,
        status: currentRound.status,
        shockDescription: currentRound.shock_description
      } : null,
      playerCount,
      pendingShocks
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
