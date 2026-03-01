/**
 * Chouka 抽卡系统 - 主入口文件
 * 模块化版本
 */

import { CONFIG, DEFAULT_CHANGELOG, BUSINESS_CONFIG, TECHNICAL_CONFIG } from './config/index.js';
import { getBeijingTime, getBeijingDateStr, getBeijingISOString, utcToBeijing, normalizePath } from './utils/time.js';
import { jsonResponse, safeJsonParse, requireAdmin, calculateHash } from './utils/response.js';
import { UserService } from './services/user-service.js';

export { CONFIG, DEFAULT_CHANGELOG, BUSINESS_CONFIG, TECHNICAL_CONFIG };
export { getBeijingTime, getBeijingDateStr, getBeijingISOString, utcToBeijing, normalizePath };
export { jsonResponse, safeJsonParse, requireAdmin, calculateHash };
export { UserService };

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function uploadToGithub(env, path, content, extension, message) {
  try {
    const githubToken = env.GITHUB_TOKEN;
    const repoOwner = env.GITHUB_OWNER || TECHNICAL_CONFIG.GITHUB.OWNER;
    const repoName = env.GITHUB_REPO || TECHNICAL_CONFIG.GITHUB.REPO;

    if (!githubToken) {
      console.error('[GitHub Upload] Missing GITHUB_TOKEN');
      return { error: 'GitHub Token 未配置，请在 CF 后台环境变量中设置 GITHUB_TOKEN' };
    }

    let base64Content;
    try {
      base64Content = arrayBufferToBase64(content);
    } catch (e) {
      console.error('[GitHub Upload] Base64 encode error:', e);
      return { error: '图片编码处理失败，请更换其他图片' };
    }

    const apiUrl = `${TECHNICAL_CONFIG.GITHUB.API_BASE}/repos/${repoOwner}/${repoName}/contents/${path}`;

    const requestBody = {
      message: message,
      content: base64Content,
      branch: TECHNICAL_CONFIG.GITHUB.BRANCH
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[GitHub Upload] API Error:', response.status, response.statusText, errText);
      return { error: `GitHub API 错误: ${response.status}` };
    }

    const data = await response.json();
    const cdnUrl = `${TECHNICAL_CONFIG.GITHUB.CDN_BASE}/${repoOwner}/${repoName}/${TECHNICAL_CONFIG.GITHUB.BRANCH}/${path}`;
    console.log(`[GitHub Upload] Success: ${cdnUrl}`);
    return { success: true, url: cdnUrl };
  } catch (e) {
    console.error('[GitHub Upload] Network/Worker Error:', e);
    return { error: '上传失败，请稍后重试' };
  }
}

// Re-export GachaService for backward compatibility
// Note: GachaService is still in the main worker.js for now
// Users can gradually migrate it to src/services/gacha-service.js
export function createGachaService(env, ctx, userService) {
  return {
    env,
    ctx,
    userService,
    CONFIG: CONFIG,
    TECHNICAL_CONFIG: TECHNICAL_CONFIG
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = normalizePath(url.pathname);

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-User-ID' 
        }
      });
    }

    const token = request.headers.get('X-Session-Token');
    let currentUser = null;
    if (token) {
      const userDataStr = await env.KV_CACHE.get(`session:${token}`);
      if (userDataStr) {
        currentUser = JSON.parse(userDataStr);
      }
    }
    
    if (!currentUser && request.headers.get('X-User-ID')) {
      const uidName = request.headers.get('X-User-ID');
      const user = await env.DB.prepare('SELECT id, username, nickname, coins, level, exp, total_exp FROM users WHERE username = ?').bind(uidName).first();
      if(user) currentUser = user;
    }

    const userService = new UserService(env, ctx);

    const handleRoute = async (handler) => {
      try {
        return await handler();
      } catch (err) {
        console.error('Route Error:', err);
        return jsonResponse({ error: '服务器内部错误' }, 500);
      }
    };

    // Routes are handled in worker.js for now
    // This file provides the module infrastructure
    return jsonResponse({ error: 'Not implemented in modular version yet' }, 501);
  }
};
