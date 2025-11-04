# Invader Game - Comprehensive Feature Inventory

## 1. CORE GAME FEATURES

### 1.1 Game Flow & State Machine
- **Feature**: Game phase management with state machine pattern
- **Location**: Frontend `/home/user/InvaderGameEnglish/frontend/src/pages/PlayPage.tsx` (lines 203-261)
- **Game Phases**:
  - `idle`: Waiting for question to start
  - `speaking`: Question audio being played
  - `listening`: Waiting for user answer
  - `beam`: Correct answer - beam effect
  - `explosion`: Correct answer - explosion effect
  - `reveal`: Showing correct answer
  - `timeout`: Time ran out
  - `wrong`: User gave wrong answer
  - `intermission`: Showing intermission screen
  - `finished`: Game completed
- **Implementation Complexity**: Medium
- **Dependencies**: React useReducer, AbortController for cancellation

### 1.2 Question Display & Progression
- **Feature**: Question loading, display, and progression through game
- **Location**: 
  - Frontend: `PlayPage.tsx` (lines 894-1013, 1046-1088)
  - Backend: `playGame.js` routes GET `/game/part` (lines 46-120) and GET `/game/questions` (lines 125-236)
- **Details**:
  - Loads part information (requirement text)
  - Loads up to 16 questions per part
  - Demo questions (first question)
  - Regular questions
  - Question metadata: text, image URL, display order
- **Implementation Complexity**: Medium
- **Dependencies**: Google Sheets API, Redis caching, Question validation

### 1.3 Answer Validation & Matching
- **Feature**: Speech recognition result evaluation with fuzzy matching
- **Location**: Frontend `PlayPage.tsx` (lines 1235-1463)
- **Matching Algorithms**:
  - Normalization: Remove special chars, lowercase, collapse whitespace
  - Exact match (lines 1273-1281)
  - Levenshtein distance similarity (lines 124-157, 1287)
  - Jaccard similarity for word overlap (lines 165-173, 1288)
  - Thresholds: 0.6 for both Levenshtein and Jaccard
- **Implementation Complexity**: High (complex similarity calculations)
- **Dependencies**: Speech Recognition API, TTS service, Backend answer patterns

### 1.4 Scoring System
- **Feature**: Track correct answers and determine clear/fail status
- **Location**: 
  - Frontend: `PlayPage.tsx` (lines 1317-1327, 1466-1658)
  - Backend: `playGame.js` POST `/game/score` (lines 241-345)
- **Details**:
  - Clear condition: 10 correct answers out of non-demo questions
  - Score persistence to Google Sheets
  - Separate counting for demo vs. real questions
  - Score saved with timestamp
- **Implementation Complexity**: Medium
- **Dependencies**: Backend API, Google Sheets, User authentication

### 1.5 Timer Functionality
- **Feature**: 30-second round timer with automatic timeout
- **Location**: Frontend `PlayPage.tsx` (lines 396-531)
- **Details**:
  - ROUND_TIME_SEC = 30 seconds
  - Updates every 120ms
  - Uses deadline-based approach (not interval drift)
  - Auto-timeout when time expires
  - Timer visible in top-left corner
- **Implementation Complexity**: Medium
- **Dependencies**: Game state management, Timeout handler, updateActivity tracking

### 1.6 Win/Lose Conditions
- **Feature**: Game end detection and result determination
- **Location**: Frontend `PlayPage.tsx` (lines 1466-1658)
- **Details**:
  - Win: Get 10+ correct answers from non-demo questions
  - Lose: Less than 10 correct answers
  - Result page shows score, percentage, pass/fail status
  - Messages vary by performance (90%+, 80%+, etc.)
- **Implementation Complexity**: Low
- **Dependencies**: Score tracking, Backend advance endpoint

---

## 2. USER INTERACTION FEATURES

