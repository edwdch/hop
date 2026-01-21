# AGENTS.md - AI Assistant Guidelines for Hop

Hop is an Nginx configuration management tool with a Go backend (`dom/`) and React frontend (`ui/`).

## Project Structure

```
hop/
├── dom/                    # Go backend (Chi router, SQLite)
│   ├── cmd/hop/            # CLI entry point (Cobra)
│   ├── internal/
│   │   ├── auth/           # Authentication
│   │   ├── config/         # TOML configuration
│   │   ├── database/       # SQLite layer
│   │   ├── nginx/          # Nginx config management
│   │   ├── server/         # HTTP server setup
│   │   └── ssl/            # SSL/ACME certificate management
│   └── Makefile
├── ui/                     # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── api/            # API client functions
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities
│   └── package.json
└── build-go.sh             # Full build script
```

## Build Commands

### Backend (Go) - from `dom/`

```bash
make build          # Build binary (requires CGO for SQLite)
make dev            # Run in development mode
make watch          # Hot-reload with Air
make test           # Run all tests
make build-all      # Build with frontend embedded
```

### Frontend (React) - from `ui/`

```bash
bun install         # Install dependencies
bun run dev         # Dev server (proxies /api to localhost:3000)
bun run build       # Production build
bun run lint        # Run ESLint
```

### Full Build

```bash
./build-go.sh       # Builds frontend + Go binary with embedded assets
```

## Running Tests

### Go Backend

```bash
make test                                    # All tests
go test -v -run TestName ./internal/pkg/     # Single test in package
go test -v -run TestName ./...               # Single test, all packages
go test -cover ./...                         # With coverage
```

### Frontend

No test framework currently configured.

## Code Style - Go Backend

### Imports (3 groups)

```go
import (
    "fmt"
    "net/http"

    "github.com/go-chi/chi/v5"

    "github.com/hop/backend/internal/config"
)
```

### Naming

- **Packages:** lowercase, single word (`auth`, `nginx`, `ssl`)
- **Exported:** PascalCase (`Server`, `IssueCertificate`)
- **Unexported:** camelCase (`handleGetSites`, `jsonError`)
- **Handlers:** `func (s *Server) handleAction()` pattern
- **Comments:** `// TypeName description` format (Chinese)

### Error Handling

```go
if err != nil {
    return fmt.Errorf("context: %w", err)
}
```

### Logging

```go
var log = logger.WithTag("server")
log.Info("message", map[string]interface{}{"key": "value"})
```

## Code Style - TypeScript Frontend

### Formatting

- 4 spaces indentation
- Single quotes for strings, double quotes in JSX
- Semicolons required
- Trailing commas in multi-line structures

### Imports (4 groups)

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getSites } from '@/api/nginx';
```

### Naming

- **Page components:** PascalCase, default export (`HomePage.tsx`)
- **UI components:** kebab-case, named export (`theme-toggle.tsx`)
- **API modules:** lowercase (`auth.ts`, `nginx.ts`)
- **Functions:** camelCase, handlers with `handle` prefix
- **Constants:** UPPER_SNAKE_CASE (`API_BASE`)

### Component Structure

```typescript
export default function PageName() {
    const navigate = useNavigate();           // 1. Router hooks
    const [data, setData] = useState([]);     // 2. State
    useEffect(() => { loadData(); }, []);     // 3. Effects
    const handleSubmit = async () => {};      // 4. Handlers
    if (loading) return <Spinner />;          // 5. Early returns
    return ( ... );                           // 6. Main JSX
}
```

### Error Handling

```typescript
try {
    const result = await apiCall();
    result.success ? toast.success('OK') : toast.error('Failed', { description: result.error });
} catch (err) {
    toast.error('Failed', { description: (err as Error).message });
} finally {
    setLoading(false);
}
```

### API Pattern

Return `{ success: boolean; error?: string; data?: T }`

### Styling

- Tailwind CSS v4 with CSS variables
- `cn()` from `@/lib/utils` for class merging
- class-variance-authority (cva) for variants

## Key Dependencies

**Backend:** Chi v5 (router), Cobra (CLI), go-sqlite3, golang.org/x/crypto

**Frontend:** React 19, React Router 7, Vite, Tailwind 4, Radix UI, CodeMirror 6, Sonner

## Notes

- Comments and UI text are in Chinese
- Config format: TOML (`config.toml`)
- SQLite requires `CGO_ENABLED=1`
- Frontend assets embedded into Go binary at build time
- Dev: frontend proxies `/api` to `http://127.0.0.1:3000`
