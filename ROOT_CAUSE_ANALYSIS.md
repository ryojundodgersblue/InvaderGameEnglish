# Invader Game Codebase - Root Cause Analysis Report

## Executive Summary

After analyzing the codebase and git history, I've identified **SYSTEMIC ARCHITECTURAL ISSUES** that cause cascading bugs. The game repeatedly exhibits freezes, timeouts, and state synchronization problems because of fundamental design flaws that persist even after individual bug fixes.

**Key Finding**: The codebase has **multiple sources of truth for game state**, creating race conditions and state synchronization issues that cannot be permanently fixed without architectural refactoring.

---

## CRITICAL ISSUES FOUND

### 1. DUAL STATE MANAGEMENT ANTI-PATTERN (Root Cause #1)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 290-339, 333-339

**Problem**: The code maintains TWO separate state systems that must stay synchronized:
- **React State**: `status`, `idx`, `realCorrect`, `timeLeft`, `questions`
- **Refs**: `statusRef`, `idxRef`, `realCorrectRef`, `timeLeftRef`, `questionsRef`

```typescript
// Lines 290-306: React state declarations
const [idx, setIdx] = useState(0);
const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SEC);
const [realCorrect, setRealCorrect] = useState(0);
const [gameState, dispatch] = React.useReducer(gameStateReducer, initialGameState);
const { phase: status, enemyVariant, intermissionSnap } = gameState;

// Lines 307-339: Manual synchronization via useEffect
const idxRef = useRef(0);
const statusRef = useRef<Status>('idle');
const realCorrectRef = useRef(0);
useEffect(() => { questionsRef.current = questions; }, [questions]);
useEffect(() => { idxRef.current = idx; }, [idx]);
useEffect(() => { statusRef.current = status; }, [status]);
useEffect(() => { realCorrectRef.current = realCorrect; }, [realCorrect]);
```

**Impact**:
1. **Stale Closure Problem**: Callbacks capture refs, but those refs might be out of sync with state
2. **Batching Issues**: React state updates are batched, but refs are updated immediately → creates windows where refs don't match state
3. **Timing Vulnerability**: In async operations lasting 100ms+, refs might be stale
4. **Impossible to Fix at Callback Level**: Each callback checks refs, but refs can change between callback creation and execution

**Example Race Condition**:
```
1. User answers incorrectly at t=0ms
2. evaluateCaptured() starts, isProcessingRef.current = true
3. setTimeout for timeout fires at t=29,000ms
4. handleTimeout() checks statusRef.current - but statusRef might be from previous question
5. State shows "listening", ref shows "wrong" → mismatch causes freeze
```

---

### 2. GLOBAL STATE LOCK ANTIPATTERN (Root Cause #2)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 330, 440-454, 1237-1246, 1302-1306

**Problem**: `isProcessingRef.current` acts as a global lock that controls flow, but:
1. Set to true in multiple places (timeout, evaluation, etc)
2. Not consistently reset on all error paths
3. Can deadlock when both timeout AND evaluation race

```typescript
// Line 440-454: handleTimeout sets flag
if (isProcessingRef.current) return; // Guard 1
isProcessingRef.current = true; // Set lock
clearTimer();

// Line 1237-1246: evaluateCaptured also sets flag
if (isProcessingRef.current) {
  console.log('[Eval] Already processing - skipping');
  return; // Returns without resetting - potential deadlock
}
isProcessingRef.current = true; // Set lock

// But what if both functions try to set it?
// Line 1302-1306: Only clears on CORRECT answer
if (isCorrect) {
  clearTimer();
  // ... lots of async code ...
  // If any error happens here, lock stays true FOREVER
}
```

**Impact**: 
- Game can enter state where no further processing possible
- The more complex the fix, the more error paths that could leave lock set
- See commit `c4908e5`: Had to add entire timeout handling block because lock wasn't being released in wrong answer + timeout case

**Git Evidence** (commit c4908e5):
```
# When wrong answer + time expires:
# OLD: Just set isProcessingRef=true and exit → FREEZE
# NEW: Full async timeout flow to properly release lock
```

---

### 3. TIMER RACE CONDITION CASCADE (Root Cause #3)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 510-531, 396-404, 516-530

