# Detailed Root Cause Analysis - Code Locations & Examples

## 1. DUAL STATE MANAGEMENT ANTI-PATTERN

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`

#### State Declarations (Lines 290-306)
```typescript
const [loading, setLoading] = useState(true);
const [partInfo, setPartInfo] = useState<PartInfo | null>(null);
const [questions, setQuestions] = useState<Q[]>([]);
const [idx, setIdx] = useState(0);
const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SEC);
const [showRequirement, setShowRequirement] = useState(true);
const [showText, setShowText] = useState(false);
const [realCorrect, setRealCorrect] = useState(0);
const [gameState, dispatch] = React.useReducer(gameStateReducer, initialGameState);
const { phase: status, enemyVariant, intermissionSnap } = gameState;
```

#### Ref Declarations (Lines 307-325)
```typescript
const recognitionRef = useRef<SpeechRecognition | null>(null);
const capturedRef = useRef<string[]>([]);
const stoppingRef = useRef(false);
const micActiveRef = useRef(false);
const currentAudioRef = useRef<HTMLAudioElement | null>(null);
const isSpeakingRef = useRef(false);
const timerRef = useRef<number | null>(null);
const deadlineRef = useRef<number | null>(null);
const timeLeftRef = useRef<number>(ROUND_TIME_SEC);
const freezeDetectionTimerRef = useRef<number | null>(null);
const isProcessingRef = useRef(false);
const questionsRef = useRef<Q[]>([]);
const idxRef = useRef(0);
const statusRef = useRef<Status>('idle');
const realCorrectRef = useRef(0);
```

#### Synchronization (Lines 336-339)
```typescript
useEffect(() => { questionsRef.current = questions; }, [questions]);
useEffect(() => { idxRef.current = idx; }, [idx]);
useEffect(() => { statusRef.current = status; }, [status]);
useEffect(() => { realCorrectRef.current = realCorrect; }, [realCorrect]);
```

### Problem Example: Race During Evaluation + Timeout

**Timeline**:
```
t=0ms: User says wrong answer
t=50ms: evaluateCaptured() starts
       - Checks isProcessingRef.current (false) → passes
       - Sets isProcessingRef.current = true
       - statusRef.current = 'listening' (from state)

t=100ms: evaluateCaptured() doing fuzzy matching
       - Uses questionsRef.current (synced from state)
       - Uses realCorrectRef.current (synced from state)

t=29,950ms: Timer checks deadline
           - Remaining time = 0
           - clearTimer() called
           - handleTimeout() called (async)

t=29,960ms: handleTimeout() checks statusRef.current
           - But statusRef = 'listening' (stale from question start!)
           - evaluateCaptured() might be in "wrong answer" state
           - State = 'wrong', ref = 'listening' → MISMATCH

t=29,970ms: handleTimeout() returns early because status != 'listening'
           - Game is now in 'wrong' state
           - No timeout handling happened
           - No intermission started
           - Game FREEZES
```

---

## 2. GLOBAL STATE LOCK (isProcessingRef) ANTIPATTERN

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`

#### Where Lock is Set

**In handleTimeout (Lines 440-454)**:
```typescript
const handleTimeout = useCallback(async () => {
  // ★ 競合状態対策: 既に処理中、またはlistening状態でない場合は無視
  if (isProcessingRef.current) {
    console.log('[Timeout] Ignored - already processing');
    return;
  }

  if (statusRef.current !== 'listening') {
    console.log('[Timeout] Ignored - not in listening state:', statusRef.current);
    return;
  }

  updateActivity();

  // ★ 処理開始フラグを立てる（他の処理をブロック）
  isProcessingRef.current = true;
  console.log(`[Timeout] Question ${idxRef.current + 1} timed out`);
```

**In evaluateCaptured (Lines 1237-1246)**:
```typescript
const evaluateCaptured = useCallback(async () => {
  // ★ 競合状態対策: 既に処理中の場合はスキップ
  if (isProcessingRef.current) {
    console.log('[Eval] Already processing - skipping');
    return;
  }

  updateActivity();

  // ★ 競合状態対策: 処理開始をマーク（タイムアウトとの競合を防ぐ）
  isProcessingRef.current = true;
  console.log('[Eval] Starting evaluation - setting isProcessingRef to true');
```

#### Where Lock is Cleared

