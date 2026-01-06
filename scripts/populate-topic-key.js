#!/usr/bin/env node
/**
 * Popula o campo topicKey baseado no campo topic traduzido
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');

// Mapeamento de todos os valores traduzidos para o topicKey em inglês
const TOPIC_MAPPING = {
  // Galaxies & Cosmology
  'Galaxies & Cosmology': 'Galaxies & Cosmology',
  'Galáxias e Cosmologia': 'Galaxies & Cosmology',
  'Galaxias y Cosmología': 'Galaxies & Cosmology',
  'Galaxias y cosmología': 'Galaxies & Cosmology',
  'Galaxies et Cosmologie': 'Galaxies & Cosmology',
  'Galaxies et cosmologie': 'Galaxies & Cosmology',
  
  // General Curiosities
  'General Curiosities': 'General Curiosities',
  'Curiosidades gerais': 'General Curiosities',
  'Curiosidades generales': 'General Curiosities',
  'Curiosités générales': 'General Curiosities',
  
  // Relativity & Fundamental Physics
  'Relativity & Fundamental Physics': 'Relativity & Fundamental Physics',
  'Relatividade e Física Fundamental': 'Relativity & Fundamental Physics',
  'Relatividade e física fundamental': 'Relativity & Fundamental Physics',
  'Relatividad y física fundamental': 'Relativity & Fundamental Physics',
  'Relativité et physique fondamentale': 'Relativity & Fundamental Physics',
  
  // Scientists
  'Scientists': 'Scientists',
  'Cientistas': 'Scientists',
  'Científicos': 'Scientists',
  'Scientifiques': 'Scientists',
  
  // Small Solar System Bodies
  'Small Solar System Bodies': 'Small Solar System Bodies',
  'Corpos Pequenos do Sistema Solar': 'Small Solar System Bodies',
  'Pequenos corpos do sistema solar': 'Small Solar System Bodies',
  'Cuerpos pequeños del Sistema Solar': 'Small Solar System Bodies',
  'Petits corps du système solaire': 'Small Solar System Bodies',
  
  // Solar System
  'Solar System': 'Solar System',
  'Sistema Solar': 'Solar System',
  'Système Solaire': 'Solar System',
  'Système solaire': 'Solar System',
  
  // Space Missions
  'Space Missions': 'Space Missions',
  'Missões Espaciais': 'Space Missions',
  'Missões espaciais': 'Space Missions',
  'Misiones espaciales': 'Space Missions',
  'Missions spatiales': 'Space Missions',
  
  // Space Observation
  'Space Observation': 'Space Observation',
  'Observação Espacial': 'Space Observation',
  'Observação do espaço': 'Space Observation',
  'Observación espacial': 'Space Observation',
  'Observation de l\'espace': 'Space Observation',
  
  // Stellar Objects
  'Stellar Objects': 'Stellar Objects',
  'Objetos Estelares': 'Stellar Objects',
  'Objetos estelares': 'Stellar Objects',
  'Objets Stellaires': 'Stellar Objects',
  'Objets stellaires': 'Stellar Objects',
  'Stars': 'Stellar Objects',
  'Estrelas': 'Stellar Objects',
  'Estrellas': 'Stellar Objects',
  'Étoiles': 'Stellar Objects',
  
  // Worlds Beyond
  'Worlds Beyond': 'Worlds Beyond',
  'Mundos Além': 'Worlds Beyond',
  'Mundos além': 'Worlds Beyond',
  'Mundos más allá': 'Worlds Beyond',
  'Les mondes au-delà': 'Worlds Beyond',
  
  // Subcategorias (mapear para categoria pai)
  'Sun': 'Solar System',
  'Sol': 'Solar System',
  'Soleil': 'Solar System',
  'Moon': 'Solar System',
  'Lua': 'Solar System',
  'Luna': 'Solar System',
  'Lune': 'Solar System',
  'Earth': 'Solar System',
  'Terra': 'Solar System',
  'Tierra': 'Solar System',
  'Terre': 'Solar System',
  'Milky Way': 'Galaxies & Cosmology',
  'Via Láctea': 'Galaxies & Cosmology',
  'Vía Láctea': 'Galaxies & Cosmology',
  'Voie Lactée': 'Galaxies & Cosmology',
  'Astronomy': 'General Curiosities',
  'Astronomia': 'General Curiosities',
  'Astronomía': 'General Curiosities',
  'Astronomie': 'General Curiosities',
  'Massive Objects': 'Stellar Objects',
};

async function populateTopicKey() {
  console.log('🔄 Populando topicKey baseado em topic...\n');

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco:', err.message);
      process.exit(1);
    }
  });

  try {
    let updated = 0;
    let notMapped = 0;
    const stats = {};

    for (const [topicValue, topicKey] of Object.entries(TOPIC_MAPPING)) {
      const result = await new Promise((resolve, reject) => {
        db.run(
          `UPDATE questions SET topic_key = ? WHERE topic = ?`,
          [topicKey, topicValue],
          function (err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });

      if (result > 0) {
        updated += result;
        stats[topicKey] = (stats[topicKey] || 0) + result;
        console.log(`   ✓ "${topicValue}" → "${topicKey}" (${result} perguntas)`);
      }
    }

    // Verificar perguntas sem topicKey
    const unmapped = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT topic FROM questions WHERE topic_key IS NULL`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log(`\n✅ Total atualizado: ${updated} perguntas`);
    
    if (unmapped.length > 0) {
      console.log(`\n⚠️  ${unmapped.length} tópico(s) não mapeado(s):`);
      unmapped.forEach(r => console.log(`   - "${r.topic}"`));
    }

    console.log('\n📊 Distribuição por topicKey:');
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => console.log(`   ${key}: ${count}`));

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    db.close();
  }
}

populateTopicKey();
