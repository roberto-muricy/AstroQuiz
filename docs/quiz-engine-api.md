# 🎮 AstroQuiz Engine API Documentation

## 📋 Overview

The AstroQuiz Engine provides a complete game logic system with intelligent question selection, adaptive scoring, and comprehensive session management. This API enables frontend applications to create engaging quiz experiences with 50 progressive phases and advanced game mechanics.

**Base URL**: `http://localhost:1337/api`  
**Version**: 1.0  
**Content Type**: `application/json`

---

## 🎯 Core Game Concepts

### Phase System
- **50 Phases** divided into 5 difficulty tiers
- **10 questions** per phase
- **Progressive difficulty** with adaptive selection
- **Minimum score requirements** increase with phase level

### Scoring System
- **Base points** by difficulty level (10-50 points)
- **Speed bonuses** up to 2x multiplier
- **Streak bonuses** for consecutive correct answers
- **Perfect phase bonuses** for 100% accuracy

### Session Management
- **Persistent sessions** with pause/resume capability
- **Real-time progress** tracking
- **Automatic cleanup** of expired sessions
- **Analytics and insights** for completed sessions

---

## 🚀 Quick Start

### 1. Start a Quiz
```bash
POST /api/quiz/start
{
  "phaseNumber": 1,
  "locale": "en",
  "userId": "user123"
}
```

### 2. Get Current Question
```bash
GET /api/quiz/question/{sessionId}
```

### 3. Submit Answer
```bash
POST /api/quiz/answer
{
  "sessionId": "quiz_abc123",
  "selectedOption": "A",
  "timeUsed": 15000
}
```

---

## 📝 API Endpoints

### **POST** `/quiz/start` - Start Quiz Session

Initialize a new quiz session for a specific phase.

**Request Body:**
```json
{
  "phaseNumber": 1,
  "locale": "en",
  "userId": "user123",
  "userPreferences": {
    "timePerQuestion": 30000
  }
}
```

**Parameters:**
- `phaseNumber` (integer, required): Phase number (1-50)
- `locale` (string, optional): Language locale (`en`, `pt`, `es`, `fr`)
- `userId` (string, optional): User identifier for progress tracking
- `userPreferences` (object, optional): Custom session preferences

**Response:**
```json
{
  "success": true,
  "message": "Quiz session started successfully",
  "data": {
    "sessionId": "quiz_abc123def456",
    "phaseNumber": 1,
    "totalQuestions": 10,
    "timePerQuestion": 30000,
    "phaseConfig": {
      "type": "beginner",
      "levels": [1, 2],
      "distribution": { "1": 0.7, "2": 0.3 },
      "minScore": 0.6
    },
    "startTime": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### **GET** `/quiz/session/:sessionId` - Get Session Info

Retrieve current session status and statistics.

**Path Parameters:**
- `sessionId` (string): Session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "quiz_abc123def456",
      "phaseNumber": 1,
      "status": "active",
      "currentQuestionIndex": 3,
      "score": 180,
      "streakCount": 2,
      "isPaused": false
    },
    "stats": {
      "progress": {
        "currentQuestion": 4,
        "totalQuestions": 10,
        "percentage": 30
      },
      "performance": {
        "accuracy": 0.75,
        "averageTime": 18500,
        "currentStreak": 2,
        "maxStreak": 3
      }
    }
  }
}
```

---

### **GET** `/quiz/question/:sessionId` - Get Current Question

Retrieve the current question for an active session.