### 2.1 Speech Recognition (Web Speech API)
- **Feature**: Mic-on/off toggle with continuous speech recognition
- **Location**: Frontend `PlayPage.tsx` (lines 1099-1206)
- **Details**:
  - Uses WebkitSpeechRecognition (Chrome) or SpeechRecognition API
  - Language: en-US
  - Continuous mode enabled
  - Interim results captured
  - Multiple alternative transcripts captured
  - Auto-restart on speech end (if still active)
  - Can be toggled during question speaking phase (interrupts audio)
- **Implementation Complexity**: High
- **Dependencies**: Web Speech API, Browser support detection, Freeze detection, State management
- **Key Handlers**: startRecognition, stopRecognitionAndEvaluate, Mic toggle

### 2.2 Microphone Toggle Button
- **Feature**: Visual gun-shaped button to start/stop recording
- **Location**: Frontend `PlayPage.tsx` (lines 1805-1816)
- **UI Elements**:
  - Gun icon image (`/gun.png`)
  - Pulse ring animation when active
  - Enabled only in speaking/listening/wrong states
  - Disabled when time <= 0
- **Implementation Complexity**: Low
- **Dependencies**: CSS animations, Speech recognition, Game state

### 2.3 Last Recognized Text Display
- **Feature**: Show user's last heard speech recognition result
- **Location**: Frontend `PlayPage.tsx` (lines 1736-1739)
- **UI**: Badge in top-right showing "Heard: [text]"
- **Implementation Complexity**: Low
- **Dependencies**: Speech recognition result capture

### 2.4 Mic Status Badge
- **Feature**: Visual indicator of microphone active/inactive state
- **Location**: Frontend `PlayPage.tsx` (lines 1730-1740)
- **UI Details**:
  - Red background when active (MIC: ON)
  - Gray background when inactive (MIC: OFF)
  - Shows emoji (🎤 or 🔇)
- **Implementation Complexity**: Low
- **Dependencies**: Mic state management, CSS styling

### 2.5 Button Controls
- **Feature**: Interactive buttons for game navigation
- **Location**: Frontend `/components/Button.tsx`
- **Usage**:
  - Start game button
  - Logout button
  - Ranking button
  - Retry/Next button
- **Implementation Complexity**: Low
- **Dependencies**: React Router, Navigation handlers

### 2.6 Visual Feedback - Animations
- **Feature**: Enemy character animations and visual effects
- **Location**: 
  - Frontend CSS: `PlayPage.css` (lines 117-150+)
  - Frontend JSX: `PlayPage.tsx` (lines 1704-1758)
- **Effects**:
  - Beam effect (correct answer) - brightness reduction
  - Explosion effect - scale reduction
  - Attack effect - shake animation + brightness increase
  - Enemy variant switching (normal, ko, attack)
- **Implementation Complexity**: Low
- **Dependencies**: CSS keyframe animations, State management

### 2.7 Audio Feedback (Sound Effects)
- **Feature**: Play sound effects for game events
- **Location**: Frontend `PlayPage.tsx` (lines 175-201)
- **Sound Files**:
  - `attack.mp3` - Played on correct answer (waits for completion)
  - `miss.mp3` - Played on wrong answer
- **Volume Control**: SOUND_EFFECT_VOLUME = 0.2 (20%)
- **Implementation Complexity**: Low
- **Dependencies**: HTML Audio API, Asset management

### 2.8 Text-to-Speech (Google TTS)
- **Feature**: Synthesize speech for question and answer audio
- **Location**: 
  - Frontend: `PlayPage.tsx` (lines 642-891)
  - Backend: `/routes/tts.js` (lines 9-106)
  - Utility: `/utils/googleTTS.ts` (lines 19-118)
- **Details**:
  - Voice: en-US-Neural2-D (US English Neural voice)
  - Speaking rate: 0.95 (slightly slower)
  - Pitch: 0 (default)
  - Base64-encoded audio response
  - 15-second timeout per audio segment
  - Volume control: TTS_VOLUME = 1.0