**Problem**: Timer creates a race condition with the evaluation logic:

```typescript
// Line 510-531: startTimer implementation
const startTimer = useCallback(() => {
  clearTimer();
  deadlineRef.current = Date.now() + ROUND_TIME_SEC * 1000;
  setTimeLeft(ROUND_TIME_SEC);
  
  timerRef.current = window.setInterval(() => {
    const dl = deadlineRef.current;
    if (!dl) { clearTimer(); return; }
    
    const remainMs = Math.max(0, dl - Date.now());
    const newTimeLeft = Math.ceil(remainMs / 1000);
    setTimeLeft(newTimeLeft);
    
    if (remainMs <= 0) {
      clearTimer(); // Clear interval
      handleTimeout(); // Call async handler
    }
  }, 120); // Runs every 120ms
}, [clearTimer, handleTimeout]);
```

**Race Window**:
1. At t=29.8 seconds: evaluation starts, sets `isProcessingRef = true`
2. At t=29.85 seconds: timer fires `remainMs <= 0`
3. At t=29.86 seconds: `clearTimer()` runs (removes interval)
4. At t=29.87 seconds: `handleTimeout()` runs (async)
5. At t=29.88 seconds: BUT evaluation hasn't finished yet!

Both try to manipulate game state → race condition

**Git Evidence** (commits 0bf22b8, 6a9bc92):
- `0bf22b8`: "simplifying timeout logic" - tried to fix by removing some checks
- `6a9bc92`: "prevent mic-on timeout bugs" - added stoppingRef flag
- Neither fixed underlying race condition

---

### 4. SPEECH RECOGNITION RESTART DEADLOCK (Root Cause #4)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 1148-1197, 376-394

**Problem**: Complex auto-restart logic that can enter deadlock:

```typescript
// Line 1099-1206: startRecognition
// Creates new recognition and sets onend handler
rec.onend = () => {
  console.log('[ASR] Ended');
  
  // Multiple nested conditions
  if (stoppingRef.current) return; // Check 1
  if (!micActiveRef.current) return; // Check 2
  if (isProcessingRef.current) {  // Check 3
    setMicActive(false);
    micActiveRef.current = false;
    return;
  }
  if (timeLeftRef.current <= 0) { // Check 4
    setMicActive(false);
    micActiveRef.current = false;
    return;
  }
  
  const shouldRestart = ['speaking', 'listening', 'wrong'].includes(statusRef.current);
  if (shouldRestart) {
    try {
      rec.start(); // Try to restart
    } catch (err) {
      setMicActive(false); // Fallback
    }
  }
};

// Line 376-394: forceStopRecognition
const forceStopRecognition = useCallback(() => {
  stoppingRef.current = true;
  try {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Clear handler
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  } catch (e) { /* ignore */ }
}, []);
```

**Deadlock Scenario**:
1. Recognition is running, `micActiveRef = true`
2. Timeout fires, calls `forceStopRecognition()`, sets `stoppingRef = true`
3. Recognition `onend` fires, but `stoppingRef = true` → returns
4. Later, `startRecognition()` is called again
5. BUT `recognitionRef.current` is null (was cleared)
6. `new SR()` called → new instance created
7. BUT if `stoppingRef.current` is still true → new instance ends immediately → infinite loop

**Git Evidence** (commits 6a9bc92, 151a249):
- Added `stoppingRef` flag to prevent restart
- But no mechanism to clear this flag properly
- Can cause mic to stay dead after one timeout

---

### 5. AUDIO EVENT LISTENER MEMORY LEAKS (Root Cause #5)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 642-891 (speakAwaitTTS function)

**Problem**: Audio playback has multiple listener attachment points without guaranteed cleanup:

```typescript
// Line 696-737: First audio handling (Buffer type)
const audio = new Audio(audioUrl);
audio.volume = isAnswer ? TTS_VOLUME : (micActiveRef.current ? 0 : TTS_VOLUME);
currentAudioRef.current = audio;

await Promise.race([
  new Promise<void>((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudioRef.current = null; // Cleanup
      isSpeakingRef.current = false;
      resolve();
    };
    audio.onerror = () => { /* ... */ resolve(); };
    audio.play().catch(() => { /* ... */ resolve(); });
  }),
  // TIMEOUT PROMISE
  new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn('[TTS] Audio playback timeout (15s)');
      if (currentAudioRef.current === audio) {
        audio.pause();
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      }
      resolve();
    }, 15000);
  })
]);
```

