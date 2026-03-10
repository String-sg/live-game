'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ textAlign: 'center' }}>
      {/* Background glow blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 20% 60%, rgba(212,168,83,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(96,165,250,0.06) 0%, transparent 70%)',
      }} />

      {/* Hero */}
      <div className="relative z-10 text-center" style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '0.75rem' }}>🦪</div>
        <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 8vw, 2.75rem)', fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>
          Pearl Exchange
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          Live market simulation · Classroom edition
        </p>
      </div>

      {/* Join form */}
      <div className="relative z-10" style={{ width: '100%', maxWidth: '22rem', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem', textAlign: 'center' }}>
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem', textAlign: 'center' }}>
              Your Name
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              style={{ textAlign: 'center' }}
            />
          </div>

          {joinError && <p style={{ color: 'var(--error)', fontSize: '0.875rem', textAlign: 'center' }}>{joinError}</p>}

          <button className="btn-primary" onClick={handleJoin} disabled={joining} style={{ width: '100%', marginTop: '0.25rem', fontSize: '1.05rem' }}>
            {joining ? 'Joining…' : '🎮 Join Game'}
          </button>
        </div>

        {/* Teacher link */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link
            href="/create"
            style={{ color: 'var(--muted)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.15s' }}
          >
            🏫 I&apos;m a teacher → <span style={{ textDecoration: 'underline' }}>Create a game</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
