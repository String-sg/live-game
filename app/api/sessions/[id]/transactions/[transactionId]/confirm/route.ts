import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calculateSurplus } from '@/lib/game';

export async function PUT(req: Request, { params }: { params: { id: string, transactionId: string } }) {
  try {
    const { id, transactionId } = params;
    const { playerId, confirmed } = await req.json();

    const txs = await sql`SELECT * FROM transactions WHERE id = ${transactionId}`;
    if (txs.length === 0) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    const tx = txs[0];

    if (tx.session_id !== id) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const rounds = await sql`SELECT * FROM rounds WHERE id = ${tx.round_id}`;
    if (rounds.length === 0 || rounds[0].status !== 'active') return NextResponse.json({ error: 'Round is not active' }, { status: 400 });

    if (tx.partner_id !== playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (tx.status !== 'pending') return NextResponse.json({ error: 'Transaction no longer pending' }, { status: 400 });

    if (!confirmed) {
      await sql`UPDATE transactions SET status = 'rejected' WHERE id = ${transactionId}`;
      return NextResponse.json({ status: 'rejected' });
    }

    // Confirm transaction
    // Get roles and secret values
    const pr1Res = await sql`SELECT * FROM player_rounds WHERE player_id = ${tx.initiator_id} AND round_id = ${tx.round_id}`;
    const pr2Res = await sql`SELECT * FROM player_rounds WHERE player_id = ${tx.partner_id} AND round_id = ${tx.round_id}`;
    const pr1 = pr1Res[0];
    const pr2 = pr2Res[0];

    const surplus1 = calculateSurplus(pr1.role, parseFloat(pr1.secret_value), parseFloat(tx.price));
    const surplus2 = calculateSurplus(pr2.role, parseFloat(pr2.secret_value), parseFloat(tx.price));

    const consumerSurplus = pr1.role === 'buyer' ? surplus1 : surplus2;
    const producerSurplus = pr1.role === 'seller' ? surplus1 : surplus2;

    await sql`
      UPDATE transactions
      SET status = 'confirmed', confirmed_at = NOW(),
          consumer_surplus = ${consumerSurplus}, producer_surplus = ${producerSurplus}
      WHERE id = ${transactionId}
    `;

    await sql`
      UPDATE player_rounds
      SET has_traded = TRUE, surplus_earned = ${surplus1}
      WHERE player_id = ${tx.initiator_id} AND round_id = ${tx.round_id}
    `;

    await sql`
      UPDATE player_rounds
      SET has_traded = TRUE, surplus_earned = ${surplus2}
      WHERE player_id = ${tx.partner_id} AND round_id = ${tx.round_id}
    `;

    // Cancel other pending transactions for these players
    await sql`
      UPDATE transactions
      SET status = 'rejected'
      WHERE round_id = ${tx.round_id} AND status = 'pending'
        AND (initiator_id = ${tx.initiator_id} OR partner_id = ${tx.initiator_id}
             OR initiator_id = ${tx.partner_id} OR partner_id = ${tx.partner_id})
        AND id != ${transactionId}
    `;

    return NextResponse.json({ status: 'confirmed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
