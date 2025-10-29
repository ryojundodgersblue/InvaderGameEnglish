// src/pages/SelectPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Dropdown from '../components/Dropdown'
import '../App.css'

// partsテーブルから取得したオプションの型
type PartOptions = {
  [grade: string]: {
    [part: string]: number[]
  }
}

const SelectPage: React.FC = () => {
  const navigate = useNavigate()

  // localStorageから初期値を取得（バックエンドから取得した進捗情報を使用）
  const initialGrade = localStorage.getItem('current_grade') || '1'
  const initialPart = localStorage.getItem('current_part') || '1'
  const initialSubpart = localStorage.getItem('current_subpart') || '1'

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
        const userId = localStorage.getItem('userId')
        if (!userId) {
          setError('ログイン情報がありません')
          setLoading(false)
          return
        }
        
        console.log('Fetching options from /select/options...')
        const res = await fetch(`http://localhost:4000/select/options?user_id=${userId}`, {
          credentials: 'include' // クッキーを送信
        })
        
        if (!res.ok) {
          throw new Error(`Failed to fetch options: ${res.status}`)
        }
        
        const data = await res.json()
        console.log('Options response:', data)
        
        if (!data.ok) {
          throw new Error(data.message || 'オプション取得エラー')
        }
        
        setAllOptions(data.options)
        
        // 利用可能な学年を設定
        const availableGrades = Object.keys(data.options).sort((a, b) => Number(a) - Number(b))
        setGradeOptions(availableGrades)
        
        console.log('Available grades:', availableGrades)
        
        // 現在の進捗情報もレスポンスから設定
        if (data.currentProgress) {
          localStorage.setItem('current_grade', String(data.currentProgress.grade))
          localStorage.setItem('current_part', String(data.currentProgress.part))
          localStorage.setItem('current_subpart', String(data.currentProgress.subpart))
          console.log('Current progress updated from server:', data.currentProgress)
        }
        
      } catch (e) {
        console.error('Failed to fetch options:', e)
        const errorMessage = e instanceof Error ? e.message : String(e)
        setError(errorMessage)

        // 認証エラー（401/404）の場合はログインページにリダイレクト
        if (errorMessage.includes('401') || errorMessage.includes('404')) {
          console.warn('Authentication error detected, redirecting to login...')
          localStorage.removeItem('userId')
          localStorage.removeItem('userName')
          localStorage.removeItem('current_grade')
          localStorage.removeItem('current_part')
          localStorage.removeItem('current_subpart')
          setTimeout(() => navigate('/'), 2000)
          return
        }

        // エラー時のフォールバック
        setGradeOptions(['1'])
        setPartOptions(['1'])
        setSubpartOptions(['1'])
      } finally {
        setLoading(false)
      }
    }
    
    fetchOptions()
  }, [])

  // 初期値の設定（オプション取得後）
  useEffect(() => {
    if (!allOptions || loading) return

    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setError('ログイン情報がありません')
        return
      }

      // ユーザーの現在の進捗を取得（バックエンドから取得済み）
      const currentGrade = localStorage.getItem('current_grade') || '1'
      const currentPart = localStorage.getItem('current_part') || '1'
      const currentSubpart = localStorage.getItem('current_subpart') || '1'

      console.log('Current progress from localStorage:', { currentGrade, currentPart, currentSubpart })

      // 利用可能な学年を取得（バックエンドは既に進捗以下のデータのみを返している）
      const availableGrades = Object.keys(allOptions).sort((a, b) => Number(a) - Number(b))

      // 学年の設定：現在の進捗の学年を選択（バックエンドが制限済み）
      let selectedGrade = currentGrade
      if (!availableGrades.includes(currentGrade)) {
        // 万が一含まれていない場合は最大の学年を選択
        selectedGrade = availableGrades[availableGrades.length - 1] || '1'
        console.log(`Grade ${currentGrade} not available, using ${selectedGrade}`)
      }

      setGrade(selectedGrade)

      // パートオプションを設定
      const gradeParts = allOptions[selectedGrade] || {}
      const availableParts = Object.keys(gradeParts).sort((a, b) => Number(a) - Number(b))
      setPartOptions(availableParts)

      // パートの設定：現在の進捗のパートを選択（バックエンドが制限済み）
      let selectedPart = currentPart
      if (selectedGrade === currentGrade && !availableParts.includes(currentPart)) {
        // 万が一含まれていない場合は最大のパートを選択
        selectedPart = availableParts[availableParts.length - 1] || '1'
        console.log(`Part ${currentPart} not available, using ${selectedPart}`)
      }

      setPart(selectedPart)

      // サブパートオプションを設定
      const availableSubparts = (gradeParts[selectedPart] || []).map(String).sort((a, b) => Number(a) - Number(b))
      setSubpartOptions(availableSubparts)

      // サブパートの設定：現在の進捗のサブパートを選択（バックエンドが制限済み）
      let selectedSubpart = currentSubpart
      if (selectedGrade === currentGrade && selectedPart === currentPart && !availableSubparts.includes(currentSubpart)) {
        // 万が一含まれていない場合は最大のサブパートを選択
        selectedSubpart = availableSubparts[availableSubparts.length - 1] || '1'
        console.log(`Subpart ${currentSubpart} not available, using ${selectedSubpart}`)
      }

      setSubpart(selectedSubpart)

      console.log('Initial selection set:', {
        grade: selectedGrade,
        part: selectedPart,
        subpart: selectedSubpart
      })
      console.log('Available options:', {
        grades: availableGrades,
        parts: availableParts,
        subparts: availableSubparts
      })

    } catch (e) {
      console.error('Error setting initial values:', e)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [allOptions, loading])

  // 学年が変更された時の処理
  const handleGradeChange = (newGrade: string) => {
    console.log('Grade changed to:', newGrade)
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
    
    console.log('Updated selection after grade change:', {
      grade: newGrade,
      part: newPart,
      subpart: availableSubparts[0] || '1',
      availableParts,
      availableSubparts
    })
  }

  // パートが変更された時の処理
  const handlePartChange = (newPart: string) => {
    console.log('Part changed to:', newPart)
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
    
    console.log('Updated selection after part change:', {
      grade,
      part: newPart,
      subpart: newSubpart,
      availableSubparts
    })
  }

  const onGameStart = async () => {
    // 組み合わせの検証（オプション）
    try {
      console.log('Validating selection before game start:', { grade, part, subpart })
      
      const validateRes = await fetch(
        `http://localhost:4000/select/validate?grade=${grade}&part=${part}&subpart=${subpart}`,
        { credentials: 'include' }
      )
      
      if (validateRes.ok) {
        const validateData = await validateRes.json()
        if (!validateData.valid) {
          setError('選択された組み合わせは無効です')
          console.error('Invalid combination:', validateData.message)
          return
        }
      }
    } catch (e) {
      console.warn('Validation check failed, proceeding anyway:', e)
    }
    
    console.log('Starting game with:', { grade, part, subpart })
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