**Only in correct answer path (Lines 1302-1315)**:
```typescript
if (isCorrect) {
  // ★ 正解の場合: タイマーを停止
  clearTimer();
  console.log('[Eval] Correct answer - timer cleared');

  // ★ 問題の音声が終了するまで待つ
  await waitForCurrentAudioToFinish();

  // ★ 音量を確実に復元
  originalVolumeRef.current = TTS_VOLUME;
  console.log('[Eval] Audio volume restored for answer playback');

  // ★ 音声認識を完全停止
  forceStopRecognition();
```

**NOT cleared in wrong answer path (Lines 1386-1407)**:
```typescript
} else {
  // ★ 不正解の場合: タイマーが残っている場合のみlistening状態に戻る
  dispatch({ type: 'WRONG_ANSWER' });
  statusRef.current = 'wrong';
  playSound('miss.mp3');

  try {
    await delay(600, abortControllerRef.current?.signal);

    // ★ タイマーが残っているかチェック
    if (deadlineRef.current && Date.now() < deadlineRef.current) {
      // ★ 認識結果をクリア（新しい回答を受け付けるため）
      capturedRef.current = [];
      setLastRecognized('');
      console.log('[Eval] Wrong answer - cleared recognition results');

      // ★ 不正解の場合は処理完了をマーク（listening状態に戻る）
      isProcessingRef.current = false;  // <-- CLEARED HERE
      console.log('[Eval] Wrong answer - resetting isProcessingRef and returning to listening state');
      dispatch({ type: 'START_LISTENING' });
      statusRef.current = 'listening';
```

### Deadlock Scenario: Wrong Answer + Time Expires

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Code**: Lines 1409-1453

```typescript
} else {
  // ★ 不正解でかつ時間切れの場合は、タイムアウトと同じ処理を実行
  console.log('[Eval] Wrong answer - time expired, showing correct answer and moving to next');

  // ★ タイマーを停止
  clearTimer();

  // 音声認識を完全停止
  forceStopRecognition();

  // 問題の音声が終了するまで待つ
  await waitForCurrentAudioToFinish();

  // タイムアウト状態に遷移
  dispatch({ type: 'TIMEOUT' });

  await delay(DLY.afterTimeoutBeforeReveal, abortControllerRef.current?.signal);

  if (!isProcessingRef.current) {
    console.log('[Eval] Processing was cancelled during delay');
    return;  // <-- BUG: Returns without resetting isProcessingRef!
  }
```

**Why this was added (Commit c4908e5)**:
```
Before: Just returned without doing anything
        → isProcessingRef stayed true
        → Game froze forever

After: Full async flow to properly transition states
       → Eventually releases the lock
```

---

## 3. TIMER RACE CONDITION

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx` (Lines 510-531)

#### Timer Loop
```typescript
const startTimer = useCallback(() => {
  clearTimer();
  deadlineRef.current = Date.now() + ROUND_TIME_SEC * 1000;
  setTimeLeft(ROUND_TIME_SEC);
  console.log('[Timer] Started');
  
  timerRef.current = window.setInterval(() => {
    const dl = deadlineRef.current;
    if (!dl) { 
      clearTimer(); 
      return; 
    }
    const remainMs = Math.max(0, dl - Date.now());
    const newTimeLeft = Math.ceil(remainMs / 1000);
    setTimeLeft(newTimeLeft);
    
    if (remainMs <= 0) {
      clearTimer();       // Line 527: Clear the interval
      handleTimeout();    // Line 528: Call async handler
    }
  }, 120);  // Runs every 120ms
}, [clearTimer, handleTimeout]);
```

#### Critical Race Window

**Scenario: Wrong answer detected at t=29.8s**:

```
t=0ms: startTimer() called
       deadlineRef = now + 30000
       timerRef interval started

t=29,800ms: User gives wrong answer
           evaluateCaptured() starts
           Sets isProcessingRef.current = true
           Calls playSound('miss.mp3')
           Waits 600ms before checking time

t=29,880ms: Timer interval fires (120ms cycles)
           remainMs = 120ms (time remaining)
           setTimeLeft(1) - updates React state
           remainMs > 0, so continue

t=29,990ms: Timer interval fires again
           remainMs = 10ms (time remaining)
           setTimeLeft(1)
           remainMs <= 0 → TRUE
           Calls clearTimer()
           Calls handleTimeout() (ASYNC)

