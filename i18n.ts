import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh.json';
import en from './locales/en.json';

// 初始化 i18next
i18n
  .use(LanguageDetector) // 自动检测浏览器语言
  .use(initReactI18next) // 绑定 React
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: 'zh', // 默认语言：中文
    fallbackLng: 'en', // 回退语言：英文
    debug: false, // 开发模式下可设为 true 查看日志
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
  });

export default i18n;