**Path Parameters:**
- `sessionId` (string): Session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "questionIndex": 4,
    "totalQuestions": 10,
    "question": {
      "question": "What is the approximate age of the universe?",
      "optionA": "10 billion years",
      "optionB": "13.8 billion years",
      "optionC": "20 billion years",
      "optionD": "5 billion years",
      "level": 3,
      "topic": "Cosmology"
    },
    "timeRemaining": 25000,
    "timePerQuestion": 30000,
    "currentScore": 180,
    "currentStreak": 2
  }
}
```

---

### **POST** `/quiz/answer` - Submit Answer

Submit an answer for the current question.

**Request Body:**
```json
{
  "sessionId": "quiz_abc123def456",
  "selectedOption": "B",
  "timeUsed": 15000
}
```

**Parameters:**
- `sessionId` (string, required): Session identifier
- `selectedOption` (string, required): Selected answer (`A`, `B`, `C`, `D`)
- `timeUsed` (integer, required): Time used in milliseconds

**Response:**
```json
{
  "success": true,
  "message": "Answer submitted successfully",
  "data": {
    "answerRecord": {
      "questionIndex": 3,
      "selectedOption": "B",
      "correctOption": "B",
      "isCorrect": true,
      "isTimeout": false,
      "timeUsed": 15000,
      "timeRemaining": 15000,
      "points": 45,
      "scoreBreakdown": {
        "basePoints": "Level 3 base points",
        "speedBonus": "Good speed (1.5x)",
        "streakBonus": "3 streak bonus (+15 points)"
      },
      "topic": "Cosmology",
      "level": 3
    },
    "scoreResult": {
      "basePoints": 30,
      "speedBonus": 15,
      "streakBonus": 15,
      "totalPoints": 45,
      "speedMultiplier": 1.5
    },
    "sessionStatus": {
      "currentQuestionIndex": 4,
      "totalQuestions": 10,
      "score": 225,
      "streakCount": 3,
      "isPhaseComplete": false
    }
  }
}
```

---

### **POST** `/quiz/pause` - Pause Session

Pause the current quiz session.

**Request Body:**
```json
{
  "sessionId": "quiz_abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz session paused successfully",
  "data": {
    "sessionId": "quiz_abc123def456",
    "isPaused": true,
    "pausedAt": "2024-01-01T12:05:30.000Z"
  }
}
```

---

### **POST** `/quiz/resume` - Resume Session

Resume a paused quiz session.

**Request Body:**
```json
{
  "sessionId": "quiz_abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz session resumed successfully",
  "data": {
    "sessionId": "quiz_abc123def456",
    "isPaused": false,
    "currentQuestionStartTime": "2024-01-01T12:10:15.000Z"
  }
}
```

---

### **POST** `/quiz/finish` - Finish Session

Complete or abandon a quiz session.

**Request Body:**
```json
{
  "sessionId": "quiz_abc123def456",
  "reason": "completed"
}
```

**Parameters:**
- `sessionId` (string, required): Session identifier
- `reason` (string, optional): Completion reason (`completed`, `abandoned`)

**Response:**
```json
{
  "success": true,
  "message": "Quiz session completed successfully",
  "data": {
    "sessionId": "quiz_abc123def456",
    "finalStatus": "completed",
    "phaseResult": {
      "questionsTotal": 10,
      "questionsCorrect": 8,
      "totalPoints": 420,
      "accuracy": 0.8,
      "averageTime": 18500,
      "perfectBonus": 0,
      "phaseScore": 420,
      "achievements": ["speedDemon"],
      "passed": true,
      "grade": "B+"
    },
    "stats": {
      "performance": {
        "score": 420,
        "accuracy": 0.8,
        "averageTime": 18500,
        "maxStreak": 5
      }
    }
  }
}
```

---

### **GET** `/quiz/leaderboard` - Get Leaderboard

Retrieve leaderboard rankings.

**Query Parameters:**
- `category` (string, optional): Ranking category
  - `total_score` (default)
  - `perfect_phases`
  - `average_speed`
  - `current_streak`
- `period` (string, optional): Time period (`all_time`, `weekly`, `monthly`)
- `limit` (integer, optional): Number of entries (1-100, default: 10)

**Example Request:**
```bash
GET /api/quiz/leaderboard?category=perfect_phases&limit=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "perfect_phases",
    "period": "all_time",
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user1",
        "score": 15750,
        "username": "AstroMaster",
        "perfectPhases": 12
      },
      {
        "rank": 2,
        "userId": "user2", 
        "score": 14200,
        "username": "StarGazer",
        "perfectPhases": 8
      }
    ],
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### **GET** `/quiz/rules` - Get Game Rules

Retrieve game rules and configuration.

**Query Parameters:**
- `section` (string, optional): Specific rule section
  - `general`
  - `phases`
  - `scoring`
  - `achievements`
  - `timing`

