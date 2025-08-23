import React from "react";
import { useTranslation } from "react-i18next";

export default function Header({ onImport }) {
  const { i18n } = useTranslation();

  const handleChangeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <header className="fixed top-0 left-64 right-0 bg-black bg-opacity-60 backdrop-blur-md px-6 py-4 z-20 flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">AstroQuiz Admin</h1>

      <div className="flex items-center gap-4">
        {/* Botão de Importar */}
        <button
          onClick={onImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Import Questions
        </button>

        {/* Seletor de idioma */}
        <select
          onChange={handleChangeLanguage}
          defaultValue={i18n.language}
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
        >
          <option value="en">🇺🇸 English</option>
          <option value="pt">🇧🇷 Português</option>
          <option value="es">🇪🇸 Español</option>
          <option value="fr">🇫🇷 Français</option>
        </select>
      </div>
    </header>
  );
}
