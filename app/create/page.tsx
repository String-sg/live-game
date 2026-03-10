'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateGamePage() {
  const router = useRouter();

  const [passphrase, setPassphrase] = useState('');
  const [roundDuration, setRoundDuration] = useState(300);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const durMins = Math.floor(roundDuration / 60);
  const durSecs = String(roundDuration % 60).padStart(2, '0');

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ textAlign: 'center' }}>
      {/* Background glow blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 20% 60%, rgba(212,168,83,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(96,165,250,0.06) 0%, transparent 70%)',
      }} />

      <div className="relative z-10" style={{ width: '100%', maxWidth: '22rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '0.5rem' }}>🏫</div>
          <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.35rem' }}>
            Create Game
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Set a passphrase to manage your session
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem', textAlign: 'center' }}>
              Teacher Passphrase
            </label>
            <input
              className="input"
              type="password"
              placeholder="e.g. economics2024"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ textAlign: 'center' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem', textAlign: 'center' }}>
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

          {createError && <p style={{ color: 'var(--error)', fontSize: '0.875rem', textAlign: 'center' }}>{createError}</p>}

          <button className="btn-primary" onClick={handleCreate} disabled={creating} style={{ width: '100%', marginTop: '0.25rem', fontSize: '1.05rem' }}>
            {creating ? 'Creating…' : 'Create Game →'}
          </button>
        </div>

        {/* Back to join */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link
            href="/"
            style={{ color: 'var(--muted)', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            ← Back to Join
          </Link>
        </div>
      </div>
    </main>
  );
}
