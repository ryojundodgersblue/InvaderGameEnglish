import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../App.css';

const ResultPage: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as any;
  const clear = !!state?.clear;
  const correct = state?.correct ?? 0;
  const total = state?.total ?? 0;

  return (
    <div className="page" style={{ textAlign:'center' }}>
      <h1 className="title">{clear ? 'Stage Clear! 🎉' : 'Try Again...'}</h1>
      <div style={{ fontSize:24, margin:'12px 0' }}>Score: {correct} / {total}</div>
      <Button onClick={()=>nav('/select')}>Back to Select</Button>
    </div>
  );
};
export default ResultPage;
