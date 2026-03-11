import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string, playerId: string } }) {
  try {
    const { id, playerId } = params;

    const sessionRes = await sql`SELECT status FROM sessions WHERE id = ${id}`;
    if (sessionRes.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const sessionStatus = sessionRes[0].status;

    const playerRes = await sql`SELECT id FROM players WHERE id = ${playerId} AND session_id = ${id}`;
    if (playerRes.length === 0) return NextResponse.json({ error: 'Player not found in session' }, { status: 404 });

    const currentRounds = await sql`
      SELECT * FROM rounds
      WHERE session_id = ${id}
      ORDER BY round_number DESC
      LIMIT 1
    `;
    const currentRound = currentRounds[0];

    if (!currentRound) {
      return NextResponse.json({
        sessionStatus,
        role: null, secretValue: null,
        hasTraded: false, surplusEarned: 0,
        roundNumber: null, roundStatus: null
      });
    }

    const playerRounds = await sql`
      SELECT * FROM player_rounds
      WHERE player_id = ${playerId} AND round_id = ${currentRound.id}
    `;
    const pr = playerRounds[0];

    const incomingTx = await sql`
      SELECT t.id, t.price, t.initiator_id, p.name as initiator_name
      FROM transactions t
      JOIN players p ON t.initiator_id = p.id
      WHERE t.round_id = ${currentRound.id} AND t.partner_id = ${playerId} AND t.status = 'pending'
      LIMIT 1
    `;

    const outgoingTx = await sql`
      SELECT t.id, t.price, t.partner_id, p.name as partner_name
      FROM transactions t
      JOIN players p ON t.partner_id = p.id
      WHERE t.round_id = ${currentRound.id} AND t.initiator_id = ${playerId} AND t.status = 'pending'
      LIMIT 1
    `;

    return NextResponse.json({
      sessionStatus,
      role: pr?.role || null,
      secretValue: pr ? parseFloat(pr.secret_value) : null,
      hasTraded: pr?.has_traded || false,
      surplusEarned: pr ? parseFloat(pr.surplus_earned) : 0,
      roundNumber: currentRound.round_number,
      roundStatus: currentRound.status,
      shockDescription: currentRound.shock_description,
      incomingTransaction: incomingTx[0] || null,
      outgoingTransaction: outgoingTx[0] || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
