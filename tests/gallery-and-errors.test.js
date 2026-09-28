/**
 * P2 修复的回归测试：图库查询分页边界、用户维度越权、错误信息泄露
 */
import { describe, it, expect } from 'vitest';
import { GalleryService } from '../src/services/gallery-service.js';
import { errorMiddleware } from '../functions/api/middleware/error.js';
import { AppError } from '../src/utils/AppError.js';

/** 记录 SQL 与绑定参数的最小 D1 stub */
function makeD1() {
  const log = [];
  return {
    log,
    prepare(sql) {
      const entry = { sql, args: null };
      log.push(entry);
      const stmt = {
        bind: (...args) => { entry.args = args; return stmt; },
        run: async () => ({ meta: { changes: 1 } }),
        first: async () => ({ total: 0 }),
        all: async () => ({ results: [] }),
      };
      return stmt;
    },
    batch: async () => [],
  };
}

const service = () => {
  const DB = makeD1();
  return { svc: new GalleryService({ DB }), DB };
};

const limitArgOf = (DB) => {
  const stmt = DB.log.find((e) => /LIMIT \? OFFSET \?/.test(e.sql));
  return stmt ? stmt.args[stmt.args.length - 2] : null;
};

describe('GalleryService.listItems 分页边界', () => {
  it('负数 limit 被夹到 1（SQLite 中 LIMIT 负值等价于无上限）', async () => {
    const { svc, DB } = service();
    await svc.listItems({ limit: -1 });
    expect(limitArgOf(DB)).toBeGreaterThanOrEqual(1);
  });

  it('超大 limit 被夹到 100', async () => {
    const { svc, DB } = service();
    await svc.listItems({ limit: 100000 });
    expect(limitArgOf(DB)).toBe(100);
  });

  it('page 为 0/负数/非数字时归一为 1，offset 不为负', async () => {
    for (const page of [0, -5, 'abc']) {
      const { svc, DB } = service();
      const res = await svc.listItems({ page });
      const stmt = DB.log.find((e) => /LIMIT \? OFFSET \?/.test(e.sql));
      expect(stmt.args[stmt.args.length - 1]).toBeGreaterThanOrEqual(0);
      expect(res.page).toBe(1);
    }
  });
});

describe('GalleryService.listMyItems 越权防护', () => {
  it('身份取自会话：bookmarks 模式把 userId 写进 JOIN 条件', async () => {
    const { svc, DB } = service();
    await svc.listMyItems(42, 'bookmarks', {});
    const stmt = DB.log.find((e) => /card_bookmarks/.test(e.sql));
    expect(stmt).toBeDefined();
    expect(stmt.args[0]).toBe(42);
  });

  it('mine 模式把 userId 写进 WHERE 条件', async () => {
    const { svc, DB } = service();
    await svc.listMyItems(42, 'mine', {});
    expect(DB.log.some((e) => /g\.user_id = \?/.test(e.sql))).toBe(true);
  });

  it('忽略调用方传入的 userId，不允许越权查看他人', async () => {
    const { svc, DB } = service();
    // 即使攻击者传 userId=999，会话身份 42 仍必须胜出
    await svc.listMyItems(42, 'mine', { userId: '999' });
    const cond = DB.log.find((e) => /g\.user_id = \?/.test(e.sql));
    expect(cond.args[0]).toBe(42);
  });

  it('用户维度结果标记为 private, no-store', async () => {
    const { svc } = service();
    const res = await svc.listMyItems(42, 'mine', {});
    expect(res.cacheHeaders['Cache-Control']).toBe('private, no-store');
  });
});

describe('errorMiddleware 不泄露内部细节', () => {
  const fakeC = () => {
    const captured = {};
    return {
      c: { json: (body, status) => { captured.body = body; captured.status = status; return captured; } },
      captured,
    };
  };

  it('AppError 透传 message 与 code', () => {
    const { c, captured } = fakeC();
    errorMiddleware(AppError.validationError('积分不足'), c);
    expect(captured.body).toEqual({ success: false, error: '积分不足', code: 'VALIDATION_ERROR' });
    expect(captured.status).toBe(400);
  });

  it('非预期错误不回吐原始 message，且带 code', () => {
    const { c, captured } = fakeC();
    const err = new Error('D1_ERROR: no such column: draw_histry (CHECK constraint failed: count >= 0)');
    errorMiddleware(err, c);

    expect(captured.status).toBe(500);
    expect(captured.body.code).toBe('INTERNAL_ERROR');
    // 回归点：修复前直接把 err.message 返回客户端，泄露表名/列名/约束名
    expect(captured.body.error).not.toContain('no such column');
    expect(captured.body.error).not.toContain('CHECK constraint');
    expect(captured.body.error).toBe('服务器内部错误');
  });

  it('JSON 解析失败仍返回 400 INVALID_JSON', () => {
    const { c, captured } = fakeC();
    errorMiddleware(new SyntaxError('Unexpected token }'), c);
    expect(captured.status).toBe(400);
    expect(captured.body.code).toBe('INVALID_JSON');
  });
});
