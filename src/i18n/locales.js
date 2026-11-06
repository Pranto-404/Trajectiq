export const LOCALES = [
  ['en', 'English'], ['bn', 'বাংলা'], ['es', 'Español'], ['fr', 'Français'],
  ['de', 'Deutsch'], ['pt', 'Português'], ['ar', 'العربية'], ['hi', 'हिन्दी'],
  ['zh', '简体中文'], ['ja', '日本語'], ['ru', 'Русский'], ['id', 'Bahasa Indonesia'],
].map(([code, name]) => ({code, name, dir: code === 'ar' ? 'rtl' : 'ltr'}));
export const LANGUAGES = LOCALES.map(l => l.code);
export const normalizeLanguage = lang => LANGUAGES.includes(lang) ? lang : 'en';