**Example Request:**
```bash
GET /api/quiz/rules?section=scoring
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scoring": {
      "basePoints": {
        "1": 10,
        "2": 20,
        "3": 30,
        "4": 40,
        "5": 50
      },
      "speedBonus": {
        "excellent": { "threshold": 20000, "multiplier": 2.0 },
        "good": { "threshold": 15000, "multiplier": 1.5 },
        "normal": { "threshold": 10000, "multiplier": 1.2 },
        "slow": { "threshold": 0, "multiplier": 1.0 }
      },
      "streakBonus": {
        "pointsPerStreak": 5,
        "maxStreakBonus": 50,
        "streakThreshold": 3
      }
    }
  }
}
```

---

### **GET** `/quiz/pool-stats` - Get Question Pool Stats

Analyze question pool statistics for a locale.

**Query Parameters:**
- `locale` (string, optional): Language locale (default: `en`)

**Response:**
```json
{
  "success": true,
  "data": {
    "locale": "en",
    "stats": {
      "total": 363,
      "byLevel": {
        "1": 89,
        "2": 94,
        "3": 87,
        "4": 52,
        "5": 41
      },
      "byTopic": {
        "Galaxies & Cosmology": 67,
        "Stellar Objects": 84,
        "Solar System": 76,
        "Physics & Mathematics": 58,
        "Observation & Instruments": 78
      },
      "coverage": {
        "beginner": {
          "available": 183,
          "needed": 100,
          "ratio": 1.83
        },
        "elite": {
          "available": 93,
          "needed": 100,
          "ratio": 0.93
        }
      }
    },
    "generatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### **GET** `/quiz/analytics/:sessionId` - Get Session Analytics

Retrieve detailed analytics for a completed session.

**Path Parameters:**
- `sessionId` (string): Session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "phases": [
      {
        "phaseNumber": 1,
        "score": 420,
        "accuracy": 0.8,
        "timeEfficiency": 72,
        "strongTopics": [
          { "topic": "Solar System", "accuracy": 1.0, "avgTime": 12000 }
        ],
        "weakTopics": [
          { "topic": "Physics", "accuracy": 0.5, "avgTime": 25000 }
        ],
        "improvements": [
          "Work on speed - practice quick recall of basic facts"
        ]
      }
    ],
    "summary": {
      "totalPhases": 1,
      "phasesCompleted": 1,
      "totalQuestions": 10,
      "totalCorrect": 8,
      "overallAccuracy": 0.8,
      "achievements": ["speedDemon"],
      "currentLevel": 1
    },
    "recommendations": [
      "Focus on improving accuracy through regular practice",
      "Study these challenging topics: Physics"
    ]
  }
}
```

---

### **GET** `/quiz/health` - Health Check

Check quiz engine health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "services": {
      "session": true,
      "scoring": true,
      "selector": true
    },
    "config": {
      "totalPhases": 50,
      "questionsPerPhase": 10,
      "supportedLocales": ["en", "pt", "es", "fr"]
    }
  }
}
```

---

## 🎯 Game Flow Examples

### Complete Quiz Session Flow

```javascript
// 1. Start quiz
const startResponse = await fetch('/api/quiz/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phaseNumber: 1,
    locale: 'en',
    userId: 'player123'
  })
});
const { sessionId } = (await startResponse.json()).data;

// 2. Game loop
for (let i = 0; i < 10; i++) {
  // Get current question
  const questionResponse = await fetch(`/api/quiz/question/${sessionId}`);
  const questionData = await questionResponse.json();
  
  // Display question to user and get answer
  const userAnswer = await getUserAnswer(questionData.data);
  
  // Submit answer
  const answerResponse = await fetch('/api/quiz/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      selectedOption: userAnswer.option,
      timeUsed: userAnswer.timeUsed
    })
  });
  
  const answerResult = await answerResponse.json();
  
  // Show feedback to user
  showFeedback(answerResult.data);
  
  // Check if phase is complete
  if (answerResult.data.sessionStatus.isPhaseComplete) {
    break;
  }
}

// 3. Get final results
const finishResponse = await fetch('/api/quiz/finish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, reason: 'completed' })
});
const finalResults = await finishResponse.json();

// Display final results
showResults(finalResults.data);
```

### Pause/Resume Flow

```javascript
// Pause during game
await fetch('/api/quiz/pause', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId })
});

// Later, resume the game
await fetch('/api/quiz/resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId })
});

// Continue with normal flow
const questionResponse = await fetch(`/api/quiz/question/${sessionId}`);
```

---

## ❌ Error Responses

### Common Error Codes

**400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid phase number. Must be between 1 and 50"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Session not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to start quiz session"
}
```

