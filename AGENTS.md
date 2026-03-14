# AGENTS.md - Chouka Gacha System

## Project Overview

Chouka is a Cloudflare Workers-based gacha (card draw) system using Workers, D1 (SQLite), KV storage, and R2. It's written in plain JavaScript (ES Modules).

---

## Build & Deployment Commands

### Local Development
```bash
# Local development with local KV/D1
npx wrangler dev --local

# Use remote D1 (requires .dev.vars configured)
npx wrangler dev
```

### Deploy to Cloudflare
```bash
# Deploy to production
npx wrangler deploy

# Deploy to a specific environment
npx wrangler deploy --env staging
```

### Database
```bash
# Initialize/reset D1 database
npx wrangler d1 execute chouka --remote --file=./schema.sql

# Execute SQL directly
npx wrangler d1 execute chouka --remote --command="SELECT * FROM users"

# List tables
npx wrangler d1 execute chouka --remote --command=".tables"
```

### Testing
- **No test framework is currently configured** for this project
- Test new functionality manually using `wrangler dev` or Cloudflare Dashboard
- For unit testing individual functions, you can:
  1. Create temporary test files in a `/test` directory
  2. Import and test functions directly using Node.js
  3. Use `wrangler dev` to test endpoints locally
- Example manual testing approach:
  ```bash
  # Start local development server
  npx wrangler dev --local
  
  # In another terminal, test endpoints:
  curl http://localhost:8787/user/info -H "X-Session-Token: your-token"
  ```

### Linting & Formatting
- **No automated linting/formatting tools are currently configured**
- Follow the code style guidelines in this document
- Recommended setup for contributors:
  - Install Prettier: `npm install --save-dev prettier`
  - Install ESLint: `npm install --save-dev eslint`
  - Configure according to the guidelines below
- Manual code review should focus on:
  - Consistent naming conventions
  - Proper error handling
  - Correct use of ES modules
  - Following Cloudflare Workers best practices

---

## Code Style Guidelines

### Language & Standards
- **JavaScript ES Modules** (`.js` files with ES module imports)
- **No TypeScript** - use JSDoc comments for complex types if needed
- Target: **Cloudflare Workers runtime** (recent compatibility date)
- Avoid Node.js specific APIs that aren't available in Workers
- Use global fetch API (available in Workers) instead of node-fetch or similar

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Functions/variables | `camelCase` | `handleRoute`, `currentUser` |
| Classes | `PascalCase` | `UserService`, `GachaService` |
| Constants | `UPPER_SNAKE_CASE` | `CONFIG`, `TTL`, `BUSINESS_CONFIG` |
| File names | `kebab-case` | `user-service.js`, `response.js` |
| Acronyms in names | Treat as single word (e.g., `getXMLData`, `parseHTMLResponse`) |

### Import/Export Style
```javascript
// Named exports preferred
import { CONFIG, DEFAULT_CHANGELOG } from './config/index.js';
import { jsonResponse, safeJsonParse } from './src/utils/response.js';

// Destructure imports for clarity
import { getBeijingTime, getBeijingISOString } from './src/utils/time.js';

// Class exports
export class UserService { 
  constructor() { 
    // ... 
  } 
}

// Default export only for main worker entry point
export default {
  async fetch(request, env, ctx) {
    // ...
  }
};
```

### Formatting
- **Indentation**: 2 spaces (not tabs)
- **Line length**: Maximum 100 characters (prefer 80 for readability)
- **Semicolons**: Always use semicolons to terminate statements
- **Commas**: Trailing commas in multi-line objects/arrays when it aids readability
- **Braces**: 
  - Opening brace on same line as statement
  - Closing brace on its own line
  - Example: `if (condition) {` followed by content, then `}`
- **Control flow**: Space after keywords (`if`, `for`, `while`, etc.)
- **Functions**: Space between function name and opening parenthesis only for named functions, not calls
- **Objects**: Space after colon in object properties
- **Template literals**: Prefer for string interpolation

