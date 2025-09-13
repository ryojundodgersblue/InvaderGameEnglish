import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../App.css';

// --------------------------- Types ---------------------------
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

// --------------------------- Consts ---------------------------
const USE_LOCAL_TTS = true;
const ROUND_TIME_SEC = 30;
const CORRECT_TO_CLEAR = 10;
const MAX_QUESTIONS = 16;

// 演出のディレイ（ms）
const DLY = {
  betweenSpeaks: 500,                 // 読み上げ間の待ち時間
  afterThirdSpeakBeforeDemoAns: 2000, // デモ：3回目読み上げ→自動解答まで
  afterThirdSpeakBeforeListen: 800,   // 非デモ：3回目読み上げ→回答受付まで
  beam: 800,                          // ビーム演出時間
  explosion: 1000,                    // 爆発演出時間
  afterReveal: 1500,                  // 解答表示後→次問へ
  afterTimeoutBeforeReveal: 500,     // タイムアウト→解答表示まで
  beforeNextQuestion: 300,            // 次の問題開始前の待機
};

// ------------------------ Utilities --------------------------
const normalize = (s:string)=> s.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();

function speakAwait(text: string): Promise<void> {
  return new Promise((resolve) => {
    // 音声合成をキャンセル（前の音声が残らないように）
    const synth = (window as any).speechSynthesis;
    if (!synth) return resolve();
    
    // 既存の音声をキャンセル
    synth.cancel();
    
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

function speakBubuu() {
  const synth = (window as any).speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance('ぶぶー');
  u.lang = 'ja-JP';
  u.rate = 1.0;
  synth.speak(u);
}

// ------------------------ Component --------------------------
const PlayPage: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { grade, part, subpart } = (loc.state || {}) as { grade?: string; part?: string; subpart?: string };

  const [loading, setLoading] = useState(true);
  const [partInfo, setPartInfo] = useState<PartInfo | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SEC);
  const [showRequirement, setShowRequirement] = useState(true);
  const [showText, setShowText] = useState(false);
  type Status = 'idle'|'speaking'|'listening'|'beam'|'explosion'|'reveal'|'timeout'|'wrong'|'finished';
  const [status, setStatus] = useState<Status>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [realCorrect, setRealCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const isProcessingAnswerRef = useRef(false);
  const currentQuestionRef = useRef<Q | null>(null);

  const current = questions[idx];
  const questionNo = idx + 1;

  // デモは1問目のis_demo=trueのみ
  const isDemo = idx === 0 && current?.is_demo === true;

  // ---------------------- Timer control ----------------------
  const clearTimer = useCallback(() => { 
    if (timerRef.current) { 
      window.clearInterval(timerRef.current); 
      timerRef.current = null; 
    } 
    deadlineRef.current = null;
  }, []);
  
  const startRoundTimer = useCallback(() => {
    clearTimer();
    deadlineRef.current = Date.now() + ROUND_TIME_SEC * 1000;
    setTimeLeft(ROUND_TIME_SEC);
    
    timerRef.current = window.setInterval(() => {
      if (!deadlineRef.current) {
        clearTimer();
        return;
      }
      const now = Date.now();
      const remainMs = Math.max(0, deadlineRef.current - now);
      const remainSec = Math.ceil(remainMs / 1000);
      setTimeLeft(remainSec);
      
      if (remainMs <= 0) {
        clearTimer();
        if (!isProcessingAnswerRef.current) {
          handleTimeout();
        }
      }
    }, 100) as any;
  }, [clearTimer]);

  const handleTimeout = useCallback(async () => {
    if (isProcessingAnswerRef.current || status === 'finished') return;
    isProcessingAnswerRef.current = true;
    
    console.log('Timeout occurred for question:', idx + 1);
    
    setStatus('timeout');
    await new Promise(r => setTimeout(r, DLY.afterTimeoutBeforeReveal));
    setStatus('reveal');
    await new Promise(r => setTimeout(r, DLY.afterReveal));
    
    moveToNextQuestion();
  }, [idx, status]);

  // ---------------------- Initial load -----------------------
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
        const qs: Q[] = (j2.questions || []).slice(0, MAX_QUESTIONS);
        setQuestions(qs);
        setIdx(0);
        setShowRequirement(true);
      } catch (e:any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    
    // クリーンアップ
    return () => {
      clearTimer();
      (window as any).speechSynthesis?.cancel();
    };
  }, [clearTimer]);

  // ---------------------- Question Start ----------------------
  const startQuestionForIndex = useCallback(async (questionIndex: number) => {
    const targetQuestion = questions[questionIndex];
    if (!targetQuestion || status === 'finished') return;
    
    console.log(`Starting question ${questionIndex + 1}:`, targetQuestion.question_text);
    
    // 状態をリセット
    isProcessingAnswerRef.current = false;
    currentQuestionRef.current = targetQuestion;
    setShowText(false);
    setStatus('speaking');
    clearTimer();
    setTimeLeft(ROUND_TIME_SEC);
    
    // 音声合成をクリア
    (window as any).speechSynthesis?.cancel();
    
    const text = targetQuestion.question_text;
    const isCurrentDemo = questionIndex === 0 && targetQuestion.is_demo === true;

    try {
      // 1回目読み上げ
      await speakAwait(text);
      await new Promise(r => setTimeout(r, DLY.betweenSpeaks));

      // 2回目読み上げ
      await speakAwait(text);
      await new Promise(r => setTimeout(r, DLY.betweenSpeaks));

      // 3回目の読み上げと同時に問題文を表示
      setShowText(true);
      await speakAwait(text);

      // タイマー開始
      startRoundTimer();

      if (isCurrentDemo) {
        // デモの自動処理
        await new Promise(r => setTimeout(r, DLY.afterThirdSpeakBeforeDemoAns));
        
        if (isProcessingAnswerRef.current) return;
        isProcessingAnswerRef.current = true;
        clearTimer();

        // ビーム演出
        setStatus('beam');
        setCorrectCount(c => c + 1);
        await new Promise(r => setTimeout(r, DLY.beam));

        // 爆発演出
        setStatus('explosion');
        await new Promise(r => setTimeout(r, DLY.explosion));

        // 解答表示
        setStatus('reveal');
        await new Promise(r => setTimeout(r, DLY.afterReveal));
        
        moveToNextQuestion();
      } else {
        // 通常問題：回答受付開始
        await new Promise(r => setTimeout(r, DLY.afterThirdSpeakBeforeListen));
        if (!isProcessingAnswerRef.current) {
          setStatus('listening');
        }
      }
    } catch (e) {
      console.error('Error in startQuestionForIndex:', e);
    }
  }, [questions, status, clearTimer, startRoundTimer]);

  // ---------------------- Move to Next Question ----------------------
  const moveToNextQuestion = useCallback(() => {
    clearTimer();
    isProcessingAnswerRef.current = false;
    
    const nextIdx = idx + 1;
    console.log(`Moving from question ${idx + 1} to ${nextIdx + 1}`);
    
    if (nextIdx >= questions.length) {
      setStatus('finished');
      finishGame();
      return;
    }
    
    setIdx(nextIdx);
    setShowText(false);
    setStatus('idle');
    
    // 少し待ってから次の問題を開始
    setTimeout(() => {
      startQuestionForIndex(nextIdx);
    }, DLY.beforeNextQuestion);
  }, [idx, questions.length, clearTimer]);

  // ---------------------- Mic / Answer -----------------------
  const onMic = useCallback(async () => {
    const currentQ = currentQuestionRef.current;
    if (!currentQ || status !== 'listening' || isProcessingAnswerRef.current) return;
    
    const deadline = deadlineRef.current;
    if (!deadline || Date.now() >= deadline) return;

    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return alert('このブラウザは音声認識に未対応です（Chrome 推奨）');
    
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = async (e:any) => {
      if (isProcessingAnswerRef.current || !deadlineRef.current || Date.now() >= deadlineRef.current) {
        return;
      }

      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      console.log('Recognized:', transcript, 'Expected:', currentQ.answers);
      
      const ok = (currentQ.answers || []).some(a => normalize(a) === normalize(transcript));
      
      if (ok) {
        // 正解処理
        isProcessingAnswerRef.current = true;
        clearTimer();
        
        setStatus('beam');
        setCorrectCount(c => c + 1);
        setRealCorrect(c => c + 1);
        await new Promise(r => setTimeout(r, DLY.beam));
        
        setStatus('explosion');
        await new Promise(r => setTimeout(r, DLY.explosion));
        
        setStatus('reveal');
        await new Promise(r => setTimeout(r, DLY.afterReveal));
        
        moveToNextQuestion();
      } else {
        // 不正解
        setStatus('wrong');
        speakBubuu();
        setTimeout(() => {
          if (!isProcessingAnswerRef.current && deadlineRef.current && Date.now() < deadlineRef.current) {
            setStatus('listening');
          }
        }, 600);
      }
    };
    
    rec.onerror = (e:any) => {
      console.error('Speech recognition error:', e);
      if (!isProcessingAnswerRef.current && deadlineRef.current && Date.now() < deadlineRef.current) {
        setStatus('listening');
      }
    };
    
    rec.start();
  }, [status, clearTimer, moveToNextQuestion]);

  // ---------------------- Finish Game ----------------------
  const finishGame = async () => {
    console.log(`Game finished. Total correct: ${realCorrect}/${questions.filter(q => !q.is_demo).length}`);
    const clear = realCorrect >= CORRECT_TO_CLEAR;
    
    try {
      const userId = localStorage.getItem('userId') || '';
      const part_id = partInfo?.part_id || '';
      if (userId && part_id) {
        await fetch('http://localhost:4000/game/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, part_id, scores: realCorrect, clear }),
        });
        
        if (clear) {
          console.log('Clear achieved! Advancing progress...');
          const cur = {
            grade: grade ?? localStorage.getItem('current_grade') ?? '1',
            part: part ?? localStorage.getItem('current_part') ?? '1',
            subpart: subpart ?? localStorage.getItem('current_subpart') ?? '1',
          };
          await fetch('http://localhost:4000/game/advance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, current: cur, part_id, clear }),
          });
        }
      }
    } catch (e) {
      console.warn('score/advance failed', e);
    }
    
    // デモを除いた問題数を渡す
    const totalNonDemoQuestions = questions.filter(q => !q.is_demo).length;
    nav('/result', { state: { clear, correct: realCorrect, total: totalNonDemoQuestions } });
  };

  // ---------------------- Start Button Handler ----------------------
  const handleStartClick = () => {
    setShowRequirement(false);
    setTimeout(() => {
      startQuestionForIndex(0);
    }, 100);
  };

  // ---------------------- Render -----------------------------
  if (loading) return <div className="page"><h1 className="title">Loading...</h1></div>;
  if (error) return <div className="page"><h1 className="title">Error</h1><div style={{color:'salmon'}}>{error}</div></div>;
  if (!partInfo || questions.length === 0) return <div className="page"><h1 className="title">No Data</h1></div>;

  return (
    <div className="page" style={{ position:'relative', minHeight:'100vh' }}>
      {/* 左上：Time Limit */}
      <div style={{ position:'absolute', top:14, left:16, color:'#fff' }}>
        <div style={{ fontSize:20, marginBottom:6 }}>Time Limit</div>
        <div style={{ 
          width:56, height:56, borderRadius:8, 
          background:'rgba(255,255,255,0.9)', color:'#000',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 
        }}>{timeLeft}</div>
      </div>

      {/* 左：何問目 */}
      <div style={{ position:'absolute', top:260, left:'15vw', color:'#fff' }}>
        <div style={{ 
          width:64, height:64, borderRadius:6, 
          background:'rgba(255,255,255,0.9)', color:'#000',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 
        }}>{questionNo}</div>
      </div>

      {/* 上中央：敵 */}
      <div style={{ 
        display:'flex', justifyContent:'center', marginTop:20, 
        position:'absolute', top:0, left:'50%', transform:'translateX(-50%)' 
      }}>
        {status === 'explosion'
          ? <img src="/explosion.gif" alt="boom" style={{ height:64 }} />
          : <img src="/enemy.png" alt="enemy" style={{ height:64 }} />
        }
      </div>

      {/* 中央：要件 or 問題文 */}
      {showRequirement ? (
        <div className="login-box" style={{ maxWidth:700, margin:'24px auto', textAlign:'center' }}>
          <h2 style={{ marginTop:0, color:'#ffffff' }}>Requirement</h2>
          <div style={{ color: '#ffdf6b', fontSize:28, whiteSpace:'pre-wrap' }}>{partInfo.requirement}</div>
          <div style={{ marginTop:18 }}>
            <Button onClick={handleStartClick}>Start</Button>
          </div>
        </div>
      ) : (
        <>
          {/* 問題文 */}
          <div style={{ 
            textAlign:'center', fontSize:52, marginTop:10, minHeight:40, 
            position:'absolute', top:90, color:'#ffffff' 
          }}>
            {showText && current ? current.question_text : ''}
          </div>

          {/* 右側：問題画像 */}
          {current?.image_url && (
            <div style={{ position:'absolute', top:150, right:60 }}>
              <img src={current.image_url} alt="" style={{ width:260, height:'auto', borderRadius:4 }} />
            </div>
          )}

          {/* 正解ビーム */}
          {status === 'beam' && (
            <div style={{ 
              position:'absolute', width:10, left:'50%', transform:'translateX(-50%)', 
              top:220, bottom:200, height:180, margin:'12px auto', 
              background:'#7cf', boxShadow:'0 0 16px #7cf' 
            }} />
          )}

          {/* マイク */}
          <div style={{ 
            position:'absolute', display:'flex', justifyContent:'center', 
            marginTop:20, bottom:150, left:0, right:0 
          }}>
            <button
              onClick={onMic}
              disabled={status !== 'listening'}
              style={{ 
                border:'none', background:'transparent', 
                cursor:(status === 'listening' ? 'pointer' : 'default') 
              }}
            >
              {status === 'timeout'
                ? <img src="/mic_explosion.gif" alt="mic exploded" height={60} />
                : <img src="/mic.png" alt="mic" height={60} />
              }
            </button>
          </div>

          {/* 解答表示 */}
          {(status === 'reveal' || status === 'timeout') && current && (
            <div style={{ 
              position:'absolute', textAlign:'center', marginTop:10, 
              fontSize:40, color:'#fff', bottom:70, left:0, right:0 
            }}>
              <span style={{ marginRight:8 }}>◯</span>
              <span>{current.answers?.[0] ?? ''}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;