import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextBox from '../components/TextBox'
import Button from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { API_URL } from '../config'
import '../App.css'
import './LoginPage.css'

interface LoginResponse {
  ok: boolean
  message?: string
  user?: {
    userId: string
    name: string
    current_grade: number
    current_part: number
    is_admin: boolean
  }
}

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState('')
  const [password, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  const onLogin = async () => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // クッキーを送受信
        body: JSON.stringify({ userId, password }),
      })

      // ★ まず JSON を一度だけパース
      const data = await res.json().catch((): LoginResponse => ({ ok: false }))

      // ★ ステータス or API の ok を確認
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || `Login failed (${res.status})`)
      }

      // ★ ユーザー情報をContextに保存
      const user = data.user || {}
      login({
        userId: user.userId ?? '',
        name: user.name ?? '',
        current_grade: user.current_grade ?? 1,
        current_part: user.current_part ?? 1,
        is_admin: user.is_admin ?? false,
      })

      // 成功したら遷移（管理者の場合は管理画面へ）
      if (user.is_admin) {
        navigate('/admin')
      } else {
        navigate('/select')
      }
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
