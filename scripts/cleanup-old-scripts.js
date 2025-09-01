const fs = require('fs');
const path = require('path');

// Scripts essenciais para manter
const KEEP_SCRIPTS = [
  'csv-import-with-deepl.js',    // Script principal melhorado
  'clean-everything.js',         // Limpeza geral
  'resume-translations.js',      // Backup para retomar traduções
  'cleanup-old-scripts.js'       // Este script
];

// CSVs importantes para manter
const KEEP_CSVS = [
  'AstroQuiz Questions import.csv', // CSV principal
  'AstroQuiz Questions - en-translated.csv' // Backup com traduções
];

// JSONs importantes
const KEEP_JSONS = [
  'import-checkpoint.json' // Checkpoint atual
];

const KEEP_FILES = [...KEEP_SCRIPTS, ...KEEP_CSVS, ...KEEP_JSONS];

function cleanupScripts() {
  const scriptsDir = __dirname;
  const files = fs.readdirSync(scriptsDir);
  
  console.log('🧹 Iniciando limpeza de scripts...');
  console.log(`📊 Total de arquivos: ${files.length}`);
  
  let deletedCount = 0;
  let keptCount = 0;
  
  // Criar pasta de backup
  const backupDir = path.join(scriptsDir, 'old-scripts-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
    console.log('📁 Pasta de backup criada: old-scripts-backup/');
  }
  
  for (const file of files) {
    if (KEEP_FILES.includes(file)) {
      console.log(`✅ Mantendo: ${file}`);
      keptCount++;
    } else if (file.endsWith('.js') || file.endsWith('.csv') || file.endsWith('.json')) {
      // Mover para backup ao invés de deletar
      const sourcePath = path.join(scriptsDir, file);
      const backupPath = path.join(backupDir, file);
      
      try {
        fs.renameSync(sourcePath, backupPath);
        console.log(`📦 Movido para backup: ${file}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Erro movendo ${file}:`, error.message);
      }
    } else {
      console.log(`⏭️  Ignorando: ${file} (não é script/csv/json)`);
    }
  }
  
  console.log('\n📊 RESUMO DA LIMPEZA:');
  console.log(`✅ Scripts mantidos: ${keptCount}`);
  console.log(`📦 Scripts movidos para backup: ${deletedCount}`);
  console.log(`📁 Backup localizado em: scripts/old-scripts-backup/`);
  
  console.log('\n🎯 SCRIPTS ESSENCIAIS MANTIDOS:');
  KEEP_SCRIPTS.forEach(script => {
    console.log(`   • ${script}`);
  });
  
  console.log('\n💡 Para restaurar algum script do backup:');
  console.log('   mv scripts/old-scripts-backup/NOME_DO_SCRIPT.js scripts/');
}

// Executar limpeza
cleanupScripts();
