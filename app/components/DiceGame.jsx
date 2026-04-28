import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

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
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>骰子猜大小</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>投注金额</label>
          <input className="input" type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} min={10} max={1000} style={{ marginTop: 4 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>预测</label>
          <select className="input" value={prediction} onChange={e => setPrediction(e.target.value)} style={{ marginTop: 4 }}>
            <option value="big">大 (6-12)</option>
            <option value="small">小 (2-5)</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" onClick={handlePlay} disabled={playing} style={{ width: '100%' }}>
        {playing ? '投掷中...' : `🎲 下注 ${betAmount} 积分`}
      </button>
      {result && !result.error && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: '1.5rem' }}>
            {result.roll1} + {result.roll2} = <strong>{result.sum}</strong>
          </p>
          <p style={{ color: result.reward > result.cost ? 'var(--success)' : 'var(--text-light)', fontWeight: 600 }}>
            {result.reward > result.cost ? `+${result.reward - result.cost} 积分` : '未中奖'}
          </p>
        </div>
      )}
      {result?.error && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{result.error}</p>}
    </div>
  );
}
