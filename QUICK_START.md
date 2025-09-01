# 🚀 Quick Start Guide - Multilingual Quiz System

Get your multilingual quiz system up and running in minutes!

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
cd quiz-cms
npm install
```

### 2. Start the Development Server
```bash
npm run develop
```

### 3. Access the Admin Panel
- Open: http://localhost:1337/admin
- Create your first admin user
- Navigate to Content Manager → Question

### 4. Sample Data
The system automatically populates with sample questions in all 4 languages:
- English (en) - Master language
- Portuguese (pt)
- Spanish (es)
- French (fr)

## 🌍 Language Switching

### In Admin Panel
1. Look for the language selector in the top-right corner
2. Click to switch between languages
3. Create/edit content in each language
4. Use the "Localizations" tab to link translations

### Via API
```bash
# Get questions in different languages
curl http://localhost:1337/api/questions?locale=en
curl http://localhost:1337/api/questions?locale=pt
curl http://localhost:1337/api/questions?locale=es
curl http://localhost:1337/api/questions?locale=fr
```

## 🧪 Test the System

### Run API Tests
```bash
cd quiz-cms
node scripts/test-api.js
```

### Manual Testing
1. Visit http://localhost:1337/admin
2. Go to Content Manager → Question
3. Switch languages using the selector
4. Verify content appears in the correct language

## 📊 Sample Questions Included

The system comes with 4 sample questions in all languages:

1. **Astronomy** - "What is the largest planet in our solar system?"
2. **Geography** - "What is the capital of France?"
3. **History** - "In which year did World War II end?"
4. **Chemistry** - "What is the chemical symbol for gold?"

## 🔧 Content Management

### Creating New Questions
1. Switch to English (master language)
2. Create a new question
3. Fill in all required fields
4. Set a unique `baseId`
5. Publish the question

### Adding Translations
1. Switch to target language (pt, es, fr)
2. Create new entry or edit existing
3. Link to the master English entry
4. Translate only the translatable fields:
   - `question`
   - `optionA`, `optionB`, `optionC`, `optionD`
   - `explanation`
   - `topic`
5. Keep non-translatable fields the same:
   - `baseId`
   - `level`
   - `correctOption`

## 📡 API Endpoints

### Standard Endpoints
```bash
# Get all questions (default: English)
GET /api/questions

# Get questions by locale
GET /api/questions?locale=pt

# Get specific question
GET /api/questions/:id?locale=es
```

### Custom i18n Endpoints
```bash
# Get questions by locale
GET /api/questions/locale/pt

# Get questions with fallback
GET /api/questions/fallback/es

# Get questions by level and locale
GET /api/questions/level/beginner/en

# Get questions by topic and locale
GET /api/questions/topic/astronomy/fr
```

## 🎯 Next Steps

1. **Add more questions** in all languages
2. **Create categories/topics** for better organization
3. **Build the mobile app** to consume the API
4. **Add user authentication** and progress tracking
5. **Implement scoring system** and leaderboards

## 🆘 Troubleshooting

### Common Issues
- **Content not showing**: Ensure it's published in the target language
- **API errors**: Check that the locale parameter is correct
- **Admin issues**: Clear browser cache and restart the server

### Get Help
- Check the full documentation: `docs/i18n-setup.md`
- Review the API documentation in the admin panel
- Check Strapi logs for detailed error messages

---

🎉 **You're all set!** Your multilingual quiz system is ready to use.
