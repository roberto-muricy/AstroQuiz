# 🚀 AstroQuiz API Documentation

## 📋 Overview

**Base URL**: `http://localhost:1337`  
**API Version**: Strapi v4  
**Content Type**: `application/json`  
**i18n Support**: EN (default), PT, ES, FR  

## 🔐 Authentication

Currently using **Public API** access. For production, implement JWT authentication:

```javascript
// Headers for authenticated requests
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

---

## 📝 Questions API

### **GET** `/api/questions` - List All Questions

Retrieve all questions with pagination and filtering support.

**Query Parameters:**
- `locale` (string): Language filter (`en`, `pt`, `es`, `fr`)
- `pagination[page]` (number): Page number (default: 1)
- `pagination[pageSize]` (number): Items per page (default: 25, max: 100)
- `sort` (string): Sort field and order (`field:asc` or `field:desc`)
- `populate` (string): Relations to populate
- `filters` (object): Complex filtering

**Example Request:**
```bash
GET /api/questions?locale=en&pagination[page]=1&pagination[pageSize]=10&sort=level:asc
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123def456",
      "baseId": "astro_00001",
      "topic": "Galaxies & Cosmology",
      "level": 3,
      "question": "What is the approximate age of the universe?",
      "optionA": "10 billion years",
      "optionB": "13.8 billion years",
      "optionC": "20 billion years",
      "optionD": "5 billion years",
      "correctOption": "B",
      "explanation": "Current scientific consensus estimates the universe's age at approximately 13.8 billion years.",
      "locale": "en",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "publishedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 37,
      "total": 363
    }
  }
}
```

---

### **GET** `/api/questions/:documentId` - Get Single Question

Retrieve a specific question by its documentId.

**Path Parameters:**
- `documentId` (string): Unique document identifier

**Query Parameters:**
- `locale` (string): Language version to retrieve

**Example Request:**
```bash
GET /api/questions/abc123def456?locale=pt
```

**Example Response:**
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "baseId": "astro_00001",
    "topic": "Galáxias e Cosmologia",
    "level": 3,
    "question": "Qual é a idade aproximada do universo?",
    "optionA": "10 bilhões de anos",
    "optionB": "13,8 bilhões de anos", 
    "optionC": "20 bilhões de anos",
    "optionD": "5 bilhões de anos",
    "correctOption": "B",
    "explanation": "O consenso científico atual estima a idade do universo em aproximadamente 13,8 bilhões de anos.",
    "locale": "pt",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "publishedAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {}
}
```

---

## 🔍 Advanced Filtering

### **Filter by Topic**

```bash
GET /api/questions?filters[topic][$eq]=Galaxies & Cosmology&locale=en
```

### **Filter by Level**

**Single Level:**
```bash
GET /api/questions?filters[level][$eq]=3&locale=en
```

**Level Range:**
```bash
GET /api/questions?filters[level][$gte]=2&filters[level][$lte]=4&locale=en
```

### **Filter by Multiple Criteria**

```bash
GET /api/questions?filters[topic][$eq]=Stellar Objects&filters[level][$gte]=3&locale=en&sort=level:asc
```

### **Search in Question Text**

```bash
GET /api/questions?filters[question][$containsi]=galaxy&locale=en
```

---

## 🌍 Localization Examples

### **Get Questions by Language**

**English (default):**
```bash
GET /api/questions?locale=en&pagination[pageSize]=5
```

**Portuguese:**
```bash
GET /api/questions?locale=pt&pagination[pageSize]=5
```

**Spanish:**
```bash
GET /api/questions?locale=es&pagination[pageSize]=5
```

**French:**
```bash
GET /api/questions?locale=fr&pagination[pageSize]=5
```

---

## 📊 Statistics & Aggregation

### **Count Questions by Level**

```bash
GET /api/questions?filters[level][$eq]=1&pagination[pageSize]=0
# Check meta.pagination.total for count
```

### **Get Unique Topics**

```bash
GET /api/questions?fields[0]=topic&pagination[pageSize]=100
# Process response to extract unique topics
```

---

## 🔧 DeepL Translation API

### **POST** `/api/deepl/translate` - Translate Text

Translate arbitrary text using DeepL API.

**Request Body:**
```json
{
  "text": "What is a black hole?",
  "targetLang": "PT-BR",
  "sourceLang": "EN"
}
```

