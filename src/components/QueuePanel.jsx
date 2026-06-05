import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Trash2, GripVertical, ListMusic } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTrackItem({ track, index, isActive, onPlay, onRemove, formatDuration }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`queue-item${isActive ? ' queue-item--active' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="queue-drag-handle"
        aria-label="Réordonner"
      >
        <GripVertical size={14} />
      </div>

      {/* Cover */}
      <img
        src={track.coverUrl || '/default-cover.jpg'}
        alt={track.title}
        className="queue-item-cover"
        onClick={() => onPlay(track)}
        style={{ cursor: 'pointer' }}
        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=100'; }}
      />

      {/* Info */}
      <div className="queue-item-info" onClick={() => onPlay(track)} style={{ cursor: 'pointer' }}>
        <span className="queue-item-title">{track.title}</span>
        <span className="queue-item-artist">{track.artistName}</span>
      </div>

      {/* Duration */}
      {track.duration > 0 && (
        <span className="queue-item-duration">{formatDuration(track.duration)}</span>
      )}

      {/* Remove button */}
      <button
        className="queue-item-remove"
        onClick={() => onRemove(index)}
        aria-label={`Retirer ${track.title} de la file`}
        title="Retirer"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function QueuePanel({ isOpen, onClose }) {
  const {
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    formatDuration,
  } = useContext(AppContext);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = queue.findIndex(t => t.id === active.id);
    const newIndex = queue.findIndex(t => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderQueue(arrayMove(queue, oldIndex, newIndex));
    }
  };

  const upcomingTracks = queue.slice(queueIndex + 1);
  const playedTracks = queue.slice(0, queueIndex);

  if (!isOpen) return null;

  return (
    <div className="queue-panel" aria-label="File d'attente">
      {/* Header */}
      <div className="queue-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ListMusic size={18} color="var(--color-primary)" />
          <span className="queue-panel-title">File d'attente</span>
          <span className="queue-badge">{upcomingTracks.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {queue.length > 0 && (
            <button
              className="queue-clear-btn"
              onClick={clearQueue}
              aria-label="Vider la file d'attente"
              title="Vider la file"
            >
              <Trash2 size={14} />
              <span>Vider</span>
            </button>
          )}
          <button
            className="queue-close-btn"
            onClick={onClose}
            aria-label="Fermer la file d'attente"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Current track */}
      {currentTrack && (
        <div className="queue-section">
          <p className="queue-section-label">En cours</p>
          <div className="queue-item queue-item--active queue-item--current">
            <img
              src={currentTrack.coverUrl || '/default-cover.jpg'}
              alt={currentTrack.title}
              className="queue-item-cover"
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=100'; }}
            />
            <div className="queue-item-info">
              <span className="queue-item-title">{currentTrack.title}</span>
              <span className="queue-item-artist">{currentTrack.artistName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingTracks.length > 0 && (
        <div className="queue-section queue-section--scroll">
          <p className="queue-section-label">À suivre ({upcomingTracks.length})</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={upcomingTracks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {upcomingTracks.map((track, i) => (
                <SortableTrackItem
                  key={track.id}
                  track={track}
                  index={queueIndex + 1 + i}
                  isActive={false}
                  onPlay={(t) => playTrack(t, queue)}
                  onRemove={(idx) => removeFromQueue(idx)}
                  formatDuration={formatDuration}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Empty state */}
      {upcomingTracks.length === 0 && (
        <div className="queue-empty">
          <ListMusic size={36} style={{ opacity: 0.3 }} />
          <p>La file d'attente est vide</p>
          <p style={{ fontSize: 12, opacity: 0.5 }}>Faites clic droit sur un morceau pour l'ajouter</p>
        </div>
      )}
    </div>
  );
}
