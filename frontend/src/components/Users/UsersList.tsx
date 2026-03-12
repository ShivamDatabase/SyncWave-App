'use client';
import { generateAvatar } from '@/lib/utils';

interface RoomUser {
  _id: string;
  name: string;
  avatar: string;
  socketId: string;
  isMuted?: boolean;
}

interface Props {
  users: RoomUser[];
  adminId: string;
  currentUserId: string;
  controlledBy: string | null;
  speakingUsers: Set<string>;
  canControl: boolean;
  onGiveControl: (userId: string) => void;
  onRemoveUser: (userId: string) => void;
}

export default function UsersList({
  users, adminId, currentUserId, controlledBy, speakingUsers, canControl, onGiveControl, onRemoveUser,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>👥 Listeners ({users.length})</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {users.map(user => {
          const isAdmin = user._id === adminId;
          const isSelf = user._id === currentUserId;
          const isSpeaking = speakingUsers.has(user._id);
          const hasControl = user._id === adminId || user._id === controlledBy;

          return (
            <div key={user._id} className="fade-in" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: isSelf ? 'rgba(124,58,237,0.1)' : 'transparent',
              border: `1px solid ${isSelf ? 'var(--accent)' : 'transparent'}`,
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={user.avatar || generateAvatar(user.name)}
                  alt={user.name}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', objectFit: 'cover',
                    border: `2px solid ${isSpeaking ? 'var(--green)' : 'transparent'}`,
                    boxShadow: isSpeaking ? '0 0 0 3px var(--green-glow)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  className={isSpeaking ? 'speaking-ring' : ''}
                  onError={e => { (e.target as HTMLImageElement).src = generateAvatar(user.name); }}
                />
                {isSpeaking && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: 'var(--green)', border: '2px solid var(--bg-primary)',
                  }} />
                )}
              </div>

              {/* Name & badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}{isSelf ? ' (you)' : ''}
                  </span>
                  {isAdmin && <span className="tag" style={{ fontSize: 10 }}>👑 Admin</span>}
                  {!isAdmin && hasControl && <span className="tag" style={{ fontSize: 10, background: 'rgba(34,197,94,0.15)', color: 'var(--green)' }}>🎮 DJ</span>}
                </div>
              </div>

              {/* Admin actions */}
              {canControl && !isSelf && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {!isAdmin && (
                    <button className="btn-icon tooltip" data-tip={hasControl ? 'Revoke control' : 'Give control'}
                      onClick={() => onGiveControl(user._id)}
                      style={{ width: 28, height: 28, fontSize: 13, background: hasControl ? 'var(--green-glow)' : undefined }}>
                      🎮
                    </button>
                  )}
                  {!isAdmin && (
                    <button className="btn-icon tooltip" data-tip="Remove user"
                      onClick={() => onRemoveUser(user._id)}
                      style={{ width: 28, height: 28, fontSize: 13, background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
