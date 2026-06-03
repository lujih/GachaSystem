import { useState, useCallback } from 'react';
import { api } from '~/lib/api';

export function useGacha() {
  const [drawing, setDrawing] = useState(false);
  const [lastDraw, setLastDraw] = useState(null);

  const draw = useCallback(async () => {
    setDrawing(true);
    try {
      const result = await api.draw();
      setLastDraw(result);
      return result;
    } finally {
      setDrawing(false);
    }
  }, []);

  // 十连抽：并行调用 10 次单抽，合并结果
  const multiDraw = useCallback(async (count = 10) => {
    setDrawing(true);
    try {
      const results = await Promise.all(
        Array.from({ length: count }, () => api.draw())
      );
      // 合并为 cards 数组格式
      const cards = results.map(r => ({
        rarity: r.rarity || r.card?.rarity || 'N',
        asset: r.card || null,
        isPity: r.isPity || false,
        pityInfo: r.pityInfo || null,
      }));
      const totalExp = results.reduce((s, r) => s + (r.expGained || 0), 0);
      const lastResult = results[results.length - 1];
      const combined = {
        success: true,
        cards,
        count: cards.length,
        userCoins: lastResult?.userCoins,
        expGained: totalExp,
        levelUp: lastResult?.levelUp || null,
        pityInfo: lastResult?.pityInfo || null,
      };
      setLastDraw(combined);
      return combined;
    } finally {
      setDrawing(false);
    }
  }, []);

  // 限定池抽卡：并行调用多次单抽
  const drawLimited = useCallback(async (poolId, count = 1) => {
    setDrawing(true);
    try {
      if (count <= 1) {
        const result = await api.drawLimited(poolId, 1);
        setLastDraw(result);
        return result;
      }
      const results = await Promise.all(
        Array.from({ length: count }, () => api.drawLimited(poolId, 1))
      );
      const cards = results.map(r => {
        // drawLimited 返回 { cards: [...] } 或 { card, rarity }
        if (r.cards?.length) return r.cards[0];
        return { rarity: r.rarity || 'N', asset: r.card || null, isPity: r.isPity || false, pityInfo: r.pityInfo || null };
      });
      const totalExp = results.reduce((s, r) => s + (r.expGained || 0), 0);
      const lastResult = results[results.length - 1];
      const combined = {
        success: true,
        cards,
        count: cards.length,
        pool: lastResult?.pool,
        userCoins: lastResult?.userCoins,
        expGained: totalExp,
        levelUp: lastResult?.levelUp || null,
        pityInfo: lastResult?.pityInfo || null,
      };
      setLastDraw(combined);
      return combined;
    } finally {
      setDrawing(false);
    }
  }, []);

  const clearDraw = useCallback(() => setLastDraw(null), []);

  return { drawing, lastDraw, draw, multiDraw, drawLimited, clearDraw };
}
