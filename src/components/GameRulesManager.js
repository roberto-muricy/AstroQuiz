import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_GAME_RULES } from "../constants/gameRules";

// Debug: verificar se a importação está funcionando
console.log('🔧 DEFAULT_GAME_RULES importada:', DEFAULT_GAME_RULES);
console.log('🔧 Tipo da constante:', typeof DEFAULT_GAME_RULES);
console.log('🔧 Propriedades da constante:', Object.keys(DEFAULT_GAME_RULES));

// Fallback caso a importação falhe
const FALLBACK_RULES = {
  timePerQuestion: 15,
  timeBonus: 2,
  timePenalty: 1,
  pointsPerCorrectAnswer: 10,
  pointsPerLevel: 100,
  pointsMultiplier: 1.5,
  streakBonus: 5,
  passingPercentage: 80,
  questionsPerLevel: 10,
  maxAttempts: 0,
  difficultyMultiplier: 1.2,
  unlockRequirement: 2,
  achievementThresholds: {
    speedDemon: 120,
    perfectionist: 95,
    streakMaster: 5,
  },
  allowHints: false,
  allowSkip: false,
  showTimer: true,
  showProgress: true,
  rankingUpdateInterval: 5,
  rankingDisplayLimit: 50,
  enableNotifications: true,
  dailyReminder: true,
  achievementNotifications: true,
  lastUpdated: new Date(),
  updatedBy: 'admin',
  version: '1.0.0'
};

