'use client';
import { use, useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import api from '@/lib/api';
import YouTubePlayer from '@/components/Player/YouTubePlayer';
import PlayerControls, { RepeatMode } from '@/components/Player/PlayerControls';
import PlaylistPanel from '@/components/Playlist/PlaylistPanel';
import UsersList from '@/components/Users/UsersList';
import ChatPanel from '@/components/Chat/ChatPanel';
import VoiceControls from '@/components/VoiceChat/VoiceControls';
import ActivityLog from '@/components/Room/ActivityLog';
import { toast } from '@/components/ui/Toaster';

interface Song { id: string; youtubeId: string; title: string; thumbnail: string; addedBy: any; likes: string[]; duration?: string; }
interface RoomUser { _id: string; name: string; avatar: string; socketId: string; isMuted?: boolean; }
interface PlaybackState { isPlaying: boolean; currentTime: number; updatedAt: string; }
interface ChatMsg { id: string; user: { _id: string; name: string; avatar: string }; text: string; createdAt: string; }
interface ActivityItem { type: string; message: string; user: { name: string }; createdAt: string; }

interface RoomState {
  name: string;
  code: string;
  admin: string;
  controlledBy: string | null;
  playlist: Song[];
  currentSongIndex: number;
  playbackState: PlaybackState;
  users: RoomUser[];
  activityLog: ActivityItem[];
}

type Action =
  | { type: 'SET_ROOM'; payload: any }
  | { type: 'USERS_UPDATED'; payload: RoomUser[] }
  | { type: 'PLAYBACK_STATE'; payload: PlaybackState }
  | { type: 'PLAYBACK_SEEK'; payload: { currentTime: number } }
  | { type: 'SONG_CHANGED'; payload: { currentSongIndex: number; playbackState: PlaybackState } }
  | { type: 'PLAYLIST_UPDATED'; payload: Song[] }
  | { type: 'CONTROL_CHANGED'; payload: { controlledBy: string | null } }
  | { type: 'ACTIVITY_LOG'; payload: ActivityItem[] };

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'SET_ROOM': {
      const r = action.payload;
      return {
        name: r.name, code: r.code,
        admin: r.admin?._id || r.admin,
        controlledBy: r.controlledBy || null,
        playlist: r.playlist || [],
        currentSongIndex: r.currentSongIndex ?? 0,
        playbackState: r.playbackState || { isPlaying: false, currentTime: 0, updatedAt: new Date().toISOString() },
        users: r.users || [],
        activityLog: r.activityLog || [],
      };
    }
    case 'USERS_UPDATED': return { ...state, users: action.payload };
    case 'PLAYBACK_STATE': return { ...state, playbackState: action.payload };
    case 'PLAYBACK_SEEK': return { ...state, playbackState: { ...state.playbackState, currentTime: action.payload.currentTime, updatedAt: new Date().toISOString() } };
    case 'SONG_CHANGED': return { ...state, currentSongIndex: action.payload.currentSongIndex, playbackState: action.payload.playbackState };
    case 'PLAYLIST_UPDATED': return { ...state, playlist: action.payload };
    case 'CONTROL_CHANGED': return { ...state, controlledBy: action.payload.controlledBy };
    case 'ACTIVITY_LOG': return { ...state, activityLog: action.payload };
    default: return state;
  }
}

