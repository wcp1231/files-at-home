'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DynamicIcon } from 'lucide-react/dynamic'
import LocaleSwitcher from './LocaleSwitcher'

export function Header() {
  const t = useTranslations('Header');
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-10 items-center">
        <div className="mx-4 md:mx-0 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">{t('title')}</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center space-x-2 justify-end mx-4 md:mx-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <DynamicIcon name={theme === 'light' ? 'moon' : 'sun'} size={20} />
            </Button>
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
} 