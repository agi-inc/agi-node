# Multimodal Driver Support - Node SDK Updates

This update adds comprehensive multimodal support to the Node SDK to match the new agi-driver capabilities.

## Changes Made

### Protocol Updates (`src/driver/protocol.ts`)

#### New Event Types
- `AudioTranscriptEvent`: Audio transcript from buffer
- `VideoFrameEvent`: Video frame from camera/screen
- `SpeechStartedEvent`: TTS playback started
- `SpeechFinishedEvent`: TTS playback finished
- `TurnDetectedEvent`: Voice turn detection

#### New Command Types
- `GetAudioTranscriptCommand`: Request audio transcript
- `GetVideoFrameCommand`: Request video frame

#### New Interfaces
- `MCPServerConfig`: MCP server configuration
- `AgentIdentity`: Agent identity information
- `ToolChoice`: Tool choice configuration type

#### Updated StartCommand
Added fields for multimodal configuration:
- `agent_identity?: AgentIdentity` - Agent identity (default: agi-2-claude by AGI Company)
- `tool_choice?: ToolChoice` - Tool choice mode
- `mcp_servers?: MCPServerConfig[]` - MCP server configurations
- `audio_input_enabled?: boolean`, `audio_buffer_seconds?: number`
- `turn_detection_enabled?: boolean`, `turn_detection_silence_ms?: number`
- `speech_output_enabled?: boolean`, `speech_voice?: string`
- `camera_enabled?: boolean`, `camera_buffer_seconds?: number`
- `screen_recording_enabled?: boolean`, `screen_recording_buffer_seconds?: number`

### Exports (`src/driver/index.ts`)
Added exports for all new event and command types, plus helper interfaces.

## Usage Examples

### Basic Multimodal Session

```typescript
import { AgentDriver } from '@agi-inc/agi-node';

const driver = new AgentDriver({
  mode: 'local',
  agent_name: 'agi-2-claude'
});

// Start with multimodal features
await driver.start({
  goal: 'Help me with my computer',
  mode: 'local',
  agent_name: 'agi-2-claude',

  // Voice features
  audio_input_enabled: true,
  turn_detection_enabled: true,
  speech_output_enabled: true,
  speech_voice: 'alloy',

  // Video features
  camera_enabled: true,
  screen_recording_enabled: true,

  // MCP servers
  mcp_servers: [
    {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'],
      env: {}
    }
  ],

  // Tool choice
  tool_choice: 'auto'
});
```

### Handling New Events

```typescript
driver.on('audio_transcript', (event: AudioTranscriptEvent) => {
  console.log(`Transcript: ${event.transcript}`);
});

driver.on('video_frame', (event: VideoFrameEvent) => {
  // event.frame_base64 contains JPEG frame
  saveFrame(event.frame_base64);
});

driver.on('speech_started', (event: SpeechStartedEvent) => {
  console.log(`🔊 Speaking: ${event.text}`);
});

driver.on('speech_finished', () => {
  console.log('✓ Finished speaking');
});

driver.on('turn_detected', (event: TurnDetectedEvent) => {
  console.log(`You said: ${event.transcript}`);
});
```

### Voice-Only Mode

```typescript
await driver.start({
  goal: '(voice input)',
  mode: 'local',
  audio_input_enabled: true,
  turn_detection_enabled: true,
  turn_detection_silence_ms: 1000,  // 1 second of silence = turn complete
  speech_output_enabled: true,
  speech_voice: 'alloy'  // or: echo, fable, onyx, nova, shimmer
});
```

### MCP Servers

```typescript
const mcpServers: MCPServerConfig[] = [
  {
    name: 'filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/you/Documents']
  },
  {
    name: 'database',
    command: 'python',
    args: ['-m', 'my_db_server'],
    env: { DATABASE_URL: 'postgresql://...' }
  }
];

await driver.start({
  goal: 'Analyze my documents',
  mode: 'local',
  mcp_servers: mcpServers
});
```

### Tool Choice Configuration

```typescript
// Auto (default)
tool_choice: 'auto'

// Required - must use at least one tool
tool_choice: 'required'

// None - no tool use
tool_choice: 'none'

// Specific tool
tool_choice: { type: 'tool', name: 'filesystem__read_file' }
```

## Breaking Changes

⚠️ This is a breaking change with no backwards compatibility.

- `StartCommand` interface has many new optional fields
- New event types may be emitted
- `agent_name` should be set to `"agi-2-claude"` for new agents

## Testing

```bash
# Install updated SDK
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Try a voice session
node -e "
const { AgentDriver } = require('./dist');

(async () => {
  const driver = new AgentDriver({ mode: 'local' });
  const result = await driver.start({
    goal: 'Test voice',
    mode: 'local',
    audio_input_enabled: true,
    speech_output_enabled: true
  });
  console.log(result);
})();
"
```

## Related PRs

- agi-api (driver): https://github.com/agi-inc/agents/pull/344
- agi-python: https://github.com/agi-inc/agi-python/pull/8
- agi-csharp: TBD
