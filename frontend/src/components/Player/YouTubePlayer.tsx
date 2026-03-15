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
  onDurationChange?: (duration: number) => void;
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
  onTimeUpdate, onDurationChange, onEnded, onError, onPlay, onPause, onReady,
}: Props) {
  const playerRef    = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
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
    if (isReady && playerRef.current) {
      safeCall(playerRef.current, 'unMute');
      safeCall(playerRef.current, 'setVolume', volume);
    }
  }, [volume, isReady]);

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
            console.log('[YouTubePlayer] Player ready');
            setIsReady(true);
            setYtError(null);
            // Immediately unmute + set volume so audio works from the start
            safeCall(playerRef.current, 'unMute');
            safeCall(playerRef.current, 'setVolume', volumeRef.current);
            onReadyRef.current();
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              const dt = (playerRef.current as any)?.getDuration?.();
              if (typeof dt === 'number' && dt > 0) {
                onDurationChange?.(dt);
              }
              const t = (playerRef.current as any)?.getCurrentTime?.() ?? 0;
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
            console.error('[YouTubePlayer] Error:', e.data);
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

    // Workaround for strict browser autoplay policies:
    const unlockAudio = () => {
      if (playerRef.current && typeof (playerRef.current as any).unMute === 'function') {
        safeCall(playerRef.current, 'unMute');
        safeCall(playerRef.current, 'setVolume', volumeRef.current);
      }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsReady(false);
      playerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load new video when videoId changes or player becomes ready ─────────────
  useEffect(() => {
    if (!isReady || !videoId || !playerRef.current) return;
    
    if (videoId !== lastVideoId.current) {
      console.log(`[YouTubePlayer] Loading video: ${videoId}`);
      lastVideoId.current = videoId;
      setYtError(null);
      isLocalAction.current = true;
      safeCall(playerRef.current, 'loadVideoById', videoId, 0);
    }
  }, [videoId, isReady]);

  // ── Sync playback state from server ─────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !videoId || !playerRef.current) return;

    // Use a simple sync: if playing, calculate expected current time based on server's update
    const now = Date.now();
    const updatedAt = new Date(playbackState.updatedAt).getTime();
    let elapsed = (now - updatedAt) / 1000;
    
    // If elapsed is negative, it means client clock is ahead of server
    // We treat it as 0 to avoid jumping backwards
    if (elapsed < 0) {
        console.log(`[YouTubePlayer] Client clock ahead of server by ${Math.abs(elapsed).toFixed(2)}s`);
        elapsed = 0;
    }

    const serverTime = playbackState.currentTime + (playbackState.isPlaying ? elapsed : 0);
    const current = (playerRef.current as any)?.getCurrentTime?.() ?? 0;
    const drift = Math.abs(current - serverTime);

    // Only sync if drift is significant (avoiding stutter from minor clock differences)
    // Increased threshold from 2 to 3 seconds for better stability with clock skew
    if (drift > 3) {
      console.log(`[YouTubePlayer] Syncing: drift=${drift.toFixed(2)}s, seeking to ${serverTime.toFixed(2)}s`);
      isLocalAction.current = true;
      safeCall(playerRef.current, 'seekTo', serverTime, true);
    }

    if (playbackState.isPlaying) {
      if ((playerRef.current as any)?.getPlayerState?.() !== window.YT.PlayerState.PLAYING) {
        isLocalAction.current = true;
        safeCall(playerRef.current, 'playVideo');
      }
    } else {
      if ((playerRef.current as any)?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
        isLocalAction.current = true;
        safeCall(playerRef.current, 'pauseVideo');
      }
    }
  }, [playbackState, videoId]);

  return (
    <div id="youtube-player-container" style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative' }}>
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