const GameRulesManager = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState(DEFAULT_GAME_RULES || FALLBACK_RULES);
  const [message, setMessage] = useState("");
  const [firestoreStatus, setFirestoreStatus] = useState('checking');

  // Debug: verificar se o estado foi inicializado
  console.log('🔧 Estado rules inicializado:', rules);
  console.log('🔧 DEFAULT_GAME_RULES disponível:', !!DEFAULT_GAME_RULES);

  const loadGameRules = useCallback(async () => {
    try {
      setLoading(true);
      
      // Tentar carregar do Firestore primeiro
      try {
        console.log('🔍 Tentando carregar regras do Firestore...');
        const rulesDoc = await getDoc(doc(db, 'gameRules', 'current'));
        
        if (rulesDoc.exists()) {
          const data = rulesDoc.data();
          // Garantir que achievementThresholds seja sempre um objeto válido
          const loadedRules = {
            ...DEFAULT_GAME_RULES,
            ...data,
            achievementThresholds: {
              ...DEFAULT_GAME_RULES.achievementThresholds,
              ...(data.achievementThresholds || {})
            },
            lastUpdated: data.lastUpdated?.toDate() || new Date()
          };
          setRules(loadedRules);
          setFirestoreStatus('working');
          console.log('✅ Regras carregadas do Firestore');
          return;
        }
      } catch (firestoreError) {
        console.log('⚠️ Erro ao carregar do Firestore:', firestoreError.message);
        setFirestoreStatus('error');
      }
      
      // Fallback: tentar carregar do localStorage
      try {
        console.log('🔍 Tentando carregar regras do localStorage...');
        const localRules = localStorage.getItem('astroquiz_game_rules');
        
        if (localRules) {
          const parsedRules = JSON.parse(localRules);
          const loadedRules = {
            ...DEFAULT_GAME_RULES,
            ...parsedRules,
            achievementThresholds: {
              ...DEFAULT_GAME_RULES.achievementThresholds,
              ...(parsedRules.achievementThresholds || {})
            },
            lastUpdated: parsedRules.lastUpdated ? new Date(parsedRules.lastUpdated) : new Date()
          };
          setRules(loadedRules);
          console.log('✅ Regras carregadas do localStorage');
          return;
        }
      } catch (localError) {
        console.log('⚠️ Erro ao carregar do localStorage:', localError.message);
      }
      
      // Último fallback: usar regras padrão
      console.log('⚠️ Usando regras padrão');
      setRules(DEFAULT_GAME_RULES || FALLBACK_RULES);
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar regras:', error);
      setRules(DEFAULT_GAME_RULES || FALLBACK_RULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGameRules();
  }, [loadGameRules]);

  const saveGameRules = async () => {
    try {
      setSaving(true);
      setMessage(""); // Limpar mensagens anteriores
      
      console.log('🔧 Tentando salvar regras...', rules);
      
      // Validar e limpar os dados antes de salvar
      const validatedRules = {
        ...rules,
        timePerQuestion: Math.max(5, Math.min(60, parseInt(rules.timePerQuestion) || 15)),
        timeBonus: Math.max(0, Math.min(10, parseInt(rules.timeBonus) || 2)),
        timePenalty: Math.max(0, Math.min(5, parseInt(rules.timePenalty) || 1)),
        pointsPerCorrectAnswer: Math.max(1, Math.min(50, parseInt(rules.pointsPerCorrectAnswer) || 10)),
        pointsPerLevel: Math.max(50, Math.min(500, parseInt(rules.pointsPerLevel) || 100)),
        pointsMultiplier: Math.max(1.0, Math.min(3.0, parseFloat(rules.pointsMultiplier) || 1.5)),
        streakBonus: Math.max(0, Math.min(20, parseInt(rules.streakBonus) || 5)),
        passingPercentage: Math.max(50, Math.min(100, parseInt(rules.passingPercentage) || 80)),
        questionsPerLevel: Math.max(5, Math.min(20, parseInt(rules.questionsPerLevel) || 10)),
        maxAttempts: Math.max(0, Math.min(10, parseInt(rules.maxAttempts) || 0)),
        unlockRequirement: Math.max(1, Math.min(3, parseInt(rules.unlockRequirement) || 2)),
        difficultyMultiplier: Math.max(1.0, Math.min(2.0, parseFloat(rules.difficultyMultiplier) || 1.2)),
        rankingUpdateInterval: Math.max(1, Math.min(60, parseInt(rules.rankingUpdateInterval) || 5)),
        rankingDisplayLimit: Math.max(10, Math.min(200, parseInt(rules.rankingDisplayLimit) || 50)),
        achievementThresholds: {
          speedDemon: Math.max(60, Math.min(300, parseInt(rules.achievementThresholds?.speedDemon) || 120)),
          perfectionist: Math.max(90, Math.min(100, parseInt(rules.achievementThresholds?.perfectionist) || 95)),
          streakMaster: Math.max(3, Math.min(10, parseInt(rules.achievementThresholds?.streakMaster) || 5))
        },
        lastUpdated: new Date(),
        updatedBy: 'admin',
        version: incrementVersion(rules.version)
      };
      
      console.log('✅ Regras validadas:', validatedRules);
      
      // Tentar salvar no Firestore primeiro
      try {
        console.log('🚀 Tentando salvar no Firestore...');
        await setDoc(doc(db, 'gameRules', 'current'), validatedRules);
        console.log('✅ Regras salvas no Firestore com sucesso!');
        setMessage("✅ Regras salvas com sucesso no Firestore!");
        setFirestoreStatus('working');
        
        // Atualizar o estado local com as regras validadas
        setRules(validatedRules);
        
      } catch (firestoreError) {
        console.log('⚠️ Erro no Firestore, salvando localmente...', firestoreError.message);
        
        // Fallback: salvar no localStorage
        try {
          localStorage.setItem('astroquiz_game_rules', JSON.stringify(validatedRules));
          console.log('✅ Regras salvas localmente com sucesso!');
          
          setMessage("⚠️ Regras salvas localmente (Firestore indisponível). Aplique as regras de segurança para sincronização completa.");
          
          // Atualizar o estado local com as regras validadas
          setRules(validatedRules);
          
        } catch (localError) {
          console.error('❌ Erro ao salvar localmente:', localError);
          setMessage("❌ Erro ao salvar regras. Tente novamente.");
        }
      }
      
      setTimeout(() => setMessage(""), 5000);
      
    } catch (error) {
      console.error('❌ Erro geral ao salvar regras:', error);
      setMessage("❌ Erro inesperado. Tente novamente.");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  const incrementVersion = (version) => {
    const parts = version.split('.');
    parts[2] = (parseInt(parts[2]) + 1).toString();
    return parts.join('.');
  };

  const handleInputChange = (section, field, value) => {
    setRules(prev => {
      // Se for um campo aninhado (como achievementThresholds)
      if (field !== null) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
      }
      // Se for um campo direto
      return {
        ...prev,
        [section]: value
      };
    });
  };

  const resetToDefaults = () => {
    setRules(DEFAULT_GAME_RULES || FALLBACK_RULES);
  };

  if (loading) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">{t("loading_rules")}</h2>
        <p className="text-gray-300">{t("loading_rules_desc")}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">🎮 {t("game_rules_title")}</h2>
          <p className="text-gray-300">{t("game_rules_subtitle")}</p>
          
          {/* Status do Firestore */}
          {firestoreStatus === 'checking' && (
            <div className="mt-2 p-2 bg-blue-900/50 text-blue-300 rounded-lg text-sm">
              🔍 Verificando conexão com o Firestore...
            </div>
          )}
          
          {firestoreStatus === 'working' && (
            <div className="mt-2 p-2 bg-green-900/50 text-green-300 rounded-lg text-sm">
              ✅ Conectado ao Firestore - Sincronização ativa
            </div>
          )}
          
          {firestoreStatus === 'error' && (
            <div className="mt-2 p-2 bg-orange-900/50 text-orange-300 rounded-lg text-sm">
              ⚠️ Firestore indisponível - Salvando localmente. 
              <a 
                href="https://console.firebase.google.com/project/astroquiz-3a316/firestore/rules" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1 hover:text-yellow-300"
              >
                Aplicar regras de segurança
              </a>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            🔄 {t("restore_defaults")}
          </button>
          <button
            onClick={saveGameRules}
            disabled={saving}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? `💾 ${t("saving_rules")}` : `💾 ${t("save_rules")}`}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes("✅") ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configurações de Tempo */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">⏱️ {t("time_settings")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("time_per_question")}
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={rules.timePerQuestion || 15}
                onChange={(e) => handleInputChange('timePerQuestion', null, parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("time_bonus")}
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={rules.timeBonus || 2}
                onChange={(e) => handleInputChange('timeBonus', null, parseInt(e.target.value) || 2)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("time_penalty")}
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={rules.timePenalty || 1}
                onChange={(e) => handleInputChange('timePenalty', null, parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Pontuação */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">🎯 {t("scoring_settings")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("points_per_correct")}
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={rules.pointsPerCorrectAnswer || 10}
                onChange={(e) => handleInputChange('pointsPerCorrectAnswer', null, parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("points_per_level")}
              </label>
              <input
                type="number"
                min="50"
                max="500"
                value={rules.pointsPerLevel || 100}
                onChange={(e) => handleInputChange('pointsPerLevel', null, parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("points_multiplier")}
              </label>
              <input
                type="number"
                min="1.0"
                max="3.0"
                step="0.1"
                value={rules.pointsMultiplier || 1.5}
                onChange={(e) => handleInputChange('pointsMultiplier', null, parseFloat(e.target.value) || 1.5)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("streak_bonus")}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={rules.streakBonus || 5}
                onChange={(e) => handleInputChange('streakBonus', null, parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Progresso */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">📈 {t("progress_settings")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("passing_percentage")}
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={rules.passingPercentage || 80}
                onChange={(e) => handleInputChange('passingPercentage', null, parseInt(e.target.value) || 80)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("questions_per_level")}
              </label>
              <input
                type="number"
                min="5"
                max="20"
                value={rules.questionsPerLevel || 10}
                onChange={(e) => handleInputChange('questionsPerLevel', null, parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("max_attempts")}
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={rules.maxAttempts || 0}
                onChange={(e) => handleInputChange('maxAttempts', null, parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("unlock_requirement")}
              </label>
              <input
                type="number"
                min="1"
                max="3"
                value={rules.unlockRequirement || 2}
                onChange={(e) => handleInputChange('unlockRequirement', null, parseInt(e.target.value) || 2)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Multiplicador de Dificuldade
              </label>
              <input
                type="number"
                min="1.0"
                max="2.0"
                step="0.1"
                value={rules.difficultyMultiplier || 1.2}
                onChange={(e) => handleInputChange('difficultyMultiplier', null, parseFloat(e.target.value) || 1.2)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Conquistas */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">🏆 {t("achievement_settings")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("speed_demon")}
              </label>
              <input
                type="number"
                min="60"
                max="300"
                value={rules.achievementThresholds?.speedDemon || 120}
                onChange={(e) => handleInputChange('achievementThresholds', 'speedDemon', parseInt(e.target.value) || 120)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("perfectionist")}
              </label>
              <input
                type="number"
                min="90"
                max="100"
                value={rules.achievementThresholds?.perfectionist || 95}
                onChange={(e) => handleInputChange('achievementThresholds', 'perfectionist', parseInt(e.target.value) || 95)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("streak_master")}
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={rules.achievementThresholds?.streakMaster || 5}
                onChange={(e) => handleInputChange('achievementThresholds', 'streakMaster', parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Modo de Jogo */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">🔧 {t("game_mode_settings")}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("allow_hints")}</label>
              <input
                type="checkbox"
                checked={rules.allowHints || false}
                onChange={(e) => handleInputChange('allowHints', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("allow_skip")}</label>
              <input
                type="checkbox"
                checked={rules.allowSkip || false}
                onChange={(e) => handleInputChange('allowSkip', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("show_timer")}</label>
              <input
                type="checkbox"
                checked={rules.showTimer || true}
                onChange={(e) => handleInputChange('showTimer', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("show_progress")}</label>
              <input
                type="checkbox"
                checked={rules.showProgress || true}
                onChange={(e) => handleInputChange('showProgress', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Ranking */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">🏅 {t("ranking_settings")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("ranking_update_interval")}
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={rules.rankingUpdateInterval || 5}
                onChange={(e) => handleInputChange('rankingUpdateInterval', null, parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("ranking_display_limit")}
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={rules.rankingDisplayLimit || 50}
                onChange={(e) => handleInputChange('rankingDisplayLimit', null, parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Notificações */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">📱 {t("notification_settings")}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("enable_notifications")}</label>
              <input
                type="checkbox"
                checked={rules.enableNotifications || true}
                onChange={(e) => handleInputChange('enableNotifications', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("daily_reminder")}</label>
              <input
                type="checkbox"
                checked={rules.dailyReminder || true}
                onChange={(e) => handleInputChange('dailyReminder', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t("achievement_notifications")}</label>
              <input
                type="checkbox"
                checked={rules.achievementNotifications || true}
                onChange={(e) => handleInputChange('achievementNotifications', null, e.target.checked)}
                className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Informações da Versão */}
      <div className="mt-8 p-4 bg-gray-800/30 rounded-lg">
        <div className="flex justify-between items-center text-sm text-gray-400">
          <div>
            <span className="font-medium">{t("version_info")}:</span> {rules.version || '1.0.0'}
          </div>
          <div>
            <span className="font-medium">{t("last_updated")}:</span> {rules.lastUpdated ? rules.lastUpdated.toLocaleString() : new Date().toLocaleString()}
          </div>
          <div>
            <span className="font-medium">{t("updated_by")}:</span> {rules.updatedBy || 'admin'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRulesManager;
