# AGENTS.md - Agentic Coding Guidelines

## Project Overview
This is a Cloudflare Workers project (Gacha card game system) using vanilla JavaScript.
Architecture: Single-file worker with service classes (UserService, GachaService).

## Build/Deploy Commands

```bash
# Local development
npx wrangler dev --local

# Deploy to production
npx wrangler deploy

# Initialize database
npx wrangler d1 execute chouka --remote --file=./schema.sql
```

## Code Style Guidelines

### Formatting
- Indentation: 2 spaces
- Max line length: 100 characters
- Use trailing commas in multi-line objects/arrays
- Semicolons: required

### Naming Conventions
- Constants: `UPPER_SNAKE_CASE` (e.g., `CONFIG`, `DEFAULT_CHANGELOG`)
- Classes: `PascalCase` (e.g., `UserService`, `GachaService`)
- Functions/Methods: `camelCase` (e.g., `calculateLevelProgress`)
- Variables: `camelCase`
- Private methods: prefix with underscore `_privateMethod`

### Imports & Structure
- No external imports (Cloudflare Workers runtime only)
- Service classes initialized in main handler
- Configuration at top of file in layered structure

### Error Handling
- Use `try/catch` blocks in route handlers
- Return JSON error responses with appropriate HTTP status codes:
  ```javascript
  return jsonResponse({ error: 'Error message' }, 500);
  ```
- Always log errors with `console.error()`
- Check user authentication before operations

### Response Pattern
```javascript
// Success
return jsonResponse({ success: true, data: ... });

// Error
return jsonResponse({ error: 'Message' }, statusCode);
```

### Database Patterns
- Use parameterized queries with `.bind()`
- Use transactions (`.batch()`) for multi-step operations
- Invalidate KV cache after DB writes: `await this.invalidateUserCache(userId)`
- Check `result.meta.changes` for update verification

### Service Class Structure
```javascript
class ServiceName {
  constructor(env, ctx) {
    this.env = env;
    this.ctx = ctx;
  }
  
  async methodName(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    // Implementation
  }
}
```

### Configuration
- Business config in `BUSINESS_CONFIG` object
- Technical config in `TECHNICAL_CONFIG` object
- Merged into unified `CONFIG` object for backward compatibility

### Route Handling
- Routes defined in routes object: `'METHOD /path': () => handler()`
- Path normalization required: remove trailing slashes
- Authentication via `X-Session-Token` header
- Optional debug auth via `X-User-ID` header

## Testing
No test suite configured. Test manually via curl or deploy and verify.

## Environment Variables
Set in Cloudflare Dashboard:
- `admin` (Secret) - Admin password
- `R2_DOMAIN` (Var) - Optional R2 public domain

## Bindings
- KV: `KV_CACHE`, `RECENT_REQUESTS`
- D1: `DB`
- R2: `R2_BUCKET`

## Development Workflow

### Adding New Features
1. Add configuration to `BUSINESS_CONFIG` or `TECHNICAL_CONFIG`
2. Create new route in routes object using `'METHOD /path': () => handler()`
3. Implement logic in existing service or create new service class
4. Add parameterized DB queries with `.bind()`
5. Invalidate cache after writes
6. Return standardized JSON responses

### API Design Guidelines
- Public endpoints: No authentication required
- User endpoints: Require `X-Session-Token` header
- Admin endpoints: Validate `password` in request body against `env.admin`
- Optional timezone support: Accept `X-User-Timezone` header (+/-HH:MM format)

### Error Response Codes
- 200: Success
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate/constraint violation)
- 500: Internal Server Error

### Database Schema Updates
1. Modify `schema.sql` with new tables/indexes
2. Test locally first if possible
3. Apply to production: `npx wrangler d1 execute chouka --remote --file=./schema.sql`
4. Consider backward compatibility for existing data

### Best Practices
- Always use `await` for async operations
- Validate user input before DB operations
- Use transactions for multi-step operations
- Keep sensitive logic server-side
- Log errors for debugging but don't expose internals to client