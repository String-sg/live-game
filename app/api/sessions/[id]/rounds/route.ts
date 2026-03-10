import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { distributeRoles } from '@/lib/game';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { passphrase } = await req.json();

    const session = await sql`SELECT * FROM sessions WHERE id = ${id}`;
    if (session.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session[0].passphrase !== passphrase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Update session status to active
    await sql`UPDATE sessions SET status = 'active' WHERE id = ${id}`;

    // Get current round number
    const rounds = await sql`SELECT COUNT(*) as count FROM rounds WHERE session_id = ${id}`;
    const nextRoundNumber = parseInt(rounds[0].count) + 1;

    // Get pending shocks
    const shocks = await sql`
      SELECT * FROM shocks
      WHERE session_id = ${id} AND applied_to_round IS NULL
    `;
    const shock = shocks[0] || null;

    const supplyShift = shocks.filter(s => s.type === 'supply').reduce((acc, s) => acc + parseFloat(s.price_shift), 0);
    const demandShift = shocks.filter(s => s.type === 'demand').reduce((acc, s) => acc + parseFloat(s.price_shift), 0);

    // Create new round
    const newRounds = await sql`
      INSERT INTO rounds (session_id, round_number, shock_description)
      VALUES (${id}, ${nextRoundNumber}, ${shock?.description || null})
      RETURNING id
    `;
    const roundId = newRounds[0].id;

    // Mark shocks as applied
    if (shocks.length > 0) {
      await sql`
        UPDATE shocks SET applied_to_round = ${nextRoundNumber}
        WHERE session_id = ${id} AND applied_to_round IS NULL
      `;
    }

    // Distribute roles
    const players = await sql`SELECT id FROM players WHERE session_id = ${id}`;
    const playerIds = players.map(p => p.id);
    const roles = distributeRoles(playerIds, { supplyShift, demandShift });

    // Insert player rounds
    for (const r of roles) {
      await sql`
        INSERT INTO player_rounds (player_id, round_id, role, secret_value)
        VALUES (${r.playerId}, ${roundId}, ${r.role}, ${r.secretValue})
      `;
    }

    return NextResponse.json({ roundId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
