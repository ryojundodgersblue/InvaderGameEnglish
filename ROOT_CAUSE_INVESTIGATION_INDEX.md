# Root Cause Investigation - Complete Analysis Index

## Overview

This directory contains a comprehensive analysis of the Invader Game codebase identifying systemic architectural issues that cause cascading bugs. The game exhibits recurring freeze, timeout, and state synchronization problems due to fundamental design flaws.

## Documents

### 1. **ROOT_CAUSE_ANALYSIS.md** (21KB) - PRIMARY REPORT
- Executive summary of all critical issues
- 10 root cause categories with explanations
- Git history analysis showing bug patterns
- Architectural problems summary table
- Recommended refactoring approach

**Read this first to understand the big picture.**

### 2. **DETAILED_CODE_LOCATIONS.md** (22KB) - CODE REFERENCE
- Exact file paths and line numbers
- Code snippets showing problematic patterns
- Timeline diagrams of race conditions
- Step-by-step deadlock scenarios
- Memory leak demonstrations

**Use this to locate specific problems in the code.**

## Key Findings Summary

### Critical Issues Found: 10

1. **Dual State Management Anti-Pattern** (CRITICAL)
   - Maintains both React state and Refs
   - Creates synchronization windows where they're out of sync
   - Causes stale closures in callbacks
   - File: PlayPage.tsx lines 290-339

2. **Global State Lock Anti-Pattern** (CRITICAL)
   - `isProcessingRef.current` acts as a global lock
   - Not released on all error paths
   - Can deadlock when timeout + evaluation race
   - File: PlayPage.tsx lines 440-454, 1237-1246

3. **Timer Race Condition** (CRITICAL)
   - setInterval (120ms) vs async operations creates race window
   - Both handleTimeout() and evaluateCaptured() try to handle end-of-question
   - Only one succeeds, other may freeze
   - File: PlayPage.tsx lines 510-531

4. **Speech Recognition Deadlock** (HIGH)
   - Complex onend handler with 4+ nested condition checks
   - stoppingRef flag prevents restart but never resets
   - Can cause mic to stay dead after timeout
   - File: PlayPage.tsx lines 1148-1197, 376-394

5. **Audio Event Listener Memory Leaks** (HIGH)
   - Promise.race() pattern creates loser promises that keep running
   - 15-second timeout leaks for each TTS call
   - Pattern repeated 3 times = tripled leaks
   - File: PlayPage.tsx lines 642-891

6. **Inconsistent State Initialization** (MEDIUM)
   - Multiple sources of truth (props, localStorage, state)
   - Can load questions for wrong part
   - Refs duplicated during initialization
   - File: PlayPage.tsx lines 534-596

7. **Promise Chain Complexity** (HIGH)
   - Deep promise chains without proper error boundaries
   - Missing dependency declarations in useCallback
   - Unhandled errors re-thrown
   - File: PlayPage.tsx lines 438-507

8. **Backend Data Type Inconsistency** (MEDIUM)
   - Some endpoints use FORMATTED_VALUE, others UNFORMATTED_VALUE
   - User ID "00002" becomes "2" in some paths
   - Ranking lookup fails for formatted IDs
   - File: backend/src/routes/playGame.js, select.js, logInPage.js

9. **Missing Cleanup on Unmount** (MEDIUM)
   - AbortController created but never aborted
   - Refs not cleared on component unmount
   - Audio URL blobs not revoked
   - File: PlayPage.tsx lines 588-596

10. **Freeze Detection Only (Not Prevention)** (LOW)
    - Detects freeze but doesn't recover
    - No action taken, just logs error
    - 30-second detection window
    - File: PlayPage.tsx lines 344-374

## Bug Pattern Analysis

### Recurring Freeze Bugs
- `1bef2ca`: Freeze when answering during 3rd reading
- `c4908e5`: Freeze when wrong answer + time expires
- `151a249`: Freeze when mic turned off
- **Root Cause**: isProcessingRef not released in complex paths

