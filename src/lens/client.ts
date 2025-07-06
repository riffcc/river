import { LensService, Site, Release, User } from '@riffcc/lens-sdk';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  RiverProject, 
  CollaborationSession, 
  SessionParticipant,
  EditOperation,
  SyncMessage,
  CollaboratorInfo
} from './types';

export interface LensClientConfig {
  networkId: string;
  bootstrapPeers: string[];
}

export class RiverLensClient extends EventEmitter {
  private lens: LensService;
  private config: LensClientConfig;
  private currentProject?: RiverProject;
  private session?: CollaborationSession;
  private participants: Map<string, SessionParticipant> = new Map();

  constructor(config: LensClientConfig) {
    super();
    this.config = config;
    this.lens = new LensService();
  }

  /**
   * Initialize the Lens client and connect to the network
   */
  async init(): Promise<void> {
    try {
      await this.lens.init({
        networkId: this.config.networkId,
        bootstrapPeers: this.config.bootstrapPeers,
      });

      // Set up event listeners
      this.setupEventListeners();

      logger.info('River Lens client initialized', {
        networkId: this.config.networkId,
        peerId: this.lens.client?.identity.publicKey.toString(),
      });
    } catch (error) {
      logger.error('Failed to initialize Lens client', error);
      throw new Error(`Lens initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new collaborative project
   */
  async createProject(project: Omit<RiverProject, 'id' | 'siteId' | 'created' | 'updated'>): Promise<RiverProject> {
    if (!this.lens.client) {
      throw new Error('Lens client not initialized');
    }

    // Create a new Lens Site for the project
    const site = new Site(this.lens.client.identity.publicKey);
    await this.lens.openSite(site);
    
    // Store the site reference
    (this.lens as any).site = site;

    const riverProject: RiverProject = {
      id: uuidv4(),
      siteId: site.address.toString(),
      created: new Date(),
      updated: new Date(),
      ...project,
    };

    // Store project metadata as a release
    await this.lens.addRelease({
      name: project.name,
      description: project.description,
      categoryId: 'river-project',
      metadata: {
        projectId: riverProject.id,
        ...riverProject.metadata,
      },
    });

    this.currentProject = riverProject;
    this.emit('project:created', riverProject);

    return riverProject;
  }

  /**
   * Join an existing project
   */
  async joinProject(siteAddress: string): Promise<RiverProject> {
    if (!this.lens.client) {
      throw new Error('Lens client not initialized');
    }

    // Open the site
    const site = await this.lens.openSiteByAddress(siteAddress);
    
    // Store the site reference
    (this.lens as any).site = site;
    
    // Get project metadata from releases
    const releases = await this.lens.getReleases({ categoryId: 'river-project' });
    const projectRelease = releases[0]; // Assuming one project per site

    if (!projectRelease || !projectRelease.metadata) {
      throw new Error('Project metadata not found');
    }

    const riverProject: RiverProject = {
      id: projectRelease.metadata.projectId,
      name: projectRelease.name,
      description: projectRelease.description,
      siteId: siteAddress,
      created: new Date(projectRelease.created),
      updated: new Date(projectRelease.updated || projectRelease.created),
      metadata: {
        framerate: projectRelease.metadata.framerate,
        resolution: projectRelease.metadata.resolution,
        format: projectRelease.metadata.format,
        collaborators: projectRelease.metadata.collaborators || [],
      },
    };

    this.currentProject = riverProject;
    this.emit('project:joined', riverProject);

    return riverProject;
  }

  /**
   * Start a collaboration session
   */
  async startSession(): Promise<CollaborationSession> {
    if (!this.currentProject) {
      throw new Error('No project loaded');
    }

    if (!this.lens.client) {
      throw new Error('Lens client not initialized');
    }

    const session: CollaborationSession = {
      projectId: this.currentProject.id,
      sessionId: uuidv4(),
      participants: [{
        peerId: this.lens.client.identity.publicKey.toString(),
        status: 'active',
        lastSeen: new Date(),
      }],
      startedAt: new Date(),
      active: true,
    };

    this.session = session;
    this.broadcastMessage({
      type: 'state',
      projectId: this.currentProject.id,
      userId: this.lens.client.identity.publicKey.toString(),
      timestamp: new Date(),
      data: { session },
    });

    this.emit('session:started', session);
    return session;
  }

  /**
   * Send an edit operation to all participants
   */
  async sendOperation(operation: Omit<EditOperation, 'id' | 'timestamp' | 'userId'>): Promise<void> {
    if (!this.session || !this.lens.client) {
      throw new Error('No active session');
    }

    const fullOperation: EditOperation = {
      ...operation,
      id: uuidv4(),
      timestamp: new Date(),
      userId: this.lens.client.identity.publicKey.toString(),
    };

    await this.broadcastMessage({
      type: 'operation',
      projectId: this.currentProject!.id,
      userId: this.lens.client.identity.publicKey.toString(),
      timestamp: new Date(),
      data: fullOperation,
    });

    this.emit('operation:sent', fullOperation);
  }

  /**
   * Update cursor position
   */
  async updateCursor(position: { timestamp: number; trackIndex?: number; tool?: string }): Promise<void> {
    if (!this.session || !this.lens.client) {
      throw new Error('No active session');
    }

    await this.broadcastMessage({
      type: 'cursor',
      projectId: this.currentProject!.id,
      userId: this.lens.client.identity.publicKey.toString(),
      timestamp: new Date(),
      data: position,
    });
  }

  /**
   * Add a collaborator to the project
   */
  async addCollaborator(peerId: string, role: 'admin' | 'member' | 'guest' = 'member'): Promise<void> {
    if (!this.currentProject || !this.lens.site) {
      throw new Error('No project loaded');
    }

    // Add user to Lens site with appropriate role
    const lensRole = this.mapRoleToLens(role);
    await this.lens.addUser(peerId, lensRole);

    // Update project metadata
    const collaborator: CollaboratorInfo = {
      peerId,
      publicKey: peerId,
      role,
      joinedAt: new Date(),
    };

    this.currentProject.metadata.collaborators.push(collaborator);
    this.emit('collaborator:added', collaborator);
  }

  /**
   * Get all collaborators
   */
  getCollaborators(): CollaboratorInfo[] {
    return this.currentProject?.metadata.collaborators || [];
  }

  /**
   * Get active participants in the current session
   */
  getParticipants(): SessionParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Create an invite link for the project
   */
  async createInviteLink(role: 'admin' | 'member' | 'guest' = 'member'): Promise<string> {
    if (!this.currentProject) {
      throw new Error('No project loaded');
    }

    // Create invite link with project site address and role
    const baseUrl = 'river://join';
    const params = new URLSearchParams({
      site: this.currentProject.siteId,
      role,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Close the current session
   */
  async closeSession(): Promise<void> {
    if (!this.session) {
      return;
    }

    this.session.active = false;
    this.broadcastMessage({
      type: 'state',
      projectId: this.currentProject!.id,
      userId: this.lens.client!.identity.publicKey.toString(),
      timestamp: new Date(),
      data: { sessionClosed: true },
    });

    this.session = undefined;
    this.participants.clear();
    this.emit('session:closed');
  }

  /**
   * Disconnect from the network
   */
  async disconnect(): Promise<void> {
    if (this.session) {
      await this.closeSession();
    }

    if (this.lens.client) {
      await this.lens.stop();
    }

    this.emit('disconnected');
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.lens.client) return;

    // Listen for incoming messages
    this.lens.on('message', (message: any) => {
      this.handleIncomingMessage(message);
    });

    // Listen for peer events
    this.lens.on('peer:connected', (peerId: string) => {
      logger.debug('Peer connected', { peerId });
      this.emit('peer:connected', peerId);
    });

    this.lens.on('peer:disconnected', (peerId: string) => {
      logger.debug('Peer disconnected', { peerId });
      this.updateParticipantStatus(peerId, 'disconnected');
      this.emit('peer:disconnected', peerId);
    });
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      const syncMessage = message as SyncMessage;

      switch (syncMessage.type) {
        case 'operation':
          this.emit('operation:received', syncMessage.data);
          break;

        case 'cursor':
          this.updateParticipantCursor(syncMessage.userId, syncMessage.data);
          break;

        case 'state':
          if (syncMessage.data.session) {
            this.handleSessionUpdate(syncMessage.data.session);
          }
          break;

        case 'chat':
          this.emit('chat:message', {
            userId: syncMessage.userId,
            message: syncMessage.data,
            timestamp: syncMessage.timestamp,
          });
          break;
      }
    } catch (error) {
      logger.error('Error handling incoming message', error);
    }
  }

  private async broadcastMessage(message: SyncMessage): Promise<void> {
    if (!this.lens.site) {
      throw new Error('No site loaded');
    }

    // Broadcast to all peers in the site
    await this.lens.broadcast(message);
  }

  private updateParticipantStatus(peerId: string, status: 'active' | 'idle' | 'disconnected'): void {
    const participant = this.participants.get(peerId);
    if (participant) {
      participant.status = status;
      participant.lastSeen = new Date();
      this.emit('participant:updated', participant);
    }
  }

  private updateParticipantCursor(userId: string, cursor: any): void {
    let participant = this.participants.get(userId);
    if (!participant) {
      participant = {
        peerId: userId,
        status: 'active',
        lastSeen: new Date(),
      };
      this.participants.set(userId, participant);
    }

    participant.cursor = cursor;
    participant.lastSeen = new Date();
    this.emit('cursor:updated', { userId, cursor });
  }

  private handleSessionUpdate(session: CollaborationSession): void {
    // Update participant list
    for (const participant of session.participants) {
      this.participants.set(participant.peerId, participant);
    }
    this.emit('session:updated', session);
  }

  private mapRoleToLens(role: 'admin' | 'member' | 'guest'): 'admin' | 'write' | 'read' {
    switch (role) {
      case 'admin':
        return 'admin';
      case 'member':
        return 'write';
      case 'guest':
        return 'read';
    }
  }
}