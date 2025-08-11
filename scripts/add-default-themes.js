const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-2024.firebaseapp.com",
  projectId: "astroquiz-2024",
  storageBucket: "astroquiz-2024.appspot.com",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultThemes = [
  {
    id: 'planets',
    name: 'Planetas',
    description: 'Conheça os planetas do Sistema Solar',
    icon: '🪐',
    color: '#4CAF50',
    gradientStart: '#4CAF50',
    gradientEnd: '#45a049',
    topics: ['Mercúrio', 'Vênus', 'Terra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Netuno']
  },
  {
    id: 'stars',
    name: 'Estrelas',
    description: 'Explore o mundo das estrelas',
    icon: '⭐',
    color: '#FFD700',
    gradientStart: '#FFD700',
    gradientEnd: '#FFA000',
    topics: ['Tipos de estrelas', 'Ciclo de vida', 'Constelações', 'Supernovas']
  },
  {
    id: 'galaxies',
    name: 'Galáxias',
    description: 'Descubra as galáxias do universo',
    icon: '🌌',
    color: '#9C27B0',
    gradientStart: '#9C27B0',
    gradientEnd: '#7B1FA2',
    topics: ['Via Láctea', 'Andrômeda', 'Tipos de galáxias', 'Agrupamentos']
  },
  {
    id: 'space_exploration',
    name: 'Exploração Espacial',
    description: 'Missões e conquistas espaciais',
    icon: '🚀',
    color: '#2196F3',
    gradientStart: '#2196F3',
    gradientEnd: '#1976D2',
    topics: ['Apollo', 'ISS', 'Mars Rovers', 'Telescópios']
  },
  {
    id: 'cosmology',
    name: 'Cosmologia',
    description: 'A origem e evolução do universo',
    icon: '🌍',
    color: '#FF5722',
    gradientStart: '#FF5722',
    gradientEnd: '#E64A19',
    topics: ['Big Bang', 'Expansão do universo', 'Matéria escura', 'Energia escura']
  },
  {
    id: 'black_holes',
    name: 'Buracos Negros',
    description: 'Os mistérios dos buracos negros',
    icon: '⚫',
    color: '#000000',
    gradientStart: '#333333',
    gradientEnd: '#000000',
    topics: ['Formação', 'Tipos', 'Horizonte de eventos', 'Radiação Hawking']
  },
  {
    id: 'exoplanets',
    name: 'Exoplanetas',
    description: 'Planetas fora do Sistema Solar',
    icon: '🌍',
    color: '#00BCD4',
    gradientStart: '#00BCD4',
    gradientEnd: '#0097A7',
    topics: ['Métodos de detecção', 'Zona habitável', 'Tipos de exoplanetas']
  },
  {
    id: 'space_technology',
    name: 'Tecnologia Espacial',
    description: 'Inovações e equipamentos espaciais',
    icon: '🛰️',
    color: '#607D8B',
    gradientStart: '#607D8B',
    gradientEnd: '#455A64',
    topics: ['Satélites', 'Telescópios', 'Propulsão', 'Comunicação']
  }
];

async function addDefaultThemes() {
  try {
    console.log('🌌 Adicionando temas padrão ao Firebase...');
    
    // Verificar se já existem temas
    const existingThemes = await getDocs(collection(db, 'themes'));
    if (!existingThemes.empty) {
      console.log('⚠️  Já existem temas no Firebase. Pulando...');
      return;
    }

    // Adicionar cada tema
    for (const theme of defaultThemes) {
      const themeData = {
        ...theme,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'themes'), themeData);
      console.log(`✅ Tema "${theme.name}" adicionado com sucesso!`);
    }
    
    console.log('🎉 Todos os temas padrão foram adicionados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar temas:', error);
  }
}

// Executar o script
addDefaultThemes().then(() => {
  console.log('🏁 Script concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