const defaultRoom: RoomState = {
  name: '', code: '', admin: '', controlledBy: null,
  playlist: [], currentSongIndex: 0,
  playbackState: { isPlaying: false, currentTime: 0, updatedAt: new Date().toISOString() },
  users: [], activityLog: [],
};

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const [room, dispatch] = useReducer(reducer, defaultRoom);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [loading, setLoading] = useState(true);
  const [voiceJoined, setVoiceJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'activity'>('chat');
  const [mobilePanel, setMobilePanel] = useState<'player' | 'playlist' | 'users'>('player');
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const roomCode = code.toUpperCase();

  const isAdmin = user?._id === room.admin;
  const canControl = isAdmin || user?._id === room.controlledBy;
  const currentSong = room.playlist[room.currentSongIndex] ?? null;

  const { isMuted, toggleMute, speakingUsers, micError, startVoice } = useVoiceChat({
    socket, roomCode, userId: user?._id || '', users: room.users,
  });

  // Load room + join via socket
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth'); return; }

    api.get(`/rooms/${roomCode}`)
      .then(r => { dispatch({ type: 'SET_ROOM', payload: r.data.room }); setLoading(false); })
      .catch(() => { toast('Room not found', 'error'); router.push('/'); });
  }, [roomCode, user, authLoading, router]);

  useEffect(() => {
    if (!socket || !user || loading) return;
    socket.emit('join-room', { roomCode });

    socket.on('room-state', ({ room: r }) => dispatch({ type: 'SET_ROOM', payload: r }));
    socket.on('users-updated', ({ users }) => dispatch({ type: 'USERS_UPDATED', payload: users }));
    socket.on('playback:state', (state) => dispatch({ type: 'PLAYBACK_STATE', payload: state }));
    socket.on('playback:seek', (data) => dispatch({ type: 'PLAYBACK_SEEK', payload: data }));
    socket.on('playlist:song-changed', (data) => dispatch({ type: 'SONG_CHANGED', payload: data }));
    socket.on('playlist:updated', ({ playlist }) => dispatch({ type: 'PLAYLIST_UPDATED', payload: playlist }));
    socket.on('admin:control-changed', ({ controlledBy }) => dispatch({ type: 'CONTROL_CHANGED', payload: { controlledBy } }));
    socket.on('activity-log', ({ log }) => dispatch({ type: 'ACTIVITY_LOG', payload: log }));
    socket.on('chat:message', (msg) => setMessages(prev => [...prev.slice(-200), msg]));
    socket.on('kicked', () => { toast('You were removed from the room', 'error'); router.push('/'); });
    socket.on('error', ({ message }) => toast(message, 'error'));

    return () => {
      ['room-state','users-updated','playback:state','playback:seek','playlist:song-changed',
       'playlist:updated','admin:control-changed','activity-log','chat:message','kicked','error']
        .forEach(e => socket.off(e));
    };
  }, [socket, user, loading, roomCode, router]);

  const emit = useCallback((event: string, data: object) => {
    socket?.emit(event, { roomCode, ...data });
  }, [socket, roomCode]);

  const handleSkip = useCallback((dir: 'prev' | 'next') => {
    if (shuffle && dir === 'next' && room.playlist.length > 1) {
      let idx;
      do { idx = Math.floor(Math.random() * room.playlist.length); }
      while (idx === room.currentSongIndex && room.playlist.length > 1);
      emit('playlist:play-song', { index: idx });
    } else {
      emit('playback:skip', { direction: dir });
    }
  }, [shuffle, room.playlist.length, room.currentSongIndex, emit]);

  const handleRepeatToggle = useCallback(() => {
    setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  }, []);

  const handleSeek = useCallback((time: number) => {
    emit('playback:seek', { currentTime: time });
  }, [emit]);

  const handleJoinVoice = async () => {
    await startVoice();
    setVoiceJoined(true);
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Joining room...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <button className="btn-ghost" onClick={() => router.push('/')} style={{ fontSize: 18, padding: '4px 8px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{room.name || 'Room'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Code: <span style={{ fontFamily: 'monospace', color: 'var(--accent-light)', letterSpacing: 2 }}>{roomCode}</span>
            <button onClick={() => { navigator.clipboard.writeText(roomCode); toast('Code copied!', 'success'); }}
              style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 11 }}>
              Copy
            </button>
            {' · '}{room.users.length} listener{room.users.length !== 1 ? 's' : ''}
          </div>
        </div>
        {isAdmin && <span className="tag">👑 Admin</span>}
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.name}</span>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
          onClick={() => router.push('/')}>Leave</button>
      </header>

      {/* Mobile Tab Bar */}
      <div style={{ display: 'none' }} className="mobile-tabs">
        {(['player','playlist','users'] as const).map(t => (
          <button key={t} onClick={() => setMobilePanel(t)} style={{
            flex: 1, padding: '8px 0', fontWeight: 600, fontSize: 12, background: 'none', border: 'none',
            borderBottom: `2px solid ${mobilePanel === t ? 'var(--accent)' : 'transparent'}`,
            color: mobilePanel === t ? 'var(--accent-light)' : 'var(--text-muted)',
          }}>
            {t === 'player' ? '🎵 Player' : t === 'playlist' ? '📋 Queue' : '👥 Users'}
          </button>
        ))}
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 300px', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT: Playlist */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <PlaylistPanel
            playlist={room.playlist}
            currentSongIndex={room.currentSongIndex}
            canControl={canControl}
            userId={user?._id || ''}
            onAdd={song => emit('playlist:add', { song })}
            onRemove={id => emit('playlist:remove', { songId: id })}
            onReorder={(from, to) => emit('playlist:reorder', { fromIndex: from, toIndex: to })}
            onLike={id => emit('playlist:like', { songId: id })}
            onPlaySong={index => emit('playlist:play-song', { index })}
          />
        </div>

        {/* CENTER: Player */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          {/* Video Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: 12, overflow: 'hidden' }}>
            <YouTubePlayer
              videoId={currentSong?.youtubeId ?? null}
              playbackState={room.playbackState}
              canControl={canControl}
              volume={volume}
              onTimeUpdate={t => setCurrentTime(t)}
              onEnded={() => emit('playback:song-ended', {})}
              onError={() => toast('This video cannot be embedded. Skipping…', 'error')}
              onPlay={t => emit('playback:play', { currentTime: t })}
              onPause={t => emit('playback:pause', { currentTime: t })}
              onReady={() => setPlayerReady(true)}
            />

            {/* Activity Log */}
            <ActivityLog log={room.activityLog} />
          </div>

          {/* Player Controls */}
          <PlayerControls
            currentSong={currentSong}
            playbackState={room.playbackState}
            canControl={canControl}
            currentTime={currentTime}
            queueLength={room.playlist.length}
            currentIndex={room.currentSongIndex}
            onPlay={() => emit('playback:play', { currentTime })}
            onPause={() => emit('playback:pause', { currentTime })}
            onSkip={handleSkip}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={v => setVolume(v)}
            shuffle={shuffle}
            onShuffleToggle={() => setShuffle(s => !s)}
            repeat={repeat}
            onRepeatToggle={handleRepeatToggle}
          />
        </div>

        {/* RIGHT: Users + Chat */}
        <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          {/* Users List - top half */}
          <div style={{ flex: '0 0 auto', maxHeight: '35%', borderBottom: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <UsersList
              users={room.users}
              adminId={room.admin}
              currentUserId={user?._id || ''}
              controlledBy={room.controlledBy}
              speakingUsers={speakingUsers}
              canControl={isAdmin}
              onGiveControl={uid => emit('admin:give-control', { targetUserId: uid })}
              onRemoveUser={uid => emit('admin:remove-user', { targetUserId: uid })}
            />
          </div>

          {/* Voice Controls */}
          <VoiceControls
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onJoinVoice={handleJoinVoice}
            isJoined={voiceJoined}
            micError={micError}
          />

          {/* Chat / Activity Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {(['chat','activity'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                flex: 1, padding: '8px 0', fontWeight: 600, fontSize: 12, background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === t ? 'var(--accent)' : 'transparent'}`,
                color: activeTab === t ? 'var(--accent-light)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}>
                {t === 'chat' ? '💬 Chat' : '📋 Log'}
              </button>
            ))}
          </div>

          {/* Chat Panel */}
          <div style={{ flex: 1, overflow: 'hidden', display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column' }}>
            <ChatPanel
              messages={messages}
              currentUserId={user?._id || ''}
              onSend={text => socket?.emit('chat:message', { roomCode, text })}
            />
          </div>

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {room.activityLog.map((item, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  {item.message}
                  <span style={{ float: 'right', color: 'var(--text-muted)' }}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {room.activityLog.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>No activity yet</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .mobile-tabs { display: flex !important; background: var(--bg-card); border-bottom: 1px solid var(--border); }
        }
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
