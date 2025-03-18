import React from 'react';
import { DynamicIcon } from 'lucide-react/dynamic'
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from 'next-intl';

interface DirectorySelectorProps {
  onSelectDirectory: () => Promise<void>;
  isFileSystemAccessSupported: () => boolean;
}

export default function DirectorySelector({ onSelectDirectory, isFileSystemAccessSupported }: DirectorySelectorProps) {
  const t = useTranslations('ShareView.directorySelector');

  // 检查是否支持文件系统访问 API
  const isSupported = isFileSystemAccessSupported();

  return (
    <Card>
      <CardHeader className="text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            {isSupported ? (
              <DynamicIcon name="folder" className="h-8 w-8 text-primary" />
            ) : (
              <DynamicIcon name="folder-x" className="h-8 w-8 text-destructive" />
            )}
          </div>
          <div>
            <CardTitle className="text-xl">{
              isSupported ? (
                t('title')
              ) : (
                t('unsupported.title')
              )
            }</CardTitle>
            <CardDescription className="mt-2">
              {isSupported ? (
                t('description')
              ) : (
                t('unsupported.description')
              )
            }</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center md:justify-end">
        <Button onClick={onSelectDirectory} disabled={!isSupported}>
          {t('selectDirectoryButton')}
        </Button>
      </CardContent>
    </Card>
  );
} 