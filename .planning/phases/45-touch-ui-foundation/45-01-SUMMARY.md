# Plan 45-01 Summary: Vite + React Frontend & App Layout Shell

## Result: COMPLETE

**Tasks:** 2/2
**Duration:** 1 session

## Commits

| Hash | Message |
|------|---------|
| 4593a79 | feat(45): add Vite + React + TypeScript frontend with Fastify static serving |
| 2771f86 | feat(45): create dark-themed app layout shell with header, sidebar, and content area |

## What Was Built

### Task 1: Vite + React + TypeScript Project
- Created `ui/` directory with React 19, Vite 6, TypeScript 5.9
- Vite config builds to `dist/public/` for Fastify static serving
- Dev server on :5173 proxies `/api` to backend on :3456
- Updated `src/app.ts` with @fastify/static registration and SPA fallback
- Root `npm run build` chains backend tsc + UI vite build
- Added `ui:dev`, `ui:build`, `ui:preview` scripts to root package.json

### Task 2: App Layout Shell
- Three-region CSS Grid: 56px header, 200px sidebar, flexible content area
- Dark theme with CSS custom properties (--color-bg, --color-surface, etc.)
- Touch-optimized base CSS: no-zoom viewport, manipulation touch-action, momentum scrolling
- Thin custom scrollbars for Chromium kiosk

## Decisions

| Decision | Rationale |
|----------|-----------|
| Manual project setup (no create-vite) | Full control over structure, minimal boilerplate |
| Separate ui/tsconfig.json from root | Backend uses NodeNext/rootDir:src; frontend needs bundler/jsx |
| SPA fallback conditional on dist/public/ existence | Works in both dev (no static) and production (serves index.html) |
| 100dvh not 100vh | Correct viewport height on mobile/LAN access |
| CSS custom properties for all colors | Single source of truth for theme; easy to adjust |

## Files Modified

- `ui/package.json` — React + Vite dependencies
- `ui/vite.config.ts` — Build output and dev proxy config
- `ui/tsconfig.json`, `ui/tsconfig.app.json` — TypeScript config
- `ui/index.html` — Vite entry with touch viewport meta
- `ui/src/main.tsx` — React root mount
- `ui/src/App.tsx` — Layout shell component
- `ui/src/App.css` — Grid layout styles
- `ui/src/index.css` — Global reset, theme variables, scrollbar
- `ui/src/vite-env.d.ts` — Vite client types
- `src/app.ts` — @fastify/static + SPA fallback
- `package.json` — UI build scripts
- `.gitignore` — Exclude ui/node_modules and ui/dist

## Verification

- [x] `cd ui && npx vite build` produces dist/public/index.html and assets
- [x] `cd ui && npx tsc --noEmit` passes without errors
- [x] Root `npm run build` produces both dist/server.js and dist/public/
- [x] Dark three-region layout renders correctly
