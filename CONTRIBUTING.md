# Contributing to ACP Web Client

Thank you for your interest in contributing to ACP Web Client! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](../../issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Python version)
   - Screenshots if applicable

### Suggesting Features

1. Open an issue with the "feature request" label
2. Describe the feature and its use case
3. Discuss implementation approaches

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add/update tests if applicable
5. Update documentation
6. Commit with clear messages
7. Push to your fork and create a PR

#### PR Checklist

- [ ] Code follows existing style
- [ ] Changes are tested
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] No merge conflicts

## Development Setup

```bash
# Clone your fork
git clone https://github.com/shon-yuan/acp-web-client.git
cd acp_web_client

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install websockets

# Run tests (when available)
python -m pytest
```

## Project Structure Guidelines

### Python Code

- Follow PEP 8 style guide
- Use type hints where possible
- Add docstrings for public functions
- Keep functions focused and small

### JavaScript Code

- Use ES6+ features
- Avoid global variables
- Use semantic HTML
- Comment complex logic

### Documentation

- Keep README.md up to date
- Document API changes
- Add examples for new features
- Update this file if process changes

## Testing

### Manual Testing

1. Test with all supported providers (Mock, Kimi, Claude)
2. Test session creation, switching, and resumption
3. Test permission handling
4. Test tool call display
5. Verify Markdown rendering
6. Check responsive design

### Automated Testing (Future)

We plan to add:
- Unit tests for Python modules
- Integration tests for WebSocket communication
- Frontend tests with Playwright

## Commit Message Format

```
type: Brief description

Longer explanation if needed. Wrap at 72 characters.

- Bullet points for details
- Reference issues: Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Questions?

Open a [Discussion](../../discussions) or join our community chat (coming soon).

## Attribution

Contributors will be added to the CONTRIBUTORS.md file.
