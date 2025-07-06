# River - Collaborative Video/Audio Editor

!! Work in progress, not ready yet.

River is a decentralized, collaborative video and audio editing platform built on the TAMS (Time-addressable Media Store) standard and powered by the Riff.CC Lens SDK for peer-to-peer collaboration.

## 🌊 Overview

River enables real-time collaborative editing of video and audio content without relying on centralized servers. By combining the BBC's TAMS architecture for immutable, time-addressable media storage with Riff.CC's decentralized content management capabilities, River offers a unique approach to media production workflows.

## 🎯 Key Features

- **Real-time Collaboration**: Multiple editors can work on the same project simultaneously
- **Time-addressable Media**: Precise frame-level addressing using TAMS timelines
- **Immutable Media References**: Media once stored cannot be changed, ensuring consistency
- **Decentralized Architecture**: No central server required - works peer-to-peer
- **Copy-on-Write Editing**: Efficient storage through media object reuse
- **Role-based Access Control**: Guest, Member, and Admin roles for project management
- **Content-addressable Storage**: Media is stored and referenced by CID (content identifier)

## 🏗️ Architecture

River combines two powerful technologies:

### TAMS (Time-addressable Media Store)
- Provides immutable, timeline-based media storage
- Enables precise `<flow_id, timestamp>` addressing
- Supports efficient copy-on-write operations
- Separates metadata and media data planes

### Lens SDK
- Handles peer-to-peer synchronization
- Manages collaborative sessions
- Provides content-addressed storage
- Enables federated content sharing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Git with submodule support
- IPFS storage (for media files)
- Modern web browser with WebRTC support

### Installation

```bash
# Clone the repository with submodules
git clone --recursive https://github.com/riffcc/river.git
cd river

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# TAMS Configuration
TAMS_API_URL=http://localhost:4010

# IPFS Configuration (optional)
IPFS_API_URL=http://localhost:5001

# S3 Configuration (optional)
S3_API_URL=
S3_STORAGE_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Lens SDK Configuration
LENS_NETWORK_ID=river-network
LENS_BOOTSTRAP_PEERS=/dns4/bootstrap.river.network/tcp/4001/p2p/QmBootstrapPeerID

# Application Configuration
PORT=3000
NODE_ENV=development
```

### Running the Development Server

```bash
# Start the TAMS mock server (optional, for development)
npm run tams:mock

# Start the River application
npm run dev

# In another terminal, start the peer discovery service
npm run peer:discovery
```

Visit `http://localhost:3000` to access the River editor.

## 📚 Usage

### Creating a New Project

```typescript
import { RiverEditor } from '@river/editor';
import { LensService } from '@river/lens';

const editor = new RiverEditor();
await editor.init();

// Create a new collaborative project
const project = await editor.createProject({
  name: "My Documentary",
  description: "A collaborative documentary project",
  framerate: 25,
  resolution: { width: 1920, height: 1080 }
});

// Share project with collaborators
const inviteLink = await project.createInviteLink('member');
```

### Importing Media

```typescript
// Import video file
const videoFlow = await project.importMedia({
  file: videoFile,
  type: 'video',
  metadata: {
    codec: 'h264',
    bitrate: '10Mbps'
  }
});

// Import audio file
const audioFlow = await project.importMedia({
  file: audioFile,
  type: 'audio',
  metadata: {
    codec: 'aac',
    sampleRate: 48000
  }
});
```

### Timeline Editing

```typescript
// Add clips to timeline
await project.timeline.addClip({
  flowId: videoFlow.id,
  sourceIn: '0:0',
  sourceOut: '0:10000000000', // 10 seconds
  timelinePosition: '0:5000000000' // Start at 5 seconds
});

// Create a transition
await project.timeline.addTransition({
  type: 'crossfade',
  duration: '0:1000000000', // 1 second
  position: '0:14000000000' // At 14 seconds
});
```

## 🛠️ Development

### Project Structure

```
river/
├── src/
│   ├── editor/         # Core editing engine
│   ├── timeline/       # Timeline management
│   ├── tams/          # TAMS integration
│   ├── lens/          # Lens SDK integration
│   ├── ui/            # User interface components
│   └── sync/          # Real-time synchronization
├── tams/              # TAMS submodule
├── tests/             # Test suites
└── docs/              # Documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

### Building for Production

```bash
# Build the application
npm run build

# Run production server
npm run start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [BBC R&D](https://www.bbc.co.uk/rd) for the TAMS specification
- All our contributors and collaborators

## 📞 Contact
- Issue Tracker: [GitHub Issues](https://github.com/riffcc/river/issues)
