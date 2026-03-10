'use client';

import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area,
} from 'recharts';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Player {
  id: string;
  role?: string;
  secret_value?: number;
}

interface Transaction {
  price: number;
  status: string;
}

interface Props {
  players: Player[];
  transactions: Transaction[];
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Build stepped demand & supply curves from player secret values.
 *
 * Demand curve: buyers' willingness-to-pay sorted high → low (step function)
 * Supply curve: sellers' willingness-to-accept sorted low → high (step function)
 *
 * Returns data points suitable for a line chart where x = quantity, y = price.
 */
function buildCurves(players: Player[]) {
  const buyers = players
    .filter(p => p.role === 'buyer' && p.secret_value != null)
    .map(p => Number(p.secret_value))
    .sort((a, b) => b - a); // highest first

  const sellers = players
    .filter(p => p.role === 'seller' && p.secret_value != null)
    .map(p => Number(p.secret_value))
    .sort((a, b) => a - b); // lowest first

  const maxLen = Math.max(buyers.length, sellers.length);

  // Build step data — each unit of quantity is one player
  const data: { qty: number; demand: number | null; supply: number | null }[] = [];

  for (let i = 0; i <= maxLen; i++) {
    const demand = i < buyers.length ? buyers[i] : null;
    const supply = i < sellers.length ? sellers[i] : null;

    // Start of step (left edge)
    data.push({ qty: i, demand, supply });
    // End of step (right edge) — same y, next x
    if (i < maxLen) {
      data.push({
        qty: i + 1,
        demand,
        supply,
      });
    }
  }

  return data;
}

/**
 * Find the equilibrium price & quantity where demand and supply curves intersect.
 */
function findEquilibrium(players: Player[]) {
  const buyers = players
    .filter(p => p.role === 'buyer' && p.secret_value != null)
    .map(p => Number(p.secret_value))
    .sort((a, b) => b - a);

  const sellers = players
    .filter(p => p.role === 'seller' && p.secret_value != null)
    .map(p => Number(p.secret_value))
    .sort((a, b) => a - b);

  let eqQty = 0;
  let eqPrice = 0;

  for (let i = 0; i < Math.min(buyers.length, sellers.length); i++) {
    if (buyers[i] >= sellers[i]) {
      eqQty = i + 1;
      eqPrice = (buyers[i] + sellers[i]) / 2;
    } else {
      break;
    }
  }

  return { eqQty, eqPrice };
}

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem',
    }}>
      <div style={{ color: 'var(--muted)', marginBottom: '0.25rem' }}>Quantity: {label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name}: ${Number(entry.value).toFixed(0)}
        </div>
      ))}
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function MarketChart({ players, transactions }: Props) {
  const hasBuyers = players.some(p => p.role === 'buyer' && p.secret_value != null);
  const hasSellers = players.some(p => p.role === 'seller' && p.secret_value != null);

  if (!hasBuyers && !hasSellers) return null;

  const curveData = buildCurves(players);
  const { eqQty, eqPrice } = findEquilibrium(players);
  const confirmedPrices = transactions
    .filter(t => t.status === 'confirmed')
    .map((t, i) => ({ qty: i + 1, tradePrice: Number(t.price) }));

  // Determine axis range
  const allValues = players
    .filter(p => p.secret_value != null)
    .map(p => Number(p.secret_value));
  const tradePriceValues = confirmedPrices.map(t => t.tradePrice);
  const allPrices = [...allValues, ...tradePriceValues];
  const minY = Math.max(0, Math.floor((Math.min(...allPrices) - 15) / 10) * 10);
  const maxY = Math.ceil((Math.max(...allPrices) + 15) / 10) * 10;
  const maxX = Math.max(
    players.filter(p => p.role === 'buyer').length,
    players.filter(p => p.role === 'seller').length,
    confirmedPrices.length
  ) + 1;

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          📊 Market Curves
        </h3>
        {eqQty > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            Eq: <span className="font-mono" style={{ color: 'var(--accent)' }}>
              ${eqPrice.toFixed(0)}
            </span>
            {' '}@ Q={eqQty}
          </span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.7rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 12, height: 3, background: '#60a5fa', display: 'inline-block', borderRadius: 2 }} />
          <span style={{ color: 'var(--muted)' }}>Demand</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 12, height: 3, background: '#fb923c', display: 'inline-block', borderRadius: 2 }} />
          <span style={{ color: 'var(--muted)' }}>Supply</span>
        </span>
        {confirmedPrices.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 8, height: 8, background: '#4ade80', display: 'inline-block', borderRadius: '50%' }} />
            <span style={{ color: 'var(--muted)' }}>Trades</span>
          </span>
        )}
        {eqQty > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 12, height: 2, background: 'var(--accent)', display: 'inline-block', borderRadius: 2, opacity: 0.5 }} />
            <span style={{ color: 'var(--muted)' }}>Equilibrium</span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
          />
          <XAxis
            dataKey="qty"
            type="number"
            domain={[0, maxX]}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            label={{ value: 'Quantity', position: 'insideBottom', offset: -2, fill: 'var(--muted)', fontSize: 10 }}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={(v: number) => `$${v}`}
            width={45}
          />
          <Tooltip content={<ChartTooltip />} />

          {/* Equilibrium price line */}
          {eqQty > 0 && (
            <ReferenceLine
              y={eqPrice}
              stroke="var(--accent)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              opacity={0.6}
            />
          )}

          {/* Demand curve (blue) */}
          <Line
            data={curveData}
            dataKey="demand"
            type="stepAfter"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Supply curve (orange) */}
          <Line
            data={curveData}
            dataKey="supply"
            type="stepAfter"
            stroke="#fb923c"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Actual trade prices (green dots) */}
          {confirmedPrices.length > 0 && (
            <Scatter
              data={confirmedPrices}
              dataKey="tradePrice"
              fill="#4ade80"
              stroke="#0c0e14"
              strokeWidth={1.5}
              r={5}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
