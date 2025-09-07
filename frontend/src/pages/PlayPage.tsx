// src/pages/PlayPage.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../App.css';

type PlayState = {
  grade: string;
  part: string;
  subpart: string;
};

const PlayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as Partial<PlayState>;

  const grade = state.grade ?? '';
  const part = state.part ?? '';
  const subpart = state.subpart ?? '';

  // 値が来ていない（直リンク/リロード等）なら Select に戻す
  useEffect(() => {
    if (!grade || !part || !subpart) {
      navigate('/select', { replace: true });
    }
  }, [grade, part, subpart, navigate]);

  if (!grade || !part || !subpart) return null;

  return (
    <div className="page">
      <h1 className="title">Game (Preview)</h1>

      <div className="login-box" style={{ maxWidth: 420 }}>
        <p>Grade: {grade}</p>
        <p>Part: {part}</p>
        <p>Subpart: {subpart}</p>

        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <Button onClick={() => navigate(-1)}>Back</Button>
          {/* ここから実際の問題画面へ遷移/描画していく */}
        </div>
      </div>
    </div>
  );
};

export default PlayPage;
