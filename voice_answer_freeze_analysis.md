# Voice Answer Processing Flow - Detailed Analysis

## Executive Summary

The application experienced a critical freeze when users answered correctly via voice. The issue was caused by **race conditions** between asynchronous operations (timeout handling and answer evaluation) combined with **improper state management** and **async/await pattern issues**.

The current implementation (after fixes) uses:
1. **State Machine Pattern** - Central control via useReducer
2. **Promise-based Flow Control** - AbortController for cancellable async operations
3. **Grace Period Mechanism** - 3-second buffer for user speech completion
4. **Explicit Processing Flags** - isProcessingRef to prevent race conditions

---

## 1. Voice Answer Processing Flow

### 1.1 Normal Correct Answer Flow (Happy Path)

```
User starts recording (toggleMic)
    ↓
startRecognition()
    ├─ Creates new SpeechRecognition instance
    ├─ Sets lang='en-US', continuous=true, interimResults=true
    ├─ Sets up onresult handler (captures speech phrases)
    └─ Sets up onend handler (auto-restart logic)
    ↓
User speaks and mic captures phrases
    ├─ onresult fires on each recognized phrase
    ├─ Phrases stored in capturedRef.current array
    ├─ RECOGNITION_DETECTED action dispatched
    └─ lastRecognized state updated for UI display
    ↓
User stops recording (toggleMic again)
    ↓
stopRecognitionAndEvaluate()
    ├─ Sets stoppingRef.current = true
    ├─ Calls recognitionRef.current.stop()
    ├─ Sets micActive = false
    └─ Calls evaluateCaptured()
    ↓
evaluateCaptured()
    ├─ [RACE CONDITION CHECK] If isProcessingRef.current, skip
    ├─ [RACE CONDITION CHECK] If not in listening/grace_period state, skip
    ├─ updateActivity() - Update freeze detection timer
    ├─ isProcessingRef.current = true - Block other operations
    ├─ clearTimer() - Stop countdown timer immediately
    ├─ Normalize heard phrases and answers
    ├─ Match using: 1) Exact match, 2) Fuzzy match (Levenshtein ≥0.66 OR Jaccard ≥0.6)
    └─ Proceed based on result
    ↓
IF CORRECT:
    ├─ waitForCurrentAudioToFinish() - Wait for question audio to complete
    ├─ Restore audio volume to TTS_VOLUME
    ├─ forceStopRecognition() - Completely stop speech recognition
    ├─ Update score (if not demo question)
    ├─ BEGIN ANIMATION SEQUENCE:
    │   ├─ Start attack sound async (playSoundAwait)
    │   ├─ dispatch(START_BEAM) → state.phase = 'beam'
    │   ├─ delay(DLY.beam = 800ms)
    │   ├─ Check if still processing (if not, return early)
    │   ├─ dispatch(START_EXPLOSION) → state.phase = 'explosion'
    │   ├─ delay(DLY.explosion = 1000ms)
    │   ├─ Check if still processing (if not, return early)
    │   ├─ dispatch(REVEAL_ANSWER) → state.phase = 'reveal'
    │   ├─ AWAIT attack sound to complete (waits for playSoundAwait promise)
    │   ├─ Play answer audio via speakAwaitTTS(answer, isAnswer=true)
    │   ├─ Check if still processing (if not, return early)
    │   ├─ delay(DLY.afterReveal = 1500ms)
    │   ├─ Check if still processing (if not, return early)
    │   └─ startIntermissionThenNext()
    └─ END ANIMATION SEQUENCE
    ↓
startIntermissionThenNext()
    ├─ dispatch(START_INTERMISSION) with snapshot
    ├─ delay(DLY.intermission = 3000ms)
    └─ moveToNextQuestion()
    ↓
moveToNextQuestion()
    ├─ updateActivity() - Update freeze detection
    ├─ clearTimer()
    ├─ isProcessingRef.current = false - Allow next question
    ├─ Check if all questions completed
    └─ If more questions: dispatch(RESET_TO_IDLE) → startQuestionForIndex(next)
```

---

## 2. Critical Issues Fixed - Root Cause Analysis

### 2.1 Issue #1: Race Condition - Timeout vs Evaluation

