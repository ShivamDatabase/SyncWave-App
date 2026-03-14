'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime } from '@/lib/utils';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: string;
}

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  youtubeId: string;
  addedBy: { name: string };
  duration?: string;
}

export type RepeatMode = 'none' | 'one' | 'all';

interface Props {
  currentSong: Song | null;
  actualDuration?: number | null;
  playbackState: PlaybackState;
  canControl: boolean;
  currentTime: number;
  queueLength: number;
  currentIndex: number;
  onPlay: () => void;
  onPause: () => void;
  onSkip: (dir: 'prev' | 'next') => void;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  shuffle: boolean;
  onShuffleToggle: () => void;
  repeat: RepeatMode;
  onRepeatToggle: () => void;
}

export default function PlayerControls({
  currentSong, actualDuration, playbackState, canControl, currentTime,
  queueLength, currentIndex,
  onPlay, onPause, onSkip, onSeek,
  volume, onVolumeChange,
  shuffle, onShuffleToggle,
  repeat, onRepeatToggle,
}: Props) {
  const [liveTime, setLiveTime] = useState(currentTime);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(currentTime);

  // Sync live time with server state
  useEffect(() => {
    if (isSeeking) return;
    baseRef.current = playbackState.currentTime;
    startRef.current = Date.now();
    setLiveTime(playbackState.currentTime);
  }, [playbackState, isSeeking]);

  // Tick the live timer
  useEffect(() => {
    if (!playbackState.isPlaying || isSeeking) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      setLiveTime(baseRef.current + elapsed);
    }, 500);
    return () => clearInterval(interval);
  }, [playbackState.isPlaying, isSeeking]);

  const duration = actualDuration
    ? actualDuration
    : currentSong
    ? parseFloat(currentSong.duration || '0') || 240
    : 240;

  const displayTime = isSeeking ? seekValue : liveTime;
  const progress = duration ? Math.min((displayTime / duration) * 100, 100) : 0;

  // Calculate seek position from mouse/touch event on progress bar
  const getSeekTime = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    if (!canControl) return;
    setIsSeeking(true);
    setSeekValue(getSeekTime(e));

    const onMove = (ev: MouseEvent) => setSeekValue(getSeekTime(ev));
    const onUp = (ev: MouseEvent) => {
      const t = getSeekTime(ev);
      setIsSeeking(false);
      setLiveTime(t);
      onSeek(t);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleFullscreen = () => {
    const playerEl = document.getElementById('youtube-player-container');
    if (!playerEl) return;
    if (!document.fullscreenElement) {
      playerEl.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const repeatIcon = repeat === 'none' ? '🔁' : repeat === 'all' ? '🔁' : '🔂';
  const repeatLabel = repeat === 'none' ? 'No repeat' : repeat === 'all' ? 'Repeat all' : 'Repeat one';

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      padding: '12px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      userSelect: 'none',
    }}>

      {/* Song Info Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {currentSong ? (
          <>
            <img
              src={currentSong.thumbnail || `https://img.youtube.com/vi/${currentSong.youtubeId}/mqdefault.jpg`}
              alt={currentSong.title}
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSong.title}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Added by {currentSong.addedBy?.name}
                {queueLength > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--accent-light)', fontWeight: 600 }}>
                    {currentIndex + 1} / {queueLength}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, flex: 1 }}>No song playing — add one from the queue!</div>
        )}

        {!canControl && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, padding: '3px 8px', background: 'var(--bg-hover)', borderRadius: 99 }}>
            👑 Admin controls
          </span>
        )}
      </div>

      {/* Progress / Seek Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(displayTime)}
        </span>

        {/* Clickable track */}
        <div
          ref={progressRef}
          onMouseDown={handleProgressMouseDown}
          style={{
            flex: 1,
            height: 5,
            background: 'var(--bg-hover)',
            borderRadius: 99,
            position: 'relative',
            cursor: canControl ? 'pointer' : 'default',
            overflow: 'visible',
          }}
          onMouseEnter={e => { if (canControl) (e.currentTarget.style.height = '7px'); }}
          onMouseLeave={e => { if (!isSeeking) (e.currentTarget.style.height = '5px'); }}
        >
          {/* Filled portion */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, var(--accent), var(--accent-light))`,
            borderRadius: 99,
            transition: isSeeking ? 'none' : 'width 0.5s linear',
          }} />
          {/* Thumb */}
          {canControl && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: isSeeking ? 14 : 10,
              height: isSeeking ? 14 : 10,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 4px rgba(124,58,237,0.6)',
              transition: isSeeking ? 'none' : 'width 0.15s, height 0.15s',
              pointerEvents: 'none',
            }} />
          )}
        </div>

        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Main Controls Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px 12px' }}>

        {/* Left — shuffle + repeat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
          <button
            className="btn-icon tooltip"
            data-tip={shuffle ? 'Shuffle ON' : 'Shuffle OFF'}
            onClick={() => canControl && onShuffleToggle()}
            style={{
              width: 30, height: 30, fontSize: 14, opacity: canControl ? 1 : 0.4,
              background: shuffle ? 'var(--accent-glow)' : 'transparent',
              color: shuffle ? 'var(--accent-light)' : 'var(--text-muted)',
              border: shuffle ? '1px solid var(--border-focus)' : '1px solid transparent',
            }}
            disabled={!canControl}
            title={shuffle ? 'Shuffle ON' : 'Shuffle OFF'}
          >🔀</button>

          <button
            className="btn-icon tooltip"
            data-tip={repeatLabel}
            onClick={() => canControl && onRepeatToggle()}
            style={{
              width: 30, height: 30, fontSize: 14, opacity: canControl ? 1 : 0.4,
              background: repeat !== 'none' ? 'var(--accent-glow)' : 'transparent',
              color: repeat !== 'none' ? 'var(--accent-light)' : 'var(--text-muted)',
              border: repeat !== 'none' ? '1px solid var(--border-focus)' : '1px solid transparent',
            }}
            disabled={!canControl}
            title={repeatLabel}
          >{repeatIcon}</button>
        </div>

        {/* Center — prev / play-pause / next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-icon tooltip"
            data-tip="Previous"
            onClick={() => canControl && onSkip('prev')}
            style={{ opacity: canControl ? 1 : 0.35, width: 36, height: 36, fontSize: 18 }}
            disabled={!canControl}
          >⏮</button>

          <button
            onClick={() => { if (!canControl) return; playbackState.isPlaying ? onPause() : onPlay(); }}
            style={{
              width: 52, height: 52,
              borderRadius: '50%',
              background: canControl
                ? 'linear-gradient(135deg, var(--accent), var(--accent-light))'
                : 'var(--bg-hover)',
              color: '#fff',
              border: 'none',
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canControl ? 'pointer' : 'not-allowed',
              opacity: canControl ? 1 : 0.5,
              boxShadow: canControl ? 'var(--shadow-accent)' : 'none',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (canControl) (e.currentTarget.style.transform = 'scale(1.07)'); }}
            onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            disabled={!canControl}
          >
            {playbackState.isPlaying ? '⏸' : '▶'}
          </button>

          <button
            className="btn-icon tooltip"
            data-tip="Next"
            onClick={() => canControl && onSkip('next')}
            style={{ opacity: canControl ? 1 : 0.35, width: 36, height: 36, fontSize: 18 }}
            disabled={!canControl}
          >⏭</button>
        </div>

        {/* Right — volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
          <span
            onClick={() => onVolumeChange(volume === 0 ? 70 : 0)}
            title={volume === 0 ? 'Unmute' : 'Mute'}
            role="button"
            style={{ cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
          >
            {volume === 0 ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊'}
          </span>
          <input
            type="range"
            min={0} max={100}
            value={volume}
            onChange={e => onVolumeChange(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--accent)',
              cursor: 'pointer',
              height: 4,
            }}
            title={`Volume: ${volume}%`}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {volume}%
          </span>
          <button
            onClick={handleFullscreen}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', marginLeft: 8 }}
            title="Toggle Fullscreen"
          >
            ⛶
          </button>
        </div>

      </div>
    </div>
  );
}
