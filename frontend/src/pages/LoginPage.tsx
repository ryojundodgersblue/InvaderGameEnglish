import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextBox from '../components/TextBox'
import Button from '../components/Button'
import '../App.css'

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState('')
  const [password, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const onLogin = async () => {
    setError(null)
    try {
      const res = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message || 'Login failed')
      }
      // ログイン成功したら選択画面へ
      navigate('/select')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

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
        <Button onClick={onLogin}>LOGIN</Button>
      </div>
    </div>
  );
};

export default LoginPage;