### Types & Documentation
- Use JSDoc for complex types and function documentation:
  ```javascript
  /**
   * Calculates the total price with tax
   * @param {number} price - Base price
   * @param {number} taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
   * @returns {number} Total price including tax
   */
  function calculateTotalWithTax(price, taxRate) {
    return price * (1 + taxRate);
  }
  ```
- For simple types, rely on descriptive variable names
- Document function parameters, return values, and potential exceptions
- Use `@typedef` for complex reusable types
- Document event handlers and callbacks thoroughly

### Error Handling
- Always wrap route handlers in try/catch
- Return proper HTTP status codes (400, 401, 403, 404, 500)
- Use `jsonResponse({ error: 'message' }, statusCode)`
- Log errors to console with context: `console.error('Route Error:', err)`
- Don't expose internal error details in production responses
- Handle promise rejections appropriately:
  ```javascript
  // Good
  async function handler() {
    try {
      const result = await riskyOperation();
      return jsonResponse({ data: result });
    } catch (err) {
      console.error('Operation failed:', err);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  }
  
  // Avoid
  async function handler() {
    const result = await riskyOperation(); // Unhandled rejection possible
    return jsonResponse({ data: result });
  }
  ```

```javascript
const handleRoute = async (handler) => {
  try {
    return await handler();
  } catch (err) {
    console.error('Route Error:', err);
    // In development, you might want more details
    if (TECHNICAL_CONFIG.DEBUG) {
      return jsonResponse({ error: err.message }, 500);
    }
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
};
```

### Database (D1)
- Use parameterized queries: `.bind(...).first()` or `.bind(...).all()`
- Prefer `Promise.all` for independent queries
- Use batches for multi-statement operations
- Always check for null/undefined results from `.first()`
- Use explicit column selection instead of `SELECT *` when possible
- Consider indexing strategies for frequently queried columns

```javascript
// Good parameterized query
const user = await env.DB.prepare(
  'SELECT id, username, email FROM users WHERE username = ? AND active = 1'
).bind(username).first();

// Handle potential null result
if (!user) {
  return jsonResponse({ error: 'User not found' }, 404);
}

// Batch operations for efficiency
await env.DB.batch([
  env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now, userId),
  env.DB.prepare('INSERT INTO login_history (user_id, login_time) VALUES (?, ?)').bind(userId, now)
]);
```

### Caching (KV)
- Cache expensive queries with appropriate TTL
- Use JSON serialization for complex objects
- Handle cache invalidation on data changes
- Consider cache stampede protection for high-traffic scenarios
- Use meaningful key names with consistent prefixes
- Monitor KV usage to avoid unexpected costs

```javascript
// Good caching pattern with error handling
async function getUserData(userId) {
  const cacheKey = `user:profile:${userId}`;
  
  // Try cache first
  let cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Corrupted cache, continue to fetch fresh data
      console.warn('Cache corruption detected for', cacheKey);
    }
  }
  
  // Fetch from database
  const user = await env.DB.prepare(
    'SELECT id, username, email FROM users WHERE id = ?'
  ).bind(userId).first();
  
  if (!user) {
    return null;
  }
  
  // Cache for future requests
  await env.KV_CACHE.put(cacheKey, JSON.stringify(user), { expirationTtl: 300 }); // 5 minutes
  
  return user;
}

// Cache invalidation on update
async function updateUser(userId, updates) {
  await env.DB.prepare(
    'UPDATE users SET email = ?, username = ? WHERE id = ?'
  ).bind(updates.email, updates.username, userId).run();
  
  // Invalidate cache
  await env.KV_CACHE.delete(`user:profile:${userId}`);
}
```

### Response Format
Use the `jsonResponse` utility from `./src/utils/response.js`:

```javascript
// Basic response
return jsonResponse({ success: true });

// With status code
return jsonResponse({ error: 'Not found' }, 404);

// With custom headers
return jsonResponse(data, 200, { 'X-Cache-Status': 'HIT' });

// Error responses should follow consistent format
return jsonResponse({ 
  error: 'Validation failed', 
  details: ['Email is required', 'Password must be at least 8 characters'] 
}, 400);

// Success responses with data
return jsonResponse({ 
  data: userData, 
  meta: { 
    timestamp: getBeijingISOString(),
    version: '1.0.0'
  } 
});
```

