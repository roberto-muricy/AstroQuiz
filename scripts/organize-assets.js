#!/usr/bin/env node

/**
 * 📁 AstroQuiz Assets Organizer
 * Script para organizar automaticamente assets e ícones do Figma
 */

const fs = require('fs');
const path = require('path');

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
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n📁 ${msg}${colors.reset}`)
};

class AssetsOrganizer {
  constructor() {
    this.sourceDir = process.cwd();
    this.targetDir = path.join(this.sourceDir, 'public', 'assets');
    
    // Mapeamento de categorias por palavras-chave
    this.categoryMappings = {
      // Imagens
      images: {
        backgrounds: ['bg', 'background', 'gradient', 'stars', 'space', 'nebula', 'texture'],
        levels: ['level', 'sistema-solar', 'planet', 'solar', 'galaxy', 'universe'],
        achievements: ['achievement', 'badge', 'trophy', 'medal', 'award', 'conquest'],
        avatars: ['avatar', 'profile', 'user', 'character', 'astronaut', 'scientist'],
        misc: ['logo', 'splash', 'icon', 'misc', 'other', 'general']
      },
      
      // Ícones
      icons: {
        navigation: ['home', 'menu', 'tab', 'nav', 'back', 'forward'],
        actions: ['play', 'pause', 'stop', 'next', 'prev', 'settings', 'config'],
        status: ['correct', 'wrong', 'star', 'check', 'error', 'success', 'warning'],
        game: ['planet', 'rocket', 'telescope', 'galaxy', 'star', 'moon', 'sun', 'earth']
      }
    };
    
    // Extensões suportadas
    this.imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    this.iconExtensions = ['.svg'];
    this.allExtensions = [...this.imageExtensions, ...this.iconExtensions];
  }

  async organize() {
    log.header('AstroQuiz Assets Organizer Started');
    
    try {
      // Criar estrutura de diretórios
      await this.createDirectoryStructure();
      
      // Encontrar pastas de assets
      const assetFolders = await this.findAssetFolders();
      
      if (assetFolders.length === 0) {
        log.warning('Nenhuma pasta de assets encontrada');
        return;
      }
      
      // Organizar cada pasta
      for (const folder of assetFolders) {
        await this.organizeFolder(folder);
      }
      
      // Gerar relatório
      await this.generateReport();
      
      log.success('Organização de assets concluída!');
      
    } catch (error) {
      log.error(`Erro durante organização: ${error.message}`);
      throw error;
    }
  }

  async createDirectoryStructure() {
    log.info('Criando estrutura de diretórios...');
    
    const directories = [
      'public/assets',
      'public/assets/images',
      'public/assets/images/backgrounds',
      'public/assets/images/levels',
      'public/assets/images/achievements',
      'public/assets/images/avatars',
      'public/assets/images/misc',
      'public/assets/icons',
      'public/assets/icons/navigation',
      'public/assets/icons/actions',
      'public/assets/icons/status',
      'public/assets/icons/game',
      'public/assets/ui',
      'public/assets/ui/buttons',
      'public/assets/ui/cards',
      'public/assets/ui/effects'
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(this.sourceDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    
    log.success('Estrutura de diretórios criada');
  }

  async findAssetFolders() {
    log.info('Procurando pastas de assets...');
    
    const folders = [];
    const items = fs.readdirSync(this.sourceDir);
    
    for (const item of items) {
      const itemPath = path.join(this.sourceDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Procurar por pastas que contenham "astroquiz", "img", "icon", "asset"
        const lowerName = item.toLowerCase();
        if (lowerName.includes('astroquiz') || 
            lowerName.includes('img') || 
            lowerName.includes('icon') || 
            lowerName.includes('asset')) {
          folders.push({
            name: item,
            path: itemPath,
            type: this.determineFolderType(item)
          });
        }
      }
    }
    
    log.info(`Encontradas ${folders.length} pastas de assets:`);
    folders.forEach(folder => {
      log.info(`  - ${folder.name} (${folder.type})`);
    });
    
    return folders;
  }

  determineFolderType(folderName) {
    const lower = folderName.toLowerCase();
    if (lower.includes('icon')) return 'icons';
    if (lower.includes('img') || lower.includes('image')) return 'images';
    return 'mixed';
  }

  async organizeFolder(folder) {
    log.header(`Organizando pasta: ${folder.name}`);
    
    const files = this.getAllFiles(folder.path);
    const assetFiles = files.filter(file => 
      this.allExtensions.includes(path.extname(file.toLowerCase()))
    );
    
    log.info(`Encontrados ${assetFiles.length} arquivos de assets`);
    
    for (const file of assetFiles) {
      await this.organizeFile(file, folder.type);
    }
  }

  getAllFiles(dirPath, arrayOfFiles = []) {
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

  async organizeFile(filePath, folderType) {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, fileExt);
    
    // Determinar categoria
    const category = this.categorizeFile(baseName, fileExt, folderType);
    
    // Determinar nome final
    const finalName = this.generateFinalName(baseName, category);
    
    // Caminho de destino
    const targetPath = path.join(this.targetDir, category.type, category.subtype, finalName + fileExt);
    
    try {
      // Copiar arquivo
      fs.copyFileSync(filePath, targetPath);
      log.success(`${fileName} → ${category.type}/${category.subtype}/${finalName}${fileExt}`);
      
    } catch (error) {
      log.error(`Erro ao copiar ${fileName}: ${error.message}`);
    }
  }

  categorizeFile(baseName, fileExt, folderType) {
    const lowerName = baseName.toLowerCase();
    
    // Determinar tipo principal (images ou icons)
    let mainType;
    if (this.iconExtensions.includes(fileExt)) {
      mainType = 'icons';
    } else if (this.imageExtensions.includes(fileExt)) {
      mainType = 'images';
    } else {
      mainType = folderType === 'icons' ? 'icons' : 'images';
    }
    
    // Determinar subtipo
    let subtype = 'misc'; // default
    
    const categories = this.categoryMappings[mainType];
    for (const [categoryName, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          subtype = categoryName;
          break;
        }
      }
      if (subtype !== 'misc') break;
    }
    
    return {
      type: mainType,
      subtype: subtype
    };
  }

  generateFinalName(baseName, category) {
    // Limpar nome
    let cleanName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Remover prefixos comuns do Figma
    cleanName = cleanName
      .replace(/^chatgpt-image-\d+-de-set-de-\d+-/, '')
      .replace(/^astroquiz-/, '')
      .replace(/^icon-/, '')
      .replace(/^img-/, '');
    
    // Adicionar prefixo baseado na categoria se necessário
    const prefixes = {
      'navigation': 'nav',
      'actions': 'action',
      'status': 'status',
      'game': 'game',
      'backgrounds': 'bg',
      'levels': 'level',
      'achievements': 'achievement',
      'avatars': 'avatar'
    };
    
    const prefix = prefixes[category.subtype];
    if (prefix && !cleanName.startsWith(prefix)) {
      cleanName = `${prefix}-${cleanName}`;
    }
    
    return cleanName;
  }

  async generateReport() {
    log.header('Gerando relatório de organização');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: 0,
        byType: {},
        byCategory: {}
      },
      files: []
    };
    
    // Escanear diretório organizado
    const assetsDir = this.targetDir;
    this.scanDirectory(assetsDir, assetsDir, report);
    
    // Salvar relatório
    const reportPath = path.join(this.sourceDir, 'assets-organization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Gerar README dos assets
    await this.generateAssetsReadme(report);
    
    log.success(`Relatório salvo: ${reportPath}`);
    log.info(`Total de arquivos organizados: ${report.summary.totalFiles}`);
    
    // Mostrar resumo
    console.log('\n📊 RESUMO DA ORGANIZAÇÃO:');
    Object.entries(report.summary.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} arquivos`);
    });
  }

  scanDirectory(dirPath, basePath, report, relativePath = '') {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.scanDirectory(itemPath, basePath, report, path.join(relativePath, item));
      } else {
        const fileInfo = {
          name: item,
          path: path.join(relativePath, item),
          size: stat.size,
          type: path.extname(item).toLowerCase()
        };
        
        report.files.push(fileInfo);
        report.summary.totalFiles++;
        
        // Contar por tipo
        const mainType = relativePath.split('/')[0] || 'root';
        report.summary.byType[mainType] = (report.summary.byType[mainType] || 0) + 1;
        
        // Contar por categoria
        const category = relativePath.split('/').join('/') || 'root';
        report.summary.byCategory[category] = (report.summary.byCategory[category] || 0) + 1;
      }
    }
  }

  async generateAssetsReadme(report) {
    const readmePath = path.join(this.targetDir, 'README.md');
    
    const content = `# 🎨 AstroQuiz Assets

Assets organizados automaticamente em ${new Date(report.timestamp).toLocaleString()}.

## 📊 Resumo

- **Total de arquivos**: ${report.summary.totalFiles}
- **Tipos**: ${Object.keys(report.summary.byType).join(', ')}

## 📁 Estrutura

\`\`\`
assets/
├── images/           # Imagens PNG/JPG
│   ├── backgrounds/  # Fundos e texturas
│   ├── levels/       # Imagens de níveis
│   ├── achievements/ # Badges e conquistas
│   ├── avatars/      # Avatars de usuário
│   └── misc/         # Imagens diversas
├── icons/            # Ícones SVG
│   ├── navigation/   # Navegação
│   ├── actions/      # Ações
│   ├── status/       # Estados
│   └── game/         # Jogo
└── ui/               # Elementos de UI
    ├── buttons/      # Botões
    ├── cards/        # Cards
    └── effects/      # Efeitos
\`\`\`

## 🎯 Como Usar

### Em HTML
\`\`\`html
<img src="/assets/images/backgrounds/stars-bg.png" alt="Background">
<img src="/assets/icons/navigation/home.svg" alt="Home">
\`\`\`

### Em CSS
\`\`\`css
.background {
  background-image: url('/assets/images/backgrounds/stars-bg.png');
}
\`\`\`

### Em React/Vue
\`\`\`javascript
import starsBg from '/assets/images/backgrounds/stars-bg.png';
import homeIcon from '/assets/icons/navigation/home.svg';
\`\`\`

## 📋 Lista de Arquivos

${report.files.map(file => `- \`${file.path}\` (${(file.size / 1024).toFixed(1)}KB)`).join('\n')}

---

Organizado automaticamente pelo AstroQuiz Assets Organizer 🚀
`;
    
    fs.writeFileSync(readmePath, content);
    log.success('README dos assets gerado');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const organizer = new AssetsOrganizer();
  
  organizer.organize().catch(error => {
    log.error(`Falha na organização: ${error.message}`);
    process.exit(1);
  });
}

module.exports = AssetsOrganizer;