t=29,991ms: clearTimer() runs
           window.clearInterval(timerRef.current)
           timerRef.current = null
           Returns

t=29,992ms: handleTimeout() is awaiting in event loop
           But React component has handleTimeout as dependency
           handleTimeout function has statusRef, deadlineRef captures
           Checks statusRef.current === 'listening'?

t=30,000ms: evaluateCaptured() finishes its delay(600ms)
           Checks time remaining
           Calls startIntermissionThenNext()
           OR Calls delay() again

t=30,050ms: handleTimeout() finally runs
           Checks statusRef - which state is it?
           If from evaluateCaptured, state is 'wrong'
           handleTimeout checks: statusRef !== 'listening'?
           YES → Returns without doing anything
           
RESULT: Both functions tried to process same end-of-question event
        One won, one lost
        Game may be in inconsistent state
```

---

## 4. SPEECH RECOGNITION DEADLOCK

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx` (Lines 1148-1197)

#### Recognition onend Handler
```typescript
rec.onend = () => {
  console.log('[ASR] Ended');

  // ★ 競合状態対策: 停止フラグが立っている場合は再起動しない
  if (stoppingRef.current) {
    console.log('[ASR] Not restarting - stopping flag is set');
    setMicActive(false);
    micActiveRef.current = false;
    return;  // <-- Check 1
  }

  // ★ マイクが非アクティブなら再起動しない
  if (!micActiveRef.current) {
    console.log('[ASR] Not restarting - mic is inactive');
    return;  // <-- Check 2
  }

  // ★ タイムアウトまたは処理中の場合は再起動しない
  if (isProcessingRef.current) {
    console.log('[ASR] Not restarting - processing in progress');
    setMicActive(false);
    micActiveRef.current = false;
    return;  // <-- Check 3
  }

  if (timeLeftRef.current <= 0) {
    console.log('[ASR] Not restarting - time expired');
    setMicActive(false);
    micActiveRef.current = false;
    return;  // <-- Check 4
  }

  // ★ 有効なステータスでない場合は再起動しない
  const shouldRestart = ['speaking', 'listening', 'wrong'].includes(statusRef.current);

  if (shouldRestart) {
    try {
      rec.start();
      console.log('[ASR] Auto-restarted');
    } catch (err) {
      console.warn('[ASR] Failed to restart:', err);
      setMicActive(false);
      micActiveRef.current = false;
    }
  } else {
    console.log('[ASR] Not restarting - invalid status:', statusRef.current);
    setMicActive(false);
    micActiveRef.current = false;
  }
};
```

#### Force Stop (Lines 376-394)
```typescript
const forceStopRecognition = useCallback(() => {
  console.log('[ASR] Force stopping recognition');
  // ★ 再起動を確実に防ぐため、停止フラグを設定
  stoppingRef.current = true;
  try {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;  // <-- Clear handler
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;  // <-- Clear reference
    }
  } catch (e) {
    console.warn('[ASR] Error during force stop:', e);
  }
  setMicActive(false);
  micActiveRef.current = false;
}, []);
```

#### The Deadlock Scenario

```
Scenario: User on question, has mic on, timeout fires

t=0ms: startRecognition() called
      recognitionRef = new SR()
      rec.onend handler attached
      rec.start()
      micActiveRef = true

t=29,950ms: Timeout fires
           forceStopRecognition() called
           Sets stoppingRef.current = true
           Calls recognitionRef.current.stop()

t=29,951ms: Recognition naturally ends
           rec.onend fires
           Checks stoppingRef.current → TRUE
           Returns early
           Doesn't try to restart

t=30,100ms: Next question starts
           startRecognition() called again
           recognitionRef.current is null (was cleared)
           new SR() called → creates new instance
           Sets up onend handler
           Calls rec.start()
           
BUT: stoppingRef.current is STILL TRUE!
           
t=30,101ms: New recognition naturally ends (or completes)
           rec.onend fires
           Checks stoppingRef.current → STILL TRUE!
           Returns without restarting
           
RESULT: Mic is permanently dead
        Next timeout will force stop again
        Game continues but mic doesn't work
```

**Code Issue**: `stoppingRef` is never reset to `false` after use!

---

