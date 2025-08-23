import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const ThemeManager = () => {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
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
      description: 'Conheça os planetas do Sistema Solar e suas características únicas',
      icon: '🪐',
      color: '#4CAF50',
      gradientStart: '#4CAF50',
      gradientEnd: '#45a049',
      topics: ['Mercúrio', 'Vênus', 'Terra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Netuno', 'Plutão', 'Planetas Anões']
    },
    {
      id: 'stars',
      name: 'Estrelas',
      description: 'Explore o mundo das estrelas e seus ciclos de vida',
      icon: '⭐',
      color: '#FFD700',
      gradientStart: '#FFD700',
      gradientEnd: '#FFA000',
      topics: ['Tipos de estrelas', 'Ciclo de vida', 'Constelações', 'Supernovas', 'Anãs brancas', 'Estrelas de nêutrons']
    },
    {
      id: 'galaxies',
      name: 'Galáxias',
      description: 'Descubra as galáxias do universo e suas estruturas',
      icon: '🌌',
      color: '#9C27B0',
      gradientStart: '#9C27B0',
      gradientEnd: '#7B1FA2',
      topics: ['Via Láctea', 'Andrômeda', 'Tipos de galáxias', 'Agrupamentos', 'Galáxias anãs', 'Galáxias ativas']
    },
    {
      id: 'space-exploration',
      name: 'Exploração Espacial',
      description: 'A história da exploração espacial e as missões mais importantes',
      icon: '🚀',
      color: '#2196F3',
      gradientStart: '#2196F3',
      gradientEnd: '#1976D2',
      topics: ['Apollo', 'ISS', 'Mars Rovers', 'Telescópios', 'Sondas espaciais', 'Estações espaciais']
    },
    {
      id: 'cosmology',
      name: 'Cosmologia',
      description: 'Os grandes mistérios do universo e sua origem',
      icon: '🌍',
      color: '#607D8B',
      gradientStart: '#607D8B',
      gradientEnd: '#455A64',
      topics: ['Big Bang', 'Matéria Escura', 'Energia Escura', 'Expansão do universo', 'Inflação cósmica', 'Radiação cósmica']
    },
    {
      id: 'black-holes',
      name: 'Buracos Negros',
      description: 'Os mistérios dos buracos negros e suas propriedades',
      icon: '⚫',
      color: '#000000',
      gradientStart: '#333333',
      gradientEnd: '#000000',
      topics: ['Formação', 'Tipos', 'Horizonte de eventos', 'Radiação Hawking', 'Buracos negros supermassivos', 'Gravidade']
    },
    {
      id: 'exoplanets',
      name: 'Exoplanetas',
      description: 'Planetas fora do Sistema Solar e busca por vida',
      icon: '🌍',
      color: '#00BCD4',
      gradientStart: '#00BCD4',
      gradientEnd: '#0097A7',
      topics: ['Métodos de detecção', 'Zona habitável', 'Tipos de exoplanetas', 'Biosignatures', 'TESS', 'Kepler']
    },
    {
      id: 'space-technology',
      name: 'Tecnologia Espacial',
      description: 'Inovações e equipamentos espaciais modernos',
      icon: '🛰️',
      color: '#607D8B',
      gradientStart: '#607D8B',
      gradientEnd: '#455A64',
      topics: ['Satélites', 'Telescópios', 'Propulsão', 'Comunicação', 'Robótica espacial', 'Materiais espaciais']
    }
  ];

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const themesRef = collection(db, 'themes');
      const q = query(themesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
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

  const validateForm = () => {
    const errors = [];
    if (!formData.id.trim()) errors.push('ID é obrigatório');
    if (!formData.name.trim()) errors.push('Nome é obrigatório');
    if (!formData.description.trim()) errors.push('Descrição é obrigatória');
    if (!formData.icon.trim()) errors.push('Ícone é obrigatório');
    if (formData.topics.length === 0) errors.push('Pelo menos um tópico é obrigatório');
    
    // Verificar se ID já existe (apenas para novos temas)
    if (!editingTheme && themes.some(t => t.id === formData.id)) {
      errors.push('ID já existe. Escolha outro ID.');
    }
    
    return errors;
  };

  const handleAddTheme = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Erros de validação:\n' + errors.join('\n'));
      return;
    }

    try {
      setSaving(true);
      const themeData = {
        ...formData,
        id: formData.id.trim().toLowerCase().replace(/\s+/g, '-'),
        topics: formData.topics.filter(t => t.trim()),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'themes'), themeData);
      setShowAddModal(false);
      resetForm();
      loadThemes();
      alert('✅ Tema adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar tema:', error);
      alert('❌ Erro ao adicionar tema: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTheme = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Erros de validação:\n' + errors.join('\n'));
      return;
    }

    try {
      setSaving(true);
      const themeRef = doc(db, 'themes', editingTheme.id);
      await updateDoc(themeRef, {
        ...formData,
        id: formData.id.trim().toLowerCase().replace(/\s+/g, '-'),
        topics: formData.topics.filter(t => t.trim()),
        updatedAt: new Date()
      });
      setEditingTheme(null);
      resetForm();
      loadThemes();
      alert('✅ Tema atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tema:', error);
      alert('❌ Erro ao atualizar tema: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTheme = async (themeId) => {
    try {
      await deleteDoc(doc(db, 'themes', themeId));
      setShowDeleteConfirm(null);
      loadThemes();
      alert('✅ Tema excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir tema:', error);
      alert('❌ Erro ao excluir tema: ' + error.message);
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
    if (!window.confirm('Adicionar todos os temas padrão? Isso pode criar duplicatas se alguns já existirem.')) {
      return;
    }

    try {
      setSaving(true);
      let addedCount = 0;
      let skippedCount = 0;

      for (const theme of defaultThemes) {
        // Verificar se já existe
        const exists = themes.some(t => t.id === theme.id);
        if (!exists) {
          await addDoc(collection(db, 'themes'), {
            ...theme,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }
      
      loadThemes();
      alert(`✅ ${addedCount} temas adicionados!\n⏭️ ${skippedCount} temas já existiam e foram pulados.`);
    } catch (error) {
      console.error('Erro ao adicionar temas padrão:', error);
      alert('❌ Erro ao adicionar temas padrão: ' + error.message);
    } finally {
      setSaving(false);
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

  // Filtrar temas baseado na busca e filtro
  const filteredThemes = themes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         theme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         theme.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterBy === 'all' || 
                         (filterBy === 'with-topics' && theme.topics?.length > 0) ||
                         (filterBy === 'no-topics' && (!theme.topics || theme.topics.length === 0));
    
    return matchesSearch && matchesFilter;
  });

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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Adicionando...' : 'Adicionar Temas Padrão'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
          >
            + Novo Tema
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Buscar temas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
        <div>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">Todos os temas</option>
            <option value="with-topics">Com tópicos</option>
            <option value="no-topics">Sem tópicos</option>
          </select>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{themes.length}</div>
          <div className="text-sm text-gray-400">Total de Temas</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-green-400">
            {themes.filter(t => t.topics?.length > 0).length}
          </div>
          <div className="text-sm text-gray-400">Com Tópicos</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">
            {themes.filter(t => !t.topics || t.topics.length === 0).length}
          </div>
          <div className="text-sm text-gray-400">Sem Tópicos</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">
            {filteredThemes.length}
          </div>
          <div className="text-sm text-gray-400">Filtrados</div>
        </div>
      </div>

      {/* Lista de Temas */}
      {filteredThemes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌌</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {searchTerm ? 'Nenhum tema encontrado' : 'Nenhum tema cadastrado'}
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Clique em "Adicionar Temas Padrão" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme) => (
            <div key={theme.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
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
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Editar tema"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(theme)}
                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="Excluir tema"
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
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Tópicos ({theme.topics?.length || 0}):
                </h4>
                <div className="flex flex-wrap gap-1">
                  {theme.topics?.map((topic, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                      {topic}
                    </span>
                  ))}
                  {(!theme.topics || theme.topics.length === 0) && (
                    <span className="px-2 py-1 bg-red-900 text-xs text-red-300 rounded">
                      Sem tópicos
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Criado: {theme.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                {theme.updatedAt && theme.updatedAt !== theme.createdAt && (
                  <span className="ml-2">
                    • Atualizado: {theme.updatedAt?.toDate?.()?.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-red-400 mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-300 mb-6">
                Tem certeza que deseja excluir o tema <strong>"{showDeleteConfirm.name}"</strong>?
                <br /><br />
                Esta ação é <strong>IRREVERSÍVEL</strong>!
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTheme(showDeleteConfirm.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Tema */}
      {(showAddModal || editingTheme) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">
              {editingTheme ? 'Editar Tema' : 'Novo Tema'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID do Tema <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="ex: planets, stars, galaxies"
                  disabled={!!editingTheme}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingTheme ? 'ID não pode ser alterado' : 'Será convertido para minúsculas e hífens'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Nome do tema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrição <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows="3"
                  placeholder="Descrição do tema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ícone <span className="text-red-400">*</span>
                </label>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tópicos <span className="text-red-400">*</span>
                </label>
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
                        title="Remover tópico"
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
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={editingTheme ? handleUpdateTheme : handleAddTheme}
                disabled={saving}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : (editingTheme ? 'Atualizar' : 'Adicionar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeManager;
