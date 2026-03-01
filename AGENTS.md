# AGENTS.md - Agent Coding Guidelines

This document provides guidance for agents working on the Chouka (抽卡) Gacha System codebase.

## Project Overview

- **Project**: Chouka - Cloudflare Workers-based Gacha (card draw) system
- **Main File**: `worker.js` (~5000 lines, single-file architecture)
- **Tech Stack**: Cloudflare Workers, D1 (SQLite), KV Storage, R2 Storage
- **Language**: Vanilla JavaScript (ES Modules)

---

## Build, Deploy & Development Commands

### Development
```bash
# Local development (requires wrangler.toml bindings)
npx wrangler dev --local

# Local development with remote D1
npx wrangler dev
```

### Deployment
```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# Deploy with specific environment
npx wrangler deploy --env production
```

### Database Operations
```bash
# Execute SQL schema on local D1
npx wrangler d1 execute chouka --local --file=./schema.sql

# Execute SQL schema on remote D1
npx wrangler d1 execute chouka --remote --file=./schema.sql

# View D1 database
npx wrangler d1 execute chouka --remote --command="SELECT * FROM users"
```

### Testing
- **No formal test framework is configured** - manual testing via `wrangler dev` or deployed environment
- Test API endpoints using curl or Postman:
  ```bash
  # Example: Login
  curl -X POST -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test123"}' \
    https://your-worker/auth/login
  ```

### Linting
- **No ESLint/Prettier configured** - code uses vanilla JS with consistent internal style
- Manual code review recommended

---

## Code Style Guidelines

### General Principles
- Single `worker.js` file contains entire application
- Use ES Modules (`export default`, `class`, etc.)
- Chinese comments used throughout codebase for documentation

### Naming Conventions
- **Classes**: PascalCase (e.g., `UserService`, `GachaService`)
- **Functions**: camelCase (e.g., `getBeijingTime`, `jsonResponse`)
- **Constants/Config**: UPPER_SNAKE_CASE (e.g., `BUSINESS_CONFIG`, `TTL`)
- **File/Route paths**: kebab-case in URLs

## File Structure

### Current (Single File)
- Single `worker.js` file contains entire application (~5000 lines)

### Modular Structure (Future)
```
src/
├── config/          # Configuration modules
├── utils/           # Utility functions
├── services/       # Business logic services
├── handlers/        # Route handlers (future)
├── templates/       # HTML templates (future)
└── worker.js        # Entry point (future)
```

See `docs/MODULARIZATION_STATUS.md` for migration details.

### Imports/Dependencies
- No external npm dependencies - uses Cloudflare Workers runtime APIs only
- Uses native `crypto.subtle` for password hashing (PBKDF2 + SHA-256)
- Uses native `fetch` for external API calls
- Supports ES Modules for modular architecture (see `src/` directory)

### Modular Architecture
The project includes a modular structure under `src/` directory:
- `src/config/` - Business and technical configuration
- `src/utils/` - Utility functions (time, response helpers)
- `src/services/` - Service classes

Cloudflare Workers automatically bundles all imported modules using esbuild.

### Error Handling
```javascript
// Route-level error wrapper pattern:
const handleRoute = async (handler) => {
  try {
    return await handler();
  } catch (err) {
    console.error('Route Error:', err);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
};
```

### Database Operations (D1)
- Use `.prepare(sql).bind(...params)` for parameterized queries
- Use `.first()` for single-row results
- Use `.all()` for multiple rows
- Use `.run()` for insert/update/delete
- Use `.batch([queries])` for transactional operations

```javascript
// Examples:
const user = await env.DB.prepare(
  'SELECT id, username, coins FROM users WHERE id = ?'
).bind(userId).first();

const results = await env.DB.prepare(
  'SELECT * FROM inventory WHERE user_id = ?'
).bind(userId).all();

await env.DB.batch([
  env.DB.prepare('UPDATE users SET coins = ? WHERE id = ?').bind(newCoins, userId),
  env.DB.prepare('INSERT INTO logs (user_id, action) VALUES (?, ?)').bind(userId, 'draw')
]);
```

### Response Format
- Use `jsonResponse(data, status, extraHeaders)` helper
- Standard error response: `{ error: '错误信息' }`
- Standard success response: `{ success: true, ...data }`

### Authentication
- Token-based via `X-Session-Token` header
- Fallback debug header: `X-User-ID` (unsafe, for development only)
- Admin routes verify against `env.admin` secret

### Caching Strategy
- KV_CACHE for session data and API caching
- Use `expirationTtl` for TTL-based expiration
- Cache keys should be descriptive (e.g., `session:token123`, `uinfo:user1`)

### Configuration
- `BUSINESS_CONFIG`: Game logic (gacha rates, costs, level system)
- `TECHNICAL_CONFIG`: System config (cache TTL, R2 domain, GitHub integration)
- Environment variables set in Cloudflare Dashboard or wrangler.toml

---

## Required Environment Variables

### In Cloudflare Dashboard (Workers → Settings → Variables & Secrets)
- `admin` (Secret) - Admin password for management后台
- `GITHUB_TOKEN` (Secret) - GitHub PAT for image uploads
- `GITHUB_OWNER` (Var) - GitHub username (optional, defaults to `lujih`)
- `GITHUB_REPO` (Var) - Image repository name (optional, defaults to `chouka-images`)
- `R2_DOMAIN` (Var) - Public R2 domain for image access

### Bindings (from wrangler.toml)
- `KV_CACHE` - KV namespace for caching
- `RECENT_REQUESTS` - KV namespace for changelog/announcement
- `DB` - D1 database
- `R2_BUCKET` - R2 storage bucket

---

## Important Database Tables

See `schema.sql` for complete schema. Key tables:
- `users` - User accounts, coins, level, exp
- `inventory` - Card inventory by rarity
- `gallery` - Public image gallery
- `logs` - User action logs
- `user_titles` - User titles/badges
- `user_uploads` - User-submitted images

---

## Key API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | No | User registration |
| `/auth/login` | POST | No | User login |
| `/user/info` | GET | Token | Get user info |
| `/draw` | GET | Token | Draw from permanent pool |
| `/draw/limited` | POST | Token | Draw from limited pool |
| `/user/craft` | POST | Token | Craft cards |
| `/shop/buy` | POST | Token | Buy cards |
| `/game/dice` | POST | Token | Dice mini-game |
| `/admin/*` | POST | Password | Admin operations |

---

## Documentation

See `docs/` folder for development plans:
- `docs/AD_OPERATIONS_PLAN.md` - 广告与运营功能开发计划

---

## Best Practices

1. Always use parameterized queries (`.bind()`) to prevent SQL injection
2. Handle KV/D1/R2 errors gracefully with try-catch
3. Log errors to console for debugging
4. Use batch operations for multiple database changes
5. Cache expensive operations (user info, leaderboard)
6. Validate request body before processing
7. Return consistent error messages in Chinese
