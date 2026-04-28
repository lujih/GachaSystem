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

  const multiDraw = useCallback(async (count = 10) => {
    setDrawing(true);
    try {
      const result = await api.multiDraw(count);
      setLastDraw(result);
      return result;
    } finally {
      setDrawing(false);
    }
  }, []);

  const drawLimited = useCallback(async (poolId) => {
    setDrawing(true);
    try {
      const result = await api.drawLimited(poolId);
      setLastDraw(result);
      return result;
    } finally {
      setDrawing(false);
    }
  }, []);

  return { drawing, lastDraw, draw, multiDraw, drawLimited, clearDraw: () => setLastDraw(null) };
}
