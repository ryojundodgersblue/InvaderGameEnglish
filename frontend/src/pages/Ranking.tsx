// src/pages/Ranking.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config'
import './Ranking.css'

type RankItem = { userId: string; name: string; }

const Ranking: React.FC = () => {
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<RankItem[] | null>(null)
  const [accuracy, setAccuracy] = useState<RankItem[] | null>(null)
  const [month, setMonth] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_URL}/ranking`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('failed to fetch')
        const json = await res.json()

        if (cancelled) return
        setMonth(json.month ?? '')
        setChallenge(json.items?.challenge ?? [])
        setAccuracy(json.items?.accuracy ?? [])
      } catch {
        if (cancelled) return
        setError('ランキング取得に失敗しました')
        // フォールバック（任意）
        setChallenge([
          { userId: '', name: '' },
          { userId: '', name: '' },
          { userId: '', name: '' },
        ])
        setAccuracy([
          { userId: '', name: '' },
          { userId: '', name: '' },
          { userId: '', name: '' },
        ])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="page ranking-page">
      <div style={{ position: 'absolute', top: 5, right: 16, padding: 10 }}>
        <Button onClick={() => navigate(-1)}>Back</Button>
      </div>

      <h1 className="title">Ranking 👑</h1>
      {!!month && (
        <h2 className="correct-month">
          Period: {month}
        </h2>
      )}
      {loading && <div style={{ textAlign: 'center', marginBottom: 12 }}>Loading...</div>}
      {error && <div style={{ color: 'salmon', marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <div className="rank-grid">
        <section className="panel">
          <h2 className="rank-heading">Number of try</h2>
          <ol className="rank-list">
            {(challenge ?? []).slice(0, 3).map((it, i) => (
              <li key={`${it.userId || 'u'}-${i}`} className="rank-row">
                <span className="rank-no">No.{i + 1}</span>
                <span className="rank-name">{it.name}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2 className="rank-heading">Best Scores</h2>
          <ol className="rank-list">
            {(accuracy ?? []).slice(0, 3).map((it, i) => (
              <li key={`${it.userId || 'u'}-${i}`} className="rank-row">
                <span className="rank-no">No.{i + 1}</span>
                <span className="rank-name">{it.name}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default Ranking
