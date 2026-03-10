'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'home' | 'create' | 'join';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');

  // Create state
  const [passphrase, setPassphrase] = useState('');
  const [roundDuration, setRoundDuration] = useState(300);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join state
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function handleCreate() {
    if (!passphrase.trim()) { setCreateError('Please enter a passphrase'); return; }
    setCreating(true); setCreateError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase, roundDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create game');
      sessionStorage.setItem(`pp_${data.sessionId}`, passphrase);
      router.push(`/teacher/${data.sessionId}`);
    } catch (e: any) {
      setCreateError(e.message);
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (pin.length !== 6) { setJoinError('Enter the 6-digit PIN'); return; }
    if (!playerName.trim()) { setJoinError('Enter your name'); return; }
    setJoining(true); setJoinError('');
    try {
      const res = await fetch(`/api/sessions/${pin}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      localStorage.setItem(`player_${pin}`, data.player.id);
      localStorage.setItem(`playerName_${pin}`, data.player.name);
      router.push(`/play/${pin}`);
    } catch (e: any) {
      setJoinError(e.message);
      setJoining(false);
    }
  }

  const durMins = Math.floor(roundDuration / 60);
  const durSecs = String(roundDuration % 60).padStart(2, '0');

  /* ── HOME ──────────────────────────────────────────────────────────── */
  if (mode === 'home') return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 20% 60%, rgba(212,168,83,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(96,165,250,0.06) 0%, transparent 70%)',
      }} />

      <div className="relative z-10 text-center mb-14">
        <div style={{ fontSize: '5rem', lineHeight: 1, marginBottom: '1rem' }}>🦪</div>
        <h1 className="font-display" style={{ fontSize: '3.25rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>
          Pearl Exchange
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.75rem', fontSize: '1.05rem' }}>
          Live market simulation · Classroom edition
        </p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full" style={{ maxWidth: '26rem' }}>
        <button
          onClick={() => setMode('create')}
          className="flex-1 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--accent)', color: '#0c0e14', padding: '1.25rem 1.5rem' }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🏫</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Create Game</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.65, marginTop: '0.15rem' }}>I&apos;m a teacher</div>
        </button>

        <button
          onClick={() => setMode('join')}
          className="flex-1 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--surface-s)', border: '1px solid var(--border)', color: 'var(--text)', padding: '1.25rem 1.5rem' }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎮</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Join Game</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.5, marginTop: '0.15rem' }}>I&apos;m a student</div>
        </button>
      </div>
    </main>
  );

  /* ── CREATE ────────────────────────────────────────────────────────── */
  if (mode === 'create') return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div style={{ width: '100%', maxWidth: '22rem' }}>
        <button onClick={() => setMode('home')} style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          ← Back
        </button>
        <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.35rem' }}>
          Create Game
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Set a passphrase to manage your session
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
              Teacher Passphrase
            </label>
            <input
              className="input"
              type="password"
              placeholder="e.g. economics2024"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
              Round Duration: <span style={{ color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>{durMins}:{durSecs}</span>
            </label>
            <input
              type="range" min={60} max={600} step={30}
              value={roundDuration}
              onChange={e => setRoundDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              <span>1 min</span><span>10 min</span>
            </div>
          </div>

          {createError && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{createError}</p>}

          <button className="btn-primary" onClick={handleCreate} disabled={creating} style={{ width: '100%', marginTop: '0.5rem' }}>
            {creating ? 'Creating…' : 'Create Game →'}
          </button>
        </div>
      </div>
    </main>
  );

  /* ── JOIN ──────────────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div style={{ width: '100%', maxWidth: '22rem' }}>
        <button onClick={() => setMode('home')} style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          ← Back
        </button>
        <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.35rem' }}>
          Join Game
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Enter the PIN from the teacher&apos;s screen
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
              Game PIN
            </label>
            <input
              className="input font-mono"
              type="text" inputMode="numeric" maxLength={6}
              placeholder="123456"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              style={{ fontSize: '2rem', letterSpacing: '0.25em', textAlign: 'center', color: 'var(--accent)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
              Your Name
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>

          {joinError && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{joinError}</p>}

          <button className="btn-primary" onClick={handleJoin} disabled={joining} style={{ width: '100%', marginTop: '0.5rem' }}>
            {joining ? 'Joining…' : 'Join Game →'}
          </button>
        </div>
      </div>
    </main>
  );
}