### API Design
- **Authentication**: Token via `X-Session-Token` header
- **Debug mode**: `X-User-ID` header (development only)
- **Admin routes**: Include `password` in request body, compare against `env.admin`
- **Route format**: `METHOD /path` (e.g., `GET /user/info`, `POST /auth/login`)
- **HTTP Methods**: Use appropriate methods (GET for retrieval, POST for creation, etc.)
- **Status Codes**: Follow REST conventions:
  - 200: Success (GET, PUT, PATCH)
  - 201: Created (POST)
  - 204: No Content (DELETE)
  - 400: Bad Request (validation errors)
  - 401: Unauthorized (missing/invalid auth)
  - 403: Forbidden (authenticated but insufficient permissions)
  - 404: Not Found
  - 429: Too Many Requests (rate limiting)
  - 500: Internal Server Error
- **Versioning**: Consider API versioning in path (e.g., `/api/v1/users`)
- **Idempotency**: Design POST/PUT/PATCH operations to be idempotent when possible
- **Pagination**: For list endpoints, support limit/offset or cursor-based pagination
- **Filtering/Sorting**: Support query parameters for filtering and sorting results
- **CORS**: Configure appropriately for your frontend domains

### Project Structure
```
.
├── worker.js          # Main entry point (handles all routes)
├── src/
│   ├── config/        # Configuration (business.js, technical.js)
│   │   ├── index.js   # Exports all config
│   │   ├── business.js # Business logic constants
│   │   └── technical.js # Technical feature flags
│   ├── services/      # Business logic (UserService, GachaService)
│   │   ├── user-service.js
│   │   ├── gacha-service.js
│   │   └── index.js   # Service exports
│   ├── utils/         # Utilities (response.js, time.js)
│   │   ├── response.js # HTTP response helpers
│   │   ├── time.js     # Beijing time utilities
│   │   └── index.js    # Utility exports
│   └── index.js       # Module re-exports (optional)
├── wrangler.toml      # Cloudflare config
├── schema.sql         # D1 database schema
└── README.md          # Project overview
```

### Configuration
- Business config: `./src/config/business.js`
- Technical config: `./src/config/technical.js`
- Import via `./src/config/index.js`
- Business rules and limits should be in business.js
- Feature flags and technical settings in technical.js
- Consider environment-specific overrides in wrangler.toml

---

## Environment Variables

Required in Cloudflare Dashboard (Workers → Settings → Variables):
- `admin` (Secret) - Admin password
- `GITHUB_TOKEN` (Secret) - GitHub PAT for image uploads
- `GITHUB_OWNER` (Var) - GitHub username (default: lujih)
- `GITHUB_REPO` (Var) - Image repository name
- `R2_DOMAIN` (Var) - R2 public access domain

Local development (.dev.vars):
```
# Copy .dev.vars.example to .dev.vars and fill in
ADMIN=your_admin_password
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_image_repo
R2_DOMAIN=your_r2_domain
```

---

## Common Development Patterns

### Adding a New Route
1. Add route in `worker.js` route table
2. Create handler function
3. Use `handleRoute()` wrapper for error handling
4. Consider adding to appropriate service if logic is complex

```javascript
'GET /new-endpoint': () => handleRoute(() => handleNewEndpoint()),

// Handler function
async function handleNewEndpoint() {
  // Extract request data
  const { searchParams } = new URL(request.url);
  const paramValue = searchParams.get('param');
  
  // Validate input
  if (!paramValue) {
    return jsonResponse({ error: 'Missing required parameter' }, 400);
  }
  
  // Business logic
  const result = await someOperation(paramValue);
  
  // Return response
  return jsonResponse({ data: result });
}
```

