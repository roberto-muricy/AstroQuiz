#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const csvFilePath = path.join(__dirname, 'AstroQuiz Questions - en.csv');

console.log('📖 Reading CSV file:', csvFilePath);

if (!fs.existsSync(csvFilePath)) {
  console.error('❌ CSV file not found:', csvFilePath);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvFilePath, 'utf8');
const lines = csvContent.split('\n');

console.log('📊 CSV Stats:');
console.log('  Total lines:', lines.length);
console.log('  Header:', lines[0]);
console.log('  First data line:', lines[1]);
console.log('  Lines with content:', lines.filter(line => line.trim()).length);

// Test parsing first data line
if (lines[1]) {
  const header = lines[0].split(',').map(h => h.trim());
  console.log('\n🏗️ Header columns:', header);
  console.log('  Header length:', header.length);
  
  // Simple split test
  const firstDataLine = lines[1];
  const simpleSplit = firstDataLine.split(',');
  console.log('\n📝 First data line simple split:');
  console.log('  Values count:', simpleSplit.length);
  console.log('  Values:', simpleSplit.slice(0, 5).map(v => `"${v}"`));
}