#### Problem Scenario
```
Timeline:
T=0ms:    User answer is correct, stopRecognitionAndEvaluate() called
T=100ms:  evaluateCaptured() sets isProcessingRef=true, clearTimer()
T=200ms:  handleTimeout fires (was scheduled from timer interval) 
           → Sees isProcessingRef=false (because it hasn't been updated)
           → Starts its own animation sequence
T=300ms:  evaluateCaptured() animation sequence also runs
RESULT:   TWO animation sequences run simultaneously, freezing the game
```

#### Root Cause
In older code:
1. Timer was cleared by `clearTimeout()` but interval could still fire
2. handleTimeout checked `isProcessingRef.current` AFTER evaluation started
3. Both functions would modify state and play sounds independently
4. No coordination between the two async flows

#### Solution Applied
```typescript
// Step 1: Early race condition check
if (isProcessingRef.current) {
  console.log('[Eval] Already processing - skipping');
  return;
}

// Step 2: Immediate timer stop (blocks handleTimeout)
clearTimer();

// Step 3: Mark processing BEFORE any async work
isProcessingRef.current = true;
console.log('[Eval] Starting evaluation - setting isProcessingRef to true');

// Step 4: Add multiple checkpoints during animation
if (!isProcessingRef.current) {
  console.log('[Eval] Processing was cancelled during beam');
  return; // Exit early if timeout took over
}
```

---

### 2.2 Issue #2: Callback Hell and Timing Issues

#### Problem: Using setTimeout callbacks
```typescript
// OLD CODE (callback hell)
await new Promise(r => setTimeout(r, DLY.beam));

// Multiple nested callbacks with no cancellation capability
setTimeout(() => {
  setStatus('beam');
  setTimeout(() => {
    setStatus('explosion');
    // ... etc
  }, DLY.explosion);
}, DLY.beam);
```

#### Problems:
1. No way to cancel delays if game is interrupted
2. Difficult to debug (no clear async flow)
3. Hard to add checkpoints
4. State updates happen in callbacks (potential batching issues)

#### Solution Applied: Promise-based delay with AbortController
```typescript
// NEW CODE
const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timeout = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
};

// Usage in async function with AbortSignal
try {
  await delay(DLY.beam, abortControllerRef.current?.signal);
  if (!isProcessingRef.current) return; // Checkpoint
  
  dispatch({ type: 'START_EXPLOSION' });
  await delay(DLY.explosion, abortControllerRef.current?.signal);
  if (!isProcessingRef.current) return; // Checkpoint
} catch (e) {
  if (e instanceof DOMException && e.name === 'AbortError') {
    console.log('[Eval] Aborted');
  } else throw e;
}
```

---

### 2.3 Issue #3: Audio Playback Blocking

#### Problem
Question audio and answer audio could overlap/conflict:

```
Timeline:
T=0s:     Question audio starts playing (3 readings of question)
T=5s:     User speaks and is correct
          Answer evaluation begins
T=6s:     Question audio STILL PLAYING
          Animation sequence tries to start
T=7s:     Attack sound plays
          Answer audio tries to play
RESULT:   Audio conflict, user doesn't hear answer clearly
```

#### Solution Applied
```typescript
// WAIT for question audio to finish BEFORE starting animations
await waitForCurrentAudioToFinish();

// Ensure volume is restored for answer playback
originalVolumeRef.current = TTS_VOLUME;

// THEN start the animation sequence
const attackSoundPromise = playSoundAwait('attack.mp3');
dispatch({ type: 'START_BEAM' });
await delay(DLY.beam);

// WAIT for attack sound to complete
await attackSoundPromise;

// THEN play answer
await speakAwaitTTS(q.answers[0], true);
```

---

### 2.4 Issue #4: Grace Period for Late Speech

#### Problem
Users who continue speaking after timeout would lose their answer:

```
Timeline:
T=0:      User asks "What is..." 
T=25s:    User recognizes and starts: "The answer is..."
T=30s:    TIMEOUT occurs (timer expires)
          handleTimeout evaluates current captured phrases: ["what is"]
          Returns WRONG because "what is" doesn't match
T=31s:    User finishes: "The answer is apple"
          But evaluation already happened!
RESULT:   Correct answer lost because of timeout
```

