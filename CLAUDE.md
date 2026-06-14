# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack social media/posts application with AI capabilities:

- **Backend**: NestJS (Node.js) with PostgreSQL (Prisma ORM), JWT authentication, LangChain AI integration
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui

## Project Structure

```
black_box/
├── backend/backend/posts/     # NestJS backend (port 3000)
│   ├── src/
│   │   ├── ai/               # AI services (DeepSeek chat, embeddings, DALL-E, RAG)
│   │   ├── auth/             # JWT authentication
│   │   ├── posts/            # Posts CRUD
│   │   ├── prisma/           # Prisma service
│   │   └── users/            # User management
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── uploads/              # Static files (avatars, post images)
└── frontend/black_box/       # React frontend (port 5173 default)
    ├── src/
    │   ├── api/              # API client (axios with token refresh)
    │   ├── components/ui/    # shadcn/ui components
    │   ├── pages/            # Route pages
    │   ├── store/            # Zustand state management
    │   └── router/           # React Router config
    └── mock/                 # (Optional) vite-plugin-mock directory
```

## Common Commands

### Backend (from `backend/backend/posts/`)

```bash
# Development (watch mode)
pnpm start:dev

# Production build
pnpm build
pnpm start:prod

# Database
npx prisma migrate dev      # Run migrations
npx prisma generate         # Generate Prisma client
npx prisma studio           # Open Prisma Studio

# Testing
pnpm test                   # Unit tests (Jest)
pnpm test:e2e              # E2E tests
pnpm test:cov              # Coverage report

# Lint/Format
pnpm lint
pnpm format
```

### Frontend (from `frontend/black_box/`)

```bash
# Development
pnpm dev                    # Vite dev server (port 5173)

# Production build
pnpm build
pnpm preview

# Lint
pnpm lint
```

## Architecture Details

### Backend (NestJS)

- **API Prefix**: All routes prefixed with `/api`
- **Static Files**: Served from `/uploads` (avatars at `/uploads/avatar/resized/`, post images at `/uploads/resized/`)
- **Global Validation**: Uses `ValidationPipe` with `class-validator` for DTO validation
- **CORS**: Enabled for all origins in development

**Key Modules:**
- `AuthModule`: JWT strategy with access/refresh tokens
- `PostsModule`: Pagination with Prisma, includes user avatars, tags, likes, comments counts
- `AIModule`: DeepSeek chat (streaming), OpenAI embeddings, DALL-E image generation, RAG with MemoryVectorStore
- `PrismaModule`: Database access via PrismaClient

**Environment Variables** (see `.env`):
- `DATABASE_URL`: PostgreSQL connection
- `TOKEN_SECRET`: JWT signing secret
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`: LLM provider
- `OPENAI_API_KEY` / `OPENAI_BASE_URL`: Embeddings & image generation

### Frontend (React + Vite)

- **Base Path**: API calls use `http://localhost:3000/api`
- **Path Alias**: `@/` maps to `src/`
- **State Management**: Zustand with persistence (user store in localStorage)
- **Styling**: Tailwind CSS v4 (no config file, uses CSS `@theme`)
- **UI Components**: shadcn/ui (base-nova style)
- **Route Protection**: `needsLogin` array in `App.tsx` guards specific routes

**Key Patterns:**
- Token refresh is handled transparently in axios interceptors (`api/config.ts`)
- Route-based code splitting with `React.lazy()` and `react-activation` for keep-alive
- Zustand stores: `useUserStore`, `useHomeStore`, `search`, `rag`, `git`

## Testing

### Backend Unit Tests

Tests are co-located with source files as `*.spec.ts`. Run with:
```bash
pnpm test              # All tests
pnpm test -- --testNamePattern="create"  # Specific test
```

Jest config is embedded in `package.json`:
- Root dir: `src`
- Test regex: `.*\.spec\.ts$`
- Transform: `ts-jest`

### Backend E2E Tests

Located in `test/` directory with `.e2e-spec.ts` suffix. Config in `test/jest-e2e.json`.

### Frontend

No test runner is currently configured. The project uses `vite-plugin-mock` for API mocking during development.

## Database Schema (Prisma)

Key entities:
- `User`: Authentication, has posts, comments, likes, avatars, files
- `Post`: Content with tags, likes, comments, files
- `Comment`: Nested replies (self-referential)
- `Tag`: Many-to-many with posts via `PostTag`
- `UserLikePost`: Junction table for post likes
- `Avatar` / `File`: Upload metadata with image dimensions

Relations use `onDelete: Cascade` or `SetNull` appropriately.

## AI Features

The AI service (`ai.service.ts`) provides:
1. **Chat**: Streaming DeepSeek LLM responses
2. **Search**: Vector similarity search over pre-embedded posts (cosine similarity)
3. **Avatar Generation**: DALL-E based on user name
4. **RAG**: MemoryVectorStore with sample documents
5. **Git Commit**: Generates Conventional Commits from git diff

## Important Notes

- Backend runs on port 3000, frontend on port 5173 (Vite default)
- Image URLs are hardcoded to `http://localhost:3000/uploads/` in posts service
- Token refresh logic queues concurrent requests during refresh
- `react-activation` is used to keep Home component state when navigating away
