import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Dropdown from '../components/Dropdown'
import '../App.css'

const SelectPage: React.FC = () => {
  const [level, setLevel] = useState('1')
  const [part, setPart] = useState('1')
  const navigate = useNavigate()

  return (
    <div className="login-page"> {/* 背景・センタリングは共通スタイルを流用 */}
      {/* 右上の Ranking ボタン */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <Button onClick={() => navigate('/ranking')} size="small">
          Ranking 🏆
        </Button>
      </div>

      <h1 className="title">Select a Stage</h1>

      <div className="login-box" style={{ maxWidth: 400 }}>
        <div className="field">
          <label>Level</label>
          <Dropdown
            value={level}
            onChange={setLevel}
            options={['1','2','3','4','5','6']}
          />
        </div>
        <div className="field">
          <label>Part</label>
          <Dropdown
            value={part}
            onChange={setPart}
            options={['1','2','3','4']}
          />
        </div>
        <Button onClick={() => {/* TODO: 問題開始処理 */}}>
          Game Start
        </Button>
      </div>
    </div>
  )
}

export default SelectPage
