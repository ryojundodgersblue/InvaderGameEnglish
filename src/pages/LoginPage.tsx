import React, { useState } from 'react';
import TextBox from '../components/TextBox';
import Button from '../components/Button';
import '../App.css';

const LoginPage: React.FC = () => {
  const [userId, setUserId]   = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    try {
      const res = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Login failed');
      // TODO: 成功時の処理
    }catch (err: unknown) {
      // unknown にすると any エラーが消えるので…
      if (err instanceof Error) {
        setError(err.message);
      } else {
        // Error じゃないものが飛んできたときは文字列化
        setError(String(err));
      }
    }
  };

  return (
    <div className="login-page">
      <h1 className="title">Welcome to English Game!</h1>
      <div className="login-box">
        {error && <div style={{ color: 'salmon', marginBottom: 16 }}>{error}</div>}
        <div className="field">
          <label>User ID</label>
          <TextBox value={userId} onChange={setUserId} placeholder="Enter your ID" />
        </div>
        <div className="field">
          <label>Password</label>
          <TextBox type="password" value={password} onChange={setPass} placeholder="••••••••" />
        </div>
        <Button onClick={onLogin}>log in</Button>
      </div>
    </div>
  );
};

export default LoginPage;