#### Solution Applied: 3-second Grace Period
```typescript
// In handleTimeout, detect if user is speaking
const hasCaptured = capturedRef.current.length > 0;
if (statusRef.current === 'listening' && micActiveRef.current && hasCaptured) {
  console.log(`[Timeout] Grace period activated - user is speaking`);
  
  // Enter grace period state
  dispatch({ type: 'START_GRACE_PERIOD' });
  
  // Give 3 more seconds to finish speaking
  deadlineRef.current = Date.now() + GRACE_PERIOD_SEC * 1000;
  setTimeLeft(GRACE_PERIOD_SEC);
  
  // Show warning to user
  // Visual: "⚠️ Finish speaking!" with red pulsing timer
  
  return; // Don't evaluate yet, wait for grace period to expire
}

// If grace period expires, handleTimeout is called again
if (statusRef.current === 'grace_period' && capturedRef.current.length > 0) {
  console.log('[Timeout] Evaluating captured speech after grace period');
  await evaluateCaptured();
  return;
}
```

---

## 3. State Machine Pattern

### 3.1 Type-Safe States
```typescript
type GamePhase =
  | 'idle'           // Waiting to start question
  | 'speaking'       // Question is being read aloud
  | 'listening'      // Waiting for user answer
  | 'beam'           // Attack animation (correct answer)
  | 'explosion'      // Explosion animation
  | 'reveal'         // Show correct answer
  | 'timeout'        // Time ran out
  | 'grace_period'   // Extra 3 seconds to finish speaking
  | 'wrong'          // User gave wrong answer
  | 'intermission'   // Show answer screen before next Q
  | 'finished';      // All questions complete

type GameState = {
  phase: GamePhase;
  enemyVariant: EnemyVariant;  // 'normal' | 'ko' | 'attack'
  hasRecognition: boolean;      // Track if speech detected
  intermissionSnap: IntermissionSnapshot | null;
};

type GameAction =
  | { type: 'START_SPEAKING' }
  | { type: 'START_LISTENING' }
  | { type: 'RECOGNITION_DETECTED' }
  | { type: 'START_BEAM' }
  | { type: 'START_EXPLOSION' }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'TIMEOUT' }
  | { type: 'START_GRACE_PERIOD' }
  | { type: 'WRONG_ANSWER' }
  | { type: 'START_INTERMISSION'; snapshot: IntermissionSnapshot }
  | { type: 'RESET_TO_IDLE' }
  | { type: 'FINISH_GAME' };
```

### 3.2 Reducer Logic
```typescript
function gameStateReducer(state: GameState, action: GameAction): GameState {
  console.log('[StateMachine]', { from: state.phase, action: action.type });

  switch (action.type) {
    case 'START_SPEAKING':
      return { ...state, phase: 'speaking', enemyVariant: 'normal' };
    
    case 'START_LISTENING':
      return { ...state, phase: 'listening' };
    
    case 'START_GRACE_PERIOD':
      return { ...state, phase: 'grace_period', enemyVariant: 'attack' };
    
    case 'START_BEAM':
      return { ...state, phase: 'beam', enemyVariant: 'ko' };
    
    // ... etc
  }
}
```

Benefits:
- Centralized state transitions
- Type-safe (TypeScript catches invalid transitions)
- Easy to debug (every change logged)
- Predictable (no race conditions on state)

---

## 4. Answer Checking Algorithm

### 4.1 Two-Phase Matching
```typescript
// Phase 1: Exact Match (Fast)
outer: for (const h of heard) {
  for (const a of answers) {
    if (h === a) {  // Exact equality
      isCorrect = true;
      matchDetails = `Exact match: "${h}" === "${a}"`;
      break outer;
    }
  }
}

// Phase 2: Fuzzy Match (Only if no exact match)
if (!isCorrect) {
  outer2: for (const h of heard) {
    for (const a of answers) {
      const s = simLevenshtein(h, a);  // Levenshtein distance similarity
      const j = jaccard(h, a);         // Word overlap percentage
      if (s >= 0.66 || j >= 0.6) {    // Thresholds
        isCorrect = true;
        matchDetails = `Fuzzy match: "${h}" ≈ "${a}" 
                       (Levenshtein: ${s}, Jaccard: ${j})`;
        break outer2;
      }
    }
  }
}
```

### 4.2 Normalization
```typescript
const normalize = (s: string) =>
  s.toLowerCase()              // Convert to lowercase
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();                    // Remove leading/trailing spaces
```

