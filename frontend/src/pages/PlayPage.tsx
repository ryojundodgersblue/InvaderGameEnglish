import React, { useEffect, useRef, useState } from 'react';
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

function playAngerSound() {
  const synth = (window as any).speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance('グォォォ！');
  u.lang = 'ja-JP';
  u.rate = 0.8;
  u.pitch = 0.5;
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

  // マイク関連の状態
  const [micActive, setMicActive] = useState(false);
  const [capturedTexts, setCapturedTexts] = useState<string[]>([]);
  const [lastRecognized, setLastRecognized] = useState<string>('');

  // Ref を使って最新の値を参照
  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const questionsRef = useRef<Q[]>([]);
  const idxRef = useRef(0);
  const statusRef = useRef<Status>('idle');
  const recognitionRef = useRef<any>(null);
  const capturedRef = useRef<string[]>([]);
  
  // Refと状態を同期
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { statusRef.current = status; }, [status]);

  const current = questions[idx];
  const questionNo = idx + 1;
  const isDemo = idx === 0 && current?.is_demo === true;

  // ---------------------- Timer control ----------------------
  const clearTimer = () => { 
    if (timerRef.current) { 
      window.clearInterval(timerRef.current); 
      timerRef.current = null; 
    } 
    deadlineRef.current = null;
  };
  
  const startRoundTimer = () => {
    clearTimer();
    deadlineRef.current = Date.now() + ROUND_TIME_SEC * 1000;
    setTimeLeft(ROUND_TIME_SEC);
    
    timerRef.current = window.setInterval(() => {
      if (!deadlineRef.current || isProcessingRef.current) {
        clearTimer();
        return;
      }
      
      const now = Date.now();
      const remainMs = Math.max(0, deadlineRef.current - now);
      const remainSec = Math.ceil(remainMs / 1000);
      setTimeLeft(remainSec);
      
      if (remainMs <= 0 && statusRef.current === 'listening') {
        clearTimer();
        handleTimeout();
      }
    }, 100) as any;
  };

  const handleTimeout = async () => {
    if (isProcessingRef.current || statusRef.current !== 'listening') return;
    isProcessingRef.current = true;
    
    // マイクがオンの場合はオフにする
    if (micActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setMicActive(false);
    }
    
    const currentIdx = idxRef.current;
    console.log('Timeout occurred for question:', currentIdx + 1);
    
    // タイムアウト時に敵の攻撃音を再生
    playAngerSound();
    
    setStatus('timeout');
    await new Promise(r => setTimeout(r, DLY.afterTimeoutBeforeReveal));
    setStatus('reveal');
    await new Promise(r => setTimeout(r, DLY.afterReveal));
    
    moveToNextQuestion();
  };

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
        
        console.log('Loaded questions:', qs.length, 'Demo count:', qs.filter(q => q.is_demo).length);
        
        setQuestions(qs);
        questionsRef.current = qs;
        setIdx(0);
        setShowRequirement(true);
      } catch (e:any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    
    return () => {
      clearTimer();
      (window as any).speechSynthesis?.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // ---------------------- Question Start ----------------------
  const startQuestionForIndex = async (questionIndex: number) => {
    const targetQuestion = questionsRef.current[questionIndex];
    if (!targetQuestion || statusRef.current === 'finished') return;
    
    console.log(`Starting question ${questionIndex + 1}:`, targetQuestion.question_text);
    console.log('Total questions available:', questionsRef.current.length);
    
    isProcessingRef.current = false;
    setShowText(false);
    setStatus('speaking');
    clearTimer();
    setTimeLeft(ROUND_TIME_SEC);
    setCapturedTexts([]);
    setLastRecognized('');
    capturedRef.current = [];
    
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
        
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        clearTimer();

        setStatus('beam');
        setCorrectCount(c => c + 1);
        await new Promise(r => setTimeout(r, DLY.beam));

        setStatus('explosion');
        await new Promise(r => setTimeout(r, DLY.explosion));

        setStatus('reveal');
        await new Promise(r => setTimeout(r, DLY.afterReveal));
        
        moveToNextQuestion();
      } else {
        // 通常問題：回答受付開始
        await new Promise(r => setTimeout(r, DLY.afterThirdSpeakBeforeListen));
        if (!isProcessingRef.current) {
          setStatus('listening');
        }
      }
    } catch (e) {
      console.error('Error in startQuestionForIndex:', e);
    }
  };

  // ---------------------- Move to Next Question ----------------------
  const moveToNextQuestion = () => {
    clearTimer();
    isProcessingRef.current = false;
    setMicActive(false);
    
    // 音声認識を停止
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    
    const currentIdx = idxRef.current;
    const nextIdx = currentIdx + 1;
    console.log(`Moving from question ${currentIdx + 1} to ${nextIdx + 1} (Total: ${questionsRef.current.length})`);
    
    if (nextIdx >= questionsRef.current.length) {
      console.log('All questions completed. Moving to result screen.');
      setStatus('finished');
      finishGame();
      return;
    }
    
    setIdx(nextIdx);
    idxRef.current = nextIdx;
    setShowText(false);
    setStatus('idle');
    setCapturedTexts([]);
    setLastRecognized('');
    
    setTimeout(() => {
      startQuestionForIndex(nextIdx);
    }, DLY.beforeNextQuestion);
  };

  // ---------------------- Mic Toggle -----------------------
  const toggleMic = () => {
    const currentQ = questionsRef.current[idxRef.current];
    if (!currentQ || statusRef.current !== 'listening' || isProcessingRef.current) return;
    
    const deadline = deadlineRef.current;
    if (!deadline || Date.now() >= deadline) return;

    if (!micActive) {
      // マイクをオンにする
      startRecognition();
    } else {
      // マイクをオフにして評価
      stopRecognitionAndEvaluate();
    }
  };

  const startRecognition = () => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      alert('このブラウザは音声認識に未対応です（Chrome 推奨）');
      return;
    }
    
    const rec = new SR();
    recognitionRef.current = rec;
    capturedRef.current = [];
    
    rec.lang = 'en-US';
    rec.continuous = true; // 継続的に音声を取得
    rec.interimResults = true; // 中間結果も取得
    rec.maxAlternatives = 3; // 複数の候補を取得

    rec.onresult = (e:any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        for (let j = 0; j < result.length; j++) {
          const alt = result[j];
          const text = alt?.transcript ?? '';
          if (text && text.trim()) {
            const normalized = text.trim();
            // 重複を避けて追加
            if (!capturedRef.current.includes(normalized)) {
              capturedRef.current.push(normalized);
              setCapturedTexts([...capturedRef.current]);
              setLastRecognized(normalized);
              console.log('Captured:', normalized);
            }
          }
        }
      }
    };
    
    rec.onerror = (e:any) => {
      console.log('Speech recognition error:', e.error);
      // no-speechエラーは無視（ユーザーが話していないだけ）
      if (e.error === 'no-speech') {
        return;
      }
      // その他のエラーの場合は停止
      setMicActive(false);
    };
    
    rec.onend = () => {
      console.log('Recognition ended');
      setMicActive(false);
    };

    try {
      rec.start();
      setMicActive(true);
      console.log('Mic ON - Started listening');
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setMicActive(false);
    }
  };

  const stopRecognitionAndEvaluate = async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setMicActive(false);
    console.log('Mic OFF - Evaluating captured texts:', capturedRef.current);
    
    // 評価処理
    const currentQ = questionsRef.current[idxRef.current];
    if (!currentQ || isProcessingRef.current) return;
    
    const captured = capturedRef.current.map(normalize);
    const answers = (currentQ.answers || []).map(normalize);
    
    console.log('Normalized captured:', captured);
    console.log('Expected answers:', answers);
    
    // いずれかの発話が答えと一致するかチェック
    let isCorrect = false;
    for (const capturedText of captured) {
      if (answers.some(ans => capturedText.includes(ans) || ans.includes(capturedText))) {
        isCorrect = true;
        break;
      }
    }
    
    if (isCorrect) {
      // 正解処理
      isProcessingRef.current = true;
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
        if (!isProcessingRef.current && deadlineRef.current && Date.now() < deadlineRef.current) {
          setStatus('listening');
          // 発話をリセット
          capturedRef.current = [];
          setCapturedTexts([]);
        }
      }, 600);
    }
  };

  // ---------------------- Finish Game ----------------------
  const finishGame = async () => {
    const allQuestions = questionsRef.current;
    const nonDemoQuestions = allQuestions.filter(q => !q.is_demo);
    console.log(`Game finished. Total correct: ${realCorrect}/${nonDemoQuestions.length}`);
    console.log('All questions:', allQuestions.length, 'Non-demo:', nonDemoQuestions.length);
    
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
    
    nav('/result', { state: { clear, correct: realCorrect, total: nonDemoQuestions.length } });
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

      {/* 右上：マイク状態表示 */}
      {status === 'listening' && (
        <div style={{ position:'absolute', top:14, right:16 }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: 20,
            background: micActive ? '#10b981' : '#6b7280',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: micActive ? '0 0 20px rgba(16,185,129,0.5)' : 'none',
            animation: micActive ? 'pulse 1.5s infinite' : 'none'
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: micActive ? '#fff' : '#374151',
              animation: micActive ? 'blink 1s infinite' : 'none'
            }}/>
            MIC: {micActive ? 'ON' : 'OFF'}
          </div>
          {lastRecognized && (
            <div style={{
              marginTop: 8,
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 4,
              fontSize: 12,
              color: '#e5e7eb'
            }}>
              Heard: "{lastRecognized}"
            </div>
          )}
        </div>
      )}

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
        {status === 'explosion' || status === 'beam' ? (
          <img src="/enemy_ko.png" alt="enemy ko" style={{ height:64 }} />
        ) : status === 'timeout' ? (
          <img src="/enemy_attack.png" alt="enemy attack" style={{ height:64 }} />
        ) : (
          <img src="/enemy.png" alt="enemy" style={{ height:64 }} />
        )}
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

          {/* 銃ボタン（マイクトグル） */}
          <div style={{ 
            position:'absolute', display:'flex', justifyContent:'center', 
            marginTop:20, bottom:150, left:0, right:0 
          }}>
            <button
              onClick={toggleMic}
              disabled={status !== 'listening'}
              style={{ 
                border:'none', 
                background:'transparent', 
                cursor: status === 'listening' ? 'pointer' : 'default',
                opacity: status === 'listening' ? 1 : 0.5,
                transition: 'all 0.3s',
                transform: micActive ? 'scale(1.1)' : 'scale(1)',
                filter: micActive ? 'drop-shadow(0 0 20px rgba(16,185,129,0.8))' : 'none'
              }}
            >
              <img src="/gun.png" alt="gun" style={{ height: 80 }} />
            </button>
          </div>

          {/* マイク操作ヒント */}
          {status === 'listening' && (
            <div style={{
              position:'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#94a3b8',
              fontSize: 14
            }}>
              {micActive ? 'Click gun to stop & submit' : 'Click gun to start recording'}
            </div>
          )}

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

      {/* アニメーション用のスタイル */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default PlayPage;