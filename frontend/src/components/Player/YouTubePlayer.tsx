'use client';
import { useEffect, useRef, useState } from 'react';

// @types/youtube provides the global YT namespace
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: string;
}

interface Props {
  videoId: string | null;
  playbackState: PlaybackState;
  canControl: boolean;
  volume: number;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onError?: () => void;          // called when video can't be played
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onReady: () => void;
}

// YouTube error codes
const YT_ERRORS: Record<number, string> = {
  2:   'Invalid video ID.',
  5:   'This video cannot play in this player.',
  100: 'Video not found or removed.',
  101: 'Video owner does not allow embedding.',
  150: 'Video owner does not allow embedding.',
};

// Safely call a method on the player only if it exists as a function
function safeCall(player: YT.Player | null, method: string, ...args: any[]) {
  if (!player) return;
  const fn = (player as any)[method];
  if (typeof fn === 'function') fn.apply(player, args);
}

export default function YouTubePlayer({
  videoId, playbackState, canControl, volume,
  onTimeUpdate, onEnded, onError, onPlay, onPause, onReady,
}: Props) {
  const playerRef    = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isReadyRef   = useRef(false);
  const lastVideoId  = useRef<string | null>(null);
  const intervalRef  = useRef<NodeJS.Timeout | null>(null);
  const isLocalAction = useRef(false);
  const [ytError, setYtError] = useState<string | null>(null);

  // Keep latest callbacks + values in refs (avoids stale closures)
  const onPlayRef     = useRef(onPlay);
  const onPauseRef    = useRef(onPause);
  const onEndedRef    = useRef(onEnded);
  const onErrorRef    = useRef(onError);
  const onReadyRef    = useRef(onReady);
  const canControlRef = useRef(canControl);
  const volumeRef     = useRef(volume);

  useEffect(() => { onPlayRef.current = onPlay; },         [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; },       [onPause]);
  useEffect(() => { onEndedRef.current = onEnded; },       [onEnded]);
  useEffect(() => { onErrorRef.current = onError; },       [onError]);
  useEffect(() => { onReadyRef.current = onReady; },       [onReady]);
  useEffect(() => { canControlRef.current = canControl; }, [canControl]);

  // Sync volume slider → YouTube player volume in real-time
  useEffect(() => {
    volumeRef.current = volume;
    if (isReadyRef.current) {
      safeCall(playerRef.current, 'unMute');
      safeCall(playerRef.current, 'setVolume', volume);
    }
  }, [volume]);

  // ── Load IFrame API once ────────────────────────────────────────────────────
  useEffect(() => {
    function initPlayer() {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width:  '100%',
        playerVars: {
          autoplay:       0,
          controls:       0,   // hide native controls (we use our own)
          disablekb:      1,
          fs:             0,
          modestbranding: 1,
          rel:            0,
          iv_load_policy: 3,
          origin:         window.location.origin,
        },
        events: {
          onReady: () => {
            isReadyRef.current = true;
            setYtError(null);
            // Immediately unmute + set volume so audio works from the start
            safeCall(playerRef.current, 'unMute');
            safeCall(playerRef.current, 'setVolume', volumeRef.current);
            onReadyRef.current();
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              const t = (playerRef.current as any)?.getCurrentTime?.();
              if (typeof t === 'number') onTimeUpdate(t);
            }, 1000);
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (isLocalAction.current) { isLocalAction.current = false; return; }
            if (!canControlRef.current) return;
            const t = (playerRef.current as any)?.getCurrentTime?.() ?? 0;
            if (e.data === window.YT.PlayerState.PLAYING) onPlayRef.current(t);
            if (e.data === window.YT.PlayerState.PAUSED)  onPauseRef.current(t);
            if (e.data === window.YT.PlayerState.ENDED)   onEndedRef.current();
          },
          onError: (e: { data: number }) => {
            const msg = YT_ERRORS[e.data] ?? `YouTube error (code ${e.data}).`;
            setYtError(msg);
            // Auto-skip after a short delay so admin's client moves to next song
            if (canControlRef.current) {
              setTimeout(() => onEndedRef.current(), 1500);
            }
            onErrorRef.current?.();
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      isReadyRef.current = false;
      playerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load new video when videoId changes ─────────────────────────────────────
  useEffect(() => {
    if (!isReadyRef.current || !videoId) return;
    if (videoId !== lastVideoId.current) {
      lastVideoId.current = videoId;
      setYtError(null);          // clear previous error
      isLocalAction.current = true;
      safeCall(playerRef.current, 'loadVideoById', videoId, 0);
    }
  }, [videoId]);

  // ── Sync playback state from server ─────────────────────────────────────────
  useEffect(() => {
    if (!isReadyRef.current || !videoId) return;

    const elapsed    = (Date.now() - new Date(playbackState.updatedAt).getTime()) / 1000;
    const serverTime = playbackState.currentTime + (playbackState.isPlaying ? elapsed : 0);
    const current    = (playerRef.current as any)?.getCurrentTime?.() ?? 0;
    const drift      = Math.abs(current - serverTime);

    isLocalAction.current = true;
    if (drift > 2) safeCall(playerRef.current, 'seekTo', serverTime, true);

    if (playbackState.isPlaying) {
      safeCall(playerRef.current, 'unMute');
      safeCall(playerRef.current, 'setVolume', volumeRef.current);
      safeCall(playerRef.current, 'playVideo');
    } else {
      safeCall(playerRef.current, 'pauseVideo');
    }
  }, [playbackState, videoId]);

  return (
    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Error overlay */}
      {ytError && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,10,15,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>🚫</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Can't play this video</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.5 }}>{ytError}</div>
          <div style={{ fontSize: 12, color: 'var(--accent-light)', marginTop: 4 }}>
            {canControl ? 'Skipping to next song…' : 'Waiting for admin to skip…'}
          </div>
        </div>
      )}

      {/* Empty state when no video */}
      {!videoId && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10, color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: 48 }}>🎵</div>
          <div style={{ fontSize: 14 }}>Add a song to get started</div>
        </div>
      )}
    </div>
  );
}