Example:
- User says: "The apple!"
- Becomes: "the apple"
- Matches against: "apple" (Jaccard score good)
- Matches against: "the apple" (Exact match!)

---

## 5. Async Operation Control - AbortController

### 5.1 Creating Controller for Each Question
```typescript
// At start of question
if (abortControllerRef.current) {
  abortControllerRef.current.abort();  // Cancel previous question
}
abortControllerRef.current = new AbortController();
```

### 5.2 Using Signal in All Async Operations
```typescript
// Can be aborted if user moves to next question
await delay(DLY.betweenSpeaks, abortControllerRef.current?.signal);

// Can be aborted if game is stopped
await delay(DLY.beam, abortControllerRef.current?.signal);

// Can be aborted if evaluation is cancelled
await speakAwaitTTS(q.answers[0], true);
```

### 5.3 Error Handling
```typescript
try {
  await delay(1000, signal);
  // Continue...
} catch (e) {
  if (e instanceof DOMException && e.name === 'AbortError') {
    console.log('[Question] Aborted');  // Expected
  } else {
    throw e;  // Unexpected error
  }
}
```

---

## 6. Freeze Detection System

### 6.1 Mechanism
```typescript
// Start detection when question begins
startFreezeDetection() {
  lastActivityRef.current = Date.now();
  freezeDetectionTimerRef.current = window.setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    if (timeSinceActivity > 30000) {  // 30 seconds with no progress
      console.error('[Freeze] Game appears frozen');
      setFreezeDetected(true);
    }
  }, 5000);  // Check every 5 seconds
}

// Update activity during key operations
updateActivity() {
  lastActivityRef.current = Date.now();
}

// Called in:
// - startQuestionForIndex()
// - evaluateCaptured()
// - handleTimeout()
// - moveToNextQuestion()
```

### 6.2 UI Recovery
```tsx
{freezeDetected && (
  <div>
    <h2>⚠️ エラーが発生しました</h2>
    <p>ゲームが正常に動作していない可能性があります。</p>
    <Button onClick={() => nav('/login')}>ログイン画面に戻る</Button>
  </div>
)}
```

---

## 7. Potential Remaining Issues

### 7.1 Scenario: Network Latency on TTS
```
If audio fetch delays:
T=0:      evaluateCaptured() called
T=100ms:  Audio fetch starts (HTTP request)
T=1000ms: Network slow, audio not returned yet
          But animation sequences have already started
          dispatch(START_BEAM) already occurred
RISK:     Audio plays out of sync with animation
```

**Mitigation in code:**
- `await speakAwaitTTS()` waits for the promise to resolve
- This blocks until audio actually plays
- Attack sound promise-waiting ensures proper sequencing

### 7.2 Scenario: Browser Speech Recognition Crashes
```
If SpeechRecognition.onend() doesn't fire (browser bug):
- recognitionRef still holds reference
- stoppingRef.current would be true
- Next call to startRecognition() creates new instance
RISK:     Memory leak, but recoverable
```

**Mitigation:**
- forceStopRecognition() nulls the reference
- New AbortController per question cleans up old state

### 7.3 Scenario: Very Fast Speaker
```
If user says answer very quickly:
T=0s:     Question reading starts
T=0.5s:   User immediately starts speaking
T=1s:     User finishes: "apple"
          Audio still reading question
          evaluateCaptured() called

FLOW:
  ├─ waitForCurrentAudioToFinish() - blocks until T=3-5s
  ├─ Then starts animation
  └─ Works correctly!

NO RACE: Because we wait for question audio first
```

---

## 8. Key Constants and Timings

```typescript
const ROUND_TIME_SEC = 30;        // Total time per question
const GRACE_PERIOD_SEC = 3;       // Extra time if speaking at timeout
const CORRECT_TO_CLEAR = 10;      // Correct answers needed to pass

const DLY = {
  betweenSpeaks: 1200,            // 1.2s between question readings
  afterThirdSpeakBeforeDemoAns: 2000,
  afterThirdSpeakBeforeListen: 800,
  beam: 800,                      // Beam animation duration
  explosion: 1000,                // Explosion animation
  afterReveal: 1500,              // After showing answer
  afterTimeoutBeforeReveal: 500,
  beforeNextQuestion: 300,        // Pause before next Q
  intermission: 3000,             // Answer screen display time
};
```

