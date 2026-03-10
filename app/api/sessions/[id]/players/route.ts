import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const currentRounds = await sql`
      SELECT * FROM rounds
      WHERE session_id = ${id}
      ORDER BY round_number DESC
      LIMIT 1
    `;
    const currentRound = currentRounds[0];

    const players = await sql`
      SELECT p.id, p.name, p.total_surplus, pr.role, pr.has_traded, pr.surplus_earned, pr.secret_value
      FROM players p
      LEFT JOIN player_rounds pr ON p.id = pr.player_id AND pr.round_id = ${currentRound?.id || null}
      WHERE p.session_id = ${id}
      ORDER BY p.joined_at ASC
    `;

    return NextResponse.json({ players });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const session = await sql`SELECT status FROM sessions WHERE id = ${id}`;
    if (session.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session[0].status !== 'lobby') return NextResponse.json({ error: 'Session already started' }, { status: 400 });

    const players = await sql`
      INSERT INTO players (session_id, name)
      VALUES (${id}, ${name})
      RETURNING id, name
    `;

    return NextResponse.json({ player: players[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
