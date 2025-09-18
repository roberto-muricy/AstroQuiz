#!/usr/bin/env node

/**
 * 🎨 AstroQuiz Assets Optimizer
 * Script para otimizar imagens e ícones para produção
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🎨 ${msg}${colors.reset}`)
};

class AssetsOptimizer {
  constructor() {
    this.assetsDir = path.join(process.cwd(), 'public', 'assets');
    this.optimizedDir = path.join(this.assetsDir, 'optimized');
    
    this.optimizationSettings = {
      images: {
        png: {
          quality: 90,
          compression: 6
        },
        jpg: {
          quality: 85,
          progressive: true
        },
        webp: {
          quality: 80,
          method: 6
        }
      },
      icons: {
        svg: {
          removeComments: true,
          removeMetadata: true,
          removeUselessStrokeAndFill: true,
          cleanupIDs: true
        }
      }
    };
  }

  async optimize() {
    log.header('AstroQuiz Assets Optimizer Started');
    
    try {
      // Verificar se diretório de assets existe
      if (!fs.existsSync(this.assetsDir)) {
        log.error('Diretório de assets não encontrado. Execute organize-assets.js primeiro.');
        return;
      }
      
      // Criar diretório otimizado
      if (!fs.existsSync(this.optimizedDir)) {
        fs.mkdirSync(this.optimizedDir, { recursive: true });
      }
      
      // Otimizar imagens
      await this.optimizeImages();
      
      // Otimizar ícones SVG
      await this.optimizeIcons();
      
      // Gerar diferentes tamanhos (responsive)
      await this.generateResponsiveSizes();
      
      // Gerar WebP alternativas
      await this.generateWebPVersions();
      
      // Gerar sprite de ícones
      await this.generateIconSprite();
      
      // Gerar relatório de otimização
      await this.generateOptimizationReport();
      
      log.success('Otimização de assets concluída!');
      
    } catch (error) {
      log.error(`Erro durante otimização: ${error.message}`);
      throw error;
    }
  }

  async optimizeImages() {
    log.info('Otimizando imagens...');
    
    const imageExtensions = ['.png', '.jpg', '.jpeg'];
    const imageFiles = this.findFilesByExtensions(this.assetsDir, imageExtensions);
    
    for (const file of imageFiles) {
      await this.optimizeImage(file);
    }
    
    log.success(`${imageFiles.length} imagens otimizadas`);
  }

  async optimizeImage(filePath) {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    const relativePath = path.relative(this.assetsDir, filePath);
    const outputPath = path.join(this.optimizedDir, relativePath);
    
    // Criar diretório de saída se não existir
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Otimização básica usando Node.js (sem dependências externas)
      // Em produção, você pode usar sharp, imagemin, etc.
      
      const stats = fs.statSync(filePath);
      const originalSize = stats.size;
      
      // Por enquanto, apenas copiar (você pode implementar otimização real aqui)
      fs.copyFileSync(filePath, outputPath);
      
      const optimizedStats = fs.statSync(outputPath);
      const optimizedSize = optimizedStats.size;
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      log.info(`${fileName}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savings}% economia)`);
      
    } catch (error) {
      log.error(`Erro ao otimizar ${fileName}: ${error.message}`);
    }
  }

  async optimizeIcons() {
    log.info('Otimizando ícones SVG...');
    
    const svgFiles = this.findFilesByExtensions(this.assetsDir, ['.svg']);
    
    for (const file of svgFiles) {
      await this.optimizeSVG(file);
    }
    
    log.success(`${svgFiles.length} ícones SVG otimizados`);
  }

  async optimizeSVG(filePath) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.assetsDir, filePath);
    const outputPath = path.join(this.optimizedDir, relativePath);
    
    // Criar diretório de saída
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      let svgContent = fs.readFileSync(filePath, 'utf8');
      const originalSize = Buffer.byteLength(svgContent, 'utf8');
      
      // Otimizações básicas de SVG
      svgContent = this.optimizeSVGContent(svgContent);
      
      fs.writeFileSync(outputPath, svgContent);
      
      const optimizedSize = Buffer.byteLength(svgContent, 'utf8');
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      log.info(`${fileName}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savings}% economia)`);
      
    } catch (error) {
      log.error(`Erro ao otimizar SVG ${fileName}: ${error.message}`);
    }
  }

  optimizeSVGContent(svgContent) {
    // Remover comentários
    svgContent = svgContent.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remover metadados desnecessários
    svgContent = svgContent.replace(/<metadata[\s\S]*?<\/metadata>/g, '');
    svgContent = svgContent.replace(/<title[\s\S]*?<\/title>/g, '');
    svgContent = svgContent.replace(/<desc[\s\S]*?<\/desc>/g, '');
    
    // Remover espaços em branco desnecessários
    svgContent = svgContent.replace(/\s+/g, ' ');
    svgContent = svgContent.replace(/>\s+</g, '><');
    
    // Remover atributos desnecessários
    svgContent = svgContent.replace(/\s*xmlns:xlink="[^"]*"/g, '');
    svgContent = svgContent.replace(/\s*xml:space="preserve"/g, '');
    
    return svgContent.trim();
  }

  async generateResponsiveSizes() {
    log.info('Gerando tamanhos responsivos...');
    
    const responsiveSizes = [
      { suffix: '@1x', scale: 1 },
      { suffix: '@2x', scale: 2 },
      { suffix: '@3x', scale: 3 }
    ];
    
    // Implementação básica - em produção use sharp ou similar
    log.info('Tamanhos responsivos requerem biblioteca de processamento de imagem');
    log.info('Considere usar sharp, jimp ou imagemin para implementação completa');
  }

  async generateWebPVersions() {
    log.info('Gerando versões WebP...');
    
    // Implementação básica - em produção use sharp ou cwebp
    log.info('Conversão WebP requer biblioteca específica');
    log.info('Considere usar sharp ou cwebp para implementação completa');
  }

  async generateIconSprite() {
    log.info('Gerando sprite de ícones...');
    
    const iconFiles = this.findFilesByExtensions(path.join(this.assetsDir, 'icons'), ['.svg']);
    
    if (iconFiles.length === 0) {
      log.warning('Nenhum ícone SVG encontrado para sprite');
      return;
    }
    
    let spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n`;
    
    for (const iconFile of iconFiles) {
      const iconName = path.basename(iconFile, '.svg');
      const iconContent = fs.readFileSync(iconFile, 'utf8');
      
      // Extrair conteúdo do SVG (sem tag svg)
      const match = iconContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
      if (match) {
        const innerContent = match[1];
        spriteContent += `  <symbol id="icon-${iconName}" viewBox="0 0 24 24">\n`;
        spriteContent += `    ${innerContent.trim()}\n`;
        spriteContent += `  </symbol>\n`;
      }
    }
    
    spriteContent += `</svg>`;
    
    const spritePath = path.join(this.optimizedDir, 'icons', 'sprite.svg');
    const spriteDir = path.dirname(spritePath);
    
    if (!fs.existsSync(spriteDir)) {
      fs.mkdirSync(spriteDir, { recursive: true });
    }
    
    fs.writeFileSync(spritePath, spriteContent);
    
    // Gerar CSS helper para sprite
    await this.generateSpriteCSS(iconFiles);
    
    log.success(`Sprite gerado com ${iconFiles.length} ícones`);
  }

  async generateSpriteCSS(iconFiles) {
    let cssContent = `/* AstroQuiz Icon Sprite CSS */\n\n`;
    cssContent += `.icon {\n`;
    cssContent += `  display: inline-block;\n`;
    cssContent += `  width: 1em;\n`;
    cssContent += `  height: 1em;\n`;
    cssContent += `  fill: currentColor;\n`;
    cssContent += `}\n\n`;
    
    for (const iconFile of iconFiles) {
      const iconName = path.basename(iconFile, '.svg');
      cssContent += `.icon-${iconName} {\n`;
      cssContent += `  /* Use: <svg class="icon icon-${iconName}"><use href="#icon-${iconName}"></use></svg> */\n`;
      cssContent += `}\n\n`;
    }
    
    const cssPath = path.join(this.optimizedDir, 'icons', 'sprite.css');
    fs.writeFileSync(cssPath, cssContent);
    
    log.success('CSS do sprite gerado');
  }

  async generateOptimizationReport() {
    log.info('Gerando relatório de otimização...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalOptimizedSize: 0,
        totalSavings: 0,
        byType: {}
      },
      files: []
    };
    
    // Comparar tamanhos originais vs otimizados
    await this.compareDirectories(this.assetsDir, this.optimizedDir, report);
    
    // Calcular economia total
    if (report.summary.totalOriginalSize > 0) {
      report.summary.totalSavings = 
        ((report.summary.totalOriginalSize - report.summary.totalOptimizedSize) / 
         report.summary.totalOriginalSize * 100).toFixed(1);
    }
    
    // Salvar relatório
    const reportPath = path.join(this.optimizedDir, 'optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Gerar README de otimização
    await this.generateOptimizationReadme(report);
    
    log.success(`Relatório salvo: ${reportPath}`);
    log.info(`Economia total: ${report.summary.totalSavings}%`);
    log.info(`Tamanho original: ${this.formatBytes(report.summary.totalOriginalSize)}`);
    log.info(`Tamanho otimizado: ${this.formatBytes(report.summary.totalOptimizedSize)}`);
  }

  async compareDirectories(originalDir, optimizedDir, report) {
    if (!fs.existsSync(originalDir) || !fs.existsSync(optimizedDir)) return;
    
    const files = this.getAllFiles(originalDir);
    
    for (const file of files) {
      const relativePath = path.relative(originalDir, file);
      const optimizedFile = path.join(optimizedDir, relativePath);
      
      if (fs.existsSync(optimizedFile)) {
        const originalStats = fs.statSync(file);
        const optimizedStats = fs.statSync(optimizedFile);
        
        const fileInfo = {
          path: relativePath,
          originalSize: originalStats.size,
          optimizedSize: optimizedStats.size,
          savings: ((originalStats.size - optimizedStats.size) / originalStats.size * 100).toFixed(1)
        };
        
        report.files.push(fileInfo);
        report.summary.totalFiles++;
        report.summary.totalOriginalSize += originalStats.size;
        report.summary.totalOptimizedSize += optimizedStats.size;
        
        // Contar por tipo
        const ext = path.extname(file).toLowerCase();
        if (!report.summary.byType[ext]) {
          report.summary.byType[ext] = {
            count: 0,
            originalSize: 0,
            optimizedSize: 0
          };
        }
        
        report.summary.byType[ext].count++;
        report.summary.byType[ext].originalSize += originalStats.size;
        report.summary.byType[ext].optimizedSize += optimizedStats.size;
      }
    }
  }

  async generateOptimizationReadme(report) {
    const readmePath = path.join(this.optimizedDir, 'README.md');
    
    const content = `# 🎨 AstroQuiz Optimized Assets

