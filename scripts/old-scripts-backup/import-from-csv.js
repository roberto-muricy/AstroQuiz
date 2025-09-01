#!/usr/bin/env node

/**
 * Import translated questions from CSV back to Strapi
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  }
};

class CSVImporter {
  constructor() {
    this.stats = {
      total: 0,
      imported: { pt: 0, es: 0, fr: 0 },
      errors: { pt: 0, es: 0, fr: 0 }
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Read translated CSV file
   */
  readTranslatedCSV(filePath) {
    this.log(`📖 Reading translated CSV file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Translated CSV file not found: ${filePath}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\\n');
    const header = lines[0].split(',');
    
    const data = lines.slice(1).filter(line => line.trim()).map(line => {
      // Simple CSV parsing (assuming quoted fields)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      // Create object from header and values
      const row = {};
      header.forEach((col, index) => {
        row[col.replace(/"/g, '')] = values[index] ? values[index].replace(/"/g, '').replace(/""/g, '"') : '';
      });
      
      return row;
    });
    
    this.stats.total = data.length;
    this.log(`✅ Loaded ${data.length} questions from translated CSV`);
    
    return data;
  }

  /**
   * Create question in Strapi
   */
  async createStrapiQuestion(questionData) {
    try {
      const response = await axios.post(
        `${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`,
        { data: questionData },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      return response.data.data;
    } catch (error) {
      this.log(`❌ Error creating question: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Import questions for one language
   */
  async importLanguage(data, language) {
    this.log(`\\n🌍 Importing ${language.toUpperCase()} questions...`);
    
    let imported = 0;
    let errors = 0;
    
    for (const [index, row] of data.entries()) {
      try {
        // Check if translations exist for this language
        const question = row[`question_${language}`];
        if (!question || !question.trim()) {
          this.log(`   ⚠️ Row ${index + 1}: No ${language} translation, skipping`);
          continue;
        }
        
        // Prepare question data for Strapi
        const questionData = {
          baseId: row.baseId,
          question: row[`question_${language}`],
          optionA: row[`optionA_${language}`],
          optionB: row[`optionB_${language}`],
          optionC: row[`optionC_${language}`],
          optionD: row[`optionD_${language}`],
          explanation: row[`explanation_${language}`],
          topic: row[`topic_${language}`],
          level: parseInt(row.level) || 1,
          correctOption: row.correctOption || 'A',
          locale: language, // Set correct locale
          publishedAt: new Date()
        };
        
        await this.createStrapiQuestion(questionData);
        imported++;
        
        if (imported % 25 === 0) {
          this.log(`   ✅ ${language.toUpperCase()}: ${imported} questions imported...`);
        }
        
        // Small delay to avoid overwhelming the API
        if (imported % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        errors++;
        this.log(`   ❌ Row ${index + 1}: Error importing ${language} question - ${error.message}`);
      }
    }
    
    this.stats.imported[language] = imported;
    this.stats.errors[language] = errors;
    
    this.log(`   ✅ ${language.toUpperCase()} import completed: ${imported} success, ${errors} errors`);
  }

  /**
   * Show import summary
   */
  showSummary() {
    this.log('\\n' + '='.repeat(70));
    this.log('📥 CSV IMPORT COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📊 IMPORT STATS:`);
    this.log(`   Total rows processed: ${this.stats.total}`);
    
    const languages = ['pt', 'es', 'fr'];
    languages.forEach(lang => {
      const imported = this.stats.imported[lang];
      const errors = this.stats.errors[lang];
      this.log(`   ${lang.toUpperCase()}: ${imported} imported, ${errors} errors`);
    });
    
    const totalImported = Object.values(this.stats.imported).reduce((sum, count) => sum + count, 0);
    const totalErrors = Object.values(this.stats.errors).reduce((sum, count) => sum + count, 0);
    
    this.log(`\\n📈 TOTALS:`);
    this.log(`   Questions imported: ${totalImported}`);
    this.log(`   Total errors: ${totalErrors}`);
    
    if (totalErrors === 0) {
      this.log('\\n🎉 PERFECT IMPORT! All translations imported successfully!');
    }
    
    this.log(`\\n💡 VERIFICATION STEPS:`);
    this.log(`   1. Open Strapi admin: http://localhost:1337/admin`);
    this.log(`   2. Go to Content Manager -> Question`);
    this.log(`   3. Check language tabs - you should now see:`);
    this.log(`      - English (en): ~362 questions (original)`);
    this.log(`      - Portuguese (pt): ~${this.stats.imported.pt} questions`);
    this.log(`      - Spanish (es): ~${this.stats.imported.es} questions`);
    this.log(`      - French (fr): ~${this.stats.imported.fr} questions`);
    this.log(`   4. Verify same baseId appears in all language tabs`);
    
    this.log('='.repeat(70));
  }

  /**
   * Run complete import
   */
  async runImport() {
    try {
      const csvFilePath = path.join(__dirname, 'questions-for-translation-translated.csv');
      const data = this.readTranslatedCSV(csvFilePath);
      
      // Import all languages
      for (const language of ['pt', 'es', 'fr']) {
        await this.importLanguage(data, language);
      }
      
      this.showSummary();
      
    } catch (error) {
      this.log(`💥 Import failed: ${error.message}`);
      throw error;
    }
  }
}

// Run import
async function main() {
  const importer = new CSVImporter();
  await importer.runImport();
}

main().catch(console.error);