- **Implementation Complexity**: High
- **Dependencies**: Google Cloud TTS API, Redis caching, Audio playback, Error handling
- **Key Features**:
  - Adaptive handling of multiple response formats
  - Timeout-based Promise.race for stuck audio
  - Automatic muting when mic is active
  - URL-based object creation for memory efficiency

### 2.9 Question Images Display
- **Feature**: Display question-related images
- **Location**: Frontend `PlayPage.tsx` (lines 1795-1799)
- **Details**:
  - Image URL stored in question data from Google Sheets
  - Displayed in image container with proper styling
  - Fallback if no image
- **Implementation Complexity**: Low
- **Dependencies**: Question data loading

### 2.10 Requirement Display
- **Feature**: Show stage requirement before game starts
- **Location**: Frontend `PlayPage.tsx` (lines 1761-1768)
- **Details**:
  - Requirement text from part info
  - "Start" button to begin game
  - Set requirement visibility on page load
- **Implementation Complexity**: Low
- **Dependencies**: Part info loading, Game state

---

## 3. TECHNICAL FEATURES

### 3.1 LocalStorage Usage
- **Feature**: Client-side session and preference storage
- **Location**: Multiple files (LoginPage, SelectPage, PlayPage, ResultPage)
- **Stored Data**:
  - `userId`: User ID (used for auth and API calls)
  - `userName`: Display name
  - `current_grade`: Current level (1-100)
  - `current_part`: Current part number
  - `current_subpart`: Current subpart number
  - `is_admin`: Admin flag
- **Implementation Complexity**: Low
- **Dependencies**: Browser API

### 3.2 Backend API Integration
- **Feature**: HTTP communication with Express backend
- **Location**: Multiple pages and utilities
- **Endpoints Used**:
  1. **Authentication**
     - `POST /auth/login` - User login with userId/password
  2. **Game Flow**
     - `GET /game/part?grade=&part=&subpart=` - Get part requirement
     - `GET /game/questions?part_id=` - Get 16 questions with answers
     - `POST /game/score` - Submit score after game
     - `POST /game/advance` - Request progress advancement
  3. **Selection**
     - `GET /select/options?user_id=` - Get available stage options
     - `GET /select/validate?grade=&part=&subpart=` - Validate selection
  4. **Ranking**
     - `GET /ranking` - Get monthly ranking data
  5. **TTS**
     - `POST /api/tts/synthesize` - Convert text to speech
     - `GET /api/tts/voices` - Get available voices
  6. **Admin**
     - `GET /admin/users` - Get user list
     - `POST /admin/register` - Register new user
     - `GET /admin/failure-stats` - Get failure statistics
- **Implementation Complexity**: Medium
- **Dependencies**: Fetch API, Error handling, Authentication middleware

### 3.3 Authentication & Session Management
- **Feature**: User login, token-based auth, session persistence
- **Location**: 
  - Frontend: `LoginPage.tsx` (lines 26-73)
  - Backend: `middleware/auth.js`
- **Flow**:
  1. User logs in with userId/password
  2. Backend validates credentials against Google Sheets (hashed passwords)
  3. JWT token generated and set in HttpOnly cookie
  4. User info stored in localStorage
  5. All API calls include credentials: 'include'
- **Implementation Complexity**: Medium
- **Dependencies**: JWT, Google Sheets, Password hashing, Cookie management

### 3.4 Google Sheets Integration
- **Feature**: Data persistence to Google Sheets (database backend)
- **Location**: 
  - Backend: `services/google.js`
  - Routes: Multiple (playGame.js, ranking.js, logInPage.js, select.js)
- **Sheets Used**:
  1. **users**: User accounts, progress, credentials
  2. **parts**: Stage definitions (grade, part, subpart, requirement)
  3. **questions**: Question data
  4. **answer_patterns**: Expected answers
  5. **scores**: Game scores and results
- **Implementation Complexity**: High
- **Dependencies**: Google Sheets API v4, Service account credentials

