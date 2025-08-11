import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const ThemeManager = () => {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    icon: '🌌',
    color: '#673AB7',
    gradientStart: '#673AB7',
    gradientEnd: '#5E35B1',
    topics: []
  });

  // Temas padrão para referência
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

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const themesRef = collection(db, 'themes');
      const snapshot = await getDocs(themesRef);
      const themesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setThemes(themesData);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTheme = async () => {
    try {
      const themeData = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'themes'), themeData);
      setShowAddModal(false);
      resetForm();
      loadThemes();
    } catch (error) {
      console.error('Erro ao adicionar tema:', error);
    }
  };

  const handleUpdateTheme = async () => {
    try {
      const themeRef = doc(db, 'themes', editingTheme.id);
      await updateDoc(themeRef, {
        ...formData,
        updatedAt: new Date()
      });
      setEditingTheme(null);
      resetForm();
      loadThemes();
    } catch (error) {
      console.error('Erro ao atualizar tema:', error);
    }
  };

  const handleDeleteTheme = async (themeId) => {
    if (window.confirm('Tem certeza que deseja excluir este tema?')) {
      try {
        await deleteDoc(doc(db, 'themes', themeId));
        loadThemes();
      } catch (error) {
        console.error('Erro ao excluir tema:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      icon: '🌌',
      color: '#673AB7',
      gradientStart: '#673AB7',
      gradientEnd: '#5E35B1',
      topics: []
    });
  };

  const handleEdit = (theme) => {
    setEditingTheme(theme);
    setFormData({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      icon: theme.icon,
      color: theme.color,
      gradientStart: theme.gradientStart,
      gradientEnd: theme.gradientEnd,
      topics: theme.topics || []
    });
  };

  const addDefaultThemes = async () => {
    try {
      for (const theme of defaultThemes) {
        await addDoc(collection(db, 'themes'), {
          ...theme,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      loadThemes();
    } catch (error) {
      console.error('Erro ao adicionar temas padrão:', error);
    }
  };

  const handleTopicChange = (index, value) => {
    const newTopics = [...formData.topics];
    newTopics[index] = value;
    setFormData({ ...formData, topics: newTopics });
  };

  const addTopic = () => {
    setFormData({ ...formData, topics: [...formData.topics, ''] });
  };

  const removeTopic = (index) => {
    const newTopics = formData.topics.filter((_, i) => i !== index);
    setFormData({ ...formData, topics: newTopics });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-yellow-400 text-lg">Carregando temas...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-yellow-400">Gerenciar Temas</h2>
        <div className="space-x-3">
          <button
            onClick={addDefaultThemes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Adicionar Temas Padrão
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
          >
            + Novo Tema
          </button>
        </div>
      </div>

      {/* Lista de Temas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <div key={theme.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{theme.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{theme.name}</h3>
                  <p className="text-sm text-gray-400">{theme.id}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(theme)}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteTheme(theme.id)}
                  className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <p className="text-gray-300 mb-4">{theme.description}</p>
            
            <div className="flex items-center space-x-2 mb-4">
              <div 
                className="w-6 h-6 rounded-full border-2 border-gray-600"
                style={{ backgroundColor: theme.color }}
              ></div>
              <span className="text-sm text-gray-400">{theme.color}</span>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Tópicos:</h4>
              <div className="flex flex-wrap gap-1">
                {theme.topics?.slice(0, 3).map((topic, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                    {topic}
                  </span>
                ))}
                {theme.topics?.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 text-xs text-gray-400 rounded">
                    +{theme.topics.length - 3} mais
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Criado: {theme.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Adicionar/Editar Tema */}
      {(showAddModal || editingTheme) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">
              {editingTheme ? 'Editar Tema' : 'Novo Tema'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ID do Tema</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="ex: planets, stars, galaxies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Nome do tema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows="3"
                  placeholder="Descrição do tema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ícone</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="🌌"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cor Principal</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gradiente Início</label>
                  <input
                    type="color"
                    value={formData.gradientStart}
                    onChange={(e) => setFormData({ ...formData, gradientStart: e.target.value })}
                    className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gradiente Fim</label>
                  <input
                    type="color"
                    value={formData.gradientEnd}
                    onChange={(e) => setFormData({ ...formData, gradientEnd: e.target.value })}
                    className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tópicos</label>
                <div className="space-y-2">
                  {formData.topics.map((topic, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => handleTopicChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder={`Tópico ${index + 1}`}
                      />
                      <button
                        onClick={() => removeTopic(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addTopic}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    + Adicionar Tópico
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTheme(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={editingTheme ? handleUpdateTheme : handleAddTheme}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600"
              >
                {editingTheme ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeManager;