### Adding a New Service Method
1. Add method to appropriate service class in `src/services/`
2. Follow naming: `async methodName(currentUser, request?)`
3. Return `jsonResponse(...)` with proper status codes
4. Handle authentication/authorization in the method if needed
5. Export the method from the service index.js

```javascript
// In user-service.js
async getUserStats(currentUser) {
  if (!currentUser) {
    return jsonResponse({ error: 'Authentication required' }, 401);
  }
  
  const stats = await env.DB.prepare(
    'SELECT COUNT(*) as draw_count, SUM(cost) as total_spent FROM draws WHERE user_id = ?'
  ).bind(currentUser.id).first();
  
  return jsonResponse({ data: stats });
}

// In services/index.js
export { UserService } from './user-service.js';
export { GachaService } from './gacha-service.js';
```

### Working with Time
Use Beijing time utilities from `./src/utils/time.js`:
```javascript
import { getBeijingTime, getBeijingDateStr, getBeijingISOString, utcToBeijing } from './src/utils/time.js';

const now = getBeijingTime();
const dateStr = getBeijingDateStr(now); // "2026-03-14"
const isoString = getBeijingISOString(now); // "2026-03-14T10:30:00+08:00"

// Convert UTC time to Beijing time
const utcTime = new Date('2026-03-14T02:30:00Z');
const beijingTime = utcToBeijing(utcTime); // "2026-03-14T10:30:00+08:00"
```

### Handling File Uploads to R2
When uploading files to R2 storage:
```javascript
import { v4 as uuidv4 } from 'uuid';

async function uploadFileToR2(fileBuffer, fileName, env) {
  // Generate unique filename to avoid collisions
  const extension = fileName.split('.').pop();
  const uniqueName = `${uuidv4()}.${extension}`;
  
  // Upload to R2
  await env.R2_BUCKET.put(uniqueName, fileBuffer, {
    httpMetadata: {
      contentType: getContentType(extension) // Implement this helper
    }
  });
  
  // Return public URL
  return `https://${env.R2_DOMAIN}/${uniqueName}`;
}
```

### GitHub Integration for Image Storage
When using GitHub for image storage (as configured):
```javascript
import { uploadToGithub } from './src/services/gacha-service.js';

// In your handler
async function handleImageUpload(request, env) {
  const data = await request.formData();
  const file = data.get('file');
  
  if (!file) {
    return jsonResponse({ error: 'No file provided' }, 400);
  }
  
  const buffer = await file.arrayBuffer();
  
  try {
    const uploadResult = await uploadToGithub(
      Buffer.from(buffer),
      file.name,
      env
    );
    
    return jsonResponse({ 
      data: {
        url: uploadResult.url,
        filename: uploadResult.filename
      }
    });
  } catch (error) {
    console.error('GitHub upload failed:', error);
    return jsonResponse({ error: 'Image upload failed' }, 500);
  }
}
```

### Background Tasks with ctx.waitUntil
For non-blocking operations:
```javascript
export default {
  async fetch(request, env, ctx) {
    // ... handle request
    
    // Schedule background task (won't block response)
    ctx.waitUntil(
      env.DB.prepare(
        'INSERT INTO analytics (endpoint, timestamp, user_id) VALUES (?, ?, ?)'
      ).bind(pathname, getBeijingISOString(), currentUser?.id).run()
    );
    
    return response;
  }
};
```

### Rate Limiting Pattern
Basic rate limiting implementation:
```javascript
// Simple in-memory rate limiting (for single instance)
// For production, consider using Redis or similar
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [timestamp] of rateLimitMap.keys()) {
    if (timestamp < windowStart) {
      rateLimitMap.delete(timestamp);
    }
  }
  
  // Get requests for this IP in current window
  const requests = Array.from(rateLimitMap.entries())
    .filter(([timestamp, requestIp]) => 
      timestamp >= windowStart && requestIp === ip)
    .length;
  
  if (requests >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  // Add current request
  rateLimitMap.set(now, ip);
  return false;
}

// In handler
const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
if (isRateLimited(ip)) {
  return jsonResponse({ error: 'Too many requests' }, 429);
}
```