### 3.5 Redis Caching
- **Feature**: In-memory caching for API responses
- **Location**: Backend `services/redis.js`
- **Cached Data**:
  - Sheet data (parts, questions) - TTL: 24 hours
  - TTS audio - TTL: 24 hours
  - User mapping (id->nickname) - TTL: 24 hours
  - Ranking data - TTL: 60 seconds
- **Implementation Complexity**: Medium
- **Dependencies**: Redis server, Cache key generation

### 3.6 Error Handling & Recovery
- **Feature**: Comprehensive error handling throughout app
- **Location**: Multiple files
- **Strategies**:
  - Try-catch blocks
  - Promise.catch handlers
  - Fallback UI on error
  - Error messages to user
  - Console logging for debugging
  - Validation middleware
- **Implementation Complexity**: Medium
- **Dependencies**: Custom middleware, Error handling utilities

### 3.7 Data Validation
- **Feature**: Input/output validation middleware
- **Location**: Backend `middleware/validation.js`
- **Validates**:
  - Query parameters (type, required, min/max)
  - Request body fields
  - Error sanitization
- **Implementation Complexity**: Medium
- **Dependencies**: Custom middleware

---

## 4. UX FEATURES

### 4.1 Freeze Detection
- **Feature**: Detect game freezes (no activity for 30 seconds)
- **Location**: Frontend `PlayPage.tsx` (lines 344-374)
- **Details**:
  - Checks activity every 5 seconds
  - Triggers alert if 30 seconds without activity
  - Logs freeze event
  - Can recover when activity resumes
- **Implementation Complexity**: Medium
- **Dependencies**: Timer management, Activity tracking, State updates

### 4.2 Activity Tracking
- **Feature**: Track user activity to prevent false freeze detection
- **Location**: Frontend `PlayPage.tsx` (lines 364-366)
- **Updated On**:
  - Question start
  - Mic toggle
  - Answer evaluation
  - Progress updates
- **Implementation Complexity**: Low
- **Dependencies**: Freeze detection

### 4.3 Timeout Handling
- **Feature**: Handle round timeout with correct answer reveal
- **Location**: Frontend `PlayPage.tsx` (lines 438-508)
- **Process**:
  1. Check if in listening state
  2. Clear timer immediately (prevent double-fire)
  3. Stop mic
  4. Wait for audio to finish
  5. Play timeout sound effect
  6. Show correct answer
  7. Move to intermission
- **Implementation Complexity**: High
- **Dependencies**: Timer, ASR, Audio control, State management

### 4.4 Progress Tracking & Display
- **Feature**: Show current question number and progress
- **Location**: Frontend `PlayPage.tsx` (lines 1742-1745)
- **Display**: "Question 1 of 16" style indicator
- **Implementation Complexity**: Low
- **Dependencies**: Game state

### 4.5 Ranking Display
- **Feature**: Show leaderboards for challenge count and best scores
- **Location**: Frontend `Ranking.tsx`
- **Details**:
  - Top 3 "Number of try" (most attempts)
  - Top 3 "Best Scores" (highest average)
  - Monthly data
  - Period display
- **Implementation Complexity**: Medium
- **Dependencies**: Backend ranking API, Data aggregation

### 4.6 Stage Selection with Progress Limits
- **Feature**: Dropdown selectors for grade/part/subpart with progression control
- **Location**: Frontend `SelectPage.tsx`
- **Logic**:
  - Only show grades up to current progress
  - Only show parts within current grade up to current progress
  - Only show subparts within current part up to current progress
  - Validation before game start
- **Implementation Complexity**: Medium
- **Dependencies**: Backend options API, Progress state

### 4.7 Navigation & Routing
- **Feature**: Multi-page routing with state preservation
- **Location**: Frontend `App.tsx`
- **Routes**:
  - `/` or `/logIn` - Login page
  - `/select` - Stage selection
  - `/play` - Game page
  - `/result` - Results page
  - `/ranking` - Leaderboard
  - `/admin` - Admin panel
- **Implementation Complexity**: Low
- **Dependencies**: React Router DOM

---

## 5. ADVANCED FEATURES

