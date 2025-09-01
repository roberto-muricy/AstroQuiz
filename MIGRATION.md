# Firebase to Strapi Migration Guide

This guide will help you migrate 362 quiz questions from Firebase Firestore to your new Strapi CMS setup.

## 🎯 Overview

The migration system includes:
- **Complete data transfer** from Firebase Firestore to Strapi
- **i18n support** with English as master language
- **Automatic localization** creation for PT, ES, FR
- **Data validation** and error handling
- **Progress tracking** and detailed reporting
- **Batch processing** to avoid rate limits
- **Comprehensive logging** for debugging

## 📋 Prerequisites

1. **Firebase Setup**:
   - Firebase project with Firestore database
   - Service account key with Firestore read permissions
   - Questions stored in `questions` collection

2. **Strapi Setup**:
   - Strapi running on `http://localhost:1337`
   - Question content type created with i18n enabled
   - All required permissions configured

3. **Dependencies**:
   - `firebase-admin` (already installed)
   - `axios` (already installed)

## 🚀 Quick Start

### Step 1: Setup Migration
```bash
npm run migration:setup
```
This interactive setup will:
- Guide you through Firebase configuration
- Test Strapi connection
- Update configuration files

### Step 2: Get Firebase Service Account
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate new private key"**
5. Save the file as `firebase-service-account.json` in the project root

### Step 3: Test Migration (Recommended)
```bash
# Dry run - validation only, no data changes
npm run migration:dry-run

# Test with small sample (5 question groups)
npm run migration:test
```

### Step 4: Run Full Migration
```bash
npm run migration:run
```

## 📊 Migration Process

### Data Flow
```
Firebase Firestore → Validation → Grouping → Strapi Creation
     362 questions → Check data → By baseId → Master + Localizations
```

### Question Processing
1. **Fetch** all questions from Firebase `questions` collection
2. **Group** questions by `baseId` (each baseId = 1 concept in 4 languages)
3. **Identify master** question (English preferred, fallback to ES/PT/FR)
4. **Validate** data integrity and required fields
5. **Create master** question in Strapi with detected language
6. **Create localizations** for remaining languages
7. **Log results** and generate detailed report

### Language Handling
- **Master Language**: English (`en`) preferred
- **Fallback Priority**: Spanish (`es`) → Portuguese (`pt`) → French (`fr`)
- **Automatic Detection**: Maps Firebase `language` field to Strapi locales
- **Missing Translations**: Gracefully handled, not blocking

## 🔧 Configuration

The migration can be customized by editing `scripts/migrate-from-firebase.js`:

```javascript
const CONFIG = {
  firebase: {
    serviceAccountPath: './firebase-service-account.json',
    databaseURL: 'https://your-project.firebaseio.com'
  },
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: { questions: '/api/questions' }
  },
  migration: {
    batchSize: 10,           // Questions processed in parallel
    delayBetweenBatches: 1000, // ms delay between batches
    maxRetries: 3            // Retry failed requests
  }
};
```

## 📈 Progress Tracking

During migration, you'll see:
```
🔄 Processing group: q0001 (4 questions)
📝 Creating master question (es): De acuerdo con teorías recientes...
✅ Master question created with ID: 123
🌍 Creating localization (en): According to recent theories...
✅ Localization created (en) with ID: 124
📊 Progress: 45/362 groups (12%)
```

## 📄 Reports and Logs

After migration, you'll get:

### 1. Console Summary
```
📊 MIGRATION SUMMARY
⏱️  Duration: 180s
📥 Total Firebase Questions: 1448
🗂️  Question Groups Processed: 362
✅ Successful Migrations: 360
❌ Failed Migrations: 2
📈 Success Rate: 99%
```

### 2. Detailed Report (`migration-report.json`)
```json
{
  "migration": {
    "startTime": "2025-08-27T18:00:00.000Z",
    "endTime": "2025-08-27T18:03:00.000Z",
    "duration": 180000,
    "successRate": 99
  },
  "results": [...],
  "errors": [...],
  "config": {...}
}
```

### 3. Detailed Logs (`migration-log.txt`)
Complete timestamped log of all operations.

## 🛠️ Troubleshooting

### Common Issues

#### 1. Firebase Connection Failed
```
❌ Firebase initialization failed: service account file not found
```
**Solution**: Ensure `firebase-service-account.json` exists and has correct Firebase credentials.

#### 2. Strapi Connection Failed  
```
❌ Strapi connection failed: connect ECONNREFUSED
```
**Solution**: Start Strapi with `npm run develop` and ensure it's running on port 1337.

#### 3. Permission Denied
```
❌ Translation failed: 403 Forbidden
```
**Solution**: Configure Strapi permissions for Question content type (create, update permissions for Public role).

#### 4. Invalid Data
```
❌ Master question validation failed: Missing required field: baseId
```
**Solution**: Check Firebase data structure. All questions must have required fields.

### Data Validation Rules

Questions must have:
- `baseId` (string): Unique identifier
- `question` (string): Question text
- `optionA`, `optionB`, `optionC`, `optionD` (strings): Answer options
- `correctOption` (string): Must be 'A', 'B', 'C', or 'D'
- `level` (number): Must be 1-5
- `language` (string): Must be 'en', 'pt', 'es', or 'fr'

## 🔄 Re-running Migration

If migration fails or you need to re-run:

1. **Clean Strapi data** (if needed):
   ```bash
   # Delete all questions from Strapi admin panel
   # Or use Strapi console to bulk delete
   ```

2. **Re-run migration**:
   ```bash
   npm run migration:run
   ```

The migration script handles duplicates gracefully and will update existing questions.

## 📞 Support

If you encounter issues:

1. Check the detailed logs in `migration-log.txt`
2. Review the migration report in `migration-report.json`
3. Run dry-run to validate data: `npm run migration:dry-run`
4. Test with small sample: `npm run migration:test`

## 🎉 Post-Migration

After successful migration:

1. **Verify data** in Strapi admin panel
2. **Test i18n functionality** (switch between languages)
3. **Test DeepL translation** on new questions
4. **Backup your Strapi database**

Your quiz system is now ready with all 362 questions properly migrated and localized! 🚀
