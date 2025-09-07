import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../App.css';

type Q = {
  question_id: string;
  part_id: string;
  display_order: number;
  is_demo: boolean;
  question_text: string;
  image_url: string;
  answers: string[];
};
type PartInfo = { part_id: string; requirement: string };

const USE_LOCAL_TTS = true; // 将来 Google TTS に切替えるなら false にして /tts を使う

const z = (n:number)=>String(n).padStart(2,'0');
const normalize = (s:string)=> s.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();

function speakAwait(text: string): Promise<void> {
  return new Promise((resolve) => {
    const s = (window as any).speechSynthesis;
    if (!s) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => resolve();
    s.speak(u);
  });
}

const PlayPage: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { grade, part, subpart } = (loc.state || {}) as { grade?: string; part?: string; subpart?: string };

  const [loading, setLoading] = useState(true);
  const [partInfo, setPartInfo] = useState<PartInfo | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showRequirement, setShowRequirement] = useState(true);
  const [showText, setShowText] = useState(false);
  const [status, setStatus] = useState<'idle'|'speaking'|'listening'|'correct'|'timeout'|'wrong'>('idle');
  const [correctCount, setCorrectCount] = useState(0);     // 表示用（デモ含む）
  const [realCorrect, setRealCorrect] = useState(0);       // 合否用（デモ除外）
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  const current = questions[idx];
  const questionNo = useMemo(()=> idx+1, [idx]);

  // タイマー
  const resetTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setTimeLeft(30);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timerRef.current!);
          setStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as any;
  };

  // 初期ロード
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const g = grade ?? localStorage.getItem('current_grade') ?? '1';
        const p = part ?? localStorage.getItem('current_part') ?? '1';
        const s = subpart ?? localStorage.getItem('current_subpart') ?? '1';

        const r1 = await fetch(`http://localhost:4000/game/part?grade=${g}&part=${p}&subpart=${s}`);
        if (!r1.ok) throw new Error('part 取得失敗');
        const j1 = await r1.json();
        setPartInfo(j1.part);

        const r2 = await fetch(`http://localhost:4000/game/questions?part_id=${encodeURIComponent(j1.part.part_id)}`);
        if (!r2.ok) throw new Error('questions 取得失敗');
        const j2 = await r2.json();
        setQuestions(j2.questions || []);
        setIdx(0);
        setShowRequirement(true);
      } catch (e:any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1問開始
  const startQuestion = async () => {
    if (!current) return;
    setShowText(false);
    setStatus('speaking');
    resetTimer();

    // 2回読み上げ → 3回目で表示
    await speakAwait(current.question_text);
    await speakAwait(current.question_text);
    await speakAwait(current.question_text);
    setShowText(true);

    if (current.is_demo) {
      // デモ：正解読み上げ → 自動撃破
      const ans = current.answers?.[0] ?? '';
      await speakAwait(ans);
      setStatus('correct');
      setCorrectCount(c => c+1); // デモは表示上は正解に含める
      setTimeout(nextQuestion, 900);
    } else {
      setStatus('listening');
    }
  };

  // マイク（音声認識）
  const onMic = async () => {
    if (!current || status!=='listening' || timeLeft<=0) return;
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return alert('このブラウザは音声認識に未対応です（Chrome 推奨）');
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e:any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      const ok = (current.answers || []).some(a => normalize(a) === normalize(transcript));
      if (ok) {
        setStatus('correct');
        setCorrectCount(c => c+1);
        setRealCorrect(c => c+1);
        setTimeout(nextQuestion, 800);
      } else {
        setStatus('wrong');
        new Audio('/buzzer.mp3').play().catch(()=>{});
        setTimeout(()=> setStatus('listening'), 450);
      }
    };
    rec.onerror = () => setStatus('listening');
    rec.start();
  };

  // タイムアウト後の自動遷移
  useEffect(() => {
    if (status==='timeout') setTimeout(nextQuestion, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const nextQuestion = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (idx+1 >= questions.length) finishGame();
    else {
      setIdx(i=>i+1);
      setStatus('idle');
      startQuestion();
    }
  };

  const finishGame = async () => {
    const clear = realCorrect >= 10; // デモ除外の正解が 10 以上
    try {
      const userId = localStorage.getItem('userId') || '';
      const part_id = partInfo?.part_id || '';
      if (userId && part_id) {
        await fetch('http://localhost:4000/game/score', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ userId, part_id, scores: realCorrect, clear }),
        });
      }
      if (clear) {
        const cur = {
          grade: grade  ?? localStorage.getItem('current_grade') ?? '1',
          part:  part   ?? localStorage.getItem('current_part') ?? '1',
          subpart: subpart ?? localStorage.getItem('current_subpart') ?? '1',
        };
        await fetch('http://localhost:4000/game/advance', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ userId, current: cur, part_id: partInfo?.part_id, clear }),
        });
      }
    } catch (e) {
      console.warn('score/advance failed', e);
    }
    nav('/result', { state:{ clear, correct: realCorrect, total: questions.filter(q=>!q.is_demo).length } });
  };

  if (loading) return <div className="page"><h1 className="title">Loading...</h1></div>;
  if (error)   return <div className="page"><h1 className="title">Error</h1><div style={{color:'salmon'}}>{error}</div></div>;
  if (!partInfo || !current) return <div className="page"><h1 className="title">No Data</h1></div>;

  return (
    <div className="page" style={{ position:'relative', minHeight:'100vh' }}>
      {/* 左上：Time Limit */}
      <div style={{ position:'absolute', top:14, left:16, color:'#fff' }}>
        <div style={{ fontSize:20, marginBottom:6 }}>Time Limit</div>
        <div style={{ width:48, height:48, borderRadius:6, background:'rgba(255,255,255,0.9)', color:'#000',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{timeLeft}</div>
      </div>

      {/* 左：何問目 */}
      <div style={{ position:'absolute', top:260, left:'15vw', color:'#fff' }}>
        <div style={{ width:64, height:64, borderRadius:6, background:'rgba(255,255,255,0.9)', color:'#000',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{questionNo}</div>
      </div>

      {/* 上中央：敵 */}
      <div style={{ display:'flex', justifyContent:'center', marginTop:20,position:'absolute', top:0, left:'50%', transform:'translateX(-50%)' }}>
        {status==='correct'
          ? <img src="/explosion.gif" alt="boom" style={{ height:64 }} />
          : <img src="/enemy.png" alt="enemy" style={{ height:64 }} />
        }
      </div>

      {/* 中央：要件 or 問題文 */}
      {showRequirement ? (
        <div className="login-box" style={{ maxWidth:700, margin:'24px auto', textAlign:'center' }}>
          <h2 style={{ marginTop:0, color:'#ffffff' }}>Requirement</h2>
          <div style={{ color: '#ffdf6b', fontSize:28, whiteSpace:'pre-wrap' }}>{partInfo.requirement}</div>
          <div style={{ marginTop:18 }}><Button onClick={()=>{ setShowRequirement(false); setTimeout(startQuestion, 10); }}>Start</Button></div>
        </div>
      ) : (
        <>
          {/* 問題文（敵の下） */}
          <div style={{ textAlign:'center', fontSize:52, marginTop:10, minHeight:40,position:'absolute', top:90,color:'#ffffff' }}>
            {showText ? current.question_text : ''}
          </div>

          {/* 右側：問題画像（あれば） */}
          {current.image_url && (
            <div style={{ position:'absolute', top:150, right:60 }}>
              <img src={current.image_url} alt="" style={{ width:260, height:'auto', borderRadius:4 }} />
            </div>
          )}

          {/* 正解ビーム（正解時だけ中央に） */}
          {status==='correct' && (
            <div style={{ position:'absolute',width:10, left:'50%',transform:'translateX(-50%)', top:220, bottom:200 ,height:180, margin:'12px auto', background:'#7cf', boxShadow:'0 0 16px #7cf' }} />
          )}

          {/* マイク */}
          <div style={{ position:'absolute',display:'flex', justifyContent:'center', marginTop:20, bottom:150 }}>
            <button
              onClick={onMic}
              disabled={status!=='listening' || timeLeft<=0}
              style={{ border:'none', background:'transparent', cursor:(status==='listening'?'pointer':'default') }}
            >
              {status==='timeout'
                ? <img src="/mic_explosion.gif" alt="mic exploded" height={60} />
                : <img src="/mic.png" alt="mic" height={60} />
              }
            </button>
          </div>

          {/* 正解表示（正解 or タイムアップで表示） */}
          {(status==='correct' || status==='timeout') && (
            <div style={{  position:'absolute',textAlign:'center', marginTop:10, fontSize:40, color:'#fff', bottom:70 }}>
              <span style={{ marginRight:8 }}>◯</span>
              <span> {current.answers?.[0] ?? ''}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;