**Issues**:
1. **Loser Promise Cleanup**: When first promise wins (audio finishes), second promise (timeout) is still running
2. **Loser Timeouts Leak**: Timer keeps running even after audio finishes
3. **Multiple Audio Objects**: If timeout wins, audio object might still be in DOM
4. **Event Listener Persistence**: Added listeners (`onended`, `onerror`) are only removed when promise resolves
5. **Repeated Code**: Same pattern appears 3 times in function (lines 696-737, 745-788, 832-878) = tripled leaks

**Impact**: 
- Each question runs 3+ TTS requests
- Each request leaks a timeout
- Game with 16 questions = 48+ leaked timeouts per round
- After 5 games = 240+ active timers

**Git Evidence** (commit cac6768):
- "add timeout to TTS audio playback promises to prevent freeze"
- Timeout was a BAND-AID, not a fix
- Doesn't actually prevent the freeze, just stops waiting for it

---

### 6. INCONSISTENT STATE INITIALIZATION (Root Cause #6)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 534-596, 573-577

**Problem**: Game state initialization has multiple sources with no guaranteed consistency:

```typescript
// Line 539-541: Read from storage (might be stale)
const g = grade ?? localStorage.getItem('current_grade') ?? '1';
const p = part ?? localStorage.getItem('current_part') ?? '1';
const s = subpart ?? localStorage.getItem('current_subpart') ?? '1';

// Line 573-577: Set refs to initial values
questionsRef.current = qs;
idxRef.current = 0;
setIdx(0);
idxRef.current = 0;
setRealCorrect(0);
realCorrectRef.current = 0;

// But what if:
// 1. SelectPage didn't update localStorage properly?
// 2. User was at question 5, then navigated back and restarted?
// 3. localStorage value is from a DIFFERENT game session?
```

**Impact**:
- Can load questions for wrong part
- Score might be assigned to wrong part_id
- Duplication: `setIdx(0)` then `idxRef.current = 0` again

---

### 7. PROMISE CHAIN COMPLEXITY & MISSING ERROR BOUNDARIES (Root Cause #7)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 438-507, 1302-1379, 1386-1462

**Problem**: Deep promise chains with no centralized error handling:

```typescript
// Line 438-507: handleTimeout is a long async chain
const handleTimeout = useCallback(async () => {
  if (isProcessingRef.current) return; // Check
  if (statusRef.current !== 'listening') return; // Check
  
  updateActivity();
  isProcessingRef.current = true;
  clearTimer();
  forceStopRecognition();
  
  await waitForCurrentAudioToFinish(); // Promise 1
  originalVolumeRef.current = TTS_VOLUME;
  dispatch({ type: 'TIMEOUT' });
  
  try {
    await delay(DLY.afterTimeoutBeforeReveal, ...); // Promise 2
    if (!isProcessingRef.current) return;
    dispatch({ type: 'REVEAL_ANSWER' });
    
    const q = questionsRef.current[idxRef.current];
    if (q?.answers?.[0]) {
      await speakAwaitTTS(q.answers[0], true); // Promise 3 - Complex!
    }
    if (!isProcessingRef.current) return;
    await delay(DLY.afterReveal, ...); // Promise 4
    if (!isProcessingRef.current) return;
    startIntermissionThenNext(); // Function 1
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.log('[Timeout] Aborted');
    } else {
      throw e; // Throws unhandled!
    }
  }
}, [...]); // Missing dependencies!
```

**Issues**:
1. **Throw without Catch**: Errors from `speakAwaitTTS` will throw up the stack
2. **Missing Dependencies**: `[forceStopRecognition, waitForCurrentAudioToFinish, updateActivity]` but callback uses other functions
3. **No Abort Error Handling for Main Chain**: Only catches AbortError in inner try, not from outer promises
4. **Sequential vs Parallel**: All promises wait sequentially, any hung promise blocks everything

---

### 8. BACKEND DATA TYPE INCONSISTENCY (Root Cause #8)

