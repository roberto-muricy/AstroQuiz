# 🚀 AstroQuiz API Usage Examples

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Operations](#basic-operations)
3. [Advanced Filtering](#advanced-filtering)
4. [Localization Examples](#localization-examples)
5. [Quiz Generation](#quiz-generation)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Frontend Integration](#frontend-integration)

---

## 🏁 Quick Start

### Using the API Client

```javascript
// Import the client
import { createAstroQuizClient } from './src/utils/api-client.js';

// Create client instance
const client = createAstroQuizClient({
  baseURL: 'http://localhost:1337',
  defaultLocale: 'en',
  enableCache: true
});

// Test connection
const isConnected = await client.testConnection();
console.log('API Connected:', isConnected);
```

### Direct Fetch Example

```javascript
// Simple fetch example
const response = await fetch('http://localhost:1337/api/questions?locale=en&pagination[pageSize]=5');
const data = await response.json();
console.log('Questions:', data.data);
```

---

## 📝 Basic Operations

### Get All Questions

```javascript
// Get first 10 questions in English
const questions = await client.getQuestions({
  locale: 'en',
  pageSize: 10
});

console.log(`Found ${questions.meta.pagination.total} total questions`);
questions.data.forEach(q => {
  console.log(`${q.baseId}: ${q.question}`);
});
```

### Get Single Question

```javascript
// Get specific question
const questionId = 'your-document-id-here';
const question = await client.getQuestion(questionId, { locale: 'en' });

console.log('Question:', question.data.question);
console.log('Options:', [
  question.data.optionA,
  question.data.optionB,
  question.data.optionC,
  question.data.optionD
]);
console.log('Correct:', question.data.correctOption);
```

### Get Questions with Pagination

```javascript
// Paginate through all questions
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await client.getQuestions({
    locale: 'en',
    page: page,
    pageSize: 25
  });
  
  console.log(`Page ${page}: ${response.data.length} questions`);
  
  // Process questions
  response.data.forEach(question => {
    console.log(`- ${question.topic}: ${question.question}`);
  });
  
  // Check if there are more pages
  hasMore = page < response.meta.pagination.pageCount;
  page++;
}
```

---

## 🔍 Advanced Filtering

### Filter by Level

```javascript
// Get intermediate level questions (level 3)
const intermediateQuestions = await client.getQuestionsByLevel(3, {
  locale: 'en',
  pageSize: 20
});

console.log(`Found ${intermediateQuestions.data.length} level 3 questions`);
```

### Filter by Level Range

```javascript
// Get questions from level 2 to 4
const rangeQuestions = await client.getQuestionsByLevelRange(2, 4, {
  locale: 'en',
  pageSize: 50,
  sort: 'level:asc'
});

// Group by level
const byLevel = rangeQuestions.data.reduce((acc, q) => {
  acc[q.level] = (acc[q.level] || 0) + 1;
  return acc;
}, {});

console.log('Questions by level:', byLevel);
```

### Filter by Topic

```javascript
// Get all questions about galaxies
const galaxyQuestions = await client.getQuestionsByTopic('Galaxies & Cosmology', {
  locale: 'en',
  sort: 'level:asc'
});

console.log(`Found ${galaxyQuestions.data.length} questions about galaxies`);
```

### Complex Filtering

```javascript
// Multiple filters combined
const complexQuery = await client.getQuestions({
  locale: 'en',
  filters: {
    level: { $gte: 3, $lte: 5 }, // Advanced levels only
    topic: { $containsi: 'stellar' }, // Topics containing 'stellar'
    question: { $containsi: 'what' } // Questions starting with 'what'
  },
  sort: 'level:desc',
  pageSize: 30
});

console.log('Complex query results:', complexQuery.data.length);
```

### Search Questions

```javascript
// Search across question text, explanations, and topics
const searchResults = await client.searchQuestions('black hole', {
  locale: 'en',
  pageSize: 20
});

console.log(`Found ${searchResults.data.length} questions about black holes`);
searchResults.data.forEach(q => {
  console.log(`${q.level}⭐ ${q.question}`);
});
```

---

## 🌍 Localization Examples

### Multi-language Quiz

```javascript
// Get same question in different languages
const baseId = 'astro_00001';

// Method 1: Search by baseId
const getQuestionInLocale = async (locale) => {
  const response = await client.getQuestions({
    locale,
    filters: { baseId: { $eq: baseId } },
    pageSize: 1
  });
  return response.data[0];
};

const englishQ = await getQuestionInLocale('en');
const portugueseQ = await getQuestionInLocale('pt');
const spanishQ = await getQuestionInLocale('es');
const frenchQ = await getQuestionInLocale('fr');

console.log('Same question in 4 languages:');
console.log('🇺🇸', englishQ.question);
console.log('🇧🇷', portugueseQ.question);
console.log('🇪🇸', spanishQ.question);
console.log('🇫🇷', frenchQ.question);
```

### Language-specific Statistics

```javascript
// Get statistics for each language
const languages = ['en', 'pt', 'es', 'fr'];
const stats = {};

for (const lang of languages) {
  stats[lang] = await client.getStatistics(lang);
}

console.log('Questions per language:');
languages.forEach(lang => {
  console.log(`${lang.toUpperCase()}: ${stats[lang].total} questions`);
  console.log(`  Topics: ${stats[lang].topics.length}`);
  console.log(`  Level distribution:`, stats[lang].levelDistribution);
});
```

### Dynamic Language Switching

```javascript
// Quiz app with language switching
class MultilingualQuiz {
  constructor(client) {
    this.client = client;
    this.currentLocale = 'en';
  }
  
  async switchLanguage(newLocale) {
    this.currentLocale = newLocale;
    // Clear cache to force fresh data
    this.client.clearCache();
  }
  
  async getCurrentQuestions(filters = {}) {
    return await this.client.getQuestions({
      locale: this.currentLocale,
      ...filters
    });
  }
  
  async getQuestionById(id) {
    return await this.client.getQuestion(id, {
      locale: this.currentLocale
    });
  }
}

// Usage
const quiz = new MultilingualQuiz(client);
await quiz.switchLanguage('pt');
const questions = await quiz.getCurrentQuestions({ pageSize: 10 });
```

---

## 🎯 Quiz Generation

### Random Quiz Generator

```javascript
// Generate a random quiz
const generateQuiz = async (options = {}) => {
  const {
    questionCount = 10,
    locale = 'en',
    level = null,
    topic = null,
    excludeIds = []
  } = options;
  
  const quiz = await client.getRandomQuestions({
    count: questionCount,
    locale,
    level,
    topic,
    excludeIds
  });
  
  return quiz.data.map((question, index) => ({
    number: index + 1,
    id: question.documentId,
    baseId: question.baseId,
    question: question.question,
    options: [
      { key: 'A', text: question.optionA },
      { key: 'B', text: question.optionB },
      { key: 'C', text: question.optionC },
      { key: 'D', text: question.optionD }
    ],
    correctAnswer: question.correctOption,
    explanation: question.explanation,
    level: question.level,
    topic: question.topic
  }));
};

// Generate a beginner quiz about stellar objects
const beginnerQuiz = await generateQuiz({
  questionCount: 5,
  locale: 'en',
  level: 1,
  topic: 'Stellar Objects'
});

console.log('Generated quiz:', beginnerQuiz);
```

### Progressive Difficulty Quiz

```javascript
// Create a quiz with increasing difficulty
const createProgressiveQuiz = async (locale = 'en', questionsPerLevel = 2) => {
  const quiz = [];
  
  for (let level = 1; level <= 5; level++) {
    const levelQuestions = await client.getQuestionsByLevel(level, {
      locale,
      pageSize: questionsPerLevel * 2 // Get more to randomize
    });
    
    // Randomize and take requested amount
    const shuffled = levelQuestions.data.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionsPerLevel);
    
    quiz.push(...selected.map(q => ({
      ...q,
      progressiveLevel: level,
      orderInLevel: quiz.filter(item => item.level === level).length + 1
    })));
  }
  
  return quiz;
};

const progressiveQuiz = await createProgressiveQuiz('en', 2);
console.log(`Created progressive quiz with ${progressiveQuiz.length} questions`);
```

### Topic-based Quiz Series

```javascript
// Create a series of quizzes for each topic
const createTopicSeries = async (locale = 'en') => {
  const topics = await client.getTopics(locale);
  const series = {};
  
  for (const topic of topics) {
    const topicQuestions = await client.getQuestionsByTopic(topic, {
      locale,
      sort: 'level:asc'
    });
    
    // Group by difficulty
    const byDifficulty = {
      beginner: topicQuestions.data.filter(q => q.level <= 2),
      intermediate: topicQuestions.data.filter(q => q.level === 3),
      advanced: topicQuestions.data.filter(q => q.level >= 4)
    };
    
    series[topic] = byDifficulty;
  }
  
  return series;
};

const topicSeries = await createTopicSeries('en');
console.log('Available quiz series:', Object.keys(topicSeries));
```

---

## ❌ Error Handling

### Comprehensive Error Handling

```javascript
import { AstroQuizAPIError } from './src/utils/api-client.js';

const safeApiCall = async (apiFunction, fallback = null) => {
  try {
    return await apiFunction();
  } catch (error) {
    if (error instanceof AstroQuizAPIError) {
      console.error('API Error:', {
        message: error.message,
        status: error.status,
        details: error.details
      });
      
      // Handle specific error types
      switch (error.status) {
        case 404:
          console.log('Resource not found, using fallback');
          return fallback;
        case 429:
          console.log('Rate limited, retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return await apiFunction();
        case 500:
          console.log('Server error, trying alternative approach');
          return fallback;
        default:
          throw error;
      }
    } else {
      console.error('Unexpected error:', error);
      return fallback;
    }
  }
};

// Usage
const questions = await safeApiCall(
  () => client.getQuestions({ locale: 'en', pageSize: 10 }),
  { data: [], meta: { pagination: { total: 0 } } }
);
```

### Retry Logic

```javascript
const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Usage
const robustGetQuestions = (params) => withRetry(
  () => client.getQuestions(params),
  3,
  1000
);
```

---

## ⚡ Performance Optimization

### Caching Strategy

```javascript
// Create a cached client
const cachedClient = createCachedClient({
  baseURL: 'http://localhost:1337',
  cacheTimeout: 600000 // 10 minutes
});

// Cache frequently accessed data
const getPopularTopics = async (locale = 'en') => {
  // This will be cached automatically
  return await cachedClient.getTopics(locale);
};

// Manual cache management
const refreshTopicsCache = () => {
  cachedClient.clearCache();
  return getPopularTopics();
};
```

### Batch Operations

```javascript
// Efficient batch loading
const loadMultipleQuestions = async (questionIds, locale = 'en') => {
  const promises = questionIds.map(id => 
    client.getQuestion(id, { locale }).catch(error => ({
      error: error.message,
      id
    }))
  );
  
  const results = await Promise.all(promises);
  
  return {
    successful: results.filter(r => !r.error),
    failed: results.filter(r => r.error)
  };
};
```

### Pagination Optimization

```javascript
// Efficient pagination for large datasets
const getAllQuestionsEfficiently = async (locale = 'en') => {
  const allQuestions = [];
  let page = 1;
  const pageSize = 100; // Larger pages for efficiency
  
  while (true) {
    const response = await client.getQuestions({
      locale,
      page,
      pageSize
    });
    
    allQuestions.push(...response.data);
    
    if (response.data.length < pageSize) {
      break; // Last page
    }
    
    page++;
    
    // Add small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return allQuestions;
};
```

---

## 🖥️ Frontend Integration

### React Hook Example

```javascript
// useAstroQuiz.js
import { useState, useEffect, useCallback } from 'react';
import { createCachedClient } from './api-client.js';

const client = createCachedClient();

export const useAstroQuiz = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locale, setLocale] = useState('en');

  const loadQuestions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getQuestions({
        locale,
        pageSize: 20,
        ...filters
      });
      setQuestions(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  const switchLanguage = useCallback((newLocale) => {
    setLocale(newLocale);
    client.clearCache();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return {
    questions,
    loading,
    error,
    locale,
    loadQuestions,
    switchLanguage,
    getRandomQuestions: (count) => client.getRandomQuestions({ 
      count, 
      locale 
    })
  };
};

// Usage in component
const QuizComponent = () => {
  const { 
    questions, 
    loading, 
    error, 
    locale, 
    switchLanguage, 
    getRandomQuestions 
  } = useAstroQuiz();

  const startQuiz = async () => {
    const randomQuestions = await getRandomQuestions(10);
    // Start quiz with random questions
  };

  if (loading) return <div>Loading questions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <select value={locale} onChange={(e) => switchLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="pt">Português</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>
      
      <button onClick={startQuiz}>Start Random Quiz</button>
      
      <div>
        {questions.map(question => (
          <div key={question.documentId}>
            <h3>{question.question}</h3>
            <p>Level: {question.level} | Topic: {question.topic}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Vue.js Composition API

```javascript
// useAstroQuiz.js
import { ref, reactive, computed } from 'vue';
import { createCachedClient } from './api-client.js';

const client = createCachedClient();

export function useAstroQuiz() {
  const state = reactive({
    questions: [],
    loading: false,
    error: null,
    locale: 'en'
  });

  const loadQuestions = async (filters = {}) => {
    state.loading = true;
    state.error = null;
    
    try {
      const response = await client.getQuestions({
        locale: state.locale,
        pageSize: 20,
        ...filters
      });
      state.questions = response.data;
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
    }
  };

  const switchLanguage = (newLocale) => {
    state.locale = newLocale;
    client.clearCache();
    loadQuestions();
  };

  return {
    ...toRefs(state),
    loadQuestions,
    switchLanguage,
    client
  };
}
```

### Vanilla JavaScript SPA

```javascript
// quiz-app.js
class QuizApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.client = createCachedClient();
    this.currentQuiz = [];
    this.currentQuestion = 0;
    this.score = 0;
    this.locale = 'en';
    
    this.init();
  }

  async init() {
    await this.renderLanguageSelector();
    await this.renderTopicSelector();
    this.bindEvents();
  }

  async renderLanguageSelector() {
    const languages = [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'pt', name: 'Português', flag: '🇧🇷' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' }
    ];

    const selector = languages.map(lang => 
      `<button class="lang-btn ${lang.code === this.locale ? 'active' : ''}" 
              data-locale="${lang.code}">
        ${lang.flag} ${lang.name}
      </button>`
    ).join('');

    this.container.innerHTML = `
      <div class="language-selector">
        <h2>Choose Language / Escolha o Idioma</h2>
        ${selector}
      </div>
      <div id="quiz-content"></div>
    `;
  }

  async renderTopicSelector() {
    try {
      const topics = await this.client.getTopics(this.locale);
      const topicButtons = topics.map(topic =>
        `<button class="topic-btn" data-topic="${topic}">${topic}</button>`
      ).join('');

      document.getElementById('quiz-content').innerHTML = `
        <div class="topic-selector">
          <h2>Choose a Topic</h2>
          ${topicButtons}
          <button class="topic-btn" data-topic="random">🎲 Random Mix</button>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  }

  async startQuiz(topic = null) {
    try {
      const options = {
        count: 10,
        locale: this.locale
      };
      
      if (topic && topic !== 'random') {
        options.topic = topic;
      }

      const response = await this.client.getRandomQuestions(options);
      this.currentQuiz = response.data;
      this.currentQuestion = 0;
      this.score = 0;
      
      this.renderQuestion();
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  }

  renderQuestion() {
    const question = this.currentQuiz[this.currentQuestion];
    const progress = ((this.currentQuestion + 1) / this.currentQuiz.length) * 100;

    document.getElementById('quiz-content').innerHTML = `
      <div class="quiz-progress">
        <div class="progress-bar" style="width: ${progress}%"></div>
        <span>Question ${this.currentQuestion + 1} of ${this.currentQuiz.length}</span>
      </div>
      
      <div class="question-card">
        <div class="question-meta">
          <span class="level">Level ${question.level}</span>
          <span class="topic">${question.topic}</span>
        </div>
        
        <h2>${question.question}</h2>
        
        <div class="options">
          <button class="option-btn" data-answer="A">${question.optionA}</button>
          <button class="option-btn" data-answer="B">${question.optionB}</button>
          <button class="option-btn" data-answer="C">${question.optionC}</button>
          <button class="option-btn" data-answer="D">${question.optionD}</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('lang-btn')) {
        this.switchLanguage(e.target.dataset.locale);
      } else if (e.target.classList.contains('topic-btn')) {
        this.startQuiz(e.target.dataset.topic);
      } else if (e.target.classList.contains('option-btn')) {
        this.answerQuestion(e.target.dataset.answer);
      }
    });
  }

  async switchLanguage(newLocale) {
    this.locale = newLocale;
    this.client.clearCache();
    await this.renderLanguageSelector();
    await this.renderTopicSelector();
  }

  answerQuestion(selectedAnswer) {
    const question = this.currentQuiz[this.currentQuestion];
    const isCorrect = selectedAnswer === question.correctOption;
    
    if (isCorrect) {
      this.score++;
    }

    // Show feedback
    this.showFeedback(isCorrect, question);
  }

  showFeedback(isCorrect, question) {
    const feedbackHtml = `
      <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
        <h3>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h3>
        <p><strong>Correct Answer:</strong> ${question.correctOption}</p>
        <p>${question.explanation}</p>
        <button onclick="app.nextQuestion()">
          ${this.currentQuestion < this.currentQuiz.length - 1 ? 'Next Question' : 'Show Results'}
        </button>
      </div>
    `;
    
    document.getElementById('quiz-content').innerHTML += feedbackHtml;
  }

  nextQuestion() {
    this.currentQuestion++;
    
    if (this.currentQuestion < this.currentQuiz.length) {
      this.renderQuestion();
    } else {
      this.showResults();
    }
  }

  showResults() {
    const percentage = Math.round((this.score / this.currentQuiz.length) * 100);
    
    document.getElementById('quiz-content').innerHTML = `
      <div class="results">
        <h2>Quiz Complete!</h2>
        <div class="score">
          <span class="score-number">${this.score}</span>
          <span class="score-total">/ ${this.currentQuiz.length}</span>
        </div>
        <div class="percentage">${percentage}%</div>
        <button onclick="app.renderTopicSelector()">Take Another Quiz</button>
      </div>
    `;
  }
}

