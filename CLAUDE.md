# River Project Context and Instructions

This document contains project-specific context and instructions for River, the collaborative video/audio editor built on TAMS and Lens SDK.

## Project Architecture

River combines two core technologies:

1. **TAMS (Time-addressable Media Store)**: Provides immutable, timeline-based media storage with precise frame-level addressing
2. **Lens SDK**: Enables peer-to-peer collaboration and decentralized content management

### Key Technical Concepts

#### TAMS Integration
- **Flows**: Immutable media sequences on infinite timelines
- **Sources**: Abstract content concepts that can have multiple Flow representations
- **Flow Segments**: ~1 second chunks of media wrapped in containers (e.g., MPEG-TS)
- **Copy-on-Write**: Efficient storage by reusing existing media objects
- **Timestamps**: Use nanosecond precision (e.g., `1709634568:500000000`)

#### Lens SDK Integration
- **Sites**: Collaborative project spaces
- **Roles**: Guest, Member, Admin permissions
- **Federation**: Cross-site content sharing
- **Content Addressing**: IPFS-based content storage

## Development Guidelines

### Media Handling
- Always use TAMS APIs for media storage - never store media directly
- Prefer referencing existing media objects over creating duplicates
- Maintain immutability - create new Flows for edits, don't modify existing ones
- Use appropriate container formats (MPEG-TS for video, appropriate audio containers)

### Collaboration Features
- Implement real-time sync using Lens SDK's peer-to-peer capabilities
- Use role-based permissions for all operations
- Handle offline editing with eventual consistency
- Implement conflict resolution for concurrent edits

### Timeline Operations
- Use TAMS timeranges for all timeline operations
- Implement precise frame-accurate editing
- Support multiple timeline tracks (video, audio, effects)
- Handle transitions as new rendered Flow Segments

### Storage Architecture
- Metadata plane: Use database (DynamoDB-style) for Flow metadata
- Media plane: Use IPFS or S3-compatible object storage for media data
- Separate concerns between metadata operations and media transfer
- Support pre-signed URLs for direct media uploads/downloads

## Testing Approach

### Unit Tests
- Test TAMS API integration thoroughly
- Test Lens SDK peer operations
- Mock S3 operations for media storage tests

### Integration Tests
- Test full media import/export workflows
- Test collaborative editing scenarios
- Test timeline operations with real media

### E2E Tests
- Test complete editing workflows
- Test multi-user collaboration
- Test federation between sites

## Performance Considerations

- Lazy load media - only fetch what's needed for current view
- Use proxy flows for preview/scrubbing
- Implement efficient timeline rendering
- Cache frequently accessed Flow Segments
- Use WebRTC for real-time collaboration

## Security Considerations

- Implement proper authentication for TAMS API
- Use Lens SDK's built-in encryption
- Validate all media uploads
- Implement rate limiting for API calls
- Use secure storage for credentials

## Important Patterns

### Media Import
```typescript
// 1. Create Flow
// 2. Request storage URLs
// 3. Upload media to S3
// 4. Register Flow Segments
```

### Timeline Edit
```typescript
// 1. Create new Flow for edited timeline
// 2. Reference existing segments where unchanged
// 3. Create new segments only for transitions/effects
// 4. Update Source to point to new Flow
```

### Collaborative Session
```typescript
// 1. Create/join Lens Site
// 2. Sync project metadata
// 3. Share Flow references (not media)
// 4. Sync timeline edits in real-time
```

## Common Pitfalls to Avoid

- Don't try to modify existing Flows - they're immutable
- Don't transfer media directly between peers - use TAMS references
- Don't assume timeline positions match media timestamps - use ts_offset
- Don't create monolithic Flow Segments - keep them ~1 second
- Don't forget to handle network partitions in P2P scenarios

## External Dependencies

- AWS SDK or S3-compatible client for object storage
- Database client for metadata storage
- MPEG-TS muxer/demuxer for video containers
- Audio format libraries (AAC, MP3, etc.)
- WebRTC for real-time communication
- IPFS client (via Lens SDK)

## Development Workflow

1. Always start by understanding the TAMS flow for your feature
2. Design the collaborative aspects using Lens SDK patterns
3. Implement media operations through TAMS APIs only
4. Test with mock TAMS server during development
5. Ensure all operations maintain media immutability
6. Add comprehensive error handling for network failures

## Debugging Tips

- Use TAMS mock server (`npm run tams:mock`) for development
- Enable Lens SDK debug logging for P2P issues
- Monitor S3 requests to debug media upload/download
- Use timeline visualization tools to debug edit operations
- Check Flow Segment alignment for playback issues

## Future Considerations

- Multi-resolution proxy generation
- Advanced effects and transitions engine
- AI-powered editing assistance
- Real-time streaming output
- Mobile app development
- Plugin architecture for third-party tools