**File**: `/home/user/InvaderGameEnglish/backend/src/routes/playGame.js`
**Lines**: 276-280, 391-395, 433-437, 478-479

**Problem**: Inconsistent use of `FORMATTED_VALUE` vs `UNFORMATTED_VALUE`:

```javascript
// Line 276-280: GET /game/score uses FORMATTED_VALUE
const s = await sheets.spreadsheets.values.get({
  range: `${SCORES_SHEET}!A1:F`,
  valueRenderOption: 'FORMATTED_VALUE', // Preserves leading zeros
});

// Line 391-395: POST /game/advance uses FORMATTED_VALUE
const sResp = await sheets.spreadsheets.values.get({
  range: `${SCORES_SHEET}!A1:F`,
  valueRenderOption: 'FORMATTED_VALUE',
});

// Line 433-437: But parts uses UNFORMATTED_VALUE
const u = await sheets.spreadsheets.values.get({
  range: `${USERS_SHEET}!A1:K`,
  valueRenderOption: 'FORMATTED_VALUE',
});

// But /game/part uses UNFORMATTED_VALUE (line 80-82)
const resp = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${PARTS_SHEET}!A1:E`,
  valueRenderOption: 'UNFORMATTED_VALUE', // No leading zeros!
});
```

**Impact**:
- User ID `00002` might become `2` in some endpoints
- Ranking lookup fails when searching for user (see commits efabca9, ce59872)
- Score comparison might use wrong type (string vs number)

---

### 9. NO CLEANUP ON COMPONENT UNMOUNT (Root Cause #9)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 588-596

**Problem**: Cleanup function runs, but doesn't guarantee cleanup of all async operations:

```typescript
// Line 588-596: Component cleanup
return () => {
  console.log('[Cleanup] Component unmounting');
  clearTimer();
  stopCurrentAudio();
  forceStopRecognition();
  stopFreezeDetection();
};
```

**Missing Cleanups**:
1. AbortController is created but never aborted → all pending promises continue
2. Freeze detection timer is cleared, but might be None
3. No guarantee `isProcessingRef` is reset
4. No cleanup of pending audio URLs (might leak Blob references)
5. No clearing of Refs (questionsRef, etc)

**Example**:
```
User navigates away during TTS playback:
1. Component unmounts
2. cleanup() runs → stopCurrentAudio()
3. But audio.onended listener might still fire
4. Tries to update state on unmounted component
5. "Can't perform setState on unmounted component" warning
```

---

### 10. FREEZE DETECTION IS NOT PREVENTION (Root Cause #10)

**File**: `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx`
**Lines**: 344-374

**Problem**: Freeze detection only detects, doesn't fix:

```typescript
// Line 344-374: startFreezeDetection
const startFreezeDetection = useCallback(() => {
  lastActivityRef.current = Date.now();
  if (freezeDetectionTimerRef.current) {
    window.clearInterval(freezeDetectionTimerRef.current);
  }
  freezeDetectionTimerRef.current = window.setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    if (timeSinceActivity > 30000) {
      console.error('[Freeze] Game appears to be frozen');
      if (freezeDetectionTimerRef.current) {
        window.clearInterval(freezeDetectionTimerRef.current);
        freezeDetectionTimerRef.current = null;
      }
    }
  }, 5000); // Check every 5 seconds
}, []);
```

**Issues**:
1. **Only Logs**: Detects freeze but doesn't recover from it
2. **No Recovery Action**: Just clears the detection interval, game stays frozen
3. **30 Second Window**: Game can be frozen for 30 seconds before detection
4. **No User Notification**: User doesn't know game is frozen, might keep clicking
5. **Root Cause Not Addressed**: Detects symptom but doesn't fix underlying race condition

---

## RECURRING BUG PATTERNS IN GIT HISTORY

Looking at the commit history, bugs fall into these categories:

### A. SCREEN FREEZE BUGS (Multiple Commits)
- `1bef2ca`: Freeze when answering during 3rd reading
- `c4908e5`: Freeze when wrong answer + time expires
- `151a249`: Freeze when mic turned off
- **Root Cause**: `isProcessingRef` not being released in complex async paths

### B. TIMEOUT BUGS (Multiple Commits)
- `0bf22b8`: Microphone timeout error
- `6a9bc92`: Mic-on timeout bugs
- **Root Cause**: Race between timeout handler and evaluation

### C. VALIDATION BUGS (Multiple Commits)
- `80cd1f9`: Answer validation failure during grace period
- `3ea4ccb`: Adjust validation threshold
- **Root Cause**: Fuzzy matching thresholds (0.6) and timing windows

### D. AUDIO BUGS (Multiple Commits)
- `7906d8a`: Add 1.5s delay before answer audio
- `cac6768`: Add timeout to TTS playback
- **Root Cause**: Promise management and listener cleanup

### E. STATE BUGS (Multiple Commits)
- `efabca9`: Preserve leading zeros in user_id
- `ce59872`: Use user_id instead of id for ranking
- **Root Cause**: Data type inconsistency (FORMATTED vs UNFORMATTED values)

---

## WHY BUGS KEEP APPEARING

Each bug fix creates MORE COMPLEXITY:
1. **Fix Timer Race** → Add `isProcessingRef` checks → Creates lock deadlock
2. **Fix Lock Deadlock** → Add timeout handling → Duplicates existing code
3. **Fix Timeout Handling** → Add more flags (`stoppingRef`) → Creates new race conditions
4. **Fix Freeze** → Add detection → Only logs, doesn't fix

**The Cycle**:
```
Bug appears → 
Quick fix (band-aid) → 
Fix creates new race condition → 
New bug appears → 
More complexity added → 
REPEAT
```

---

## ARCHITECTURAL PROBLEMS SUMMARY

| Issue | Severity | Caused By | Appears In Commits |
|-------|----------|-----------|-------------------|
| Dual State Management | CRITICAL | Refs + State | All freezes |
| Global Lock Antipattern | CRITICAL | isProcessingRef | c4908e5, 6a9bc92, freeze bugs |
| Timer Race Condition | CRITICAL | setInterval + async | 0bf22b8, 6a9bc92 |
| Recognition Deadlock | HIGH | Complex onend logic | 151a249, 6a9bc92 |
| Audio Listener Leaks | HIGH | Promise.race pattern | cac6768 |
| State Initialization | MEDIUM | Multiple sources | All games |
| Promise Chain Errors | HIGH | Throws unhandled | Unknown game crashes |
| Data Type Inconsistency | MEDIUM | FORMATTED vs UNFORMATTED | efabca9, ce59872 |
| Missing Cleanup | MEDIUM | No AbortController | Memory leaks over time |
| Freeze Detection Only | LOW | No recovery action | All freezes |

---

## RECOMMENDED ARCHITECTURAL REFACTORING

To permanently fix these issues:

### 1. **Single Source of Truth**
- Remove all Refs tracking state
- Use Redux or Context for global state
- Callbacks read from state, not refs

### 2. **Centralized State Machine**
- Replace `useReducer + dispatch` with proper state machine library
- Define valid state transitions explicitly
- Prevent invalid state transitions at compile time

### 3. **Proper Async Handling**
- Use React Query or SWR for API calls
- Use AbortController consistently for ALL async operations
- Clean up ALL promises on component unmount

### 4. **Eliminate Global Locks**
- Use state transitions instead of `isProcessingRef`
- State machine prevents concurrent operations automatically

### 5. **Fix Audio Management**
- Use useEffect to manage audio lifecycle
- Cleanup listeners in return function
- Don't use Promise.race for timeouts (use AbortSignal instead)

### 6. **Consistent Data Handling**
- Pick FORMATTED_VALUE or UNFORMATTED_VALUE consistently
- Add data validation on all API boundaries
- Type-check all Sheet data before using

---

## CONCLUSION

The game has **fundamental architectural flaws** that cause cascading bugs:

1. **Dual state systems** (React state + Refs) create synchronization races
2. **Global flags** (isProcessingRef) create deadlocks and freezes
3. **Complex async chains** without proper error boundaries
4. **Inconsistent data handling** between frontend and backend
5. **No centralized cleanup** of async resources

Each bug fix adds more complexity without addressing root causes, creating more bugs.

**Fixing individual bugs will NOT solve this**. A complete architectural refactoring is needed.

