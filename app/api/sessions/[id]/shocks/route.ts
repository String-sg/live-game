import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassphrase } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const shocks = await sql`SELECT * FROM shocks WHERE session_id = ${id} ORDER BY created_at DESC`;
    return NextResponse.json({ shocks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { passphrase, type, description, priceShift } = await req.json();

    const session = await sql`SELECT * FROM sessions WHERE id = ${id}`;
    if (session.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!(await verifyPassphrase(passphrase, session[0].passphrase))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await sql`
      INSERT INTO shocks (session_id, type, description, price_shift)
      VALUES (${id}, ${type}, ${description}, ${priceShift})
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
