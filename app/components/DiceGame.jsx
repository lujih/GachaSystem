import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';

export default function DiceGame() {
  const { user, refreshUser } = useAuth();
  const [betAmount, setBetAmount] = useState(10);
  const [prediction, setPrediction] = useState('big');
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);

  async function handlePlay() {
    setPlaying(true);
    setResult(null);
    try {
      const res = await api.playDice(betAmount, prediction);
      setResult(res);
      await refreshUser();
    } catch (e) {
      setResult({ error: e.message });
    }
    setPlaying(false);
  }

  return (
    <Card className="glass border-indigo-200/50 overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🎲</span> 骰子猜大小
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">投注金额</label>
            <Input
              type="number"
              value={betAmount}
              onChange={e => setBetAmount(Number(e.target.value))}
              min={10}
              max={1000}
              className="bg-white/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">预测</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={prediction === 'big' ? 'default' : 'outline'}
                onClick={() => setPrediction('big')}
                className={prediction === 'big' ? 'gradient-primary text-white' : 'bg-white/50'}
              >
                大 (6-12)
              </Button>
              <Button
                variant={prediction === 'small' ? 'default' : 'outline'}
                onClick={() => setPrediction('small')}
                className={prediction === 'small' ? 'gradient-primary text-white' : 'bg-white/50'}
              >
                小 (2-5)
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePlay}
          disabled={playing}
          className="w-full h-12 text-lg gradient-primary text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {playing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">🎲</span> 投掷中...
            </span>
          ) : (
            <span>🎲 下注 {betAmount} 积分</span>
          )}
        </Button>

        {result && !result.error && (
          <Card className="bg-white/50 border-white/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{result.roll1}</span>
                </div>
                <span className="text-2xl">+</span>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{result.roll2}</span>
                </div>
                <span className="text-2xl">=</span>
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <span className="text-white text-2xl font-black">{result.sum}</span>
                </div>
              </div>

              <p className={`text-lg font-bold ${result.reward > result.cost ? 'text-emerald-600' : 'text-gray-500'}`}>
                {result.reward > result.cost ? `🎉 +${result.reward - result.cost} 积分` : '😅 下次好运！'}
              </p>

              <p className="text-sm text-gray-500 mt-1">{result.message}</p>
            </CardContent>
          </Card>
        )}

        {result?.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {result.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
