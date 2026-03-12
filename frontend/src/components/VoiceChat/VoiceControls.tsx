'use client';

interface Props {
  isMuted: boolean;
  onToggleMute: () => void;
  onJoinVoice: () => void;
  isJoined: boolean;
  micError: string | null;
}

export default function VoiceControls({ isMuted, onToggleMute, onJoinVoice, isJoined, micError }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>🎙️ VOICE</span>

      {!isJoined ? (
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onJoinVoice}>
          Join Voice
        </button>
      ) : (
        <button
          className="btn"
          style={{
            fontSize: 12, padding: '5px 12px',
            background: isMuted ? 'var(--danger)' : 'var(--green)',
            color: '#fff',
          }}
          onClick={onToggleMute}
        >
          {isMuted ? '🔇 Muted' : '🎙️ Live'}
        </button>
      )}

      {micError && (
        <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1 }}>⚠️ {micError}</span>
      )}
    </div>
  );
}
