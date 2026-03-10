'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MarketChart = dynamic(() => import('@/components/MarketChart'), { ssr: false });

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Player {
  id: string; name: string; total_surplus: number;
  role?: string; has_traded?: boolean; surplus_earned?: number; secret_value?: number;
}
interface Transaction {
  id: string; price: number; status: string;
  initiator_name: string; partner_name: string;
  initiator_role?: string; partner_role?: string;
  consumer_surplus?: number; producer_surplus?: number;
  confirmed_at?: string; created_at: string;
}
interface Round {
  id: string; roundNumber: number; status: string;
  shockDescription?: string; startedAt: string; endedAt?: string;
}
interface RoundSummary { tradeCount: number; avgPrice: number; penaltyCount: number; totalPlayers: number; }

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function TeacherPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  // Passphrase gate
  const [passphrase, setPassphrase] = useState('');
  const [ppInput, setPpInput] = useState('');
  const [ppError, setPpError] = useState('');

  // Data
  const [sessionStatus, setSessionStatus] = useState<string>('lobby');
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingShocks, setPendingShocks] = useState<any[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShockPanel, setShowShockPanel] = useState(false);
  const [shockType, setShockType] = useState<'supply' | 'demand'>('supply');
  const [shockDesc, setShockDesc] = useState('');
  const [shockShift, setShockShift] = useState(15);
  const [shockSubmitting, setShockSubmitting] = useState(false);
  const [shockSuccess, setShockSuccess] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load passphrase from sessionStorage ── */
  useEffect(() => {
    const stored = sessionStorage.getItem(`pp_${sessionId}`);
    if (stored) setPassphrase(stored);
  }, [sessionId]);

  /* ── Polling ── */
  const fetchData = useCallback(async (pp: string) => {
    try {
      const [sessionRes, playersRes, txRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/players`),
        fetch(`/api/sessions/${sessionId}/transactions`),
      ]);
      const [sd, pd, td] = await Promise.all([
        sessionRes.json(), playersRes.json(), txRes.json(),
      ]);

      if (sd.session) {
        setSessionStatus(sd.session.status);
        setCurrentRound(sd.currentRound);
        setPlayerCount(sd.playerCount);
        setPendingShocks(sd.pendingShocks ?? []);
      }
      if (pd.players) setPlayers(pd.players);
      if (td.transactions) setTransactions(td.transactions);
    } catch {
      // silent — keep polling
    }
  }, [sessionId]);

  useEffect(() => {
    if (!passphrase) return;
    fetchData(passphrase);
    pollRef.current = setInterval(() => fetchData(passphrase), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [passphrase, fetchData]);

  /* ── Actions ── */
  async function startRound() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoundSummary(null);
      await fetchData(passphrase);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function endRound() {
    if (!currentRound) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rounds/${currentRound.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoundSummary(data.summary);
      await fetchData(passphrase);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function submitShock() {
    if (!shockDesc.trim()) return;
    setShockSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/shocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase, type: shockType, description: shockDesc, priceShift: shockShift }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShockSuccess(`✓ Shock queued for next round`);
      setShockDesc('');
      await fetchData(passphrase);
      setTimeout(() => { setShockSuccess(''); setShowShockPanel(false); }, 2500);
    } catch (e: any) { setError(e.message); }
    finally { setShockSubmitting(false); }
  }

  /* ── Passphrase gate ── */
  if (!passphrase) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div style={{ width: '100%', maxWidth: '22rem' }}>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' }}>🦪</div>
        <h2 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--accent)', textAlign: 'center', marginBottom: '1.5rem' }}>
          Teacher Login
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
          Game PIN: <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>{sessionId}</span>
        </p>
        <input className="input" type="password" placeholder="Enter your passphrase" value={ppInput}
          onChange={e => setPpInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (!ppInput.trim()) { setPpError('Enter your passphrase'); return; }
              sessionStorage.setItem(`pp_${sessionId}`, ppInput);
              setPassphrase(ppInput);
            }
          }}
          style={{ marginBottom: '0.75rem' }}
        />
        {ppError && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{ppError}</p>}
        <button className="btn-primary" style={{ width: '100%' }}
          onClick={() => {
            if (!ppInput.trim()) { setPpError('Enter your passphrase'); return; }
            sessionStorage.setItem(`pp_${sessionId}`, ppInput);
            setPassphrase(ppInput);
          }}>
          Enter Dashboard →
        </button>
      </div>
    </main>
  );

  const confirmedTxs = transactions.filter(t => t.status === 'confirmed');
  const pendingTxs   = transactions.filter(t => t.status === 'pending');
  const tradedCount  = players.filter(p => p.has_traded).length;
  const totalSurplus = confirmedTxs.reduce((s, t) => s + Number(t.consumer_surplus ?? 0) + Number(t.producer_surplus ?? 0), 0);

  return (
    <main style={{ minHeight: '100svh', padding: '1rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🦪</span>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.4rem', color: 'var(--accent)', lineHeight: 1 }}>Pearl Exchange</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
              <div className="live-dot" />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>LIVE · Teacher Dashboard</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>PIN</span>
          <span className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.15em', background: 'var(--surface-s)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.2rem 0.75rem' }}>
            {sessionId}
          </span>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid var(--error)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--error)', fontSize: '0.875rem' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', color: 'var(--error)', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── Pending shock badge ── */}
      {pendingShocks.length > 0 && (
        <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '0.75rem', padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--warn)' }}>
          ⚡ {pendingShocks.length} market shock{pendingShocks.length > 1 ? 's' : ''} queued for next round:&nbsp;
          {pendingShocks.map((s: any) => s.description).join(' · ')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: '1rem' }}>

        {/* ── LEFT COLUMN: Players ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Players', value: playerCount },
              { label: 'Trades', value: confirmedTxs.length },
              { label: 'Round', value: currentRound ? `#${currentRound.roundNumber}` : '—' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Player list */}
          <div className="card" style={{ padding: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Players</h3>
              {currentRound?.status === 'active' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{tradedCount}/{players.length} traded</span>
              )}
            </div>

            {sessionStatus === 'lobby' && players.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                Waiting for students to join…
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '320px', overflowY: 'auto' }}>
              {players.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.6rem', borderRadius: '0.5rem',
                  background: 'var(--surface-2)',
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', width: '1.2rem', textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                  {p.role && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                      borderRadius: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: p.role === 'buyer' ? 'rgba(96,165,250,0.15)' : 'rgba(251,146,60,0.15)',
                      color: p.role === 'buyer' ? 'var(--buyer)' : 'var(--seller)',
                    }}>{p.role}</span>
                  )}
                  {p.has_traded !== undefined && (
                    <span style={{ fontSize: '0.85rem' }}>{p.has_traded ? '✅' : '⏳'}</span>
                  )}
                  <span className="font-mono" style={{ fontSize: '0.8rem', color: Number(p.total_surplus) >= 0 ? 'var(--success)' : 'var(--error)', minWidth: '2.5rem', textAlign: 'right' }}>
                    ${Number(p.total_surplus).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Round summary (shown after end round) */}
          {roundSummary && (
            <div className="card slide-in" style={{ padding: '1rem', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.05)' }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', marginBottom: '0.6rem' }}>Round Ended</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                {[
                  { label: 'Trades', value: roundSummary.tradeCount },
                  { label: 'Avg Price', value: `$${roundSummary.avgPrice}` },
                  { label: 'Penalties', value: roundSummary.penaltyCount },
                  { label: 'Total Surplus', value: `$${totalSurplus.toFixed(0)}` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>{s.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Transactions + controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Action bar */}
          <div className="card" style={{ padding: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {sessionStatus === 'lobby' || currentRound?.status === 'ended' ? (
              <button
                className="btn-primary"
                onClick={startRound}
                disabled={loading || playerCount < 2}
                style={{ flex: '1 1 auto' }}
              >
                {loading ? 'Starting…' : currentRound ? `▶ Start Round ${currentRound.roundNumber + 1}` : '▶ Start Round 1'}
              </button>
            ) : (
              <button
                onClick={endRound}
                disabled={loading}
                style={{
                  flex: '1 1 auto', padding: '0.875rem 1.5rem', borderRadius: '0.75rem',
                  fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                  background: 'rgba(248,113,113,0.15)', color: 'var(--error)', border: '1px solid rgba(248,113,113,0.35)',
                }}
              >
                {loading ? 'Ending…' : '⏹ End Round'}
              </button>
            )}

            <button
              className="btn-ghost"
              onClick={() => { setShowShockPanel(!showShockPanel); setShockSuccess(''); }}
              style={{ flex: '0 0 auto' }}
            >
              ⚡ Market Shock
            </button>
          </div>

          {/* Market Shock panel */}
          {showShockPanel && (
            <div className="card slide-in" style={{ padding: '1rem', border: '1px solid rgba(250,204,21,0.25)', background: 'rgba(250,204,21,0.04)' }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warn)', marginBottom: '0.75rem' }}>
                ⚡ Queue Market Shock
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Shock takes effect on the <strong style={{ color: 'var(--text)' }}>next round</strong>. Price shift is applied to all secret values.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {(['supply', 'demand'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setShockType(t)}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer',
                      fontSize: '0.85rem', border: '1px solid',
                      borderColor: shockType === t ? (t === 'supply' ? 'var(--seller)' : 'var(--buyer)') : 'var(--border)',
                      background: shockType === t ? (t === 'supply' ? 'rgba(251,146,60,0.1)' : 'rgba(96,165,250,0.1)') : 'transparent',
                      color: shockType === t ? (t === 'supply' ? 'var(--seller)' : 'var(--buyer)') : 'var(--muted)',
                    }}
                  >
                    {t === 'supply' ? '📉 Supply Shock' : '📈 Demand Shock'}
                  </button>
                ))}
              </div>

              <textarea
                className="input"
                rows={2}
                placeholder={shockType === 'supply'
                  ? 'e.g. A mysterious virus is killing the oysters!'
                  : 'e.g. Face masks are suddenly in high demand!'}
                value={shockDesc}
                onChange={e => setShockDesc(e.target.value)}
                style={{ resize: 'none', marginBottom: '0.6rem' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  Price shift: <span style={{ color: 'var(--warn)', fontFamily: 'DM Mono, monospace' }}>+${shockShift}</span>
                </span>
                <input type="range" min={5} max={50} step={5} value={shockShift}
                  onChange={e => setShockShift(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--warn)' }} />
              </div>

              {shockSuccess
                ? <p style={{ color: 'var(--success)', fontSize: '0.875rem' }}>{shockSuccess}</p>
                : <button className="btn-primary" onClick={submitShock} disabled={shockSubmitting || !shockDesc.trim()} style={{ width: '100%', background: 'rgba(250,204,21,0.15)', color: 'var(--warn)', border: '1px solid rgba(250,204,21,0.3)' }}>
                    {shockSubmitting ? 'Queuing…' : 'Queue Shock for Next Round'}
                  </button>
              }
            </div>
          )}

          {/* Market curves chart */}
          {(currentRound || roundSummary) && (
            <MarketChart players={players} transactions={transactions} />
          )}

          {/* Live transaction feed */}
          <div className="card" style={{ padding: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                Live Transactions
              </h3>
              {pendingTxs.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--warn)', background: 'rgba(250,204,21,0.1)', padding: '0.1rem 0.5rem', borderRadius: '0.25rem' }}>
                  {pendingTxs.length} pending
                </span>
              )}
            </div>

            {transactions.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2.5rem 0' }}>
                {currentRound?.status === 'active' ? 'Waiting for first trade…' : 'No transactions yet'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '380px', overflowY: 'auto' }}>
                {transactions.map(tx => (
                  <div key={tx.id} className="slide-in" style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.6rem 0.75rem', borderRadius: '0.6rem',
                    background: tx.status === 'confirmed' ? 'rgba(74,222,128,0.05)' : tx.status === 'pending' ? 'rgba(250,204,21,0.05)' : 'rgba(107,120,145,0.05)',
                    border: `1px solid ${tx.status === 'confirmed' ? 'rgba(74,222,128,0.15)' : tx.status === 'pending' ? 'rgba(250,204,21,0.15)' : 'var(--border)'}`,
                  }}>
                    <span style={{ fontSize: '0.75rem' }}>
                      {tx.status === 'confirmed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: tx.initiator_role === 'buyer' ? 'var(--buyer)' : 'var(--seller)' }}>{tx.initiator_name}</span>
                        <span style={{ color: 'var(--muted)', margin: '0 0.3rem' }}>↔</span>
                        <span style={{ color: tx.partner_role === 'buyer' ? 'var(--buyer)' : 'var(--seller)' }}>{tx.partner_name}</span>
                      </div>
                      {tx.status === 'confirmed' && tx.consumer_surplus != null && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                          CS: <span style={{ color: 'var(--success)' }}>${Number(tx.consumer_surplus).toFixed(0)}</span>
                          &nbsp;·&nbsp;PS: <span style={{ color: 'var(--success)' }}>${Number(tx.producer_surplus ?? 0).toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                    <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: tx.status === 'confirmed' ? 'var(--success)' : 'var(--warn)' }}>
                      ${tx.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile note */}
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center', marginTop: '1.5rem' }}>
        Students join at <strong style={{ color: 'var(--text)' }}>this URL</strong> → /play/{sessionId} · PIN: <span className="font-mono" style={{ color: 'var(--accent)' }}>{sessionId}</span>
      </p>
    </main>
  );
}
