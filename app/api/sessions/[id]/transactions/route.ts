import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const currentRounds = await sql`
      SELECT id FROM rounds
      WHERE session_id = ${id}
      ORDER BY round_number DESC
      LIMIT 1
    `;
    const roundId = currentRounds[0]?.id;

    if (!roundId) return NextResponse.json({ transactions: [] });

    const transactions = await sql`
      SELECT t.*, p1.name as initiator_name, p2.name as partner_name,
             pr1.role as initiator_role, pr2.role as partner_role
      FROM transactions t
      JOIN players p1 ON t.initiator_id = p1.id
      JOIN players p2 ON t.partner_id = p2.id
      JOIN player_rounds pr1 ON t.initiator_id = pr1.player_id AND pr1.round_id = t.round_id
      JOIN player_rounds pr2 ON t.partner_id = pr2.player_id AND pr2.round_id = t.round_id
      WHERE t.round_id = ${roundId}
      ORDER BY t.created_at DESC
    `;

    return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { initiatorId, partnerId, price } = await req.json();

    const currentRounds = await sql`
      SELECT id, status FROM rounds
      WHERE session_id = ${id}
      ORDER BY round_number DESC
      LIMIT 1
    `;
    const round = currentRounds[0];

    if (!round || round.status !== 'active') {
      return NextResponse.json({ error: 'No active round' }, { status: 400 });
    }

    // Check if either player has already traded
    const traded = await sql`
      SELECT player_id FROM player_rounds
      WHERE round_id = ${round.id} AND has_traded = TRUE AND (player_id = ${initiatorId} OR player_id = ${partnerId})
    `;
    if (traded.length > 0) {
      return NextResponse.json({ error: 'One or both players have already traded' }, { status: 400 });
    }

    // Check for pending transactions involving either player in any role
    const pending = await sql`
      SELECT id FROM transactions
      WHERE round_id = ${round.id} AND status = 'pending'
        AND (
          initiator_id = ${initiatorId} OR partner_id = ${initiatorId}
          OR initiator_id = ${partnerId} OR partner_id = ${partnerId}
        )
    `;
    if (pending.length > 0) {
      return NextResponse.json({ error: 'One or both players already have a pending transaction' }, { status: 400 });
    }

    const txs = await sql`
      INSERT INTO transactions (round_id, session_id, initiator_id, partner_id, price)
      VALUES (${round.id}, ${id}, ${initiatorId}, ${partnerId}, ${price})
      RETURNING id
    `;

    return NextResponse.json({ transactionId: txs[0].id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
