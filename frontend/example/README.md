# ACP Web Client Example

Example implementation of ACP Web Client using `acp-react-hooks` with glassmorphism UI style.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Build

```bash
# Build for production
npm run build

# Serve built files
npx serve dist
```

## Structure

- `app/` - Next.js app router pages
- `components/` - React components (UI + Logic)
- `contexts/` - Legacy React Contexts (migrated to hooks)
- `types/` - TypeScript types
- `utils/` - Utility functions

## Note

This example uses the Context-based implementation. For new projects, use the hooks directly from `acp-react-hooks`.

## UI Style

This example uses glassmorphism design:
- Semi-transparent backgrounds
- Backdrop blur effects
- Gradient colors
- Glow effects
- Smooth animations
