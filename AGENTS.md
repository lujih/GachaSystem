# AGENTS.md - Development Guidelines for Chouka Gacha System

This file contains guidelines for agentic coding agents working on the Chouka Gacha System, a Cloudflare Workers-based gacha/collection game.

## Project Overview

- **Platform**: Cloudflare Workers with D1 (SQLite), KV, and R2 storage
- **Language**: JavaScript (ES2022)
- **Database**: SQLite with STRICT mode enabled
- **Authentication**: Session tokens + optional X-User-ID for read-only access
- **Configuration**: Layered config system (BUSINESS_CONFIG + TECHNICAL_CONFIG)

## Build & Development Commands

### Local Development
```bash
# Start local development server (requires wrangler CLI)
npx wrangler dev --local

# Execute database schema locally
npx wrangler d1 execute chouka --file=./schema.sql

# Run single test (if test framework is added)
npx wrangler dev --local --test=<test-name>
```

### Deployment
```bash
# Build and deploy to Cloudflare
npx wrangler deploy

# Preview deployment
npx wrangler preview --watch
```

### Database Management
```bash
# Execute SQL against remote database
npx wrangler d1 execute chouka --remote --file=./schema.sql

# Query database
npx wrangler d1 query chouka --remote "SELECT * FROM users LIMIT 10"
```

## Code Style Guidelines

### Import & Module Organization
- Use ES6 module exports (`export default`, `export const`)
- Group related functions and classes logically
- No external dependencies - pure Cloudflare Workers APIs

### Formatting & Structure
- Use 2-space indentation
- Maximum line length: 100 characters
- Function names: camelCase (`calculateLevelFromTotalExp`)
- Constants: UPPER_SNAKE_CASE (`CONFIG`, `DEFAULT_IMG`)
- Classes: PascalCase (`UserService`, `GachaService`)

### Error Handling
- Use try-catch blocks for async operations
- Return JSON responses with consistent structure: `{ success: boolean, error?: string, data?: any }`
- Log errors with `console.error()` but don't expose internal details to users
- HTTP status codes: 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)

### Database Patterns
- Use parameterized queries to prevent SQL injection
- Always handle D1 query results properly (check `.results` property)
- Use batch operations for multiple related updates
- Foreign key constraints are enabled (PRAGMA foreign_keys = ON)

### Security Practices
- Hash passwords with PBKDF2 (100,000 iterations, SHA-256)
- Use crypto.randomUUID() for session tokens
- Never expose secrets or sensitive data
- Validate all user inputs (file types, sizes, numeric ranges)
- Use environment variables for configuration (admin token, GitHub token, etc.)

### Configuration Management
- Layered config system: BUSINESS_CONFIG + TECHNICAL_CONFIG
- Use CONFIG object for all runtime settings
- Time-to-live (TTL) values defined in TECHNICAL_CONFIG.TTL
- Keys and constants defined in TECHNICAL_CONFIG.KEYS

### Time Handling
- All times stored in UTC ISO strings
- Use Beijing time (UTC+8) for user-facing operations:
  - `getBeijingTime()` - returns Date object
  - `getBeijingDateStr()` - returns YYYY-MM-DD string
  - `getBeijingISOString()` - returns ISO string in Beijing time
  - `utcToBeijing()` - converts UTC string to Beijing Date

### File Upload & Storage
- Validate file types: image/jpeg, image/png, image/gif, image/webp
- Maximum file size: 5MB
- Upload to GitHub via GitHub API, then serve via CDN
- Use R2 for image storage with proper caching headers

### Caching Strategy
- KV_CACHE for session data (7-day TTL)
- User info cache (60-second TTL)
- Inventory cache (60-second TTL)
- Buffer slots for global image caching (10 slots)

### API Design Patterns
- RESTful routes with consistent naming
- Use JSON for request/response bodies
- Include X-Cache-Status header when returning cached data
- Handle CORS preflight (OPTIONS) requests

### Testing Guidelines
- Test user authentication flows
- Test database operations with proper cleanup
- Test error handling for invalid inputs
- Test time-based operations (check-in, cooldowns)
- Test file upload and storage workflows

## Common Patterns

### User Authentication
```javascript
const token = request.headers.get('X-Session-Token');
if (token) {
  const userDataStr = await env.KV_CACHE.get(`session:${token}`);
  if (userDataStr) {
    currentUser = JSON.parse(userDataStr);
  }
}
```

### Database Query Pattern
```javascript
const result = await this.env.DB.prepare(sql).bind(params).first();
if (result) {
  return result;
}
```

### JSON Response Helper
```javascript
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}
```

### Error Response Pattern
```javascript
try {
  // operation
  return jsonResponse({ success: true, data });
} catch (err) {
  console.error('Operation Error:', err);
  return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
}
```

## Important Notes

- Never commit secrets or tokens to version control
- Always validate user inputs before processing
- Use Beijing time for user-facing date operations
- Handle database errors gracefully and provide meaningful error messages
- Follow the layered configuration pattern for all new settings
- Test thoroughly in local development before deploying
- Use proper error codes and messages for API consumers