### 5.1 Text-to-Speech with Caching
- **Feature**: Google TTS with Redis and memory caching
- **Location**: 
  - Backend: `routes/tts.js` (lines 56-67)
  - Frontend: `utils/googleTTS.ts` (lines 44-76)
- **Cache Levels**:
  1. Memory cache (in service, max 100 items)
  2. Redis server cache (24 hours)
- **Implementation Complexity**: High
- **Dependencies**: Google TTS API, Redis, Caching utilities

### 5.2 Multiple Enemy Variants
- **Feature**: Different enemy visual states based on game phase
- **Location**: Frontend `PlayPage.tsx` (lines 1704-1758), CSS
- **Variants**:
  1. **normal** - Default enemy appearance
  2. **ko** - Weakened/hit state (brightness 0.5, scale 0.8)
  3. **attack** - Enemy attacking state (brightness 1.2, saturated, shake animation)
- **Implementation Complexity**: Low
- **Dependencies**: State management, CSS animations

### 5.3 Intermission Screens
- **Feature**: Show question and answer between rounds
- **Location**: Frontend `PlayPage.tsx` (lines 1015-1044, 1769-1781)
- **Display**:
  - Question text
  - Correct answer with checkmark
  - Duration: 3 seconds (DLY.intermission = 3000ms)
  - Stores snapshot: text, answer, enemy variant
- **Implementation Complexity**: Low
- **Dependencies**: State snapshots, Delay timers

### 5.4 Demo Mode
- **Feature**: First question is special demo question
- **Location**: Frontend `PlayPage.tsx` (lines 966-1000)
- **Details**:
  - Marked with `is_demo: true` flag
  - Shows "start a demo!" banner
  - Auto-answers with attack sound + reveal
  - Doesn't count toward score
  - Used for tutorial/warm-up
- **Implementation Complexity**: Medium
- **Dependencies**: Question metadata, Special branching logic

### 5.5 Volume Control
- **Feature**: Independent volume levels for TTS and sound effects
- **Location**: Frontend `PlayPage.tsx` (lines 112-114, 697, 747, 833)
- **Levels**:
  - SOUND_EFFECT_VOLUME = 0.2 (20%)
  - TTS_VOLUME = 1.0 (100%)
- **Automatic Muting**:
  - TTS muted when mic is active (prevents feedback)
  - Unmuted when mic turns off
- **Implementation Complexity**: Low
- **Dependencies**: Mic state, Audio element volume property

### 5.6 Grace Period for Answers
- **Feature**: Answer evaluation timing and acceptance window
- **Location**: Frontend `PlayPage.tsx` (lines 1387-1461)
- **Details**:
  - Correct answers: Timer stops immediately, process begins
  - Wrong answers: Brief 600ms delay, return to listening
  - Timeout: 500ms delay before reveal
  - Multiple attempts allowed until timeout
- **Implementation Complexity**: Medium
- **Dependencies**: Timer management, State handling

### 5.7 Answer Reveal with TTS
- **Feature**: Play correct answer as audio after question ends
- **Location**: Frontend `PlayPage.tsx` (lines 1360-1362, 1437)
- **Details**:
  - Plays after 1.5s delay (DLY.afterReveal = 1500ms)
  - Uses `speakAwaitTTS(q.answers[0], true)`
  - Always plays at full volume (ignores mic muting)
  - Waits for completion before moving on
- **Implementation Complexity**: Low
- **Dependencies**: TTS service, Answer audio

### 5.8 Progress Advancement System
- **Feature**: Auto-advance to next stage based on clear or attempts
- **Location**: 
  - Frontend: `PlayPage.tsx` (lines 1534-1604)
  - Backend: `playGame.js` POST `/game/advance` (lines 352-565)
- **Logic**:
  - Clear = true: Advance immediately
  - Clear = false: Need 10 attempts on same stage
  - Updates user progress in Google Sheets
  - Updates localStorage
  - Returns next stage info
