'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Player { id: string; name: string; total_surplus: number; }

interface RoleState {
  sessionStatus: string;
  role: 'buyer' | 'seller' | null;
  secretValue: number | null;
  hasTraded: boolean;
  surplusEarned: number;
  roundNumber: number | null;
  roundStatus: string | null;
  shockDescription?: string | null;
  incomingTransaction: { id: string; price: number; initiator_id: string; initiator_name: string } | null;
  incomingTransactions: { id: string; price: number; initiator_id: string; initiator_name: string }[];
  outgoingTransaction: { id: string; price: number; partner_id: string; partner_name: string } | null;
}

export default function PlayPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [state, setState] = useState<RoleState>({
    sessionStatus: 'lobby', role: null, secretValue: null,
    hasTraded: false, surplusEarned: 0, roundNumber: null,
    roundStatus: null, incomingTransaction: null, incomingTransactions: [], outgoingTransaction: null,
  });

  // Transaction form
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [tradePrice, setTradePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');
  const [confirming, setConfirming] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoundStatus = useRef<string | null>(null);

  /* ── Load player from localStorage ── */
  useEffect(() => {
    const id = localStorage.getItem(`player_${sessionId}`);
    const name = localStorage.getItem(`playerName_${sessionId}`) ?? '';
    if (id) { setPlayerId(id); setPlayerName(name); }
  }, [sessionId]);

  /* ── Polling ── */
  const fetchState = useCallback(async (pid: string) => {
    try {
      const [roleRes, playersRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/players/${pid}/role`),
        fetch(`/api/sessions/${sessionId}/players`),
      ]);
      const [rd, pd] = await Promise.all([roleRes.json(), playersRes.json()]);

      if (rd && !rd.error) {
        // Detect round change → clear transaction form
        if (rd.roundNumber !== prevRoundStatus.current) {
          setTxError(''); setTxSuccess(''); setSelectedPartner(''); setTradePrice('');
          prevRoundStatus.current = rd.roundNumber;
        }
        setState(rd);
      }
      if (pd?.players) setAllPlayers(pd.players);
    } catch { /* silent */ }
  }, [sessionId]);

  useEffect(() => {
    if (!playerId) return;
    fetchState(playerId);
    pollRef.current = setInterval(() => fetchState(playerId), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [playerId, fetchState]);

  /* ── Submit trade ── */
  async function submitTrade() {
    if (!playerId || !selectedPartner || !tradePrice) {
      setTxError('Select a partner and enter a price');
      return;
    }
    const price = parseFloat(tradePrice);
    if (isNaN(price) || price <= 0) { setTxError('Enter a valid price'); return; }

    setSubmitting(true); setTxError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiatorId: playerId, partnerId: selectedPartner, price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTxSuccess('Trade sent! Waiting for your partner to confirm…');
      setSelectedPartner(''); setTradePrice('');
      await fetchState(playerId);
    } catch (e: any) { setTxError(e.message); }
    finally { setSubmitting(false); }
  }

  /* ── Confirm/reject incoming trade ── */
  async function respondToTrade(transactionId: string, price: number, confirmed: boolean) {
    if (!playerId) return;
    setConfirming(true); setTxError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transactions/${transactionId}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, confirmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (confirmed) {
        setTxSuccess(`Trade confirmed at $${price}! 🎉`);
      } else {
        setTxError('Trade rejected.');
      }
      await fetchState(playerId);
    } catch (e: any) { setTxError(e.message); }
    finally { setConfirming(false); }
  }

  /* ── Not yet registered ── */
  if (!playerId) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦪</div>
        <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--accent)', marginBottom: '0.75rem' }}>
          Session not found
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Go back to the home page and join with your PIN.
        </p>
        <a href="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>← Back to home</a>
      </div>
    </main>
  );

  const { role, secretValue, hasTraded, roundStatus, roundNumber, shockDescription, sessionStatus } = state;
  const roleColor = role === 'buyer' ? 'var(--buyer)' : 'var(--seller)';
  const roleBg    = role === 'buyer' ? 'rgba(96,165,250,0.08)' : 'rgba(251,146,60,0.08)';
  const roleGlow  = role === 'buyer' ? 'buyer-glow' : 'seller-glow';

  const otherPlayers = allPlayers.filter(p => p.id !== playerId);

  /* ── LOBBY ── */
  if (sessionStatus === 'lobby' || !roundNumber) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🦪</div>
      <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
        Pearl Exchange
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        Logged in as <strong style={{ color: 'var(--text)' }}>{playerName}</strong>
      </p>

      <div className="card" style={{ padding: '2rem', maxWidth: '20rem', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="live-dot" />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Waiting for teacher</span>
          </div>
        </div>
        <p style={{ color: 'var(--text)', fontSize: '1rem', lineHeight: 1.6 }}>
          The teacher will assign your role and start the round soon.<br/>
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Stay on this page!</span>
        </p>
        <div style={{ marginTop: '1.5rem', padding: '0.6rem 1rem', background: 'var(--surface-2)', borderRadius: '0.5rem', display: 'inline-block' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>PIN&nbsp;</span>
          <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.1em' }}>{sessionId}</span>
        </div>
      </div>
    </main>
  );

  /* ── ROUND ENDED ── */
  if (roundStatus === 'ended') return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div style={{ maxWidth: '22rem', width: '100%' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{hasTraded ? '🎉' : '😔'}</div>
        <h2 className="font-display" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
          Round {roundNumber} Over
        </h2>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>This Round</div>
          {hasTraded ? (
            <>
              <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 700, color: Number(state.surplusEarned) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {Number(state.surplusEarned) >= 0 ? '+' : ''}${Number(state.surplusEarned).toFixed(0)}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>surplus earned</p>
            </>
          ) : (
            <>
              <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--error)' }}>
                −${Number(secretValue ?? 0).toFixed(0)}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>penalty (no trade)</p>
            </>
          )}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Total Accumulated Surplus</div>
          <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
            ${Number(allPlayers.find(p => p.id === playerId)?.total_surplus ?? 0).toFixed(0)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <div className="live-dot" />
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Waiting for next round…</span>
        </div>
      </div>
    </main>
  );

  /* ── ACTIVE ROUND ── */
  return (
    <main style={{ minHeight: '100svh', padding: '1rem 1rem 2rem', maxWidth: '420px', margin: '0 auto' }}>

      {/* Role card */}
      <div className={`card ${roleGlow}`} style={{
        padding: '1.5rem', marginBottom: '1rem', textAlign: 'center',
        background: roleBg, border: `1px solid ${roleColor}33`,
      }}>
        {shockDescription && (
          <div style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--warn)' }}>
            ⚡ {shockDescription}
          </div>
        )}

        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: roleColor, marginBottom: '0.35rem', opacity: 0.7 }}>
          Round {roundNumber} · Your Role
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'Playfair Display, serif', color: roleColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {role?.toUpperCase()}
        </div>

        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.25rem' }}>
            {role === 'buyer' ? 'Max Willingness to Pay' : 'Min Willingness to Accept'}
          </div>
          <div className="font-mono" style={{ fontSize: '2.75rem', fontWeight: 700, color: roleColor }}>
            ${secretValue}
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
          <span>🤫</span> Keep this number secret!
        </div>
      </div>

      {/* Already traded */}
      {hasTraded && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>✅</div>
          <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.15rem' }}>Trade Complete!</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>
            {Number(state.surplusEarned) >= 0 ? '+' : ''}${Number(state.surplusEarned).toFixed(0)} surplus
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Waiting for the round to end…
          </p>
        </div>
      )}

      {/* Incoming confirmation requests */}
      {!hasTraded && state.incomingTransactions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600 }}>
            📨 {state.incomingTransactions.length} Incoming Trade Request{state.incomingTransactions.length > 1 ? 's' : ''}
          </div>
          {state.incomingTransactions.map((tx) => (
            <div key={tx.id} className="card slide-in" style={{ padding: '1.25rem', border: '1px solid rgba(250,204,21,0.4)', background: 'rgba(250,204,21,0.05)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>
                Trade from <span style={{ color: 'var(--warn)' }}>{tx.initiator_name}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                They want to trade at <span className="font-mono" style={{ color: 'var(--warn)', fontSize: '1.1rem', fontWeight: 700 }}>${tx.price}</span>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => respondToTrade(tx.id, tx.price, true)}
                  disabled={confirming}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '0.65rem', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--success)', color: '#0c0e14', fontSize: '1rem' }}
                >
                  {confirming ? '…' : '✓ Accept'}
                </button>
                <button
                  onClick={() => respondToTrade(tx.id, tx.price, false)}
                  disabled={confirming}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '0.65rem', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--error)', background: 'transparent', color: 'var(--error)', fontSize: '1rem' }}
                >
                  ✕ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outgoing pending */}
      {!hasTraded && state.outgoingTransaction && !state.incomingTransaction && (
        <div style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: '1rem', padding: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>⏳</div>
          <div style={{ fontWeight: 600, color: 'var(--warn)' }}>Waiting for {state.outgoingTransaction.partner_name} to confirm…</div>
          <div className="font-mono" style={{ color: 'var(--warn)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
            ${state.outgoingTransaction.price}
          </div>
        </div>
      )}

      {/* Trade form */}
      {!hasTraded && !state.incomingTransaction && !state.outgoingTransaction && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Log a Trade
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Negotiate a price verbally, then log the deal here.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                Trading with
              </label>
              <select
                className="input"
                value={selectedPartner}
                onChange={e => setSelectedPartner(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="">Select your partner…</option>
                {otherPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                Agreed Price ($)
              </label>
              <input
                className="input font-mono"
                type="number" inputMode="decimal" min={1} max={9999}
                placeholder="e.g. 110"
                value={tradePrice}
                onChange={e => setTradePrice(e.target.value)}
                style={{ fontSize: '1.5rem', textAlign: 'center', color: 'var(--text)' }}
              />
            </div>

            {txError && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{txError}</p>}
            {txSuccess && <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>{txSuccess}</p>}

            <button
              className="btn-primary"
              onClick={submitTrade}
              disabled={submitting || !selectedPartner || !tradePrice}
              style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}
            >
              {submitting ? 'Sending…' : '🤝 Send Trade Request'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <div className="live-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Round {roundNumber} · Live</span>
        </div>
      </div>
    </main>
  );
}
