# 🧪 AstroQuiz API Testing & Development Scripts

This directory contains all the essential scripts for testing, validating, and working with the AstroQuiz Strapi API.

## 📁 Directory Structure

```
scripts/
├── README.md                    # This file
├── api.test.js                 # Comprehensive API test suite
├── performance.test.js         # Performance and load testing
├── api-collection.json         # Postman/Thunder Client collection
├── test-setup.js              # Jest test configuration
├── csv-import-with-deepl.js    # Main data import script
├── clean-everything.js         # Database cleanup utility
├── resume-translations.js      # Resume interrupted translations
├── cleanup-old-scripts.js      # Script organization utility
└── old-scripts-backup/        # Archive of old development scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install testing dependencies
npm install

# Or install specific packages
npm install --save-dev jest supertest @types/jest
npm install --save axios
```

### 2. Start Strapi

```bash
# Make sure Strapi is running
npm run develop
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Test Suites

### 🧪 API Test Suite (`api.test.js`)

Comprehensive functional testing of all API endpoints.

**What it tests:**
- ✅ Basic connectivity and health checks
- ✅ CRUD operations on questions
- ✅ Filtering and pagination
- ✅ Localization (EN, PT, ES, FR)
- ✅ Data validation and schema compliance
- ✅ Error handling and edge cases
- ✅ DeepL translation integration
- ✅ Cross-language consistency

**Run it:**
```bash
npm run test:api
# or
jest scripts/api.test.js
```

**Example output:**
```
🚀 AstroQuiz API Test Suite
  ✓ should connect to Strapi API (245ms)
  ✓ should have questions in database (156ms)
  ✓ should get all questions with default pagination (198ms)
  ✓ should filter questions by level (234ms)
  ✓ should get questions in pt locale (187ms)
  
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
```

### ⚡ Performance Test Suite (`performance.test.js`)

Load testing and performance benchmarking.

**What it tests:**
- 🚀 Response time benchmarks
- 📈 Pagination performance
- 🌍 Localization overhead
- 🔥 Concurrent request handling
- 💾 Memory usage patterns
- 🔍 Query optimization
- 🚨 Stress testing

**Run it:**
```bash
npm run test:performance
# or
jest scripts/performance.test.js
```

**Example output:**
```
⚡ AstroQuiz API Performance Tests
  ✓ GET /questions should respond within acceptable time (156ms)
  ✓ Should handle moderate concurrent load (2.3s)
  
📊 PERFORMANCE TEST SUMMARY
==================================================
Total Requests: 156
Successful: 154
Failed: 2
Average Response Time: 234.56ms
95th Percentile: 456.78ms
==================================================
```

## 🛠️ Development Scripts

### 📥 Data Import (`csv-import-with-deepl.js`)

Main script for importing quiz questions with automatic translation.

**Features:**
- ✅ CSV parsing and validation
- ✅ English master question creation
- ✅ Automatic DeepL translation to PT/ES/FR
- ✅ Progress tracking and checkpointing
- ✅ Error handling and recovery
- ✅ Quota management

**Usage:**
```bash
# Make sure DEEPL_API_KEY is set in .env
node scripts/csv-import-with-deepl.js

# Check progress
cat scripts/import-checkpoint.json
```

### 🧹 Database Cleanup (`clean-everything.js`)

Utility to remove all questions from Strapi.

**Usage:**
```bash
# ⚠️  WARNING: This deletes ALL questions!
node scripts/clean-everything.js

# Confirm when prompted
```

### 🔄 Resume Translations (`resume-translations.js`)

Continue interrupted translation processes.

**Usage:**
```bash
# Resume from checkpoint
node scripts/resume-translations.js

