import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'eventemitter3';
import { 
  Timeline, 
  Track, 
  Clip, 
  Marker,
  EditCommand,
  EditCommandType,
  ClipSelection,
  TimelineState,
  Transition,
  Effect
} from './types';
import { Timestamp, TimeRange } from '../models/types';
import { TimestampUtils } from '../models/timestamp';
import { logger } from '../utils/logger';

export class TimelineManager extends EventEmitter {
  private timeline: Timeline;
  private state: TimelineState;
  private history: EditCommand[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 100;

  constructor(timeline: Timeline) {
    super();
    this.timeline = timeline;
    this.state = {
      playhead: TimestampUtils.create(0, 0),
      selection: [],
      zoomLevel: 100, // 100 pixels per second
      scrollPosition: 0,
    };
  }

  // Getters

  getTimeline(): Timeline {
    return this.timeline;
  }

  getState(): TimelineState {
    return this.state;
  }

  getDuration(): Timestamp {
    return this.timeline.duration;
  }

  getTracks(): Track[] {
    return this.timeline.tracks;
  }

  getTrack(trackId: string): Track | undefined {
    return this.timeline.tracks.find(t => t.id === trackId);
  }

  getClip(clipId: string): Clip | undefined {
    for (const track of this.timeline.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) return clip;
    }
    return undefined;
  }

  // Track operations

  addTrack(track: Omit<Track, 'id' | 'clips'>): Track {
    const newTrack: Track = {
      ...track,
      id: uuidv4(),
      clips: [],
    };

    // Insert at the specified index
    this.timeline.tracks.splice(track.index, 0, newTrack);
    
    // Update indices of tracks after the inserted one
    for (let i = track.index + 1; i < this.timeline.tracks.length; i++) {
      this.timeline.tracks[i].index = i;
    }

    this.executeCommand({
      id: uuidv4(),
      type: 'add_track',
      timestamp: new Date(),
      data: { track: newTrack },
      undoData: { trackId: newTrack.id },
    });

    this.updateTimeline();
    this.emit('track:added', newTrack);
    return newTrack;
  }

  removeTrack(trackId: string): boolean {
    const trackIndex = this.timeline.tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return false;

    const track = this.timeline.tracks[trackIndex];
    this.timeline.tracks.splice(trackIndex, 1);

    // Update indices
    for (let i = trackIndex; i < this.timeline.tracks.length; i++) {
      this.timeline.tracks[i].index = i;
    }

    this.executeCommand({
      id: uuidv4(),
      type: 'remove_track',
      timestamp: new Date(),
      data: { trackId },
      undoData: { track, index: trackIndex },
    });

    this.updateTimeline();
    this.emit('track:removed', track);
    return true;
  }

  reorderTracks(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    
    const [track] = this.timeline.tracks.splice(fromIndex, 1);
    this.timeline.tracks.splice(toIndex, 0, track);

    // Update all track indices
    this.timeline.tracks.forEach((t, i) => {
      t.index = i;
    });

    this.executeCommand({
      id: uuidv4(),
      type: 'reorder_tracks',
      timestamp: new Date(),
      data: { fromIndex, toIndex },
      undoData: { fromIndex: toIndex, toIndex: fromIndex },
    });

    this.updateTimeline();
    this.emit('tracks:reordered', { fromIndex, toIndex });
  }

  // Clip operations

  addClip(
    trackId: string,
    clip: Omit<Clip, 'id' | 'trackId'>
  ): Clip | null {
    const track = this.getTrack(trackId);
    if (!track) return null;

    // Validate clip doesn't overlap with existing clips
    if (this.hasOverlap(track, clip.timelineRange)) {
      throw new Error('Clip overlaps with existing clips');
    }

    const newClip: Clip = {
      ...clip,
      id: uuidv4(),
      trackId,
    };

    // Insert clip in sorted order
    const insertIndex = this.findClipInsertIndex(track, newClip.timelineRange.start);
    track.clips.splice(insertIndex, 0, newClip);

    this.executeCommand({
      id: uuidv4(),
      type: 'add_clip',
      timestamp: new Date(),
      data: { clip: newClip },
      undoData: { clipId: newClip.id },
    });

    this.updateTimeline();
    this.emit('clip:added', newClip);
    return newClip;
  }

