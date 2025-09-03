import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextBox from '../components/TextBox'
import Button from '../components/Button'
import '../App.css'
import './LoginPage.css'

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

      // ★ まず JSON を一度だけパース
      const data = await res.json().catch(() => ({} as any))

      // ★ ステータス or API の ok を確認
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || `Login failed (${res.status})`)
      }

      // ★ ユーザー情報を保存
      const user = data.user || {}
      localStorage.setItem('userId', user.userId ?? '')
      localStorage.setItem('userName', user.name ?? '')
      localStorage.setItem('current_grade', String(user.current_grade ?? ''))
      localStorage.setItem('current_part',  String(user.current_part  ?? ''))

      // 成功したら遷移
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
  )
}

export default LoginPage
