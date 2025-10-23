// src/pages/ResultPage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../App.css';

const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { clear?: boolean; correct?: number; total?: number } | null;

  const clear = state?.clear ?? false;
  const correct = state?.correct ?? 0;
  const total = state?.total ?? 0;

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const getMessage = () => {
    if (clear) {
      if (percentage >= 90) return 'Perfect! 🌟';
      if (percentage >= 80) return 'Excellent! ⭐';
      return 'Stage Clear! 🎉';
    } else {
      if (percentage >= 60) return 'Good Try! Keep it up!';
      if (percentage >= 40) return 'Nice effort!';
      return 'Try Again...';
    }
  };

  const getScoreColor = () => {
    if (clear) return '#4ade80';
    if (percentage >= 60) return '#fbbf24';
    return '#f87171';
  };

  // ★ これを追加（ログアウト処理）
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('current_grade');
    localStorage.removeItem('current_part');
    localStorage.removeItem('current_subpart');
    navigate('/logIn'); 
  };

  return (
    <div className="page" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ maxWidth: 500, margin: '0 auto', width: '100%' }}>
        <h1 className="title" style={{ fontSize: 48, marginBottom: 20 }}>
          {getMessage()}
        </h1>

        <div style={{ fontSize: 32, fontWeight: 'bold', color: clear ? '#4ade80' : '#f87171', marginBottom: 30 }}>
          {clear ? '✅ CLEAR' : '❌ FAILED'}
        </div>

        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 30, marginBottom: 30 }}>
          <div style={{ fontSize: 20, color: '#ffffff', marginBottom: 10 }}>Your Score</div>
          <div style={{ fontSize: 56, fontWeight: 'bold', color: getScoreColor(), marginBottom: 10 }}>
            {correct} / {total}
          </div>
          <div style={{ fontSize: 36, color: getScoreColor() }}>{percentage}%</div>
        </div>

        {clear ? (
          <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 30 }}>次のステージが解放されました！</div>
        ) : (
          <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 30 }}>
            {total > 0 && Math.max(0, 10 - correct) > 0 && <>あと {Math.max(0, 10 - correct)} 問正解でクリア！</>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
          <Button onClick={handleLogout}>LOGOUT</Button>
          <Button onClick={() => navigate('/select')}>{clear ? 'NEXT' : 'Retry'}</Button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