- **Implementation Complexity**: High
- **Dependencies**: Backend API, Google Sheets, State management

### 5.9 Admin Functions
- **Feature**: Admin panel for user management and analytics
- **Location**: Frontend `AdminPage.tsx`, Backend `routes/admin.js`
- **Features**:
  - Register new users (auto-generate password)
  - View all users
  - Reset user passwords
  - View failure statistics by part
- **Implementation Complexity**: Medium
- **Dependencies**: Admin authentication, User CRUD operations

### 5.10 Question Audio - Three Reads
- **Feature**: Question is spoken three times with progressive text reveal
- **Location**: Frontend `PlayPage.tsx` (lines 930-964)
- **Timeline**:
  1. 1st read: Audio only, no text (0ms)
  2. Delay: 1200ms (DLY.betweenSpeaks)
  3. 2nd read: Audio only, still no text
  4. Delay: 1200ms
  5. 3rd read: Audio + text displayed on screen
  6. Listening begins
- **Implementation Complexity**: Medium
- **Dependencies**: TTS service, Delayed state updates

---

## 6. DEPENDENCIES & INTERCONNECTIONS

### Critical Dependency Chain
```
PlayPage.tsx (core game logic)
├── Web Speech API (ASR)
├── TTS Service (Google Cloud + Redis)
├── Timer (with deadline-based updates)
├── Freeze Detection
├── Activity Tracking
├── Game State Machine (useReducer)
├── Backend APIs (score, advance, questions)
├── LocalStorage (progress, user info)
└── Audio Control (muting, volume, playback)
```

### Feature Interdependencies
- **Speech Recognition** depends on: Mic toggle, Game state, TTS muting
- **TTS** depends on: Backend TTS API, Redis cache, Audio muting, Volume control
- **Score Submission** depends on: Backend API, User auth, Question metadata
- **Progress Advancement** depends on: Score threshold, Attempts counter, Backend API
- **Ranking** depends on: Score data from sheets, User mapping, Monthly filtering

### Refactoring Impact Analysis
- **High Risk**: 
  - Game state machine (affects all game phases)
  - Timer system (affects timeout detection)
  - TTS integration (affects audio playback)
  - Speech recognition (affects answer input)
  
- **Medium Risk**:
  - API endpoints (affects data loading/saving)
  - Answer validation logic (affects grading)
  - Progress tracking (affects advancement)
  
- **Low Risk**:
  - UI components (visual only, no core logic)
  - CSS animations (pure presentation)
  - LocalStorage (can be refactored independently)

---

## 7. ARCHITECTURAL NOTES

### Current Architecture
- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js with Node.js
- **Database**: Google Sheets (via Sheets API)
- **Cache**: Redis
- **Auth**: JWT in HttpOnly cookies

### Key Design Patterns
1. **State Machine**: Game phases managed via useReducer
2. **Refs for State**: Multiple useRef for non-reactive state tracking
3. **Promise-based Delays**: AbortController for cancellable async operations
4. **Ref-based Props Tracking**: useEffect syncing props to refs for closure access

### Potential Refactoring Areas
- Extract game logic from PlayPage component (too large)
- Separate API calls into service layer
- Create custom hooks for ASR, TTS, Timer
- Extract game state machine to separate file
- Centralize error handling

---

## 8. FEATURE IMPACT ON REFACTORING

### If Removing Features (What breaks):
- **Remove TTS**: Answer reveal won't play audio, demo mode breaks
- **Remove Speech Rec**: Mic toggle useless, need manual input fallback
- **Remove Timer**: No timeout, infinite time per question
- **Remove Enemy Variants**: Visual feedback loses impact
- **Remove Ranking**: Need alternate motivation system
- **Remove Demo Mode**: Need tutorial alternate flow
- **Remove Progress Limits**: Users can skip stages

### If Extracting Components:
- Game logic extraction: Maintain state synchronization
- API service extraction: Ensure auth headers consistent
- TTS extraction: Handle caching carefully
- ASR extraction: Maintain mic toggle integration
