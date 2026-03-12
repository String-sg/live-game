import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassphrase } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string, roundId: string } }) {
  try {
    const { id, roundId } = params;
    const { passphrase } = await req.json();

    const session = await sql`SELECT * FROM sessions WHERE id = ${id}`;
    if (session.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!(await verifyPassphrase(passphrase, session[0].passphrase))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // End round
    await sql`UPDATE rounds SET status = 'ended', ended_at = NOW() WHERE id = ${roundId}`;

    // Apply penalties and update total surplus
    const playerRounds = await sql`SELECT * FROM player_rounds WHERE round_id = ${roundId}`;

    for (const pr of playerRounds) {
      let earned = parseFloat(pr.surplus_earned);
      if (!pr.has_traded) {
        earned = -parseFloat(pr.secret_value);
        await sql`
          UPDATE player_rounds SET surplus_earned = ${earned}
          WHERE id = ${pr.id}
        `;
      }

      await sql`
        UPDATE players SET total_surplus = total_surplus + ${earned}
        WHERE id = ${pr.player_id}
      `;
    }

    // Get summary
    const txs = await sql`SELECT price FROM transactions WHERE round_id = ${roundId} AND status = 'confirmed'`;
    const tradeCount = txs.length;
    const avgPrice = tradeCount > 0 ? txs.reduce((acc, t) => acc + parseFloat(t.price), 0) / tradeCount : 0;
    const penaltyCount = playerRounds.filter(pr => !pr.has_traded).length;

    return NextResponse.json({
      summary: {
        tradeCount,
        avgPrice: Math.round(avgPrice * 100) / 100,
        penaltyCount,
        totalPlayers: playerRounds.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