## 5. AUDIO LISTENER MEMORY LEAKS

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx` (Lines 642-891)

#### Pattern 1: Buffer Type Audio (Lines 696-737)
```typescript
const uint8Array = new Uint8Array(contentObj.data);
const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
const audioUrl = URL.createObjectURL(blob);
const audio = new Audio(audioUrl);
audio.volume = isAnswer ? TTS_VOLUME : (micActiveRef.current ? 0 : TTS_VOLUME);
currentAudioRef.current = audio;

// ★ タイムアウト付きでPromiseを待つ（画面固まり対策）
await Promise.race([
  new Promise<void>((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
      isSpeakingRef.current = false;
      resolve();
    };
    audio.onerror = () => {
      console.error('[TTS] Audio playback error');
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
      isSpeakingRef.current = false;
      resolve();
    };
    audio.play().catch(() => {
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null;
      isSpeakingRef.current = false;
      resolve();
    });
  }),
  // タイムアウト: 15秒で強制的にresolve
  new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn('[TTS] Audio playback timeout (15s) - forcing resolve');
      if (currentAudioRef.current === audio) {
        audio.pause();
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        isSpeakingRef.current = false;
      }
      resolve();
    }, 15000);  // <-- TIMEOUT STILL RUNNING AFTER PROMISE RESOLVES
  })
]);
```

#### Pattern 2: Repeated in Different Form (Lines 745-788)
Same pattern repeated with different condition checks

#### Pattern 3: Base64 String Variant (Lines 832-878)
Same pattern repeated again

**Leak Mechanism**:

```
Timeline for Single TTS Call:

t=0ms: speakAwaitTTS() called
      Creates Promise.race()
      Starts setTimeout(15000) for timeout

t=1000ms: Audio finishes naturally
         audio.onended fires
         resolve() called (left promise wins)
         cleanup happens for audio
         
BUT: setTimeout is STILL RUNNING
     timerID still in browser's timer queue
     Every 16 questions = 16+ leaked timeouts per game

t=4000ms: User plays 4 games
         4 * 16 questions * 3 TTS calls = 192 TTS calls
         192 * 1 leaked timeout each = 192 timers

t=5000ms: Even if game closed, timeouts still fire
         Nothing to do when fired
         But memory still allocated for timer

t=15000ms: Original timeout fires
          Checks: if (currentAudioRef.current === audio)
          But currentAudioRef might be different audio now
          Doesn't do anything
          Consumes resources anyway
```

---

## 6. INCONSISTENT DATA RETRIEVAL OPTIONS

### Location: `/home/user/InvaderGameEnglish/backend/src/routes/`

#### /game/part (Line 80-82)
File: `playGame.js`
```javascript
const resp = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${PARTS_SHEET}!A1:E`,
  valueRenderOption: 'UNFORMATTED_VALUE',  // <-- No leading zeros
});
```

#### /game/score (Line 276-280)
File: `playGame.js`
```javascript
const s = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${SCORES_SHEET}!A1:F`,
  valueRenderOption: 'FORMATTED_VALUE',  // <-- Preserves zeros
});
```

#### /game/advance (Line 391-395)
File: `playGame.js`
```javascript
const sResp = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${SCORES_SHEET}!A1:F`,
  valueRenderOption: 'FORMATTED_VALUE',  // <-- Preserves zeros
});
```

#### /select/options (Line 62-66)
File: `select.js`
```javascript
const userResponse = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: 'users!A:K',
  valueRenderOption: 'FORMATTED_VALUE',  // <-- Preserves zeros
});
```

#### /auth/login (Line 82-86)
File: `logInPage.js`
```javascript
const resp = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${USER_SHEET_NAME}!A1:K`,
  valueRenderOption: 'FORMATTED_VALUE',  // <-- Preserves zeros
});
```

**Impact Example**:
```
User ID in Sheets: "00002" (formatted as text with leading zeros)

FORMATTED_VALUE returns: "00002"
UNFORMATTED_VALUE returns: "2" (or 2 as number)

When comparing:
String("00002") === String(2)  // FALSE - comparison fails!

Bug: Ranking lookup uses FORMATTED, but part retrieval uses UNFORMATTED
     Searching for user "00002" in /game/advance fails
     Because /game/part returned user_id as just "2"
```

---

## 7. MISSING ERROR HANDLING BOUNDARIES

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`

