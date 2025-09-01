#!/usr/bin/env node

/**
 * Export English questions from Strapi to CSV for translation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  }
};

class CSVExporter {
  constructor() {
    this.questions = [];
    this.stats = {
      total: 0,
      exported: 0
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Fetch all English questions from Strapi
   */
  async fetchEnglishQuestions() {
    this.log('📥 Fetching English questions from Strapi...');
    
    let allQuestions = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
          params: {
            'pagination[page]': page,
            'pagination[pageSize]': 100,
            'locale': 'en'  // Only English questions
          }
        });
        
        const questions = response.data.data;
        allQuestions.push(...questions);
        
        if (questions.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
        
        this.log(`📥 Fetched ${allQuestions.length} English questions...`);
      } catch (error) {
        this.log(`❌ Error fetching questions: ${error.message}`);
        hasMore = false;
      }
    }
    
    this.questions = allQuestions;
    this.stats.total = allQuestions.length;
    
    this.log(`✅ Total English questions: ${this.stats.total}`);
    return allQuestions;
  }

  /**
   * Convert questions to CSV format
   */
  convertToCSV() {
    this.log('📝 Converting to CSV format...');
    
    // CSV Header
    const csvHeader = [
      'baseId',
      'documentId',
      'strapiId',
      'question_en',
      'optionA_en',
      'optionB_en',
      'optionC_en',
      'optionD_en',
      'explanation_en',
      'topic_en',
      'question_pt',
      'optionA_pt',
      'optionB_pt',
      'optionC_pt',
      'optionD_pt',
      'explanation_pt',
      'topic_pt',
      'question_es',
      'optionA_es',
      'optionB_es',
      'optionC_es',
      'optionD_es',
      'explanation_es',
      'topic_es',
      'question_fr',
      'optionA_fr',
      'optionB_fr',
      'optionC_fr',
      'optionD_fr',
      'explanation_fr',
      'topic_fr',
      'level',
      'correctOption'
    ].join(',');
    
    // CSV Rows
    const csvRows = this.questions.map(question => {
      const attrs = question.attributes || question;
      
      // Escape commas and quotes in text
      const escapeCSV = (text) => {
        if (!text) return '';
        const escaped = text.replace(/"/g, '""'); // Escape quotes
        return `"${escaped}"`; // Wrap in quotes
      };
      
      return [
        attrs.baseId || '',
        attrs.documentId || question.documentId || '',
        question.id || '',
        escapeCSV(attrs.question),
        escapeCSV(attrs.optionA),
        escapeCSV(attrs.optionB),
        escapeCSV(attrs.optionC),
        escapeCSV(attrs.optionD),
        escapeCSV(attrs.explanation),
        escapeCSV(attrs.topic),
        '', // question_pt (empty for translation)
        '', // optionA_pt (empty for translation)
        '', // optionB_pt (empty for translation)
        '', // optionC_pt (empty for translation)
        '', // optionD_pt (empty for translation)
        '', // explanation_pt (empty for translation)
        '', // topic_pt (empty for translation)
        '', // question_es (empty for translation)
        '', // optionA_es (empty for translation)
        '', // optionB_es (empty for translation)
        '', // optionC_es (empty for translation)
        '', // optionD_es (empty for translation)
        '', // explanation_es (empty for translation)
        '', // topic_es (empty for translation)
        '', // question_fr (empty for translation)
        '', // optionA_fr (empty for translation)
        '', // optionB_fr (empty for translation)
        '', // optionC_fr (empty for translation)
        '', // optionD_fr (empty for translation)
        '', // explanation_fr (empty for translation)
        '', // topic_fr (empty for translation)
        attrs.level || 1,
        attrs.correctOption || 'A'
      ].join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\\n');
    return csvContent;
  }

  /**
   * Save CSV to file
   */
  saveCSV(csvContent) {
    const filePath = path.join(__dirname, 'questions-for-translation.csv');
    
    try {
      fs.writeFileSync(filePath, csvContent, 'utf8');
      this.stats.exported = this.questions.length;
      
      this.log(`✅ CSV exported to: ${filePath}`);
      this.log(`📊 ${this.stats.exported} questions ready for translation`);
      
      return filePath;
    } catch (error) {
      this.log(`❌ Error saving CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show export summary
   */
  showSummary(filePath) {
    this.log('\\n' + '='.repeat(70));
    this.log('📊 CSV EXPORT COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📥 STRAPI QUESTIONS:`);
    this.log(`   English questions fetched: ${this.stats.total}`);
    this.log(`   Questions exported to CSV: ${this.stats.exported}`);
    
    this.log(`\\n📄 CSV FILE:`);
    this.log(`   File path: ${filePath}`);
    this.log(`   Columns: 33 (baseId, IDs, EN fields, empty PT/ES/FR fields, level, correctOption)`);
    
    this.log(`\\n💡 NEXT STEPS:`);
    this.log(`   1. Open the CSV file in Excel/Google Sheets`);
    this.log(`   2. Use DeepL or Google Translate to fill the empty PT/ES/FR columns:`);
    this.log(`      - question_pt, optionA_pt, optionB_pt, optionC_pt, optionD_pt, explanation_pt, topic_pt`);
    this.log(`      - question_es, optionA_es, optionB_es, optionC_es, optionD_es, explanation_es, topic_es`);
    this.log(`      - question_fr, optionA_fr, optionB_fr, optionC_fr, optionD_fr, explanation_fr, topic_fr`);
    this.log(`   3. Save the translated CSV`);
    this.log(`   4. Run the import script to create PT/ES/FR questions in Strapi`);
    
    this.log('='.repeat(70));
  }

  /**
   * Run complete export
   */
  async runExport() {
    try {
      await this.fetchEnglishQuestions();
      const csvContent = this.convertToCSV();
      const filePath = this.saveCSV(csvContent);
      this.showSummary(filePath);
      
    } catch (error) {
      this.log(`💥 Export failed: ${error.message}`);
      throw error;
    }
  }
}

// Run export
async function main() {
  const exporter = new CSVExporter();
  await exporter.runExport();
}

main().catch(console.error);
