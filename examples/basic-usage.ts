import { 
  RiverLensClient, 
  TAMSClient, 
  IPFSAdapter,
  TimelineManager,
  FlowModel,
  SourceModel,
  TimestampUtils,
  config
} from '../src';

async function main() {
  console.log('🌊 River - Collaborative Video Editor Example\n');

  // 1. Initialize IPFS storage
  console.log('1. Setting up IPFS storage...');
  const ipfsAdapter = new IPFSAdapter({
    host: config.ipfs.host,
    port: config.ipfs.port,
    protocol: config.ipfs.protocol
  });

  // 2. Initialize TAMS client
  console.log('2. Initializing TAMS client...');
  const tamsClient = new TAMSClient({
    apiUrl: config.tams.apiUrl,
    apiKey: config.tams.apiKey || '',
    storage: ipfsAdapter
  });

  // 3. Create a source (abstract content)
  console.log('3. Creating a media source...');
  const source = new SourceModel({
    label: 'My First Video',
    description: 'A sample video for testing River'
  });

  // 4. Create a flow (concrete representation)
  console.log('4. Creating a flow from the source...');
  const flow = new FlowModel({
    sourceId: source.id,
    label: 'HD Version',
    mediaType: 'video/mp4'
  });

  // Add a segment to the flow
  flow.addSegment({
    start: TimestampUtils.create(0, 0),
    end: TimestampUtils.create(10, 0), // 10 seconds
    resourceId: 'sample-video-resource-id' // This would be an IPFS CID in real usage
  });

  // 5. Initialize Lens client for collaboration
  console.log('5. Setting up peer-to-peer collaboration...');
  const lensClient = new RiverLensClient({
    networkId: config.lens.networkId,
    bootstrapPeers: config.lens.bootstrapPeers
  });

  await lensClient.init();

  // 6. Create a collaborative project
  console.log('6. Creating a collaborative project...');
  const project = await lensClient.createProject({
    name: 'My First River Project',
    description: 'Testing River collaborative editing',
    metadata: {
      framerate: 25,
      resolution: { width: 1920, height: 1080 },
      format: 'video',
      collaborators: []
    }
  });

  console.log(`   Project created with ID: ${project.id}`);
  console.log(`   Site ID: ${project.siteId}`);

  // 7. Create a timeline
  console.log('7. Creating a timeline...');
  const timeline = {
    id: 'timeline-1',
    projectId: project.id,
    duration: TimestampUtils.create(0, 0),
    tracks: [],
    markers: [],
    created: new Date(),
    updated: new Date()
  };

  const timelineManager = new TimelineManager(timeline);

  // 8. Add tracks
  console.log('8. Adding video and audio tracks...');
  const videoTrack = timelineManager.addTrack({
    name: 'Video Track 1',
    type: 'video',
    index: 0,
    muted: false,
    locked: false,
    visible: true
  });

  const audioTrack = timelineManager.addTrack({
    name: 'Audio Track 1',
    type: 'audio',
    index: 1,
    muted: false,
    locked: false,
    visible: true
  });

  // 9. Add a clip to the timeline
  console.log('9. Adding a clip to the timeline...');
  const clip = timelineManager.addClip(videoTrack.id, {
    sourceId: source.id,
    flowId: flow.id,
    timelineRange: {
      start: TimestampUtils.create(0, 0),
      end: TimestampUtils.create(5, 0) // 5 seconds on timeline
    },
    sourceRange: {
      start: TimestampUtils.create(2, 0), // Start from 2 seconds in source
      end: TimestampUtils.create(7, 0)   // End at 7 seconds in source
    },
    speed: 1.0,
    effects: []
  });

  console.log(`   Clip added: ${clip?.id}`);

  // 10. Start a collaboration session
  console.log('10. Starting collaboration session...');
  const session = await lensClient.startSession();
  console.log(`    Session started: ${session.sessionId}`);

  // 11. Create an invite link
  const inviteLink = await lensClient.createInviteLink('member');
  console.log(`\n✅ Project ready for collaboration!`);
  console.log(`📋 Share this link with collaborators: ${inviteLink}`);

  // 12. Simulate an edit operation
  console.log('\n11. Simulating collaborative edit...');
  await lensClient.sendOperation({
    type: 'add_clip',
    data: {
      trackId: audioTrack.id,
      clipData: {
        sourceId: source.id,
        flowId: flow.id,
        timelineRange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(5, 0)
        }
      }
    }
  });

  console.log('   Edit operation sent to collaborators');

  // Show timeline state
  console.log('\n📊 Timeline Summary:');
  console.log(`   Duration: ${TimestampUtils.toSeconds(timelineManager.getDuration())} seconds`);
  console.log(`   Tracks: ${timelineManager.getTracks().length}`);
  console.log(`   Total clips: ${timelineManager.getTracks().reduce((sum, track) => sum + track.clips.length, 0)}`);

  // Clean up
  console.log('\n12. Cleaning up...');
  await lensClient.closeSession();
  await lensClient.disconnect();

  console.log('\n✨ Example completed successfully!');
}

// Run the example
main().catch(console.error);