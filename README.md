## 1. Jiddo NPC Generator

![Node](https://img.shields.io/badge/node-22.15.0-026e00?logo=node.js&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5.x-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Version](https://img.shields.io/badge/version-0.0.1-informational)
![License](https://img.shields.io/badge/license-TBD-lightgrey)

## 2. Project description

Jiddo NPC Generator is a web application that streamlines designing and generating NPC files for Open Tibia servers using the Jiddo NPC system (TFS ≤ 1.5). The MVP focuses on fast, validated creation of simple NPCs (e.g., vendors) by collecting parameters in a guided wizard and generating a consistent Jiddo XML file. The Lua script is a shared `default.lua` (read‑only preview) and is not generated per NPC in the MVP. The app does not provide manual XML/Lua editing; users copy the generated content.

Target users include Content Designers/Scripters (create and edit NPCs, publish) and Mappers/Admins (browse and copy XML/Lua for integration).

### Table of Contents

- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

For full product requirements, see the PRD.

## 3. Tech stack

- Frontend: Astro 5 (with React 19 islands), TypeScript 5, Tailwind CSS 4, shadcn/ui
- Runtime/libs: `@astrojs/react`, `@astrojs/node`, `@supabase/supabase-js`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`
- Backend: Supabase (Auth, Database, Storage)
- AI provider: OpenRouter.ai (access to multiple model vendors)
- Tooling: ESLint 9, Prettier (with `prettier-plugin-astro`)
- Testing (planned): Vitest and React Testing Library for unit/integration tests, Playwright for E2E tests
- CI/CD & hosting (planned): GitHub Actions, Netlify

References:

- Tech overview: [.ai/tech-stack.md](.ai/tech-stack.md)
- Product requirements: [.ai/prd.md](.ai/prd.md)
- Research notes (Jiddo NPC system and modules): [`spec/research/`](spec/research)

## 4. Getting started locally

### Prerequisites

- Node.js 22.15.0 (see `.nvmrc`)
- npm (repository uses `package-lock.json`)

Optional/coming soon (not required to run the current UI scaffold):

- Supabase project (URL + anon key) for Magic Link auth
- OpenRouter API key for XML generation

### Setup

```bash
# 1) Use the correct Node version
nvm use 22.15.0

# 2) Install dependencies
npm install

# 3) Start the dev server (http://localhost:4321)
npm run dev
```

Build and preview:

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

Linting and formatting:

```bash
npm run lint
npm run lint:fix
npm run format
```

### Project structure

```text
./
├─ src/
│  ├─ assets/            # Static project assets (mocks, Lua scripts)
│  ├─ components/        # UI components (Astro + React)
│  │  ├─ auth/            # Auth context, provider, and hook
│  │  ├─ layout/          # Global layout components (Topbar, Footer, etc.)
│  │  ├─ pages/           # Page-specific root components
│  │  └─ ui/              # Reusable UI components (from shadcn/ui)
│  ├─ db/                # Supabase client and generated database types
│  ├─ layouts/           # Astro layouts (.astro)
│  ├─ lib/               # Business logic and helpers
│  │  ├─ services/        # Services for API communication
│  │  └─ validators/      # Zod validation schemas
│  ├─ middleware/        # Astro middleware
│  ├─ pages/             # Astro pages and API endpoints
│  │  └─ api/             # Server-side API routes
│  ├─ styles/            # Global styles
│  └─ types.ts           # Shared application type definitions
├─ public/               # Publicly served assets (e.g., favicon)
├─ supabase/             # Supabase database migrations
├─ spec/                 # Product specifications and research
└─ .ai/                  # AI-related docs (PRD, planning)
```

## 5. Available scripts

- `npm run dev`: Start Astro dev server
- `npm run build`: Build the site for production
- `npm run preview`: Preview the production build locally
- `npm run astro`: Run the Astro CLI directly
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Run ESLint with auto-fixes
- `npm run format`: Format files with Prettier

## 6. Project scope

### In scope (MVP)

- Authentication: Supabase Magic Link (link TTL 15 min, session 7 days, redirect after login)
- NPC Wizard (Jiddo system TFS ≤ 1.5):
  - Basics: name, `script` fixed to `default.lua` (disabled), walkinterval, floorchange, health (now/max)
  - Appearance: look type; for player outfits: head, body, legs, feet, addons
  - Messages: greet, farewell, decline, noshop, oncloseshop
  - Modules: Shop and Keywords active; Focus/Travel/Voice visible but disabled
- Shop (active):
  - Buy/Sell lists with `name`, `itemId`, `price`, `subType/charges`; optional `container/realName`
  - Interface mode: trade window vs talk mode
  - Limits: ~255 items per list; validation of required/number fields
- Keywords (active):
  - Entries with one or more trigger phrases and a response
  - Limits: ~255 entries; phrase 1–64 chars, response up to 512 chars; no duplicates (case-insensitive)
- Generation & editing:
  - Create: send parameters → AI returns Jiddo XML
  - Edit: send updated parameters + current XML → AI returns updated XML
  - No manual XML/Lua editing in-app; `default.lua` is shared and read‑only
- Previews & copy:
  - Escaped text previews for XML and `default.lua`; copy-to-clipboard
  - Content size limit 256 KB per field; blocks save/copy with clear error
- Lists & navigation:
  - HOME: featured 10 latest published NPCs
  - `/npcs`: SSR first 100 results, cursor-based infinite scroll thereafter
  - NPC cards: 4:3 placeholder, name, author, active modules, implementation type (XML in MVP)
- NPC details page (public): metadata + XML/Lua previews (read-only), copy actions
- Publishing model & permissions:
  - Create → private; Publish → public (no unpublish); soft delete
  - Owner-only actions (edit/publish/soft delete) enforced by user ID
- Validation and constraints: appearance ranges, positive integers where required; Shop and Keywords limits
- Telemetry: events (NPC Created, NPC Published), TTFNPC, Create→Publish conversion, generation error rates

### Out of scope (MVP)

- Unpublish action
- Full UI for Travel/Voice modules
- Advanced quest/storage/vocation/level gating beyond simple examples
- Ratings, filtering/search (beyond basic navigation/infinite scroll)
- Password reset (auth via Magic Link only)
- Share mechanisms beyond standard link
- Import/export bundles (e.g., ZIP of XML+LUA)
- Support for other NPC systems (e.g., RevNpcSys TFS 1.6+, Enhanced, OTX2)
- Versioning of edits
- Manual content editing in previews

See details in [.ai/prd.md](.ai/prd.md).

## 7. Project status

- Version: 0.0.1
- Status: In Progress. The foundational database schema (Supabase) and API plans for core features like asynchronous XML generation are complete. The project has moved beyond the initial UI scaffold into backend integration.
- Roadmap (short-term): Implement the NPC creation/editing forms (UI) and connect them to the backend API endpoints. Finalize the Supabase auth flow and build out the public NPC list and detail pages.

## 8. License

TBD. No license has been selected yet. Until a license is added, all rights are reserved. If you intend to use this project in production or redistribute it, please open an issue to discuss licensing.
