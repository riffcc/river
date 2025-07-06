import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RiverLensClient } from './client';
import { LensService } from '@riffcc/lens-sdk';
import { RiverProject } from './types';

// Mock the Lens SDK
vi.mock('@riffcc/lens-sdk', () => ({
  LensService: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    openSite: vi.fn(),
    openSiteByAddress: vi.fn(),
    addRelease: vi.fn(),
    getReleases: vi.fn(),
    addUser: vi.fn(),
    broadcast: vi.fn(),
    stop: vi.fn(),
    on: vi.fn(),
    client: {
      identity: {
        publicKey: {
          toString: () => 'test-public-key',
        },
      },
    },
    site: null, // Will be set when project is created/joined
  })),
  Site: vi.fn().mockImplementation((publicKey) => ({
    address: {
      toString: () => 'test-site-address',
    },
  })),
}));

describe('RiverLensClient', () => {
  let client: RiverLensClient;
  let mockLensService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    client = new RiverLensClient({
      networkId: 'test-network',
      bootstrapPeers: ['/dns4/test.peer/tcp/4001/p2p/QmTest'],
    });

    // Get the mock instance
    mockLensService = (client as any).lens;
  });

  // Helper function to setup a project with site
  const setupProjectWithSite = async () => {
    // Mock openSite to set the site property
    mockLensService.openSite.mockImplementation((site: any) => {
      mockLensService.site = site;
      return Promise.resolve();
    });

    return await client.createProject({
      name: 'Test Project',
      metadata: {
        framerate: 25,
        resolution: { width: 1920, height: 1080 },
        format: 'video',
        collaborators: [],
      },
    });
  };

  describe('init', () => {
    it('should initialize the Lens client', async () => {
      await client.init();

      expect(mockLensService.init).toHaveBeenCalledWith({
        networkId: 'test-network',
        bootstrapPeers: ['/dns4/test.peer/tcp/4001/p2p/QmTest'],
      });
    });

    it('should set up event listeners', async () => {
      await client.init();

      expect(mockLensService.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockLensService.on).toHaveBeenCalledWith('peer:connected', expect.any(Function));
      expect(mockLensService.on).toHaveBeenCalledWith('peer:disconnected', expect.any(Function));
    });

    it('should throw error on initialization failure', async () => {
      mockLensService.init.mockRejectedValue(new Error('Connection failed'));

      await expect(client.init()).rejects.toThrow('Lens initialization failed: Connection failed');
    });
  });

  describe('createProject', () => {
    beforeEach(async () => {
      await client.init();
    });

    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        metadata: {
          framerate: 25,
          resolution: { width: 1920, height: 1080 },
          format: 'video' as const,
          collaborators: [],
        },
      };

      // Mock openSite to set the site property
      mockLensService.openSite.mockImplementation((site: any) => {
        mockLensService.site = site;
        return Promise.resolve();
      });

      const project = await client.createProject(projectData);

      expect(project.id).toBeTruthy();
      expect(project.name).toBe('Test Project');
      expect(project.siteId).toBe('test-site-address');
      expect(project.metadata.framerate).toBe(25);
      expect(mockLensService.openSite).toHaveBeenCalled();
      expect(mockLensService.addRelease).toHaveBeenCalled();
      expect(mockLensService.site).toBeTruthy();
    });

    it('should emit project:created event', async () => {
      const projectCreatedHandler = vi.fn();
      client.on('project:created', projectCreatedHandler);

      // Mock openSite to set the site property
      mockLensService.openSite.mockImplementation((site: any) => {
        mockLensService.site = site;
        return Promise.resolve();
      });

      await client.createProject({
        name: 'Test Project',
        metadata: {
          framerate: 25,
          resolution: { width: 1920, height: 1080 },
          format: 'video',
          collaborators: [],
        },
      });

      expect(projectCreatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Project',
        })
      );
    });
  });

  describe('joinProject', () => {
    beforeEach(async () => {
      await client.init();
    });

    it('should join an existing project', async () => {
      const mockRelease = {
        name: 'Existing Project',
        description: 'An existing project',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: {
          projectId: 'existing-project-id',
          framerate: 30,
          resolution: { width: 1920, height: 1080 },
          format: 'video',
          collaborators: [],
        },
      };

      mockLensService.getReleases.mockResolvedValue([mockRelease]);

      const project = await client.joinProject('existing-site-address');

      expect(project.id).toBe('existing-project-id');
      expect(project.name).toBe('Existing Project');
      expect(project.siteId).toBe('existing-site-address');
      expect(mockLensService.openSiteByAddress).toHaveBeenCalledWith('existing-site-address');
    });

    it('should throw error if project metadata not found', async () => {
      mockLensService.getReleases.mockResolvedValue([]);

      await expect(client.joinProject('site-address')).rejects.toThrow('Project metadata not found');
    });
  });

  describe('collaboration session', () => {
    let testProject: RiverProject;

    beforeEach(async () => {
      await client.init();
      testProject = await setupProjectWithSite();
    });

    describe('startSession', () => {
      it('should start a collaboration session', async () => {
        const session = await client.startSession();

        expect(session.projectId).toBe(testProject.id);
        expect(session.sessionId).toBeTruthy();
        expect(session.active).toBe(true);
        expect(session.participants).toHaveLength(1);
        expect(mockLensService.broadcast).toHaveBeenCalled();
      });

      it('should throw error if no project loaded', async () => {
        const newClient = new RiverLensClient({
          networkId: 'test',
          bootstrapPeers: [],
        });
        await newClient.init();

        await expect(newClient.startSession()).rejects.toThrow('No project loaded');
      });
    });

    describe('sendOperation', () => {
      beforeEach(async () => {
        await client.startSession();
      });

      it('should send an edit operation', async () => {
        const operation = {
          type: 'add_clip' as const,
          data: { clipId: 'clip-123' },
          flowId: 'flow-123',
        };

        await client.sendOperation(operation);

        expect(mockLensService.broadcast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'operation',
            data: expect.objectContaining({
              type: 'add_clip',
              data: { clipId: 'clip-123' },
            }),
          })
        );
      });

      it('should emit operation:sent event', async () => {
        const operationSentHandler = vi.fn();
        client.on('operation:sent', operationSentHandler);

        await client.sendOperation({
          type: 'add_clip',
          data: { clipId: 'clip-123' },
        });

        expect(operationSentHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'add_clip',
          })
        );
      });
    });

    describe('updateCursor', () => {
      beforeEach(async () => {
        await client.startSession();
      });

      it('should update cursor position', async () => {
        await client.updateCursor({
          timestamp: 5000000000,
          trackIndex: 1,
          tool: 'select',
        });

        expect(mockLensService.broadcast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'cursor',
            data: {
              timestamp: 5000000000,
              trackIndex: 1,
              tool: 'select',
            },
          })
        );
      });
    });
  });

  describe('collaborator management', () => {
    beforeEach(async () => {
      await client.init();
      await client.createProject({
        name: 'Test Project',
        metadata: {
          framerate: 25,
          resolution: { width: 1920, height: 1080 },
          format: 'video',
          collaborators: [],
        },
      });
    });

    it('should add a collaborator', async () => {
      // Mock the site property
      (client as any).lens.site = {};

      await client.addCollaborator('peer-123', 'member');

      expect(mockLensService.addUser).toHaveBeenCalledWith('peer-123', 'write');
      
      const collaborators = client.getCollaborators();
      expect(collaborators).toHaveLength(1);
      expect(collaborators[0].peerId).toBe('peer-123');
      expect(collaborators[0].role).toBe('member');
    });

    it('should map roles correctly', async () => {
      (client as any).lens.site = {};

      await client.addCollaborator('admin-peer', 'admin');
      expect(mockLensService.addUser).toHaveBeenCalledWith('admin-peer', 'admin');

      await client.addCollaborator('guest-peer', 'guest');
      expect(mockLensService.addUser).toHaveBeenCalledWith('guest-peer', 'read');
    });

    it('should create invite link', async () => {
      const link = await client.createInviteLink('member');

      expect(link).toContain('river://join');
      expect(link).toContain('site=test-site-address');
      expect(link).toContain('role=member');
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await client.init();
      await client.createProject({
        name: 'Test Project',
        metadata: {
          framerate: 25,
          resolution: { width: 1920, height: 1080 },
          format: 'video',
          collaborators: [],
        },
      });
    });

    it('should close session', async () => {
      await client.startSession();
      
      const sessionClosedHandler = vi.fn();
      client.on('session:closed', sessionClosedHandler);

      await client.closeSession();

      expect(mockLensService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'state',
          data: { sessionClosed: true },
        })
      );
      expect(sessionClosedHandler).toHaveBeenCalled();
    });

    it('should handle disconnect', async () => {
      await client.startSession();
      
      const disconnectedHandler = vi.fn();
      client.on('disconnected', disconnectedHandler);

      await client.disconnect();

      expect(mockLensService.stop).toHaveBeenCalled();
      expect(disconnectedHandler).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await client.init();
      await client.createProject({
        name: 'Test Project',
        metadata: {
          framerate: 25,
          resolution: { width: 1920, height: 1080 },
          format: 'video',
          collaborators: [],
        },
      });
      await client.startSession();
    });

    it('should handle incoming operation messages', async () => {
      const operationReceivedHandler = vi.fn();
      client.on('operation:received', operationReceivedHandler);

      // Get the message handler that was registered
      const messageHandler = mockLensService.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      // Simulate incoming operation message
      messageHandler({
        type: 'operation',
        projectId: 'test-project',
        userId: 'other-user',
        timestamp: new Date(),
        data: {
          type: 'add_clip',
          data: { clipId: 'clip-456' },
        },
      });

      expect(operationReceivedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add_clip',
        })
      );
    });

    it('should handle cursor updates', async () => {
      const cursorUpdatedHandler = vi.fn();
      client.on('cursor:updated', cursorUpdatedHandler);

      const messageHandler = mockLensService.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      messageHandler({
        type: 'cursor',
        projectId: 'test-project',
        userId: 'other-user',
        timestamp: new Date(),
        data: {
          timestamp: 10000000000,
          trackIndex: 2,
        },
      });

      expect(cursorUpdatedHandler).toHaveBeenCalledWith({
        userId: 'other-user',
        cursor: {
          timestamp: 10000000000,
          trackIndex: 2,
        },
      });
    });

    it('should handle peer disconnection', async () => {
      const peerDisconnectedHandler = vi.fn();
      client.on('peer:disconnected', peerDisconnectedHandler);

      // Add a participant first
      const messageHandler = mockLensService.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      messageHandler({
        type: 'state',
        projectId: 'test-project',
        userId: 'other-user',
        timestamp: new Date(),
        data: {
          session: {
            participants: [{
              peerId: 'other-user',
              status: 'active',
              lastSeen: new Date(),
            }],
          },
        },
      });

      // Simulate peer disconnection
      const peerDisconnectHandler = mockLensService.on.mock.calls.find(
        call => call[0] === 'peer:disconnected'
      )?.[1];

      peerDisconnectHandler('other-user');

      expect(peerDisconnectedHandler).toHaveBeenCalledWith('other-user');
    });
  });
});