# Only runs if checkpoint exists
```

### 🗂️ Script Cleanup (`cleanup-old-scripts.js`)

Organize and archive old development scripts.

**Usage:**
```bash
node scripts/cleanup-old-scripts.js
```

## 🧰 Testing Tools

### Postman/Thunder Client Collection (`api-collection.json`)

Complete API collection for manual testing.

**Import into:**
- **Postman**: File → Import → `api-collection.json`
- **Thunder Client**: Collections → Import → Select file
- **Insomnia**: Import → From file

**Includes:**
- 📝 All question endpoints
- 🌍 Localization tests
- 🔧 DeepL translation tests
- ❌ Error handling tests
- ⚡ Performance tests
- 🔍 Complex filtering examples

**Variables:**
- `baseURL`: `http://localhost:1337`
- `locale`: `en` (change to `pt`, `es`, `fr`)
- `questionId`: Auto-populated from first request

### Jest Configuration (`test-setup.js`)

Global test setup and utilities.

**Provides:**
- 🌐 Global API endpoints
- 🧪 Mock data for testing
- 🔧 Helper functions
- ⏱️ Timeout configuration
- 🏥 Health check utilities

## 📋 Test Scenarios

### Basic API Testing
```bash
# Test all core functionality
npm run test:api

# Expected: All tests pass, ~25 test cases
# Time: ~30-60 seconds
```

### Performance Benchmarking
```bash
# Benchmark response times and load handling
npm run test:performance

# Expected: Performance metrics within acceptable ranges
# Time: ~2-5 minutes
```

### Manual API Testing
```bash
# Import collection into Postman/Thunder Client
# Run individual requests or entire collection
# Check variable auto-population
```

### Data Import Testing
```bash
# Test CSV import (requires sample data)
cp "AstroQuiz Questions - en.csv" quiz-cms/
node scripts/csv-import-with-deepl.js

# Expected: Questions imported and translated
# Time: Depends on DeepL quota and question count
```

## 🚨 Troubleshooting

### Common Issues

**1. Tests failing with connection errors**
```bash
# Make sure Strapi is running
npm run develop

# Check if accessible
curl http://localhost:1337/api/questions?pagination[pageSize]=1
```

**2. DeepL API errors**
```bash
# Check API key in .env
echo $DEEPL_API_KEY

# Test DeepL connection
node -e "console.log(process.env.DEEPL_API_KEY ? 'API key found' : 'API key missing')"
```

**3. Performance tests timing out**
```bash
# Increase Jest timeout
jest --testTimeout=60000 scripts/performance.test.js
```

**4. Import script stuck**
```bash
# Check checkpoint file
cat scripts/import-checkpoint.json

# Resume from checkpoint
node scripts/resume-translations.js
```

### Debug Mode

**Enable verbose logging:**
```bash
# For API tests
DEBUG=true npm run test:api

# For performance tests  
VERBOSE=true npm run test:performance

# For import scripts
DEBUG=true node scripts/csv-import-with-deepl.js
```

## 📈 Success Metrics

### API Tests
- ✅ **100% test pass rate**
- ✅ **Response times < 1000ms** for basic queries
- ✅ **All locales working** (EN, PT, ES, FR)
- ✅ **Filtering and pagination** functional
- ✅ **Error handling** robust

### Performance Tests
- ✅ **Average response time < 500ms**
- ✅ **95th percentile < 1000ms**
- ✅ **Concurrent requests** handled gracefully
- ✅ **Memory usage** within reasonable bounds
- ✅ **Load testing** passes with 80%+ success rate

### Data Import
- ✅ **All questions imported** successfully
- ✅ **All languages translated** (PT, ES, FR)
- ✅ **Localization links** working correctly
- ✅ **Data integrity** maintained
- ✅ **Error recovery** functional

## 🎯 Next Steps

1. **Run full test suite** to validate API
2. **Import your question data** using CSV script
3. **Benchmark performance** with your data volume
4. **Test frontend integration** using API client
5. **Set up CI/CD pipeline** with these tests

## 📞 Support

If you encounter issues:

1. **Check Strapi logs**: `npm run develop` console output
2. **Review test output**: Look for specific error messages
3. **Validate environment**: API keys, database connection
4. **Check documentation**: `/docs/api-documentation.md`
5. **Use examples**: `/docs/usage-examples.md`

---

**Happy Testing! 🚀**