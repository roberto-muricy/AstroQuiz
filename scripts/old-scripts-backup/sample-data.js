/**
 * Sample data script for multilingual quiz questions
 * Run this script to populate the database with sample questions in all languages
 */

const sampleQuestions = [
  {
    baseId: 'astro_001',
    level: 'beginner',
    correctOption: 'C',
    translations: {
      en: {
        question: 'What is the largest planet in our solar system?',
        optionA: 'Earth',
        optionB: 'Mars',
        optionC: 'Jupiter',
        optionD: 'Saturn',
        explanation: 'Jupiter is the largest planet in our solar system, with a mass more than twice that of Saturn.',
        topic: 'astronomy'
      },
      pt: {
        question: 'Qual é o maior planeta do nosso sistema solar?',
        optionA: 'Terra',
        optionB: 'Marte',
        optionC: 'Júpiter',
        optionD: 'Saturno',
        explanation: 'Júpiter é o maior planeta do nosso sistema solar, com uma massa mais de duas vezes maior que Saturno.',
        topic: 'astronomia'
      },
      es: {
        question: '¿Cuál es el planeta más grande de nuestro sistema solar?',
        optionA: 'Tierra',
        optionB: 'Marte',
        optionC: 'Júpiter',
        optionD: 'Saturno',
        explanation: 'Júpiter es el planeta más grande de nuestro sistema solar, con una masa más del doble que Saturno.',
        topic: 'astronomía'
      },
      fr: {
        question: 'Quelle est la plus grande planète de notre système solaire ?',
        optionA: 'Terre',
        optionB: 'Mars',
        optionC: 'Jupiter',
        optionD: 'Saturne',
        explanation: 'Jupiter est la plus grande planète de notre système solaire, avec une masse plus de deux fois supérieure à celle de Saturne.',
        topic: 'astronomie'
      }
    }
  },
  {
    baseId: 'geo_001',
    level: 'beginner',
    correctOption: 'C',
    translations: {
      en: {
        question: 'What is the capital of France?',
        optionA: 'London',
        optionB: 'Berlin',
        optionC: 'Paris',
        optionD: 'Madrid',
        explanation: 'Paris is the capital and largest city of France.',
        topic: 'geography'
      },
      pt: {
        question: 'Qual é a capital da França?',
        optionA: 'Londres',
        optionB: 'Berlim',
        optionC: 'Paris',
        optionD: 'Madri',
        explanation: 'Paris é a capital e maior cidade da França.',
        topic: 'geografia'
      },
      es: {
        question: '¿Cuál es la capital de Francia?',
        optionA: 'Londres',
        optionB: 'Berlín',
        optionC: 'París',
        optionD: 'Madrid',
        explanation: 'París es la capital y ciudad más grande de Francia.',
        topic: 'geografía'
      },
      fr: {
        question: 'Quelle est la capitale de la France ?',
        optionA: 'Londres',
        optionB: 'Berlin',
        optionC: 'Paris',
        optionD: 'Madrid',
        explanation: 'Paris est la capitale et la plus grande ville de France.',
        topic: 'géographie'
      }
    }
  },
  {
    baseId: 'hist_001',
    level: 'intermediate',
    correctOption: 'A',
    translations: {
      en: {
        question: 'In which year did World War II end?',
        optionA: '1945',
        optionB: '1944',
        optionC: '1946',
        optionD: '1943',
        explanation: 'World War II ended in 1945 with the surrender of Germany in May and Japan in September.',
        topic: 'history'
      },
      pt: {
        question: 'Em que ano terminou a Segunda Guerra Mundial?',
        optionA: '1945',
        optionB: '1944',
        optionC: '1946',
        optionD: '1943',
        explanation: 'A Segunda Guerra Mundial terminou em 1945 com a rendição da Alemanha em maio e do Japão em setembro.',
        topic: 'história'
      },
      es: {
        question: '¿En qué año terminó la Segunda Guerra Mundial?',
        optionA: '1945',
        optionB: '1944',
        optionC: '1946',
        optionD: '1943',
        explanation: 'La Segunda Guerra Mundial terminó en 1945 con la rendición de Alemania en mayo y Japón en septiembre.',
        topic: 'historia'
      },
      fr: {
        question: 'En quelle année s\'est terminée la Seconde Guerre mondiale ?',
        optionA: '1945',
        optionB: '1944',
        optionC: '1946',
        optionD: '1943',
        explanation: 'La Seconde Guerre mondiale s\'est terminée en 1945 avec la reddition de l\'Allemagne en mai et du Japon en septembre.',
        topic: 'histoire'
      }
    }
  },
  {
    baseId: 'sci_001',
    level: 'advanced',
    correctOption: 'B',
    translations: {
      en: {
        question: 'What is the chemical symbol for gold?',
        optionA: 'Ag',
        optionB: 'Au',
        optionC: 'Fe',
        optionD: 'Cu',
        explanation: 'Au comes from the Latin word for gold, "aurum".',
        topic: 'chemistry'
      },
      pt: {
        question: 'Qual é o símbolo químico do ouro?',
        optionA: 'Ag',
        optionB: 'Au',
        optionC: 'Fe',
        optionD: 'Cu',
        explanation: 'Au vem da palavra latina para ouro, "aurum".',
        topic: 'química'
      },
      es: {
        question: '¿Cuál es el símbolo químico del oro?',
        optionA: 'Ag',
        optionB: 'Au',
        optionC: 'Fe',
        optionD: 'Cu',
        explanation: 'Au proviene de la palabra latina para oro, "aurum".',
        topic: 'química'
      },
      fr: {
        question: 'Quel est le symbole chimique de l\'or ?',
        optionA: 'Ag',
        optionB: 'Au',
        optionC: 'Fe',
        optionD: 'Cu',
        explanation: 'Au vient du mot latin pour or, "aurum".',
        topic: 'chimie'
      }
    }
  }
];

module.exports = {
  sampleQuestions
};
