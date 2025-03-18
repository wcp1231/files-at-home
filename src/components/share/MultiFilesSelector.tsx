import { ChangeEvent, useState } from 'react'
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DynamicIcon } from 'lucide-react/dynamic';
import { useTranslations } from 'next-intl';

interface MultiFilesSelectorProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  className?: string;
}

export function MultiFilesSelector({ onFilesSelected, accept, className }: MultiFilesSelectorProps) {
  const t = useTranslations('ShareView.multiFilesSelector');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFiles(files);
  };

  const handleFilesSelected = () => {
    onFilesSelected(files);
  };

  return (
    <Card>
      <CardHeader className="text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <DynamicIcon name="files" className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('title')}</CardTitle>
            <CardDescription className="mt-2">
              {t('description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader> 
      <CardContent className="flex justify-center md:justify-end">
        <div className="flex w-full items-center space-x-2">
          <Input
            type="file"
            multiple
            onChange={handleFileChange}
            accept={accept}
            className={className}
          />
          <Button onClick={handleFilesSelected}>
            {t('shareButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