**Example Request:**
```bash
POST /api/deepl/translate
Content-Type: application/json

{
  "text": "What is the speed of light?",
  "targetLang": "ES",
  "sourceLang": "EN"
}
```

**Example Response:**
```json
{
  "data": {
    "translatedText": "¿Cuál es la velocidad de la luz?",
    "sourceLang": "EN",
    "targetLang": "ES",
    "usage": {
      "characterCount": 25,
      "characterLimit": 500000
    }
  }
}
```

### **POST** `/api/deepl/translate-question/:id` - Translate Question

Translate an entire question to a target language.

**Path Parameters:**
- `id` (string): Question documentId

**Request Body:**
```json
{
  "targetLang": "FR",
  "fields": ["question", "optionA", "optionB", "optionC", "optionD", "explanation", "topic"]
}
```

**Example Response:**
```json
{
  "data": {
    "originalQuestion": {
      "id": 1,
      "question": "What is a neutron star?",
      "locale": "en"
    },
    "translatedFields": {
      "question": "Qu'est-ce qu'une étoile à neutrons ?",
      "optionA": "Une étoile normale",
      "optionB": "Une étoile très dense",
      "optionC": "Une étoile géante",
      "optionD": "Une étoile mourante",
      "explanation": "Une étoile à neutrons est un objet astronomique extrêmement dense...",
      "topic": "Objets stellaires"
    },
    "targetLang": "FR",
    "usage": {
      "characterCount": 156,
      "characterLimit": 500000
    }
  }
}
```

---

## ❌ Error Responses

### **400 Bad Request**
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid query parameters",
    "details": {
      "errors": [
        {
          "path": ["filters", "level"],
          "message": "Level must be between 1 and 5"
        }
      ]
    }
  }
}
```

### **404 Not Found**
```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Question not found",
    "details": {}
  }
}
```

### **500 Internal Server Error**
```json
{
  "error": {
    "status": 500,
    "name": "InternalServerError",
    "message": "An error occurred during translation",
    "details": {}
  }
}
```

---

## 📈 Rate Limits

- **Questions API**: No rate limit (currently)
- **DeepL API**: Respects DeepL Pro plan limits
- **Recommended**: Implement client-side throttling for production

---

## 🔗 Useful Query Combinations

### **Random Quiz Questions**
```bash
# Get 10 random questions of level 3
GET /api/questions?filters[level][$eq]=3&pagination[pageSize]=10&sort=id:asc&locale=en
```

### **Progressive Difficulty**
```bash
# Get questions ordered by difficulty
GET /api/questions?sort=level:asc,id:asc&pagination[pageSize]=20&locale=en
```

### **Topic-based Quiz**
```bash
# All questions from specific topic
GET /api/questions?filters[topic][$eq]=Stellar Objects&locale=en&pagination[pageSize]=50
```

### **Multilingual Content Check**
```bash
# Check if question exists in target language
GET /api/questions?filters[baseId][$eq]=astro_00001&locale=fr
```

---

## 🧪 Testing Endpoints

### **Health Check**
```bash
GET /api/questions?pagination[pageSize]=1
# Should return 200 with 1 question
```

### **Locale Availability**
```bash
GET /api/questions?locale=pt&pagination[pageSize]=1
GET /api/questions?locale=es&pagination[pageSize]=1  
GET /api/questions?locale=fr&pagination[pageSize]=1
# All should return 200 with localized content
```

### **DeepL Integration**
```bash
POST /api/deepl/translate
{
  "text": "Test translation",
  "targetLang": "PT-BR"
}
# Should return translated text
```

---

## 📋 Response Schema

### **Question Object**
```typescript
interface Question {
  id: number;
  documentId: string;
  baseId: string;
  topic: string;
  level: number; // 1-5
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  locale: 'en' | 'pt' | 'es' | 'fr';
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}
```

### **Pagination Meta**
```typescript
interface PaginationMeta {
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}
```

---

## 🚀 Next Steps

1. **Authentication**: Implement JWT for production
2. **Caching**: Add Redis for frequently accessed questions
3. **Search**: Implement full-text search with Elasticsearch
4. **Analytics**: Track question performance and user preferences
5. **Versioning**: Add API versioning for future updates
