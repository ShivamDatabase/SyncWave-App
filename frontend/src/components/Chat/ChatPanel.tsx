'use client';
import { useState, useEffect, useRef } from 'react';
import { generateAvatar } from '@/lib/utils';

interface Msg {
  id: string;
  user: { _id: string; name: string; avatar: string };
  text: string;
  createdAt: string;
}

interface Props {
  messages: Msg[];
  currentUserId: string;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, currentUserId, onSend }: Props) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>💬 Chat</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 13 }}>
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map((msg) => {
          const isSelf = msg.user._id === currentUserId;
          return (
            <div key={msg.id} className="fade-in" style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              flexDirection: isSelf ? 'row-reverse' : 'row',
            }}>
              {!isSelf && (
                <img
                  src={msg.user.avatar || generateAvatar(msg.user.name)}
                  alt={msg.user.name}
                  style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).src = generateAvatar(msg.user.name); }}
                />
              )}
              <div style={{ maxWidth: '75%' }}>
                {!isSelf && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 2 }}>
                    {msg.user.name}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px',
                  borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isSelf ? 'var(--accent)' : 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)', marginTop: 2,
                  textAlign: isSelf ? 'right' : 'left', paddingLeft: isSelf ? 0 : 2,
                }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          maxLength={500}
        />
        <button className="btn btn-primary" style={{ flexShrink: 0, padding: '9px 14px' }} onClick={handleSend}>
          ➤
        </button>
      </div>
    </div>
  );
}
