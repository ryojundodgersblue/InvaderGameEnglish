// src/pages/SelectPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Dropdown from '../components/Dropdown'
import { useAuth } from '../hooks/useAuth'
import { apiFetch, formatApiError, ApiError } from '../utils/apiClient'
import { unlockAudio } from '../utils/ttsAudio'
import { COLD_START_API_TIMEOUT_MS } from '../constants/game'
import '../App.css'

// partsテーブルから取得したオプションの型
type PartOptions = {
  [grade: string]: {
    [part: string]: number[]
  }
}

const SelectPage: React.FC = () => {
  const navigate = useNavigate()
  const { session, updateProgress } = useAuth()

  // Contextから初期値を取得（バックエンドから取得した進捗情報を使用）
  const initialGrade = session?.currentGrade || '1'
  const initialPart = session?.currentPart || '1'
  const initialSubpart = session?.currentSubpart || '1'

  const [grade, setGrade] = useState(initialGrade)
  const [part, setPart] = useState(initialPart)
  const [subpart, setSubpart] = useState(initialSubpart)

  const [gradeOptions, setGradeOptions] = useState<string[]>(['1'])
  const [partOptions, setPartOptions] = useState<string[]>(['1'])
  const [subpartOptions, setSubpartOptions] = useState<string[]>(['1'])

  const [allOptions, setAllOptions] = useState<PartOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // オプションデータを取得
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // user_id を取得
        if (!session?.userId) {
          setError('ログイン情報がありません')
          setLoading(false)
          return
        }

        const data = await apiFetch<{
          ok: boolean
          options: PartOptions
          currentProgress?: { grade: number; part: number; subpart: number }
        }>(`/select/options?user_id=${session.userId}`, {}, { timeoutMs: COLD_START_API_TIMEOUT_MS })


        setAllOptions(data.options)
        
        // 利用可能な学年を設定
        const availableGrades = Object.keys(data.options).sort((a, b) => Number(a) - Number(b))
        setGradeOptions(availableGrades)

        // 現在の進捗情報もレスポンスからContextに設定
        if (data.currentProgress) {
          updateProgress(data.currentProgress.grade, data.currentProgress.part, data.currentProgress.subpart)
        }
        
      } catch (e) {
        console.error('Failed to fetch options:', e)
        setError(formatApiError(e, 'ステージ一覧の取得に失敗しました'))

        // エラー時のフォールバック
        setGradeOptions(['1'])
        setPartOptions(['1'])
        setSubpartOptions(['1'])
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 初期値の設定（オプション取得後）
  useEffect(() => {
    if (!allOptions || loading) return

    try {
      if (!session?.userId) {
        setError('ログイン情報がありません')
        return
      }

      // ユーザーの現在の進捗を取得（Contextから取得済み）
      const currentGrade = session.currentGrade || '1'
      const currentPart = session.currentPart || '1'
      const currentSubpart = session.currentSubpart || '1'

      // 利用可能な学年を取得（バックエンドは既に進捗以下のデータのみを返している）
      const availableGrades = Object.keys(allOptions).sort((a, b) => Number(a) - Number(b))

      // 学年の設定：現在の進捗の学年を選択（バックエンドが制限済み）
      let selectedGrade = currentGrade
      if (!availableGrades.includes(currentGrade)) {
        selectedGrade = availableGrades[availableGrades.length - 1] || '1'
      }

      setGrade(selectedGrade)

      // パートオプションを設定
      const gradeParts = allOptions[selectedGrade] || {}
      const availableParts = Object.keys(gradeParts).sort((a, b) => Number(a) - Number(b))
      setPartOptions(availableParts)

      // パートの設定：現在の進捗のパートを選択（バックエンドが制限済み）
      let selectedPart = currentPart
      if (selectedGrade === currentGrade && !availableParts.includes(currentPart)) {
        selectedPart = availableParts[availableParts.length - 1] || '1'
      }

      setPart(selectedPart)

      // サブパートオプションを設定
      const availableSubparts = (gradeParts[selectedPart] || []).map(String).sort((a, b) => Number(a) - Number(b))
      setSubpartOptions(availableSubparts)

      // サブパートの設定：現在の進捗のサブパートを選択（バックエンドが制限済み）
      let selectedSubpart = currentSubpart
      if (selectedGrade === currentGrade && selectedPart === currentPart && !availableSubparts.includes(currentSubpart)) {
        selectedSubpart = availableSubparts[availableSubparts.length - 1] || '1'
      }

      setSubpart(selectedSubpart)

    } catch (e) {
      console.error('Error setting initial values:', e)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [allOptions, loading])

  // 学年が変更された時の処理
  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade)
    
    if (!allOptions) return
    
    // 新しい学年に対応するパートを取得
    const gradeParts = allOptions[newGrade] || {}
    const availableParts = Object.keys(gradeParts).sort((a, b) => Number(a) - Number(b))
    setPartOptions(availableParts)
    
    // パートをリセット（最初のパートを選択）
    const newPart = availableParts[0] || '1'
    setPart(newPart)
    
    // サブパートもリセット
    const availableSubparts = (gradeParts[newPart] || []).map(String).sort((a, b) => Number(a) - Number(b))
    setSubpartOptions(availableSubparts)
    setSubpart(availableSubparts[0] || '1')
  }

  // パートが変更された時の処理
  const handlePartChange = (newPart: string) => {
    setPart(newPart)
    
    if (!allOptions) return
    
    // 現在の学年のデータを取得
    const gradeParts = allOptions[grade] || {}
    
    // 新しいパートに対応するサブパートを取得
    const availableSubparts = (gradeParts[newPart] || []).map(String).sort((a, b) => Number(a) - Number(b))
    setSubpartOptions(availableSubparts)
    
    // サブパートをリセット（最初のサブパートを選択）
    const newSubpart = availableSubparts[0] || '1'
    setSubpart(newSubpart)
  }

  const onGameStart = async () => {
    // ブラウザの音声自動再生ブロックを解除する。
    // 使い捨てのAudioではなく共有Audio要素をアンロックする(iOSは解除が要素単位のため: No.177)
    unlockAudio()

    // 組み合わせの検証（オプション）
    try {
      const validateData = await apiFetch<{ ok: boolean; valid: boolean; message?: string }>(
        `/select/validate?grade=${grade}&part=${part}&subpart=${subpart}`,
        {}, { timeoutMs: COLD_START_API_TIMEOUT_MS }
      )
      if (!validateData.valid) {
        setError('選択された組み合わせは無効です')
        console.error('Invalid combination:', validateData.message)
        return
      }
    } catch (e) {
      // 認証切れはAuthExpiryHandlerがログイン画面へ誘導する (No140)
      if (e instanceof ApiError && e.code === 'AUTH-001') return
      console.warn('Validation check failed, proceeding anyway:', e)
    }
    
    navigate('/play', { state: { grade, part, subpart } })
  }

  return (
    <div className="page select-page">
      {/* 右上の Ranking */}
      <div style={{ position: 'absolute', top: 5, right: 16, padding: 10 }}>
        <Button onClick={() => navigate('/ranking')}>Ranking 🏆</Button>
      </div>

      <h1 className="title">Select a Stage</h1>

      {loading && (
        <div style={{ textAlign: 'center', marginBottom: 12, color: '#fff' }}>
          Loading options...
        </div>
      )}

      {error && (
        <div style={{ color: 'salmon', marginBottom: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div className="login-box" style={{ maxWidth: 400 }}>
        <div className="field">
          <label>Grade</label>
          <Dropdown 
            value={grade} 
            onChange={handleGradeChange} 
            options={gradeOptions} 
          />
        </div>

        <div className="field">
          <label>Part</label>
          <Dropdown 
            value={part} 
            onChange={handlePartChange} 
            options={partOptions} 
          />
        </div>

        <div className="field">
          <label>Subpart</label>
          <Dropdown 
            value={subpart} 
            onChange={setSubpart} 
            options={subpartOptions} 
          />
        </div>

        <Button onClick={onGameStart}>
          Game Start
        </Button>
        
      </div>
    </div>
  )
}

export default SelectPage