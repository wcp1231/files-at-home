"use client"

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDialogStore } from '@/store/dialogStore';
import { useTranslations } from 'next-intl';

export function PassphraseDialog() {
  const t = useTranslations('PassphraseDialog');
  const [passphrase, setPassphrase] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { passphraseRequest, confirmPassphrase, cancelPassphrase } = useDialogStore();

  useEffect(() => {
    if (passphraseRequest?.isOpen && inputRef.current) {
      // 当对话框打开时自动聚焦并清空输入框
      inputRef.current.focus();
      setPassphrase('');
    }
  }, [passphraseRequest?.isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim()) {
      confirmPassphrase(passphrase);
      setPassphrase('');
    }
  };

  if (!passphraseRequest) return null;

  return (
    <Dialog open={passphraseRequest.isOpen} onOpenChange={(open) => {
      if (!open) cancelPassphrase();
    }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              ref={inputRef}
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t('placeholder')}
              className="w-full"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPassphrase('');
                cancelPassphrase();
              }}
            >
              {t('button.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!passphrase.trim()}
            >
              {t('button.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 