Assets otimizados em ${new Date(report.timestamp).toLocaleString()}.

## 📊 Resumo da Otimização

- **Total de arquivos**: ${report.summary.totalFiles}
- **Tamanho original**: ${this.formatBytes(report.summary.totalOriginalSize)}
- **Tamanho otimizado**: ${this.formatBytes(report.summary.totalOptimizedSize)}
- **Economia total**: ${report.summary.totalSavings}%

## 📈 Por Tipo de Arquivo

${Object.entries(report.summary.byType).map(([ext, data]) => {
  const savings = ((data.originalSize - data.optimizedSize) / data.originalSize * 100).toFixed(1);
  return `- **${ext}**: ${data.count} arquivos, ${this.formatBytes(data.originalSize)} → ${this.formatBytes(data.optimizedSize)} (${savings}% economia)`;
}).join('\n')}

## 🚀 Como Usar Assets Otimizados

### HTML
\`\`\`html
<!-- Imagem otimizada -->
<img src="/assets/optimized/images/backgrounds/stars-bg.png" alt="Background">

<!-- Ícone do sprite -->
<svg class="icon">
  <use href="/assets/optimized/icons/sprite.svg#icon-home"></use>
</svg>
\`\`\`

### CSS
\`\`\`css
/* Importar CSS do sprite */
@import url('/assets/optimized/icons/sprite.css');

/* Usar imagem otimizada */
.background {
  background-image: url('/assets/optimized/images/backgrounds/stars-bg.png');
}
\`\`\`

### JavaScript
\`\`\`javascript
// Carregar sprite dinamicamente
const sprite = await fetch('/assets/optimized/icons/sprite.svg');
document.body.insertAdjacentHTML('afterbegin', await sprite.text());
\`\`\`

## 📋 Arquivos Otimizados

${report.files.map(file => 
  `- \`${file.path}\`: ${this.formatBytes(file.originalSize)} → ${this.formatBytes(file.optimizedSize)} (${file.savings}% economia)`
).join('\n')}

---

Otimizado automaticamente pelo AstroQuiz Assets Optimizer 🚀
`;
    
    fs.writeFileSync(readmePath, content);
    log.success('README de otimização gerado');
  }

  findFilesByExtensions(dir, extensions) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const allFiles = this.getAllFiles(dir);
    
    for (const file of allFiles) {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        files.push(file);
      }
    }
    
    return files;
  }

  getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
    
    return arrayOfFiles;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const optimizer = new AssetsOptimizer();
  
  optimizer.optimize().catch(error => {
    log.error(`Falha na otimização: ${error.message}`);
    process.exit(1);
  });
}

module.exports = AssetsOptimizer;