  removeClip(clipId: string): boolean {
    for (const track of this.timeline.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex !== -1) {
        const [clip] = track.clips.splice(clipIndex, 1);
        
        this.executeCommand({
          id: uuidv4(),
          type: 'remove_clip',
          timestamp: new Date(),
          data: { clipId },
          undoData: { clip, trackId: track.id, index: clipIndex },
        });

        this.updateTimeline();
        this.emit('clip:removed', clip);
        return true;
      }
    }
    return false;
  }

  moveClip(
    clipId: string,
    newTrackId: string,
    newTimelineStart: Timestamp
  ): boolean {
    const clip = this.getClip(clipId);
    if (!clip) return false;

    const sourceTrack = this.getTrack(clip.trackId);
    const targetTrack = this.getTrack(newTrackId);
    if (!sourceTrack || !targetTrack) return false;

    // Calculate new timeline range
    const duration = TimestampUtils.duration(clip.timelineRange);
    const newTimelineRange: TimeRange = {
      start: newTimelineStart,
      end: TimestampUtils.add(newTimelineStart, duration),
    };

    // Check for overlaps in target position
    if (this.hasOverlap(targetTrack, newTimelineRange, clipId)) {
      throw new Error('Cannot move clip: overlaps with existing clips');
    }

    const oldTrackId = clip.trackId;
    const oldTimelineRange = clip.timelineRange;

    // Remove from source track
    sourceTrack.clips = sourceTrack.clips.filter(c => c.id !== clipId);

    // Update clip
    clip.trackId = newTrackId;
    clip.timelineRange = newTimelineRange;

    // Add to target track
    const insertIndex = this.findClipInsertIndex(targetTrack, newTimelineStart);
    targetTrack.clips.splice(insertIndex, 0, clip);

    this.executeCommand({
      id: uuidv4(),
      type: 'move_clip',
      timestamp: new Date(),
      data: { clipId, newTrackId, newTimelineStart },
      undoData: { clipId, oldTrackId, oldTimelineRange },
    });

    this.updateTimeline();
    this.emit('clip:moved', { clip, oldTrackId, newTrackId });
    return true;
  }

  trimClip(
    clipId: string,
    newSourceRange?: TimeRange,
    newTimelineRange?: TimeRange
  ): boolean {
    const clip = this.getClip(clipId);
    if (!clip) return false;

    const track = this.getTrack(clip.trackId);
    if (!track) return false;

    const oldSourceRange = clip.sourceRange;
    const oldTimelineRange = clip.timelineRange;

    // Validate new ranges
    if (newTimelineRange && this.hasOverlap(track, newTimelineRange, clipId)) {
      throw new Error('Cannot trim clip: overlaps with existing clips');
    }

    if (newSourceRange) {
      clip.sourceRange = newSourceRange;
    }

    if (newTimelineRange) {
      clip.timelineRange = newTimelineRange;
      // Re-sort clips if timeline position changed
      track.clips.sort((a, b) => 
        TimestampUtils.compare(a.timelineRange.start, b.timelineRange.start)
      );
    }

    this.executeCommand({
      id: uuidv4(),
      type: 'trim_clip',
      timestamp: new Date(),
      data: { clipId, newSourceRange, newTimelineRange },
      undoData: { clipId, oldSourceRange, oldTimelineRange },
    });

    this.updateTimeline();
    this.emit('clip:trimmed', clip);
    return true;
  }

  splitClip(clipId: string, splitPoint: Timestamp): Clip[] | null {
    const clip = this.getClip(clipId);
    if (!clip) return null;

    const track = this.getTrack(clip.trackId);
    if (!track) return null;

    // Validate split point is within clip
    if (!TimestampUtils.isWithinRange(splitPoint, clip.timelineRange)) {
      throw new Error('Split point must be within clip timeline range');
    }

    // Calculate durations
    const firstDuration = TimestampUtils.subtract(splitPoint, clip.timelineRange.start);
    const secondDuration = TimestampUtils.subtract(clip.timelineRange.end, splitPoint);

    // Create two new clips
    const firstClip: Clip = {
      ...clip,
      id: uuidv4(),
      timelineRange: {
        start: clip.timelineRange.start,
        end: splitPoint,
      },
      sourceRange: {
        start: clip.sourceRange.start,
        end: TimestampUtils.add(clip.sourceRange.start, firstDuration),
      },
      transitions: {
        in: clip.transitions?.in,
        out: undefined, // Will be set if there's a transition at split point
      },
    };

    const secondClip: Clip = {
      ...clip,
      id: uuidv4(),
      timelineRange: {
        start: splitPoint,
        end: clip.timelineRange.end,
      },
      sourceRange: {
        start: TimestampUtils.add(clip.sourceRange.start, firstDuration),
        end: clip.sourceRange.end,
      },
      transitions: {
        in: undefined, // Will be set if there's a transition at split point
        out: clip.transitions?.out,
      },
    };

    // Remove original clip
    const clipIndex = track.clips.findIndex(c => c.id === clipId);
    track.clips.splice(clipIndex, 1, firstClip, secondClip);

    this.executeCommand({
      id: uuidv4(),
      type: 'split_clip',
      timestamp: new Date(),
      data: { 
        originalClipId: clipId, 
        splitPoint, 
        firstClipId: firstClip.id, 
        secondClipId: secondClip.id 
      },
      undoData: { 
        originalClip: clip, 
        trackId: track.id, 
        index: clipIndex 
      },
    });

    this.updateTimeline();
    this.emit('clip:split', { original: clip, clips: [firstClip, secondClip] });
    return [firstClip, secondClip];
  }

  // Effect operations

  addEffect(clipId: string, effect: Omit<Effect, 'id'>): Effect | null {
    const clip = this.getClip(clipId);
    if (!clip) return null;

    const newEffect: Effect = {
      ...effect,
      id: uuidv4(),
    };

    clip.effects.push(newEffect);

    this.executeCommand({
      id: uuidv4(),
      type: 'add_effect',
      timestamp: new Date(),
      data: { clipId, effect: newEffect },
      undoData: { clipId, effectId: newEffect.id },
    });

    this.emit('effect:added', { clip, effect: newEffect });
    return newEffect;
  }

  removeEffect(clipId: string, effectId: string): boolean {
    const clip = this.getClip(clipId);
    if (!clip) return false;

    const effectIndex = clip.effects.findIndex(e => e.id === effectId);
    if (effectIndex === -1) return false;

    const [effect] = clip.effects.splice(effectIndex, 1);

    this.executeCommand({
      id: uuidv4(),
      type: 'remove_effect',
      timestamp: new Date(),
      data: { clipId, effectId },
      undoData: { clipId, effect, index: effectIndex },
    });

    this.emit('effect:removed', { clip, effect });
    return true;
  }

  // Marker operations

  addMarker(marker: Omit<Marker, 'id'>): Marker {
    const newMarker: Marker = {
      ...marker,
      id: uuidv4(),
    };

    // Insert in sorted order
    const insertIndex = this.timeline.markers.findIndex(
      m => TimestampUtils.compare(m.timestamp, marker.timestamp) > 0
    );

    if (insertIndex === -1) {
      this.timeline.markers.push(newMarker);
    } else {
      this.timeline.markers.splice(insertIndex, 0, newMarker);
    }

    this.executeCommand({
      id: uuidv4(),
      type: 'add_marker',
      timestamp: new Date(),
      data: { marker: newMarker },
      undoData: { markerId: newMarker.id },
    });

    this.emit('marker:added', newMarker);
    return newMarker;
  }

  removeMarker(markerId: string): boolean {
    const markerIndex = this.timeline.markers.findIndex(m => m.id === markerId);
    if (markerIndex === -1) return false;

    const [marker] = this.timeline.markers.splice(markerIndex, 1);

    this.executeCommand({
      id: uuidv4(),
      type: 'remove_marker',
      timestamp: new Date(),
      data: { markerId },
      undoData: { marker, index: markerIndex },
    });

    this.emit('marker:removed', marker);
    return true;
  }

  // State operations

  setPlayhead(timestamp: Timestamp): void {
    this.state.playhead = timestamp;
    this.emit('playhead:changed', timestamp);
  }

  setSelection(selection: ClipSelection[]): void {
    this.state.selection = selection;
    this.emit('selection:changed', selection);
  }

  setZoomLevel(zoomLevel: number): void {
    this.state.zoomLevel = Math.max(10, Math.min(1000, zoomLevel));
    this.emit('zoom:changed', this.state.zoomLevel);
  }

  // Undo/Redo

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const command = this.history[this.historyIndex];
    this.applyUndo(command);
    this.historyIndex--;

    this.updateTimeline();
    this.emit('undo', command);
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.historyIndex++;
    const command = this.history[this.historyIndex];
    this.applyRedo(command);

    this.updateTimeline();
    this.emit('redo', command);
    return true;
  }

  // Helper methods

  private hasOverlap(
    track: Track, 
    timerange: TimeRange, 
    excludeClipId?: string
  ): boolean {
    return track.clips.some(clip => {
      if (clip.id === excludeClipId) return false;
      
      return TimestampUtils.compare(timerange.start, clip.timelineRange.end) < 0 &&
             TimestampUtils.compare(timerange.end, clip.timelineRange.start) > 0;
    });
  }

  private findClipInsertIndex(track: Track, timestamp: Timestamp): number {
    return track.clips.findIndex(
      clip => TimestampUtils.compare(clip.timelineRange.start, timestamp) > 0
    );
  }

  private executeCommand(command: EditCommand): void {
    // Remove any commands after current index (for redo)
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new command
    this.history.push(command);
    this.historyIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
      this.historyIndex = this.history.length - 1;
    }
  }

  private updateTimeline(): void {
    // Update timeline duration based on clips
    let maxEnd = TimestampUtils.create(0, 0);
    
    for (const track of this.timeline.tracks) {
      for (const clip of track.clips) {
        if (TimestampUtils.compare(clip.timelineRange.end, maxEnd) > 0) {
          maxEnd = clip.timelineRange.end;
        }
      }
    }

    this.timeline.duration = maxEnd;
    this.timeline.updated = new Date();
    
    this.emit('timeline:updated', this.timeline);
  }

  private applyUndo(command: EditCommand): void {
    // Implementation would handle each command type
    // This is a simplified version
    logger.debug('Applying undo', { type: command.type, data: command.undoData });
  }

  private applyRedo(command: EditCommand): void {
    // Implementation would handle each command type
    // This is a simplified version
    logger.debug('Applying redo', { type: command.type, data: command.data });
  }
}