### Error Handling Best Practices

```javascript
try {
  const response = await fetch('/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phaseNumber: 1, locale: 'en' })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const data = await response.json();
  // Handle success
} catch (error) {
  // Handle specific errors
  if (error.message.includes('phase number')) {
    showError('Please select a valid phase (1-50)');
  } else if (error.message.includes('locale')) {
    showError('Language not supported');
  } else {
    showError('Unable to start quiz. Please try again.');
  }
}
```

---

## 🎮 Game Rules Reference

### Phase Difficulty Tiers

| Tier | Phases | Levels | Distribution | Min Score | Description |
|------|--------|---------|-------------|-----------|-------------|
| Beginner | 1-10 | 1-2 | 70% L1, 30% L2 | 60% | Basic concepts |
| Novice | 11-20 | 1-3 | 40% L1, 40% L2, 20% L3 | 65% | Intermediate intro |
| Intermediate | 21-30 | 2-4 | 30% L2, 50% L3, 20% L4 | 70% | Advanced topics |
| Advanced | 31-40 | 3-5 | 20% L3, 50% L4, 30% L5 | 75% | Expert level |
| Elite | 41-50 | 4-5 | 30% L4, 70% L5 | 85% | Master challenges |

### Scoring System

**Base Points by Level:**
- Level 1: 10 points
- Level 2: 20 points  
- Level 3: 30 points
- Level 4: 40 points
- Level 5: 50 points

**Speed Multipliers:**
- Excellent (≥20s remaining): 2.0x
- Good (≥15s remaining): 1.5x
- Normal (≥10s remaining): 1.2x
- Slow (<10s remaining): 1.0x

**Streak Bonuses:**
- +5 points per question in streak (3+ streak required)
- Maximum streak bonus: 50 points

**Achievements:**
- **Perfectionist**: 100% accuracy in phase (+100 points)
- **Speed Demon**: Average <10s per question (+75 points)
- **Streak Master**: 10+ consecutive correct (+150 points)

---

## 🔧 Integration Tips

### Frontend State Management

```javascript
// Redux/Context state example
const quizState = {
  currentSession: null,
  sessionStats: null,
  currentQuestion: null,
  gameHistory: [],
  userPreferences: {
    locale: 'en',
    timePerQuestion: 30000,
    soundEnabled: true
  }
};

// Actions
const startQuiz = (phaseNumber) => async (dispatch) => {
  const response = await quizAPI.startQuiz({
    phaseNumber,
    locale: getState().quiz.userPreferences.locale,
    userId: getState().auth.userId
  });
  
  dispatch({ type: 'QUIZ_STARTED', payload: response.data });
};
```

### Real-time Updates

```javascript
// WebSocket integration for real-time features
const socket = io('/quiz');

socket.on('sessionUpdate', (data) => {
  updateSessionState(data);
});

socket.on('leaderboardUpdate', (data) => {
  updateLeaderboard(data);
});

// Emit session events
socket.emit('joinSession', { sessionId });
```

### Offline Support

```javascript
// Service Worker for offline capability
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/quiz/rules')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// Cache game rules and static data
caches.open('quiz-static').then(cache => {
  cache.addAll([
    '/api/quiz/rules',
    '/api/quiz/pool-stats?locale=en'
  ]);
});
```

---

## 📱 Mobile Considerations

### Touch-Friendly Interfaces
- Large touch targets for answer options
- Swipe gestures for navigation
- Haptic feedback for correct/incorrect answers

### Performance Optimization
- Preload next question during current question
- Cache frequently accessed data
- Minimize API calls during active gameplay

### Responsive Design
- Adaptive layouts for different screen sizes
- Portrait/landscape orientation support
- Accessibility compliance (WCAG 2.1)

---

## 🎯 Next Steps

1. **Implement Frontend**: Use this API to build your quiz interface
2. **Add Authentication**: Integrate user management for progress tracking
3. **Real-time Features**: Add WebSocket support for live competitions
4. **Analytics Dashboard**: Create admin panel using analytics endpoints
5. **Mobile App**: Build native mobile apps using these APIs

The AstroQuiz Engine API provides everything needed to create an engaging, educational quiz experience with professional-grade game mechanics! 🚀
