'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toaster';

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      router.push('/');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(ellipse at top, rgba(124,58,237,0.15) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(34,197,94,0.07) 0%, transparent 60%)',
    }}>
      <div className="glass slide-up" style={{
        width: '100%', maxWidth: 420,
        padding: '40px 36px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-accent)',
        margin: '0 16px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎵</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-light), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SyncWave
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Listen together, in sync.</p>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-hover)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '7px 0', borderRadius: 6, fontWeight: 600, fontSize: 13,
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Name</label>
              <input className="input" style={{ marginTop: 4 }} placeholder="Your display name" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Email</label>
            <input className="input" style={{ marginTop: 4 }} type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Password</label>
            <input className="input" style={{ marginTop: 4 }} type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ marginTop: 4, padding: '11px', fontSize: 14, width: '100%' }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
