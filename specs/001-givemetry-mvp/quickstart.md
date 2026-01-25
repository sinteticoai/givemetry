# Quickstart: GiveMetry MVP Development

**Branch**: `001-givemetry-mvp` | **Date**: 2026-01-25

This guide covers setting up the development environment for GiveMetry.

---

## Prerequisites

- **Node.js**: v20 LTS (recommend using nvm)
- **PostgreSQL**: v15+ with pgvector extension
- **pnpm**: v8+ (package manager)
- **Git**: v2.40+

Optional:
- **Docker**: For local PostgreSQL (alternative to VPS staging DB)
- **VS Code**: Recommended IDE with extensions below

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone repository
cd /opt/apps/givemetry

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local`:

```bash
# Database (use staging DB or local Docker)
DATABASE_URL=postgresql://givemetry:PASSWORD@staging.givemetry.com:5432/givemetry_dev

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-min-32-chars

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx  # Get from console.anthropic.com
OPENAI_API_KEY=sk-xxx          # Get from platform.openai.com

# Email (Resend - use test mode)
RESEND_API_KEY=re_test_xxx     # Get from resend.com
RESEND_FROM_EMAIL=dev@givemetry.com

# File Storage (use local for dev)
STORAGE_TYPE=local
# Or for S3/R2:
# STORAGE_TYPE=s3
# S3_BUCKET=givemetry-dev
# S3_REGION=auto
# S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
# AWS_ACCESS_KEY_ID=xxx
# AWS_SECRET_ACCESS_KEY=xxx
```

### 3. Database Setup

**Option A: Use Staging Database (Recommended for development)**

The VPS staging database is shared for development. No local setup needed.

```bash
# Verify connection
pnpm db:status

# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed
```

**Option B: Local Docker PostgreSQL**

```bash
# Start PostgreSQL with pgvector
docker compose up -d postgres

# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed
```

### 4. Start Development Server

```bash
# Start Next.js dev server
pnpm dev

# Open http://localhost:3000
```

---

## Project Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push schema changes (dev) |
| `pnpm db:seed` | Seed test data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Reset database (DESTRUCTIVE) |

---

## IDE Setup (VS Code)

### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "mikestead.dotenv",
    "ms-playwright.playwright"
  ]
}
```

### Workspace Settings

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Test Data

### Demo Organization

After running `pnpm db:seed`:

| Field | Value |
|-------|-------|
| Organization | "Demo University" |
| Slug | "demo-university" |
| Admin Email | admin@demo.givemetry.com |
| Admin Password | DemoAdmin123! |

### Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.givemetry.com | DemoAdmin123! |
| Manager | manager@demo.givemetry.com | DemoManager123! |
| Gift Officer | mgo@demo.givemetry.com | DemoMGO123! |
| Viewer | viewer@demo.givemetry.com | DemoViewer123! |

### Sample Data

The seed includes:
- 1,000 constituents with varied data quality
- 5,000 gifts spanning 5 years
- 2,000 contact records
- Pre-calculated health scores and predictions

---

## Development Workflow

### 1. TDD Approach (Per Constitution)

```bash
# Write test first
pnpm test:unit -- --watch src/server/services/analysis/__tests__/lapse-risk.test.ts

# Implement until test passes
# Refactor
```

### 2. Type-Safe API Development

```bash
# Generate tRPC types after router changes
pnpm generate:trpc

# Types auto-complete in frontend
```

### 3. Database Changes

```bash
# Edit prisma/schema.prisma

# Create migration
pnpm db:migrate --name add_new_field

# Regenerate Prisma client
pnpm db:generate
```

### 4. AI Development

For testing AI features without API costs:

```typescript
// Set in .env.local
AI_MOCK_MODE=true

// Mock responses are returned from fixtures
```

---

## Common Tasks

### Adding a New tRPC Router

1. Create router in `src/server/routers/new-router.ts`
2. Add to root router in `src/server/routers/_app.ts`
3. Add contract types in `specs/001-givemetry-mvp/contracts/`
4. Write tests in `tests/integration/`

### Adding a New Dashboard Page

1. Create page in `src/app/(dashboard)/new-page/page.tsx`
2. Create components in `src/components/new-page/`
3. Add to sidebar navigation in `src/components/layout/sidebar.tsx`
4. Write E2E tests in `tests/e2e/`

### Adding a shadcn/ui Component

```bash
# Install component
pnpm dlx shadcn@latest add button

# Component added to src/components/ui/
```

---

## Debugging

### tRPC Debugging

```typescript
// Enable tRPC logger
// In src/server/trpc/init.ts
export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.error('tRPC Error:', error);
    return shape;
  },
});
```

### Database Queries

```bash
# View all queries
DATABASE_LOG=true pnpm dev

# Open Prisma Studio
pnpm db:studio
```

### AI Responses

```typescript
// Log AI prompts and responses
AI_DEBUG=true pnpm dev
```

---

## Troubleshooting

### "Cannot connect to database"

1. Check DATABASE_URL in `.env.local`
2. Verify VPS/Docker is running
3. Check firewall/VPN if using staging DB

### "ANTHROPIC_API_KEY not set"

1. Get key from console.anthropic.com
2. Add to `.env.local`
3. Restart dev server

### "Prisma Client not generated"

```bash
pnpm db:generate
```

### "Port 3000 already in use"

```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

### "E2E tests failing"

```bash
# Install browsers
pnpm exec playwright install

# Run with UI
pnpm test:e2e -- --ui
```

---

## Next Steps

1. Review [plan.md](./plan.md) for implementation phases
2. Review [data-model.md](./data-model.md) for entity definitions
3. Review [contracts/](./contracts/) for API specifications
4. Run `/speckit.tasks` to generate implementation tasks

---

*For additional help, see `/opt/apps/givemetry/docs/` or ask in the team channel.*
