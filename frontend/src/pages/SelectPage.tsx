import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Dropdown from '../components/Dropdown'
import '../App.css'

const SelectPage: React.FC = () => {
  const navigate = useNavigate()

  const [level, setLevel] = useState('1')
  const [part,  setPart]  = useState('1')
  const [levelOptions, setLevelOptions] = useState<string[]>(['1'])
  const [partOptions,  setPartOptions]  = useState<string[]>(['1'])
  const [error, setError] = useState<string | null>(null)

  const makeRange = (n: number) => Array.from({ length: Math.max(1, n) }, (_, i) => String(i + 1))

  useEffect(() => {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setError('ログイン情報がありません')
        // 必要ならログインへ戻す
        // navigate('/');
        return
      }

      const cg = Number(localStorage.getItem('current_grade') || '1') || 1
      const cp = Number(localStorage.getItem('current_part')  || '1') || 1

      setLevel(String(cg))
      setPart(String(cp))
      setLevelOptions(makeRange(cg)) // 例: cg=1 → ['1']のみ
      setPartOptions(makeRange(cp))  // 例: cp=12 → ['1'..'12']
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  return (
    <div className="page select-page">
      <div style={{ position: 'absolute', top: 5, right: 16, padding: 10 }}>
        <Button onClick={() => navigate('/ranking')}>Ranking 🏆</Button>
      </div>

      <h1 className="title">Select a Stage</h1>

      {error && <div style={{ color: 'salmon', marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <div className="login-box" style={{ maxWidth: 400 }}>
        <div className="field">
          <label>Level</label>
          <Dropdown value={level} onChange={setLevel} options={levelOptions} />
        </div>
        <div className="field">
          <label>Part</label>
          <Dropdown value={part} onChange={setPart} options={partOptions} />
        </div>
        <Button onClick={() => {/* TODO: ゲーム開始処理 */}}>
          Game Start
        </Button>
      </div>
    </div>
  )
}

export default SelectPage
