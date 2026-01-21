# Changelog

All notable changes to the AGI Node.js/TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-01-21

### Added

- **AGIClient**: Main client class for interacting with the AGI API
  - Configurable base URL and API key
  - Support for environment variable configuration (`AGI_API_KEY`, `AGI_BASE_URL`)
  - Automatic error handling and retry logic

- **Sessions API**: Full session management support
  - `sessions.create()` - Create new agent sessions with configurable agent types
  - `sessions.get()` - Retrieve session details
  - `sessions.list()` - List all sessions with pagination
  - `sessions.delete()` - Delete sessions
  - `sessions.step()` - Execute agent steps with screenshot input and session ID routing

- **AgentLoop**: Async event loop manager for client-driven sessions
  - Start/pause/resume/stop control over execution
  - Callback-based architecture for screenshot capture and action execution
  - Support for agent thinking output via `onThinking` callback
  - Support for user questions via `onAskUser` callback
  - Step-by-step progress tracking via `onStep` callback
  - Configurable step delay in milliseconds

- **Desktop Agent Support**: Full support for desktop automation
  - `DesktopAction` type for click, type, scroll, drag, and key actions
  - `StepDesktopResponse` with actions, thinking, and askUser support
  - Coordinate-based action execution

- **TypeScript Support**: First-class TypeScript support
  - Full type definitions for all APIs
  - Exported types for `DesktopAction`, `StepDesktopResponse`, `LoopState`
  - Generic session types for flexibility

- **Error Handling**: Comprehensive error classes
  - `AGIError` base exception
  - `AuthenticationError` for API key issues
  - `RateLimitError` for rate limiting
  - `APIError` for general API errors

### Changed

- **Session routing**: Added `sessionId` parameter to `AgentLoop` and `sessions.step()` for improved routing in shared sandbox environments

### Fixed

- Improved error handling in HTTPClient
- Fixed prettier formatting issues

## [0.0.1] - 2025-12-XX

### Added

- Initial release with basic session management

---

[Unreleased]: https://github.com/agi-inc/agi-node/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/agi-inc/agi-node/compare/v0.0.1...v0.3.0
[0.0.1]: https://github.com/agi-inc/agi-node/releases/tag/v0.0.1
