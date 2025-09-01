# 🌍 Internationalization (i18n) Setup for AstroQuiz

This document describes the complete i18n setup for the multilingual quiz system.

## 📋 Configuration Overview

### Supported Locales
- **English (en)** - Master language (default)
- **Portuguese (pt)** - Portuguese
- **Spanish (es)** - Spanish
- **French (fr)** - French

### Content Type: Question

#### Translatable Fields (i18n enabled)
- `question` (text) - The question text
- `optionA`, `optionB`, `optionC`, `optionD` (text) - Answer options
- `explanation` (rich text) - Explanation of the correct answer
- `topic` (text) - Question topic/category

#### Non-Translatable Fields (shared across locales)
- `baseId` (string) - Unique identifier for the question
- `level` (enumeration) - Difficulty level (beginner, intermediate, advanced)
- `correctOption` (enumeration) - Correct answer (A, B, C, D)

## 🚀 Getting Started

### 1. Start the Development Server
```bash
cd quiz-cms
npm run develop
```

### 2. Access the Admin Panel
- Open: http://localhost:1337/admin
- Create your first admin user
- Navigate to Content Manager → Question

### 3. Language Switching in Admin
- Use the language selector in the top-right corner
- Switch between English, Portuguese, Spanish, and French
- Create content in each language

## 📡 API Endpoints

### Standard CRUD Operations
All standard Strapi endpoints support i18n:

```bash
# Get all questions (default: English)
GET /api/questions

# Get questions by locale
GET /api/questions?locale=pt
GET /api/questions?locale=es
GET /api/questions?locale=fr

# Get specific question
GET /api/questions/:id?locale=pt

# Create question (specify locale)
POST /api/questions
Content-Type: application/json
{
  "data": {
    "question": "What is the capital of France?",
    "optionA": "London",
    "optionB": "Berlin",
    "optionC": "Paris",
    "optionD": "Madrid",
    "correctOption": "C",
    "level": "beginner",
    "baseId": "geo_001",
    "locale": "en"
  }
}
```

### Custom i18n Endpoints

#### Get Questions by Locale
```bash
GET /api/questions/locale/pt
GET /api/questions/locale/es
GET /api/questions/locale/fr
```

#### Get Questions with Fallback
```bash
GET /api/questions/fallback/pt
# Returns Portuguese questions, falls back to English if not available
```

#### Get Questions by Level and Locale
```bash
GET /api/questions/level/beginner/pt
GET /api/questions/level/intermediate/es
GET /api/questions/level/advanced/fr
```

#### Get Questions by Topic and Locale
```bash
GET /api/questions/topic/astronomy/pt
GET /api/questions/topic/physics/es
GET /api/questions/topic/chemistry/fr
```

## 🔧 Content Management Workflow

### Creating Multilingual Content

1. **Create Master Content (English)**
   - Start with English as the master language
   - Fill in all required fields
   - Set the `baseId` for easy identification

2. **Add Translations**
   - Switch to target language (Portuguese, Spanish, French)
   - Create new entry or edit existing
   - Link to the master English entry
   - Translate only the translatable fields
   - Keep non-translatable fields (baseId, level, correctOption) the same

3. **Publish Content**
   - Publish in each language separately
   - Use draft/publish workflow for each locale

### Example: Creating a Question in All Languages

#### English (Master)
```json
{
  "question": "What is the largest planet in our solar system?",
  "optionA": "Earth",
  "optionB": "Mars",
  "optionC": "Jupiter",
  "optionD": "Saturn",
  "correctOption": "C",
  "level": "beginner",
  "baseId": "astro_001",
  "explanation": "Jupiter is the largest planet in our solar system.",
  "topic": "astronomy"
}
```

#### Portuguese
```json
{
  "question": "Qual é o maior planeta do nosso sistema solar?",
  "optionA": "Terra",
  "optionB": "Marte",
  "optionC": "Júpiter",
  "optionD": "Saturno",
  "correctOption": "C",
  "level": "beginner",
  "baseId": "astro_001",
  "explanation": "Júpiter é o maior planeta do nosso sistema solar.",
  "topic": "astronomia"
}
```

## 🛠️ Development Notes

### Fallback Behavior
- If content is not available in the requested locale, the system falls back to English
- Non-translatable fields are always available regardless of locale

### API Response Format
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "question": "What is the capital of France?",
        "optionA": "London",
        "optionB": "Berlin",
        "optionC": "Paris",
        "optionD": "Madrid",
        "correctOption": "C",
        "level": "beginner",
        "baseId": "geo_001",
        "locale": "en",
        "localizations": {
          "data": [
            {
              "id": 2,
              "attributes": {
                "locale": "pt"
              }
            }
          ]
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

### Environment Variables
No additional environment variables are required for i18n functionality.

## 🔍 Troubleshooting

### Common Issues

1. **Content not showing in target language**
   - Ensure the content is published in the target language
   - Check that the locale is properly set when creating content

2. **API returning wrong language**
   - Verify the `locale` parameter in the API request
   - Check that the content exists in the requested locale

3. **Admin interface language switching not working**
   - Clear browser cache
   - Ensure the i18n plugin is properly configured

### Debug Commands
```bash
# Check Strapi logs
npm run develop

# Verify i18n configuration
# Check config/plugins.ts file
```

## 📚 Additional Resources

- [Strapi i18n Documentation](https://docs.strapi.io/dev-docs/plugins/i18n)
- [Strapi API Documentation](https://docs.strapi.io/dev-docs/api/rest)
- [Content Management Guide](https://docs.strapi.io/user-docs/content-manager/introduction)