// Initialize app
const app = new QuizApp('quiz-app');
```

---

## 🎯 Best Practices

### 1. **Always Handle Errors**
```javascript
// Good
try {
  const questions = await client.getQuestions();
} catch (error) {
  console.error('Failed to load questions:', error);
  // Show user-friendly message
}

// Bad
const questions = await client.getQuestions(); // Can throw unhandled errors
```

### 2. **Use Appropriate Page Sizes**
```javascript
// Good - reasonable page sizes
const questions = await client.getQuestions({ pageSize: 25 });

// Bad - too large, can be slow
const questions = await client.getQuestions({ pageSize: 1000 });
```

### 3. **Cache Frequently Accessed Data**
```javascript
// Good - use cached client for static data
const cachedClient = createCachedClient();
const topics = await cachedClient.getTopics('en');

// Bad - fetching topics repeatedly
const topics1 = await client.getTopics('en');
const topics2 = await client.getTopics('en'); // Same request again
```

### 4. **Implement Loading States**
```javascript
// Good - show loading state
setLoading(true);
try {
  const questions = await client.getQuestions();
  setQuestions(questions.data);
} finally {
  setLoading(false);
}
```

### 5. **Validate Data Before Use**
```javascript
// Good - validate response
const response = await client.getQuestions();
if (response.data && Array.isArray(response.data)) {
  setQuestions(response.data);
} else {
  console.warn('Invalid response format');
}
```

This comprehensive guide should help you integrate the AstroQuiz API into any frontend application! 🚀
