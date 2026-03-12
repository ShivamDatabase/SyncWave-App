'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import api from '@/lib/api';
import { toast } from '@/components/ui/Toaster';

function FloatingNote({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return <div aria-hidden style={{ position: 'absolute', fontSize: 24, opacity: 0.12, animation: 'float 8s ease-in-out infinite', ...style }}>{emoji}</div>;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [loading, user, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setCreating(true);
    try {
      const r = await api.post('/rooms', { name: roomName.trim() });
      router.push(`/room/${r.data.room.code}`);
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to create room', 'error');
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      await api.get(`/rooms/${code}`);
      router.push(`/room/${code}`);
    } catch {
      toast('Room not found', 'error');
      setJoining(false);
    }
  };

  if (loading || !user) {
    return <div style={{ height: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 40 }}>🎵</div>
    </div>;
  }

  return (
    <SocketProvider>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(34,197,94,0.1) 0%, transparent 50%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Floating notes */}
        <FloatingNote emoji="🎵" style={{ top: '10%', left: '8%', animationDelay: '0s' }} />
        <FloatingNote emoji="🎶" style={{ top: '25%', right: '12%', animationDelay: '-3s' }} />
        <FloatingNote emoji="🎸" style={{ top: '60%', left: '5%', animationDelay: '-1.5s' }} />
        <FloatingNote emoji="🎹" style={{ bottom: '20%', right: '8%', animationDelay: '-4s' }} />
        <FloatingNote emoji="🎤" style={{ top: '45%', left: '90%', animationDelay: '-2s' }} />
        <FloatingNote emoji="🥁" style={{ bottom: '35%', left: '15%', animationDelay: '-5s' }} />

        {/* Nav */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px', borderBottom: '1px solid var(--border)',
          background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎵</span>
            <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-light), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SyncWave
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>👋 {user.name}</span>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={logout}>Sign Out</button>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 20px 40px', textAlign: 'center' }}>
          <div className="slide-up">
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, margin: '0 0 16px',
              lineHeight: 1.1,
            }}>
              Listen{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--accent-light), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Together
              </span>
              ,<br />In Perfect Sync
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.6 }}>
              Create a room, share the code, and vibe to YouTube music with your friends — with real-time voice and chat.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 700, margin: '0 auto' }}>
            {/* Create Room */}
            <div className="glass slide-up" style={{ padding: 28, borderRadius: 'var(--radius-lg)', textAlign: 'left' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Create a Room</h2>
              <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                Start a new listening session. You&apos;ll be the admin.
              </p>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="input" placeholder="Room name (e.g. Late Night Vibes)"
                  value={roomName} onChange={e => setRoomName(e.target.value)}
                  required maxLength={40}
                />
                <button className="btn btn-primary" type="submit" disabled={creating} style={{ padding: '11px' }}>
                  {creating ? 'Creating...' : '🚀 Create Room'}
                </button>
              </form>
            </div>

            {/* Join Room */}
            <div className="glass slide-up" style={{ padding: 28, borderRadius: 'var(--radius-lg)', textAlign: 'left', animationDelay: '0.1s' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Join a Room</h2>
              <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                Got a room code? Enter it below to join the party!
              </p>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="input" placeholder="Enter 6-char room code"
                  value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  required maxLength={6} style={{ letterSpacing: 4, fontFamily: 'monospace', fontSize: 16, textTransform: 'uppercase' }}
                />
                <button className="btn btn-secondary" type="submit" disabled={joining} style={{ padding: '11px' }}>
                  {joining ? 'Joining...' : '🎵 Join Room'}
                </button>
              </form>
            </div>
          </div>

          {/* Features */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 56 }}>
            {[
              { icon: '🎵', label: 'YouTube Music' },
              { icon: '🔄', label: 'Real-time Sync' },
              { icon: '🎙️', label: 'Voice Chat' },
              { icon: '💬', label: 'Text Chat' },
              { icon: '📋', label: 'Shared Queue' },
              { icon: '👑', label: 'Admin Controls' },
            ].map(f => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                background: 'var(--bg-card)', borderRadius: 99, border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <span>{f.icon}</span><span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(5deg); }
            66% { transform: translateY(-10px) rotate(-3deg); }
          }
          @media (max-width: 640px) {
            div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </SocketProvider>
  );
}
