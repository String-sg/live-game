import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

    if (typeof type !== 'string' || type.trim().length === 0) {
      return NextResponse.json({ error: 'type is required and must be a non-empty string' }, { status: 400 });
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'description is required and must be a non-empty string' }, { status: 400 });
    }

    const shift = typeof priceShift === 'number' && isFinite(priceShift) ? priceShift : 10;

    const session = await sql`SELECT * FROM sessions WHERE id = ${id}`;
    if (session.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session[0].passphrase !== passphrase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await sql`
      INSERT INTO shocks (session_id, type, description, price_shift)
      VALUES (${id}, ${type}, ${description}, ${shift})
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
