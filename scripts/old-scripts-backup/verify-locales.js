#!/usr/bin/env node

/**
 * Verify locale distribution and show samples
 */

const axios = require('axios');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  }
};

async function verifyLocales() {
  try {
    console.log('🔍 Verificando distribuição de locales...\n');
    
    // Get sample questions to understand the structure
    const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
      params: {
        'pagination[limit]': 10,
        'sort': 'id:desc'
      }
    });
    
    const questions = response.data.data;
    const total = response.data.meta.pagination.total;
    
    console.log(`📊 Total de perguntas: ${total}\n`);
    console.log('🔍 Amostra das últimas 10 perguntas:');
    console.log('='.repeat(80));
    
    questions.forEach((q, index) => {
      const questionText = q.question ? q.question.substring(0, 60) + '...' : 'N/A';
      console.log(`${index + 1}. ID: ${q.id} | Locale: ${q.locale} | Question: ${questionText}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Check locale counts
    const locales = ['en', 'pt', 'es', 'fr'];
    const counts = {};
    
    console.log('\n📈 Contagem por locale:');
    
    for (const locale of locales) {
      try {
        const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
          params: {
            'locale': locale,
            'pagination[limit]': 1
          }
        });
        counts[locale] = response.data.meta.pagination.total;
        console.log(`   ${locale.toUpperCase()}: ${counts[locale]} perguntas`);
      } catch (error) {
        counts[locale] = 0;
        console.log(`   ${locale.toUpperCase()}: 0 perguntas (erro: ${error.message})`);
      }
    }
    
    const totalByLocale = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`\n📊 Total por locale: ${totalByLocale}`);
    
    // Show samples from each locale
    console.log('\n🔍 Amostras por locale:');
    console.log('='.repeat(80));
    
    for (const locale of locales) {
      if (counts[locale] > 0) {
        try {
          const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
            params: {
              'locale': locale,
              'pagination[limit]': 2
            }
          });
          
          const samples = response.data.data;
          console.log(`\n${locale.toUpperCase()} (${counts[locale]} perguntas):`);
          
          samples.forEach((q, index) => {
            const questionText = q.question ? q.question.substring(0, 60) + '...' : 'N/A';
            console.log(`  ${index + 1}. ID: ${q.id} | ${questionText}`);
          });
        } catch (error) {
          console.log(`\n${locale.toUpperCase()}: Erro ao buscar amostras`);
        }
      } else {
        console.log(`\n${locale.toUpperCase()}: Nenhuma pergunta encontrada`);
      }
    }
    
    // Analysis
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANÁLISE:');
    
    if (counts.en === 362 && counts.pt === 362 && counts.es === 362 && counts.fr === 362) {
      console.log('✅ PERFEITO! Distribuição correta: 362 perguntas por idioma');
    } else if (totalByLocale === 1448) {
      console.log('⚠️ Total correto (1448), mas distribuição incorreta por locale');
      console.log('💡 Algumas perguntas podem estar com locale errado');
    } else {
      console.log('❌ Total incorreto. Esperado: 1448, Atual: ' + totalByLocale);
      console.log('💡 Problemas na migração ou limpeza');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

verifyLocales();