---

## 9. Control Flow Diagram

```
GAME FLOW:
┌─────────────────┐
│  LOAD QUESTIONS │
└────────┬────────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │     LOOP THROUGH QUESTIONS          │
    └────────┬────────────────────────────┘
             │
             ▼
    ┌───────────────────────────────┐
    │ START_QUESTION_FOR_INDEX      │
    ├───────────────────────────────┤
    │ 1. Create AbortController     │
    │ 2. Start freeze detection     │
    │ 3. dispatch(RESET_TO_IDLE)    │
    │ 4. Read question 3 times      │
    │ 5. dispatch(START_LISTENING)  │
    │ 6. Start 30s timer            │
    └────────┬─────────────────────┘
             │
        ┌────┴────────────────┐
        │                     │
        ▼                     ▼
   USER ANSWERS         TIMEOUT EXPIRES
        │                     │
        │             ┌───────┴───────┐
        │             │               │
        ▼             ▼               ▼
   STOP REC      GRACE PERIOD?    SKIP EVAL
   EVALUATE      (3 sec)
        │             │
        ├─────────────┤
        │             
        ▼             
   MATCH CHECK        
        │
    ┌───┴────────┐
    │            │
    ▼            ▼
  CORRECT     WRONG
    │            │
    ▼            ▼
 ANIMATION    RETRY
 SEQUENCE   (back to
   │        listening)
   │
   ▼
START INTERMISSION
 (show answer)
   │
   ▼
MOVE_TO_NEXT
   │
   └──► Loop or FINISH


CRITICAL SYNCHRONIZATION POINTS:
═══════════════════════════════════

evaluateCaptured():
├─ [GATE 1] if isProcessingRef → return
├─ isProcessingRef = true
├─ clearTimer()
├─ [GATE 2] waitForCurrentAudioToFinish()
├─ [GATE 3] dispatch(START_BEAM)
├─ await delay()
├─ [GATE 4] if !isProcessingRef → return
├─ dispatch(START_EXPLOSION)
├─ await delay()
├─ [GATE 5] if !isProcessingRef → return
├─ dispatch(REVEAL_ANSWER)
├─ await attackSoundPromise
├─ await speakAwaitTTS()
├─ [GATE 6] if !isProcessingRef → return
├─ await delay()
├─ [GATE 7] if !isProcessingRef → return
└─ startIntermissionThenNext()

Each gate prevents:
- Double animation sequences
- Stale state values
- Audio conflicts
- Timing issues
```

---

## 10. Summary: Why Freezing Occurred (Before Fix)

### The Perfect Storm:
1. **Race Condition**: Both `evaluateCaptured()` and `handleTimeout()` could run simultaneously
2. **State Conflicts**: Both functions modified state independently
3. **Audio Conflicts**: Multiple sounds playing, overlapping
4. **No Synchronization**: No way to cancel one if the other started
5. **Callback Hell**: Nested `setTimeout` callbacks with no visibility into flow

### The Fix:
1. **State Machine**: Single source of truth for game state
2. **Processing Flag**: `isProcessingRef` prevents double execution
3. **AbortController**: Cancellable async operations
4. **Promise-based Flow**: Clear async/await with error handling
5. **Grace Period**: Prevents premature timeout evaluation
6. **Checkpoints**: Multiple guards during animation sequence
7. **Audio Sequencing**: Explicit wait for sound completion

---

## 11. Testing Checklist

To verify the fix works:

- [ ] User speaks quickly (answer within 5 seconds) → Correct answer shows, no freeze
- [ ] User speaks slowly (continues until 25 seconds) → Grace period activated, answer evaluated
- [ ] User speaks very slowly (continues past grace period) → Timeout occurs, no crash
- [ ] User doesn't speak (timeout) → Answer revealed, next question loads
- [ ] User gives wrong answer → Stays in listening, can try again
- [ ] Answer pronunciation variations (lowercase, special chars) → Fuzzy match works
- [ ] Browser tab loses focus → Speech recognition stops gracefully
- [ ] Multiple rapid answer attempts → No race conditions
- [ ] Game freeze detector → Shows recovery dialog after 30s inactivity
- [ ] Mic on/off during question audio → Transitions smoothly