#### handleTimeout (Lines 438-508)
```typescript
const handleTimeout = useCallback(async () => {
  // ... setup code ...
  
  try {
    await delay(DLY.afterTimeoutBeforeReveal, abortControllerRef.current?.signal);

    if (!isProcessingRef.current) {
      console.log('[Timeout] Processing was cancelled during delay');
      return;
    }

    dispatch({ type: 'REVEAL_ANSWER' });

    const q = questionsRef.current[idxRef.current];
    if (q?.answers?.[0]) {
      await speakAwaitTTS(q.answers[0], true);  // <-- CAN THROW
    }

    if (!isProcessingRef.current) {
      console.log('[Timeout] Processing was cancelled after TTS');
      return;
    }

    await delay(DLY.afterReveal, abortControllerRef.current?.signal);

    if (!isProcessingRef.current) {
      console.log('[Timeout] Processing was cancelled before intermission');
      return;
    }

    startIntermissionThenNext();  // <-- CAN THROW
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.log('[Timeout] Aborted');
    } else {
      throw e;  // <-- RE-THROWS UNHANDLED!
    }
  }
}, [forceStopRecognition, waitForCurrentAudioToFinish, updateActivity]);
// <-- MISSING DEPENDENCIES!
```

**Issues**:

1. **speakAwaitTTS() can throw** (Lines 878-891):
   ```typescript
   catch (error) {
     console.error('[TTS] Error:', error);
     
     if (axios.isAxiosError(error)) {
       console.error('[TTS] Axios error:', {...});
     }
     
     isSpeakingRef.current = false;
     // <-- Doesn't throw, just logs
   }
   ```
   So TTS errors are swallowed, not thrown.

2. **startIntermissionThenNext() can throw** (Lines 1016-1044):
   ```typescript
   const startIntermissionThenNext = useCallback(async () => {
     // ... code ...
     try {
       await delay(DLY.intermission, abortControllerRef.current?.signal);
       moveToNextQuestion();  // <-- CAN THROW
     } catch (e) {
       if (e instanceof DOMException && e.name === 'AbortError') {
         console.log('[Intermission] Aborted');
       } else {
         throw e;  // <-- RE-THROWS
       }
     }
   }, []);
   ```

3. **Missing Dependencies** in handleTimeout:
   - Uses `forceStopRecognition` in dependency ✓
   - Uses `waitForCurrentAudioToFinish` in dependency ✓
   - Uses `updateActivity` in dependency ✓
   - But uses `speakAwaitTTS` WITHOUT adding to dependencies!
   - Uses `startIntermissionThenNext` WITHOUT adding to dependencies!

   This means if those functions are recreated, old version is used.

---

## 8. NO CLEANUP ON UNMOUNT

### Location: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx` (Lines 588-596)

```typescript
return () => {
  console.log('[Cleanup] Component unmounting');
  clearTimer();
  stopCurrentAudio();
  forceStopRecognition();
  stopFreezeDetection();
};
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**Problems**:

1. **AbortController never aborted**:
   ```typescript
   // Created at line 316
   const abortControllerRef = useRef<AbortController | null>(null);
   
   // Never aborted in cleanup
   // New one created for each question (line 911)
   if (abortControllerRef.current) {
     abortControllerRef.current.abort();  // <-- Only aborts previous
   }
   abortControllerRef.current = new AbortController();
   
   // But on unmount, current one is never aborted
   // All pending promises continue!
   ```

2. **No ref cleanup**:
   ```typescript
   // None of these are cleared on unmount:
   questionsRef.current = qs;
   idxRef.current = 0;
   statusRef.current = 'idle';
   realCorrectRef.current = 0;
   
   // If component remounts, old refs might leak state
   ```

3. **Audio URLs might not be revoked**:
   - If audio is still playing, onended won't fire
   - URL.revokeObjectURL never called
   - Blob memory leaks

---

## Conclusion

These 8 root issues create a perfect storm for bugs:

1. Dual state → Race conditions
2. Global lock → Deadlocks  
3. Timer race → Missed transitions
4. Recognition deadlock → Stuck mic
5. Audio leaks → Memory issues
6. Data inconsistency → Wrong data flow
7. Missing error boundaries → Unhandled errors
8. No cleanup → Resource leaks

**Each fix adds complexity that creates more bugs**
