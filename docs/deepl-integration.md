# 🌐 DeepL API Integration for Strapi

Complete integration of DeepL API Pro with Strapi CMS for automatic translation of quiz questions.

## 📋 Features

- ✅ **Automatic Translation**: Translate questions to Portuguese, Spanish, and French
- ✅ **Admin Panel Integration**: Auto-translate button in question edit pages
- ✅ **Batch Translation**: Efficient batch processing of multiple fields
- ✅ **Usage Tracking**: Monitor API usage and character count
- ✅ **Error Handling**: Comprehensive error handling and retry logic
- ✅ **Progress Indicators**: Real-time translation progress
- ✅ **Manual Editing**: Edit auto-translations after creation
- ✅ **Rate Limiting**: Built-in rate limiting to respect API limits

## 🚀 Quick Setup

### 1. **Environment Configuration**

Create a `.env` file in your Strapi project root:

```bash
# DeepL API Configuration
DEEPL_API_KEY=your_deepl_api_key_here
DEEPL_API_URL=https://api-free.deepl.com/v2/translate

# Translation Settings
DEEPL_SOURCE_LANG=en
DEEPL_TARGET_LANGS=pt,es,fr
DEEPL_MAX_CHARS_PER_REQUEST=5000
DEEPL_RATE_LIMIT_DELAY=1000

# Usage Tracking
DEEPL_USAGE_TRACKING_ENABLED=true
DEEPL_USAGE_LOG_FILE=./logs/deepl-usage.log
```

### 2. **Install Dependencies**

```bash
npm install axios
```

### 3. **Restart Strapi**

```bash
npm run develop
```

## 🎯 How to Use

### **In the Admin Panel:**

1. **Navigate to Content Manager** → **Question**
2. **Create or edit a question in English**
3. **Click the "Auto-translate" button** in the top-right corner
4. **Confirm translation** in the modal
5. **Wait for completion** - progress bar shows real-time status
6. **Review translations** - switch between languages to see results

### **API Endpoints:**

```bash
# Test DeepL connection
GET /api/deepl/test

# Get usage statistics
GET /api/deepl/usage

# Translate a question
POST /api/deepl/translate/:questionId
{
  "questionData": {
    "question": "What is the largest planet?",
    "optionA": "Earth",
    "optionB": "Mars",
    "optionC": "Jupiter",
    "optionD": "Saturn",
    "explanation": "Jupiter is the largest planet.",
    "topic": "Astronomy"
  }
}

# Get translation progress
GET /api/deepl/progress/:questionId

# Reset usage counters
POST /api/deepl/reset-counters
```

## 🔧 Configuration Options

### **Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPL_API_KEY` | Required | Your DeepL API Pro key |
| `DEEPL_API_URL` | `https://api-free.deepl.com/v2/translate` | DeepL API endpoint |
| `DEEPL_SOURCE_LANG` | `en` | Source language code |
| `DEEPL_TARGET_LANGS` | `pt,es,fr` | Comma-separated target languages |
| `DEEPL_MAX_CHARS_PER_REQUEST` | `5000` | Max characters per API call |
| `DEEPL_RATE_LIMIT_DELAY` | `1000` | Delay between API calls (ms) |
| `DEEPL_USAGE_TRACKING_ENABLED` | `true` | Enable usage tracking |
| `DEEPL_USAGE_LOG_FILE` | `./logs/deepl-usage.log` | Usage log file path |

### **Supported Languages:**

- **Source**: English (EN)
- **Targets**: Portuguese (PT), Spanish (ES), French (FR)

## 📊 Usage Monitoring

### **Admin Panel Statistics:**

Access usage statistics in **Settings** → **Global Settings** → **DeepL Usage**:

- **Current Session**: Characters translated and API calls made
- **DeepL API Usage**: Official API usage from DeepL
- **Usage by Language**: Breakdown by target language
- **Usage by Date**: Historical usage data

### **Log Files:**

Usage data is logged to `./logs/deepl-usage.log` with detailed information:

```json
{
  "timestamp": "2025-08-26T16:30:00.000Z",
  "characters": 150,
  "targetLang": "pt",
  "totalCharacters": 1500,
  "apiCalls": 3
}
```

## 🔄 Translation Process

### **Fields Translated:**
- ✅ `question` - Main question text
- ✅ `optionA`, `optionB`, `optionC`, `optionD` - Answer options
- ✅ `explanation` - Detailed explanation
- ✅ `topic` - Question topic/category

### **Fields Preserved:**
- ❌ `baseId` - Unique identifier
- ❌ `level` - Difficulty level
- ❌ `correctOption` - Correct answer
- ❌ `language` - Language field

### **Translation Flow:**

1. **Extract English content** from question
2. **Batch translate** all fields to target languages
3. **Create localized versions** in Strapi
4. **Link translations** to original question
5. **Publish translations** automatically

## 🛠️ Error Handling

### **Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `DeepL API key not configured` | Missing API key | Set `DEEPL_API_KEY` in `.env` |
| `Translation failed` | API error | Check API key and network |
| `Translation timeout` | Long processing | Increase timeout or retry |
| `Question not found` | Invalid question ID | Check question exists |

### **Retry Logic:**

- **Automatic retries** for network errors
- **Rate limiting** to respect API limits
- **Graceful degradation** for partial failures

## 🔒 Security Considerations

### **API Key Security:**
- Store API key in environment variables
- Never commit API keys to version control
- Use different keys for development/production

### **Rate Limiting:**
- Built-in delays between API calls
- Respect DeepL API rate limits
- Monitor usage to avoid quota exceeded

## 📈 Performance Optimization

### **Batch Translation:**
- Multiple fields translated in single API call
- Reduces API calls and improves speed
- Configurable batch sizes

### **Caching:**
- Translation results cached in Strapi
- Avoid re-translating unchanged content
- Manual refresh available

## 🧪 Testing

### **Test API Connection:**

```bash
curl http://localhost:1337/api/deepl/test
```

### **Test Translation:**

```bash
curl -X POST http://localhost:1337/api/deepl/translate/1 \
  -H "Content-Type: application/json" \
  -d '{
    "questionData": {
      "question": "What is the capital of France?",
      "optionA": "London",
      "optionB": "Berlin", 
      "optionC": "Paris",
      "optionD": "Madrid",
      "explanation": "Paris is the capital of France.",
      "topic": "Geography"
    }
  }'
```

## 🚨 Troubleshooting

### **Translation Not Working:**
1. Check API key is valid
2. Verify network connectivity
3. Check DeepL API status
4. Review error logs

### **Slow Performance:**
1. Reduce batch size
2. Increase rate limit delay
3. Check network latency
4. Monitor API usage

### **Missing Translations:**
1. Verify question exists
2. Check field permissions
3. Review translation logs
4. Manually retry translation

## 📝 API Reference

### **DeepLService Methods:**

```javascript
// Initialize service
await deeplService.init()

// Test connection
await deeplService.testConnection()

// Get usage
await deeplService.getUsage()

// Translate text
await deeplService.translateText(text, targetLang)

// Batch translate
await deeplService.batchTranslate(texts, targetLang)

// Translate question
await deeplService.translateQuestion(questionData)

// Get usage stats
await deeplService.getUsageStats()
```

## 🎉 Success!

Your Strapi CMS now has complete DeepL API integration for automatic translation of quiz questions! 

**Next Steps:**
1. Test the integration with a sample question
2. Monitor usage statistics
3. Customize translation settings as needed
4. Scale up for production use

---

**Need Help?** Check the logs in `./logs/deepl-usage.log` for detailed information about translation operations.