### Recurring Timeout Bugs
- `0bf22b8`: Microphone timeout error
- `6a9bc92`: Mic-on timeout bugs
- **Root Cause**: Race between timeout handler and evaluation

### Validation Bugs
- `80cd1f9`: Answer validation failure
- `3ea4ccb`: Validation threshold adjustment
- **Root Cause**: Fuzzy matching thresholds (0.6) and timing windows

### Audio Bugs
- `7906d8a`: Add 1.5s delay before answer
- `cac6768`: Add timeout to TTS playback
- **Root Cause**: Promise management and listener cleanup

### State Bugs
- `efabca9`: Preserve leading zeros in user_id
- `ce59872`: Use user_id instead of id for ranking
- **Root Cause**: Data type inconsistency (FORMATTED vs UNFORMATTED)

## Why Bugs Keep Appearing

Each bug fix creates more complexity:

```
Bug appears
  ↓
Quick fix (band-aid)
  ↓
Fix creates new race condition
  ↓
New bug appears
  ↓
More complexity added
  ↓
REPEAT (Currently at iteration ~10)
```

Example progression:
- Fix timer race → Add isProcessingRef checks
- Fix lock deadlock → Add timeout handling → Duplicate code
- Fix timeout handling → Add stoppingRef flag
- New race between stoppingRef and timeout
- Add more checks → More complexity
- More edge cases exposed

## Recommended Fix Strategy

### Short Term (Band-aids)
- Document all race condition windows
- Add more logging for debugging
- Increase timeouts to reduce race window

### Medium Term (Bandage Larger Issues)
- Consolidate state management (remove duplicate Refs)
- Make stoppingRef reset properly
- Fix data type inconsistency in backend

### Long Term (Architectural Refactor - REQUIRED)
- Replace dual state system with single Redux/Context
- Use proper state machine library
- Implement AbortController consistently for all async
- Remove global flag anti-patterns
- Fix audio management with useEffect
- Add comprehensive error boundaries

## Files You Should Know

### Frontend (TypeScript React)
- **PlayPage.tsx** - 1,832 lines, contains ALL game logic
  - Multiple state management patterns
  - Complex async flows
  - Speech recognition handling
  - Audio management
  - Timer logic
  
### Backend (Node.js + Google Sheets API)
- **playGame.js** - Game score and progression
  - Data type inconsistencies
  
- **select.js** - Stage selection
  - Progress limiting logic
  
- **logInPage.js** - User authentication
  - Data retrieval options

## Key Metrics

- **Total refs syncing state**: 15 refs (statusRef, idxRef, etc.)
- **Multiple state sources**: 3 (React state, Refs, localStorage)
- **Timer instances**: 2+ concurrent (question timer + freeze detection)
- **Audio listener leaks per game**: 48+ (16 questions × 3 TTS calls)
- **Async promise chains**: 4+ major chains without error boundaries
- **Data type inconsistencies**: 5 endpoints with different rendering options

## Next Steps

1. **Read ROOT_CAUSE_ANALYSIS.md** - Understand the problems
2. **Review DETAILED_CODE_LOCATIONS.md** - Find specific issues
3. **Decide on refactoring approach** - Quick fix vs complete rewrite
4. **Plan testing strategy** - How to validate fixes
5. **Implement one architectural fix at a time** - Not individual bugs

## Important Note

**Fixing individual bugs will NOT solve this.**

The issues are systemic and architectural. Each fix adds complexity that creates more bugs. Only a complete architectural refactoring addressing root causes will result in a stable game.

The codebase needs:
- Single source of truth for state
- Proper state machine implementation
- Consistent async/await error handling
- Comprehensive cleanup on unmount
- No global flags or race-prone patterns

---

**Generated**: November 4, 2025
**Analysis Type**: Systemic Root Cause Analysis
**Investigation Depth**: VERY THOROUGH
