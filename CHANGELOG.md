# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Initial release with core functionality
- WebSocket bridge for ACP protocol communication
- Web UI with Markdown rendering and syntax highlighting
- Support for Claude ACP Agent, Kimi CLI, and Mock providers
- Session management (create, list, switch, resume)
- Permission request handling with interactive buttons
- Tool call display with collapsible cards
- Local history storage

### Features
- Real-time streaming message display
- Syntax highlighting for code blocks
- Copy-to-clipboard for code blocks
- Responsive design
- Connection status indicators
- Session filtering by working directory

## [0.1.0] - 2025-03-29

### Added
- Project initial commit
- Basic ACP client implementation
- WebSocket server bridge
- HTML/CSS/JS frontend
- Support for ACP protocol methods:
  - initialize
  - session/new
  - session/list
  - session/load
  - session/resume
  - session/prompt
  - session/request_permission

[Unreleased]: https://github.com/shon-yuan/acp-web-client/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shon-yuan/acp-web-client/releases/tag/v0.1.0
