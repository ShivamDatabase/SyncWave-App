'use client';
import { useState } from 'react';
import { extractYouTubeId } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from '@/components/ui/Toaster';

interface Props {
  onAdd: (song: { youtubeId: string; title: string; thumbnail: string; duration: string }) => void;
  onClose: () => void;
}

interface SearchResult {
  youtubeId: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export default function AddSongModal({ onAdd, onClose }: Props) {
  const [tab, setTab] = useState<'url' | 'search'>('url');
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<{ youtubeId: string; title: string } | null>(null);

  const handleUrlPreview = () => {
    const id = extractYouTubeId(url);
    if (!id) { toast('Invalid YouTube URL', 'error'); return; }
    setPreview({ youtubeId: id, title: `YouTube Video (${id})` });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await api.get(`/youtube/search?q=${encodeURIComponent(query)}`);
      setResults(r.data.results);
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = (song: { youtubeId: string; title: string; thumbnail: string }) => {
    onAdd({ ...song, duration: '' });
    toast(`Added: ${song.title}`, 'success');
    onClose();
  };

  const handleUrlAdd = () => {
    const id = extractYouTubeId(url);
    if (!id) { toast('Invalid YouTube URL', 'error'); return; }
    handleAdd({
      youtubeId: id,
      title: preview?.title || `YouTube Video`,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div className="glass slide-up" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 500, borderRadius: 'var(--radius-lg)',
        padding: 24, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🎵 Add Song</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          {(['url', 'search'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '7px 0', borderRadius: 6, fontWeight: 600, fontSize: 13,
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}>
              {t === 'url' ? '🔗 Paste URL' : '🔍 Search YouTube'}
            </button>
          ))}
        </div>

        {tab === 'url' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlPreview()}
            />
            {preview && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-hover)', borderRadius: 8, padding: 10 }}>
                <img src={`https://img.youtube.com/vi/${preview.youtubeId}/mqdefault.jpg`}
                  alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{preview.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>YouTube Video</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleUrlPreview}>Preview</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUrlAdd} disabled={!url}>Add to Queue</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Search for a song..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
                {searching ? '...' : '🔍'}
              </button>
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360 }}>
              {results.map(r => (
                <button key={r.youtubeId} onClick={() => handleAdd(r)} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: 'var(--bg-hover)', borderRadius: 8, padding: 8,
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'background 0.15s',
                  border: '1px solid transparent',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <img src={r.thumbnail} alt="" style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.channel}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 18, flexShrink: 0 }}>+</span>
                </button>
              ))}
              {results.length === 0 && !searching && query && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No results found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
