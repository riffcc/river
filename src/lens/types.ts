/**
 * Types for Lens SDK integration
 */

export interface RiverProject {
  id: string;
  name: string;
  description?: string;
  siteId: string; // Lens Site ID
  created: Date;
  updated: Date;
  metadata: ProjectMetadata;
}

export interface ProjectMetadata {
  framerate: number;
  resolution: {
    width: number;
    height: number;
  };
  format: 'video' | 'audio' | 'mixed';
  collaborators: CollaboratorInfo[];
}

export interface CollaboratorInfo {
  peerId: string;
  publicKey: string;
  name?: string;
  role: 'admin' | 'member' | 'guest';
  joinedAt: Date;
}

export interface CollaborationSession {
  projectId: string;
  sessionId: string;
  participants: SessionParticipant[];
  startedAt: Date;
  active: boolean;
}

export interface SessionParticipant {
  peerId: string;
  name?: string;
  status: 'active' | 'idle' | 'disconnected';
  lastSeen: Date;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  timestamp: number; // Timeline position in nanoseconds
  trackIndex?: number;
  tool?: string;
}

export interface EditOperation {
  id: string;
  type: 'add_clip' | 'remove_clip' | 'move_clip' | 'split_clip' | 'add_effect' | 'modify_effect';
  timestamp: Date;
  userId: string;
  data: any; // Operation-specific data
  flowId?: string;
  sourceId?: string;
}

export interface SyncMessage {
  type: 'operation' | 'cursor' | 'state' | 'chat';
  projectId: string;
  userId: string;
  timestamp: Date;
  data: any;
}