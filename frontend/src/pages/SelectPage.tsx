// src/pages/SelectPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Dropdown from '../components/Dropdown'
import '../App.css'

const SelectPage: React.FC = () => {
  const navigate = useNavigate()

  const [grade, setGrade] = useState('1')
  const [part,  setPart]  = useState('1')
  const [subpart, setSubpart] = useState('1')

  const [gradeOptions, setGradeOptions] = useState<string[]>(['1'])
  const [partOptions,  setPartOptions]  = useState<string[]>(['1'])
  const [subpartOptions, setSubpartOptions] = useState<string[]>(['1'])

  const [error, setError] = useState<string | null>(null)

  const makeRange = (n: number) =>
    Array.from({ length: Math.max(1, n) }, (_, i) => String(i + 1))

  const onGameStart = () => {
    // ここで選択値を state として渡す
    navigate('/play', { state: { grade, part, subpart } });
  };

  useEffect(() => {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setError('ログイン情報がありません')
        // 必要ならログインへ戻す:
        // navigate('/');
        return
      }

      const cg = Number(localStorage.getItem('current_grade')    || '1') || 1
      const cp = Number(localStorage.getItem('current_part')     || '1') || 1
      const cs = Number(localStorage.getItem('current_subpart')  || '1') || 1

      setGrade(String(cg))
      setPart(String(cp))
      setSubpart(String(cs))

      setGradeOptions(makeRange(cg))   // 例: cg=1 → ['1']
      setPartOptions(makeRange(cp))    // 例: cp=12 → ['1'..'12']
      setSubpartOptions(makeRange(cs)) // 例: cs=3  → ['1','2','3']
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  return (
    <div className="page select-page">
      {/* 右上の Ranking */}
      <div style={{ position: 'absolute', top: 5, right: 16, padding: 10 }}>
        <Button onClick={() => navigate('/ranking')}>Ranking 🏆</Button>
      </div>

      <h1 className="title">Select a Stage</h1>

      {error && (
        <div style={{ color: 'salmon', marginBottom: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div className="login-box" style={{ maxWidth: 400 }}>
        <div className="field">
          <label>Grade</label>
          <Dropdown value={grade} onChange={setGrade} options={gradeOptions} />
        </div>

        <div className="field">
          <label>Part</label>
          <Dropdown value={part} onChange={setPart} options={partOptions} />
        </div>

        <div className="field">
          <label>Subpart</label>
          <Dropdown value={subpart} onChange={setSubpart} options={subpartOptions} />
        </div>

        <Button onClick={onGameStart}>
          Game Start
        </Button>
      </div>
    </div>
  )
}

export default SelectPage
