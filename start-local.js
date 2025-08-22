#!/usr/bin/env node

/**
 * 🚀 Script Alternativo para Iniciar o Servidor Local
 * 
 * Este script tenta resolver problemas com react-scripts
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor local...');

// Verificar se node_modules existe
const fs = require('fs');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules não encontrado. Instalando dependências...');
  
  const install = spawn('npm', ['install', '--legacy-peer-deps'], {
    stdio: 'inherit',
    shell: true
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependências instaladas. Iniciando servidor...');
      startServer();
    } else {
      console.log('❌ Erro ao instalar dependências');
      console.log('💡 Tente: npm install --legacy-peer-deps');
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🌐 Iniciando servidor de desenvolvimento...');
  
  // Tentar diferentes comandos
  const commands = [
    ['npx', 'react-scripts', 'start'],
    ['npm', 'run', 'start'],
    ['yarn', 'start'],
    ['pnpm', 'start']
  ];
  
  tryCommand(commands, 0);
}

function tryCommand(commands, index) {
  if (index >= commands.length) {
    console.log('❌ Nenhum comando funcionou');
    console.log('💡 Soluções:');
    console.log('   1. npm install --legacy-peer-deps');
    console.log('   2. npx create-react-app . --template typescript');
    console.log('   3. Use o Vercel: https://astroquiz-admin.vercel.app');
    return;
  }
  
  const [command, ...args] = commands[index];
  console.log(`🔄 Tentando: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.log(`❌ Erro com ${command}: ${error.message}`);
    tryCommand(commands, index + 1);
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`❌ ${command} falhou com código ${code}`);
      tryCommand(commands, index + 1);
    }
  });
}
