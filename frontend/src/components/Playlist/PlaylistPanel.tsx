'use client';
import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddSongModal from './AddSongModal';

interface Song {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  addedBy: { _id: string; name: string };
  likes: string[];
  duration?: string;
}

interface Props {
  playlist: Song[];
  currentSongIndex: number;
  canControl: boolean;
  userId: string;
  onAdd: (song: any) => void;
  onRemove: (songId: string) => void;
  onReorder: (from: number, to: number) => void;
  onLike: (songId: string) => void;
  onPlaySong: (index: number) => void;
}

function SortableItem({ song, index, isActive, canControl, userId, onRemove, onLike, onPlay }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  const liked = song.likes.includes(userId);

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition: transition ?? 'background 0.15s, border-color 0.15s',
      opacity: isDragging ? 0.5 : 1,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      borderRadius: 8,
      background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
      border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
      cursor: 'default',
    }} className="fade-in">
      {/* Drag Handle */}
      {canControl && (
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>⠿</span>
      )}

      {/* Thumbnail */}
      <img src={song.thumbnail || `https://img.youtube.com/vi/${song.youtubeId}/default.jpg`}
        alt="" style={{ width: 44, height: 30, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => canControl && onPlay(index)}>
        <div style={{
          fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: isActive ? 'var(--accent-light)' : 'var(--text-primary)',
        }}>{song.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {song.addedBy?.name}</div>
      </div>

      {/* Like */}
      <button className="btn-ghost" onClick={() => onLike(song.id)} style={{
        color: liked ? '#f59e0b' : 'var(--text-muted)',
        fontSize: 13, padding: '4px 6px',
      }}>
        ♥ {song.likes.length}
      </button>

      {/* Remove */}
      {canControl && (
        <button className="btn-ghost" onClick={() => onRemove(song.id)}
          style={{ color: 'var(--danger)', padding: '4px 6px', fontSize: 13 }}>✕</button>
      )}
    </div>
  );
}

export default function PlaylistPanel({ playlist, currentSongIndex, canControl, userId, onAdd, onRemove, onReorder, onLike, onPlaySong }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = playlist.findIndex(s => s.id === active.id);
    const to = playlist.findIndex(s => s.id === over.id);
    if (from !== -1 && to !== -1) onReorder(from, to);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>🎵 Queue ({playlist.length})</span>
        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowAddModal(true)}>
          + Add Song
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {playlist.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎶</div>
            <div>Queue is empty</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Add some songs to get started!</div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={playlist.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {playlist.map((song, i) => (
                <SortableItem
                  key={song.id} song={song} index={i}
                  isActive={i === currentSongIndex}
                  canControl={canControl} userId={userId}
                  onRemove={onRemove} onLike={onLike} onPlay={onPlaySong}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showAddModal && <AddSongModal onAdd={onAdd} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
