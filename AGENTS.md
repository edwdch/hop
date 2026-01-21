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

### Backend (Go) - Run from `dom/` directory

```bash
make build          # Build binary (requires CGO for SQLite)
make dev            # Run in development mode
make watch          # Hot-reload development (uses Air)
make test           # Run all tests: go test -v ./...
make build-all      # Build with frontend assets embedded
make deps           # Download dependencies
```

**Run a single Go test:**
```bash
go test -v -run TestFunctionName ./internal/package/...
go test -v -run TestFunctionName ./...  # Search all packages
```

### Frontend (TypeScript/React) - Run from `ui/` directory

```bash
bun install         # Install dependencies (or npm install)
bun run dev         # Start dev server (proxies /api to localhost:3000)
bun run build       # Production build: tsc && vite build
bun run lint        # Run ESLint
```

### Full Project Build

```bash
./build-go.sh       # Builds frontend, copies to dom/internal/assets/dist/, builds Go binary
```

## Code Style Guidelines

### Go Backend

**Imports** - Group in order:
1. Standard library
2. Third-party packages
3. Internal packages (github.com/hop/backend/internal/...)

```go
import (
    "fmt"
    "net/http"

    "github.com/go-chi/chi/v5"

    "github.com/hop/backend/internal/config"
    "github.com/hop/backend/internal/logger"
)
```

**Naming:**
- Package names: lowercase, single word (e.g., `auth`, `nginx`, `ssl`)
- Functions: PascalCase for exported, camelCase for unexported
- Struct comments: `// TypeName description` format
- Handler functions: `func (s *Server) handleAction()` pattern

**Error handling:**
```go
if err != nil {
    return fmt.Errorf("context: %w", err)
}
```

**Logging:** Use structured logging with tags
```go
var log = logger.WithTag("server")
log.Info("message", map[string]interface{}{"key": "value"})
```

**Comments:** Chinese language is used for user-facing messages and comments

### TypeScript/React Frontend

**Formatting:**
- 4 spaces indentation
- Single quotes for strings, double quotes for JSX attributes
- Semicolons required
- Trailing commas in multi-line structures

**Imports** - Order:
1. React hooks (`import { useState } from 'react'`)
2. Third-party libraries
3. Local components (`@/components/...`)
4. API modules (`@/api/...`)

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getSites } from '@/api/nginx';
```

**Path aliases:** Use `@/*` which maps to `./src/*`

**Naming conventions:**
- Page components: PascalCase files, default export (`HomePage.tsx`)
- UI components: kebab-case files, named export (`theme-toggle.tsx`)
- API modules: lowercase (`auth.ts`, `nginx.ts`)
- Functions: camelCase, handlers prefixed with `handle` (`handleSubmit`)
- Constants: UPPER_SNAKE_CASE (`API_BASE`)

**Component structure:**
```typescript
export default function PageName() {
    // 1. Router hooks
    const navigate = useNavigate();
    
    // 2. State declarations
    const [data, setData] = useState<Type[]>([]);
    const [loading, setLoading] = useState(true);
    
    // 3. useEffect for data loading
    useEffect(() => { loadData(); }, []);
    
    // 4. Handler functions
    const handleSubmit = async () => { ... };
    
    // 5. Loading/error early returns
    if (loading) return <Spinner />;
    
    // 6. Main JSX
    return ( ... );
}
```

**TypeScript:**
- Strict mode enabled
- Explicit return types on API functions
- Interface definitions for data structures
- Union types for enums: `type Status = 'pending' | 'active' | 'error'`

**Error handling pattern:**
```typescript
try {
    const result = await apiCall();
    if (result.success) {
        toast.success('操作成功');
    } else {
        toast.error('操作失败', { description: result.error });
    }
} catch (err) {
    toast.error('操作失败', { description: (err as Error).message });
} finally {
    setLoading(false);
}
```

**API response pattern:** Return `{ success: boolean; error?: string; data?: T }`

**Styling:**
- Tailwind CSS v4 with custom theme variables
- Use `cn()` utility from `@/lib/utils` for class composition
- class-variance-authority (cva) for component variants
- HSL color format with CSS variables

## Testing

**Backend:** Uses standard Go testing
```bash
# Run all tests
make test

# Run specific test
go test -v -run TestName ./internal/package/

# Run tests with coverage
go test -cover ./...
```

**Frontend:** No test framework currently configured

## Key Dependencies

**Backend:**
- Chi v5 - HTTP router
- Cobra - CLI framework
- go-sqlite3 - Database (requires CGO)
- golang.org/x/crypto - Password hashing

**Frontend:**
- React 19 + React Router DOM 7
- Vite (rolldown-vite)
- Tailwind CSS 4
- Radix UI primitives
- CodeMirror 6 - Config editing
- Sonner - Toast notifications

## Notes

- Documentation and comments are primarily in Chinese
- Configuration uses TOML format (`config.toml`)
- Frontend dev server proxies `/api` to backend at `http://127.0.0.1:3000`
- Frontend assets are embedded into Go binary at build time
- SQLite requires CGO_ENABLED=1 for building
