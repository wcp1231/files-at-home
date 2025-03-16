export const locales = [{ value: 'en', label: 'English' }, { value: 'zh', label: '中文' }] as const;

export type Locale = (typeof locales)[number]['value'];
export const defaultLocale: Locale = 'en';
