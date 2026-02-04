const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

const questions = [
  {
    baseId: 'astro_00001',
    locales: {
      en: {
        question: 'According to recent theories, what might explain the Fermi Paradox?',
        optionA: 'Tectonic plates are rare',
        optionB: 'Advanced AI becomes the great filter',
        optionC: 'Civilizations destroy themselves',
        optionD: 'All of the above',
        correctOption: 'D',
        explanation: 'Recent theories suggest multiple explanations including rare tectonic plates, AI as a filter, and self-destruction of civilizations.',
        topic: 'Galaxies & Cosmology',
        level: 4,
        questionType: 'text',
      },
      pt: {
        question: 'De acordo com teorias recentes, o que poderia explicar o Paradoxo de Fermi?',
        optionA: 'Placas tectônicas são raras',
        optionB: 'IA avançada se torna o grande filtro',
        optionC: 'As civilizações se destroem sozinhas',
        optionD: 'Todas as alternativas acima',
        correctOption: 'D',
        explanation: 'Teorias recentes sugerem várias explicações, incluindo placas tectônicas raras, IA como filtro e autodestruição das civilizações.',
        topic: 'Galáxias e Cosmologia',
        level: 4,
        questionType: 'text',
      },
      es: {
        question: 'Según teorías recientes, ¿qué podría explicar la paradoja de Fermi?',
        optionA: 'Las placas tectónicas son raras',
        optionB: 'La IA avanzada se convierte en el gran filtro',
        optionC: 'Las civilizaciones se destruyen a sí mismas',
        optionD: 'Todos los anteriores',
        correctOption: 'D',
        explanation: 'Teorías recientes sugieren múltiples explicaciones, entre las que se incluyen placas tectónicas poco comunes, la IA como filtro y la autodestrucción de civilizaciones.',
        topic: 'Galaxias y cosmología',
        level: 4,
        questionType: 'text',
      },
      fr: {
        question: "Selon les théories récentes, qu'est-ce qui pourrait expliquer le paradoxe de Fermi ?",
        optionA: 'Les plaques tectoniques sont rares',
        optionB: "L'IA avancée devient le grand filtre",
        optionC: 'Les civilisations se détruisent elles-mêmes',
        optionD: 'Toutes les réponses ci-dessus',
        correctOption: 'D',
        explanation: "Les théories récentes suggèrent de multiples explications, notamment des plaques tectoniques rares, l'IA en tant que filtre et l'autodestruction des civilisations.",
        topic: 'Galaxies et cosmologie',
        level: 4,
        questionType: 'text',
      },
    },
  },
  {
    baseId: 'astro_00002',
    locales: {
      en: {
        question: 'Approximately how many stars are in the Milky Way galaxy?',
        optionA: '100 million',
        optionB: '1 billion',
        optionC: '100 billion',
        optionD: '1 trillion',
        correctOption: 'C',
        explanation: 'The Milky Way contains an estimated 100-400 billion stars, with 100 billion being a commonly cited figure.',
        topic: 'Galaxies & Cosmology',
        level: 3,
        questionType: 'text',
      },
      pt: {
        question: 'Aproximadamente quantas estrelas existem na galáxia Via Láctea?',
        optionA: '100 milhões',
        optionB: '1 bilhão',
        optionC: '100 bilhões',
        optionD: '1 trilhão',
        correctOption: 'C',
        explanation: 'A Via Láctea contém cerca de 100 a 400 bilhões de estrelas; 100 bilhões é um valor comumente citado.',
        topic: 'Galáxias e Cosmologia',
        level: 3,
        questionType: 'text',
      },
      es: {
        question: '¿Cuántas estrellas hay aproximadamente en la Vía Láctea?',
        optionA: '100 millones',
        optionB: '1.000 millones',
        optionC: '100.000 millones',
        optionD: '1 billón',
        correctOption: 'C',
        explanation: 'Se calcula que la Vía Láctea contiene entre 100.000 y 400.000 millones de estrellas, siendo 100.000 millones la cifra más citada.',
        topic: 'Galaxias y cosmología',
        level: 3,
        questionType: 'text',
      },
      fr: {
        question: "Combien y a-t-il d'étoiles dans la Voie lactée ?",
        optionA: "100 millions d'euros",
        optionB: '1 milliard',
        optionC: "100 milliards d'euros",
        optionD: '1 billion',
        correctOption: 'C',
        explanation: 'La Voie lactée contient environ 100 à 400 milliards d\'étoiles, le chiffre de 100 milliards étant couramment cité.',
        topic: 'Galaxies et cosmologie',
        level: 3,
        questionType: 'text',
      },
    },
  },
];

async function importTwoQuestions() {
  console.log('🚀 Importing 2 test questions (astro_00001 and astro_00002)...');
  console.log('');

  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions/import-v2',
      { questions: questions },
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ Success!');
    console.log('   Imported:', response.data.data.imported, 'questions');
    console.log('   Errors:', response.data.data.errors);
    
    if (response.data.data.errorDetails && response.data.data.errorDetails.length > 0) {
      console.log('');
      console.log('Error details:');
      console.log(JSON.stringify(response.data.data.errorDetails, null, 2));
    }
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }

  console.log('');
  console.log('Check Strapi Content Manager to verify:');
  console.log('  - astro_00001 (Fermi Paradox) - Level 4');
  console.log('  - astro_00002 (Milky Way stars) - Level 3');
  console.log('  - Each question should have 4 locales: EN, PT, ES, FR');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="your-token" node scripts/import-two-questions.js');
  process.exit(1);
}

importTwoQuestions();
