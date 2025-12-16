import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAiChatVisible?: boolean;
  setIsAiChatVisible?: (visible: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isAiChatVisible = false, setIsAiChatVisible }) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-white shadow-2xl max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <i className="fas fa-cog text-2xl text-blue-400"></i>
            <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
            <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            aria-label={t('settings.close')}
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* General Section */}
          <section className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-globe text-blue-400"></i>
              <h3 className="text-lg font-bold text-white">{t('settings.general')}</h3>
              <span className="text-xs text-gray-400 ml-auto">General</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.language')} / Language</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLanguageChange('zh')}
                    className={`flex-1 py-3 rounded-lg border transition-all duration-300 ${
                      currentLanguage === 'zh'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <i className="fas fa-language text-lg"></i>
                      <span className="font-bold">{t('settings.chinese')}</span>
                      <span className="text-xs opacity-80">Chinese</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 py-3 rounded-lg border transition-all duration-300 ${
                      currentLanguage === 'en'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <i className="fas fa-language text-lg"></i>
                      <span className="font-bold">{t('settings.english')}</span>
                      <span className="text-xs opacity-80">English</span>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t('settings.languageDescription')}
                </p>
              </div>
            </div>
          </section>

          {/* Interface Section */}
          <section className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-desktop text-green-400"></i>
              <h3 className="text-lg font-bold text-white">{t('settings.interface')}</h3>
              <span className="text-xs text-gray-400 ml-auto">Interface</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className="fas fa-robot text-green-400"></i>
                  <div>
                    <div className="font-medium text-white">{t('settings.aiAssistant')}</div>
                    <div className="text-xs text-gray-400">AI Assistant Visibility</div>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsAiChatVisible && setIsAiChatVisible(!isAiChatVisible)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isAiChatVisible ? 'bg-green-600' : 'bg-gray-700'}`}
                    aria-label={isAiChatVisible ? t('settings.disableAiAssistant') : t('settings.enableAiAssistant')}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${isAiChatVisible ? 'translate-x-6' : ''}`}></div>
                  </button>
                  <span className="text-xs text-gray-500 mt-1 block text-center">{isAiChatVisible ? t('settings.enabled') : t('settings.disabled')}</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-400 p-3 bg-gray-900/30 rounded-lg border border-gray-800">
                <i className="fas fa-info-circle text-blue-400 mr-2"></i>
                {t('settings.aiAssistantDescription')}
              </div>
            </div>
          </section>

          {/* Data Section */}
          <section className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-database text-yellow-400"></i>
              <h3 className="text-lg font-bold text-white">{t('settings.data')}</h3>
              <span className="text-xs text-gray-400 ml-auto">Data</span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors group"
                  disabled
                >
                  <div className="flex flex-col items-center gap-1">
                    <i className="fas fa-save text-yellow-400 text-lg group-hover:scale-110 transition-transform"></i>
                    <span className="font-medium text-white">{t('settings.save')}</span>
                    <span className="text-xs text-gray-400">Save Data</span>
                  </div>
                </button>
                <button
                  className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors group"
                  disabled
                >
                  <div className="flex flex-col items-center gap-1">
                    <i className="fas fa-folder-open text-yellow-400 text-lg group-hover:scale-110 transition-transform"></i>
                    <span className="font-medium text-white">{t('settings.load')}</span>
                    <span className="text-xs text-gray-400">Load Data</span>
                  </div>
                </button>
              </div>
              
              <div className="text-sm text-gray-400 p-3 bg-gray-900/30 rounded-lg border border-gray-800">
                <i className="fas fa-clock text-yellow-400 mr-2"></i>
                {t('settings.saveLoadDescription')}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              <i className="fas fa-code-branch mr-2"></i>
              PolyForge Engine v1.0
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
              {t('settings.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
