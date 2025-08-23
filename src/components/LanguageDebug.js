import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageDebug = () => {
  const { i18n } = useTranslation();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const checkLanguages = () => {
      const info = {
        currentLanguage: i18n.language,
        availableLanguages: Object.keys(i18n.options.resources || {}),
        supportedLanguages: i18n.options.supportedLngs || [],
        resources: i18n.options.resources ? Object.keys(i18n.options.resources) : [],
        hasES: i18n.hasResourceBundle('es', 'translation'),
        hasFR: i18n.hasResourceBundle('fr', 'translation'),
        hasEN: i18n.hasResourceBundle('en', 'translation'),
        hasPT: i18n.hasResourceBundle('pt', 'translation'),
      };
      
      setDebugInfo(info);
      console.log('🔍 Debug de Idiomas:', info);
    };

    checkLanguages();
    
    // Verificar novamente após um delay
    setTimeout(checkLanguages, 2000);
  }, [i18n]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">🌐 Debug de Idiomas</h4>
      <div className="space-y-1">
        <div>Atual: <span className="text-yellow-400">{debugInfo.currentLanguage}</span></div>
        <div>Disponíveis: <span className="text-green-400">{debugInfo.availableLanguages?.join(', ')}</span></div>
        <div>Suportados: <span className="text-blue-400">{debugInfo.supportedLanguages?.join(', ')}</span></div>
        <div>ES: <span className={debugInfo.hasES ? 'text-green-400' : 'text-red-400'}>{debugInfo.hasES ? '✅' : '❌'}</span></div>
        <div>FR: <span className={debugInfo.hasFR ? 'text-green-400' : 'text-red-400'}>{debugInfo.hasFR ? '✅' : '❌'}</span></div>
        <div>EN: <span className={debugInfo.hasEN ? 'text-green-400' : 'text-red-400'}>{debugInfo.hasEN ? '✅' : '❌'}</span></div>
        <div>PT: <span className={debugInfo.hasPT ? 'text-green-400' : 'text-red-400'}>{debugInfo.hasPT ? '✅' : '❌'}</span></div>
      </div>
    </div>
  );
};

export default LanguageDebug;
