
---

# 🎲 Serverless Anime Gacha System

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Database-D1_(SQLite)-blue)
![Cloudflare KV](https://img.shields.io/badge/Storage-KV-orange)
![Cloudflare R2](https://img.shields.io/badge/Assets-R2-green)
![License](https://img.shields.io/badge/license-MIT-green)

A full-stack, lightweight, and transactional Gacha (Summoning) Game engine running entirely on **Cloudflare Workers**. It features a serverless architecture using **D1** for consistent user data, **KV** for high-speed caching, and **R2** for asset storage.

## ✨ Features

*   **User System**: Secure Registration & Login with session management (KV-cached authentication).
*   **Gacha Mechanics**:
    *   **Standard Pool**: Regular summoning with rarity probabilities.
    *   **Limited Pool**: Special events with higher costs and exclusive logic.
    *   **Asset Management**: Auto-fetches anime images from external APIs and stores them persistently in **Cloudflare R2**.
*   **Economy System**:
    *   **Currency**: Earn coins by drawing or winning mini-games.
    *   **Shop**: Buy specific rarity card packs.
    *   **Crafting**: Synthesis system (Burn 5 low-tier cards to get 1 high-tier card).
*   **Mini-Game**: "Big or Small" dice gambling to earn extra coins.
*   **Data Integrity**: Uses **D1 Transactions (Batch)** to ensure coins and inventory are always in sync.
*   **Social & Admin**:
    *   **Gallery**: Browse collected cards (lazy loading supported).
    *   **Leaderboard**: Real-time latest draws.
    *   **Admin Panel**: Manage users, edit changelogs, and publish announcements.
*   **I18n**: Built-in support for **English** and **Chinese (Simplified)**.

## 🛠 Tech Stack

*   **Runtime**: Cloudflare Workers
*   **Database**: Cloudflare D1 (SQLite) - *Stores Users, Inventory, Logs*
*   **Cache/Session**: Cloudflare KV - *Stores Sessions, Preload Buffers, Leaderboards*
*   **Object Storage**: Cloudflare R2 - *Stores Card Images*
*   **Frontend**: Vanilla HTML/CSS/JS (Embedded in Worker, Single File)

## 🚀 Deployment Guide

### Prerequisites

1.  A Cloudflare Account.
2.  Node.js and npm installed.
3.  [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed (`npm install -g wrangler`).

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
```

### 2. Create Cloudflare Resources

Run the following commands to create the necessary resources in your Cloudflare account:

```bash
# Login to Cloudflare
wrangler login

# Create D1 Database
wrangler d1 create gacha-db

# Create KV Namespaces
wrangler kv:namespace create "KV_CACHE"
wrangler kv:namespace create "RECENT_REQUESTS"

# Create R2 Bucket
wrangler r2 bucket create gacha-images
```

### 3. Configure `wrangler.toml`

Create or edit `wrangler.toml` in the root directory. **Replace the IDs with the ones generated in Step 2.**

```toml
name = "gacha-worker"
main = "src/worker.js"
compatibility_date = "2023-12-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "gacha-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"

# KV Namespaces
[[kv_namespaces]]
binding = "KV_CACHE"
id = "YOUR_KV_CACHE_ID_HERE"

[[kv_namespaces]]
binding = "RECENT_REQUESTS"
id = "YOUR_RECENT_REQUESTS_ID_HERE"

# R2 Bucket
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "gacha-images"

# Admin Password
[vars]
admin = "your_secure_admin_password"
```

### 4. Initialize Database Schema

Execute the SQL schema to create the required tables in D1.

Create a file named `schema.sql`:

```sql
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS logs;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 1000,
    draw_count INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    created_at INTEGER
);

CREATE TABLE inventory (
    user_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, rarity)
);

CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    detail TEXT,
    rarity TEXT,
    created_at INTEGER
);

CREATE INDEX idx_inv_user ON inventory(user_id);
CREATE INDEX idx_logs_user ON logs(user_id);
```

Apply the schema to your D1 database:

```bash
# For local development
wrangler d1 execute gacha-db --local --file=./schema.sql

# For production deployment
wrangler d1 execute gacha-db --file=./schema.sql
```

### 5. R2 Domain Setup

1.  Go to the Cloudflare Dashboard > R2 > Select your bucket (`gacha-images`).
2.  Go to **Settings** > **Public Access**.
3.  Connect a Custom Domain (e.g., `assets.yourdomain.com`) OR allow R2.dev subdomain.
4.  **Important**: Update the `R2_DOMAIN` constant in `src/worker.js` with this domain:

```javascript
const CONFIG = {
  // ...
  R2_DOMAIN: "https://assets.yourdomain.com", 
  // ...
};
```

### 6. Deploy

```bash
wrangler deploy
```

Your Gacha game is now live! 🚀

## ⚙️ Configuration

You can customize the game balance and sources in `src/worker.js` under the `CONFIG` object:

*   **SOURCES**: Add/Remove API endpoints for image generation.
*   **GAME.POINTS**: Change points earned per rarity.
*   **GAME.SHOP**: Adjust shop prices.
*   **GAME.DICE**: Adjust gambling limits.

## 🕹️ Admin Panel

Access the admin panel by clicking **"User Profile"** -> **"Admin Panel"**.
Enter the password you set in `wrangler.toml` (under `[vars] admin`).

*   **Changelog Editor**: Update the visible changelog.
*   **User Manager**: View stats, modify coins, or ban users.
*   **Announcements**: Push global notifications.

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](LICENSE)