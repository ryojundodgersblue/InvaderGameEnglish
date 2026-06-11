import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextBox from '../components/TextBox'
import { useAuth } from '../hooks/useAuth'
import { API_URL } from '../config'
import { LOGIN_SLOW_HINT_MS } from '../constants/game'
import '../App.css'
import '../components/Button.css'
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
  const [loading, setLoading] = useState(false)
  const [slowHint, setSlowHint] = useState(false)
  const slowHintTimerRef = useRef<number | null>(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  // サーバーのウォームアップping。
  // ホスティング側のコールドスタート(起動に数十秒かかる)を、ユーザーがID/PWを
  // 入力している間に進めておくことでログイン体感を短縮する。
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => { /* 失敗してもログイン時に再接続される */ })
  }, [])

  const onLogin = async () => {
    if (loading) return
    setError(null)
    setLoading(true)
    setSlowHint(false)
    slowHintTimerRef.current = window.setTimeout(() => setSlowHint(true), LOGIN_SLOW_HINT_MS)
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
    } finally {
      if (slowHintTimerRef.current) {
        window.clearTimeout(slowHintTimerRef.current)
        slowHintTimerRef.current = null
      }
      setSlowHint(false)
      setLoading(false)
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
        <button
          className={`btn login-btn ${loading ? 'login-btn-loading' : ''}`}
          onClick={onLogin}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'LOGIN'}
        </button>
        {loading && slowHint && (
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
            サーバーを起動しています…<br />
            最大1分ほどかかる場合があります。そのままお待ちください。
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginPage
