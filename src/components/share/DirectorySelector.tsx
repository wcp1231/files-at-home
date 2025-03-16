import React from 'react';
import { DynamicIcon } from 'lucide-react/dynamic'
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from 'next-intl';

interface DirectorySelectorProps {
  onSelectDirectory: () => Promise<void>;
}

export default function DirectorySelector({ onSelectDirectory }: DirectorySelectorProps) {
  const t = useTranslations('ShareView');
  return (
    <Card>
      <CardHeader className="text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <DynamicIcon name="folder" className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('directorySelector.title')}</CardTitle>
            <CardDescription className="mt-2">
              {t('directorySelector.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center md:justify-end">
        <Button onClick={onSelectDirectory}>
          {t('directorySelector.selectDirectoryButton')}
        </Button>
      </CardContent>
    </Card>
  );
} 