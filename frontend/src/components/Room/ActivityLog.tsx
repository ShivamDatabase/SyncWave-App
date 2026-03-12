'use client';

interface ActivityItem {
  type: string;
  message: string;
  user: { name: string };
  createdAt: string;
}

const iconMap: Record<string, string> = {
  join: '🟢', leave: '🔴', add: '🎵', remove: '🗑️', skip: '⏭',
  kick: '👢', control: '🎮', default: '📝',
};

export default function ActivityLog({ log }: { log: ActivityItem[] }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
        📋 Room Activity
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {log.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>No activity yet</div>
        )}
        {log.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12 }}>
            <span style={{ flexShrink: 0 }}>{iconMap[item.type] || iconMap.default}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{item.message}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
