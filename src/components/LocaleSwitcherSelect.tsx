'use client';

import { useState, useTransition } from 'react';
import { Locale } from '@/i18n/config';
import { setUserLocale } from '@/service/locale';
import { DynamicIcon } from 'lucide-react/dynamic';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';

type Props = {
  defaultValue: string;
  items: Array<{value: string; label: string}>;
};

export default function LocaleSwitcherSelect({
  defaultValue,
  items,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState(defaultValue);

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setCurrentLocale(locale);
      setUserLocale(locale);
    });
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <DynamicIcon name="languages" className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item) => (
            <DropdownMenuItem key={item.value} onClick={() => onChange(item.value)} inset>
              {item.value === currentLocale && (
                <div className="absolute left-2 w-[1rem]">
                  <DynamicIcon name="check" className="h-5 w-5 text-slate-600" />
                </div>
              )}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}