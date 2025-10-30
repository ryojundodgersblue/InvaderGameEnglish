import React, { useState, useEffect } from 'react'
import TextBox from '../components/TextBox'
import Button from '../components/Button'
import '../App.css'
import './AdminPage.css'

interface User {
  id: number
  user_id: string
  password: string
  nickname: string
  real_name: string
  current_grade: number
  current_part: number
  current_subpart: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

interface RegisterResult {
  user_id: string
  password: string
}

interface FailureStats {
  users: string[]
  parts: string[]
  stats: Record<string, Record<string, number>>
}

const AdminPage: React.FC = () => {
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // パート別ミス数
  const [failureStats, setFailureStats] = useState<FailureStats | null>(null)

  // パスワード変更
  const [resetUserId, setResetUserId] = useState('')
  const [resetResult, setResetResult] = useState<RegisterResult | null>(null)

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:4000/admin/users', {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('ユーザー一覧の取得に失敗しました')
      }

      const data = await res.json()
      if (data.ok && data.users) {
        // is_admin=trueのユーザーを除外
        const nonAdminUsers = data.users.filter((user: User) => !user.is_admin)
        setUsers(nonAdminUsers)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // パート別ミス数を取得
  const fetchFailureStats = async () => {
    try {
      const res = await fetch('http://localhost:4000/admin/failure-stats', {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('パート別ミス数の取得に失敗しました')
      }

      const data = await res.json()
      if (data.ok) {
        setFailureStats(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // 初回ロード時にユーザー一覧とパート別ミス数を取得
  useEffect(() => {
    fetchUsers()
    fetchFailureStats()
  }, [])

  // 新規ユーザー登録
  const handleRegister = async () => {
    setError(null)
    setSuccess(null)
    setRegisterResult(null)

    if (!nickname.trim() || !realName.trim()) {
      setError('名前とニックネームを入力してください')
      return
    }

    try {
      const res = await fetch('http://localhost:4000/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname, real_name: realName }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.message || '登録に失敗しました')
      }

      // 登録成功
      setRegisterResult({
        user_id: data.user_id,
        password: data.password,
      })
      setSuccess('ユーザーを登録しました')
      setNickname('')
      setRealName('')

      // ユーザー一覧を再取得
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // ユーザー情報更新
  const handleUpdate = async (userId: string, currentGrade: number, currentPart: number) => {
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`http://localhost:4000/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_grade: currentGrade, current_part: currentPart }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.message || '更新に失敗しました')
      }

      setSuccess('ユーザー情報を更新しました')
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // パスワードリセット
  const handleResetPassword = async () => {
    setError(null)
    setSuccess(null)
    setResetResult(null)

    if (!resetUserId.trim()) {
      setError('ユーザーIDを入力してください')
      return
    }

    try {
      const res = await fetch('http://localhost:4000/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: resetUserId }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'パスワードリセットに失敗しました')
      }

      // リセット成功
      setResetResult({
        user_id: data.user_id,
        password: data.password,
      })
      setSuccess('パスワードをリセットしました')
      setResetUserId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-title">管理者画面</h1>

      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      {/* 新規登録セクション */}
      <section className="admin-section">
        <h2 className="section-title">新規登録</h2>
        <div className="register-form">
          <div className="form-row">
            <div className="field">
              <label>名前</label>
              <TextBox value={realName} onChange={setRealName} placeholder="山田 太郎" />
            </div>
            <div className="field">
              <label>ニックネーム</label>
              <TextBox value={nickname} onChange={setNickname} placeholder="taro" />
            </div>
            <Button onClick={handleRegister}>登録</Button>
          </div>

          {registerResult && (
            <div className="register-result">
              <p className="result-title">登録完了</p>
              <p className="result-item">
                <strong>ユーザーID:</strong> {registerResult.user_id}
              </p>
              <p className="result-item">
                <strong>パスワード:</strong> {registerResult.password}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* パスワードリセットセクション */}
      <section className="admin-section">
        <h2 className="section-title">パスワードリセット</h2>
        <div className="register-form">
          <div className="form-row">
            <div className="field">
              <label>ユーザーID</label>
              <TextBox value={resetUserId} onChange={setResetUserId} placeholder="00001" />
            </div>
            <Button onClick={handleResetPassword}>パスワードリセット</Button>
          </div>

          {resetResult && (
            <div className="register-result">
              <p className="result-title">パスワードリセット完了</p>
              <p className="result-item">
                <strong>ユーザーID:</strong> {resetResult.user_id}
              </p>
              <p className="result-item">
                <strong>新しいパスワード:</strong> {resetResult.password}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ユーザー一覧セクション */}
      <section className="admin-section">
        <h2 className="section-title">ユーザー情報</h2>
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ユーザーID</th>
                <th>ニックネーム</th>
                <th>名前</th>
                <th>解いている最新の学年</th>
                <th>解いている最新のパート</th>
                <th>解いている最新のサブパート</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.user_id}
                  user={user}
                  onUpdate={handleUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* パート別ミス数セクション */}
      <section className="admin-section failure-stats-section">
        <h2 className="section-title">パート別ミス数</h2>
        {failureStats && failureStats.users.length > 0 && failureStats.parts.length > 0 ? (
          <div className="failure-stats-table-container">
            <table className="failure-stats-table">
              <thead>
                <tr>
                  <th className="fixed-column">ユーザー名</th>
                  {failureStats.parts.map((part) => (
                    <th key={part}>{part}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failureStats.users.map((userName) => (
                  <tr key={userName}>
                    <td className="fixed-column">{userName}</td>
                    {failureStats.parts.map((part) => (
                      <td key={part}>{failureStats.stats[userName]?.[part] || 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>データがありません</p>
        )}
      </section>
    </div>
  )
}

// ユーザー行コンポーネント
interface UserRowProps {
  user: User
  onUpdate: (userId: string, currentGrade: number, currentPart: number) => void
}

const UserRow: React.FC<UserRowProps> = ({ user, onUpdate }) => {
  const [currentGrade, setCurrentGrade] = useState(user.current_grade)
  const [currentPart, setCurrentPart] = useState(user.current_part)
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = () => {
    onUpdate(user.user_id, currentGrade, currentPart)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setCurrentGrade(user.current_grade)
    setCurrentPart(user.current_part)
    setIsEditing(false)
  }

  return (
    <tr>
      <td>{user.user_id}</td>
      <td>{user.nickname}</td>
      <td>{user.real_name}</td>
      <td>
        {isEditing ? (
          <input
            type="number"
            value={currentGrade}
            onChange={(e) => setCurrentGrade(Number(e.target.value))}
            className="edit-input"
            min="1"
          />
        ) : (
          currentGrade
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            value={currentPart}
            onChange={(e) => setCurrentPart(Number(e.target.value))}
            className="edit-input"
            min="1"
          />
        ) : (
          currentPart
        )}
      </td>
      <td>{user.current_subpart}</td>
      <td>
        {isEditing ? (
          <div className="edit-buttons">
            <button onClick={handleSave} className="save-btn">保存</button>
            <button onClick={handleCancel} className="cancel-btn">キャンセル</button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="edit-btn">編集</button>
        )}
      </td>
    </tr>
  )
}

export default AdminPage
