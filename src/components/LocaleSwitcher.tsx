import { useLocale } from 'next-intl';
import LocaleSwitcherSelect from './LocaleSwitcherSelect';
import { locales } from '@/i18n/config';

export default function LocaleSwitcher() {
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={locales.map((locale) => ({
        value: locale.value,
        label: locale.label,
      }))}
    />
  );
}