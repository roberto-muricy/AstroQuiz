require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');
const axios = require('axios');

// Configuration
const CONFIG = {
  csvFile: path.join(__dirname, 'AstroQuiz Questions - en-translated.csv'),
  strapi: {
    apiUrl: 'http://localhost:1337/api',
    timeout: 30000
  }
};

class FrenchImporter {
  constructor() {
    this.questions = [];
    this.stats = {
      processed: 0,
      successful: 0,
      errors: 0
    };
  }

  async loadCSV() {
    console.log(`[${this.getTimestamp()}] 📖 Loading translated CSV file...`);
    
    if (!fs.existsSync(CONFIG.csvFile)) {
      throw new Error(`CSV file not found: ${CONFIG.csvFile}`);
    }
    
    const csvContent = fs.readFileSync(CONFIG.csvFile, 'utf8');
    
    return new Promise((resolve, reject) => {
      csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) {
          console.error(`[${this.getTimestamp()}] ❌ CSV parsing error:`, err);
          reject(err);
          return;
        }
        
        console.log(`[${this.getTimestamp()}] ✅ Loaded ${records.length} questions from CSV`);
        this.questions = records;
        resolve();
      });
    });
  }

  async importFrenchQuestions() {
    console.log(`[${this.getTimestamp()}] 🇫🇷 Importing French translations...`);
    
    for (const questionData of this.questions) {
      try {
        this.stats.processed++;
        
        // Validate required fields
        if (!questionData.baseId || !questionData.question_fr) {
          console.log(`[${this.getTimestamp()}] ⚠️ Skipping ${questionData.baseId} - missing French translation`);
          continue;
        }
        
        // Clamp level between 1 and 5
        const rawLevel = parseInt(questionData.level) || 1;
        const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);
        
        // Prepare French data for Strapi
        const strapiData = {
          data: {
            baseId: questionData.baseId,
            topic: questionData.topic_fr || questionData.topic || 'General',
            level: clampedLevel,
            question: questionData.question_fr,
            optionA: questionData.optionA_fr || questionData.optionA || 'Option A',
            optionB: questionData.optionB_fr || questionData.optionB || 'Option B',
            optionC: questionData.optionC_fr || questionData.optionC || 'Option C',
            optionD: questionData.optionD_fr || questionData.optionD || 'Option D',
            correctOption: questionData.correctOption || 'A',
            explanation: questionData.explanation_fr || questionData.explanation || 'No explanation provided'
          }
        };
        
        // Create French question
        const response = await axios.post(
          `${CONFIG.strapi.apiUrl}/questions?locale=fr`,
          strapiData,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: CONFIG.strapi.timeout
          }
        );
        
        this.stats.successful++;
        
        if (this.stats.processed % 25 === 0) {
          console.log(`[${this.getTimestamp()}] 📈 Progress: ${this.stats.processed}/${this.questions.length} processed, ${this.stats.successful} successful`);
        }
        
      } catch (error) {
        this.stats.errors++;
        console.error(`[${this.getTimestamp()}] ❌ Error importing French question ${questionData.baseId}:`, error.message);
      }
    }
    
    console.log(`[${this.getTimestamp()}] ✅ French import completed: ${this.stats.successful} questions`);
  }

  getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  async printFinalReport() {
    console.log(`\n[${this.getTimestamp()}] 📊 FRENCH IMPORT REPORT`);
    console.log('='.repeat(50));
    console.log(`📈 Total processed: ${this.stats.processed}`);
    console.log(`✅ Successfully imported: ${this.stats.successful}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    
    const successRate = ((this.stats.successful / this.stats.processed) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Check Strapi admin: http://localhost:1337/admin');
    console.log('   2. Go to Content Manager > Question');
    console.log('   3. Filter by French locale to verify translations');
    console.log('='.repeat(50));
  }
}

async function main() {
  console.log('🇫🇷 Import French Questions from Existing Translations');
  console.log('='.repeat(60));
  
  const importer = new FrenchImporter();
  
  try {
    // Load CSV data
    await importer.loadCSV();
    
    // Import French questions
    await importer.importFrenchQuestions();
    
    // Print final report
    await importer.printFinalReport();
    
    console.log(`\n[${importer.getTimestamp()}] 🎉 French import completed successfully!`);
    
  } catch (error) {
    console.error(`[${importer.getTimestamp()}] 💥 Fatal error:`, error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the importer
main();
