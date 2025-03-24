import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndexedDBFileStorage } from '@/utils/IndexedDBFileStorage';
import { toast } from '@/hooks/use-toast';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Badge } from "@/components/ui/badge";

interface ReceivedFile {
  id?: number;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format date
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function ReceivedFilesDialog() {
  const t = useTranslations('ReceivedFilesDialog');
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [storage, setStorage] = useState<IndexedDBFileStorage | null>(null);

  // Initialize storage and load files when dialog opens
  useEffect(() => {
    if (open && !storage) {
      const fileStorage = new IndexedDBFileStorage('host-uploads');
      setStorage(fileStorage);
    }
    
    if (open) {
      loadFiles();
    }
  }, [open, storage]);

  // Load all files from IndexedDB
  const loadFiles = async () => {
    if (!storage) return;
    
    setLoading(true);
    try {
      const filesList = await storage.listFiles();
      setFiles(filesList);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('errors.loadFailed'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Download a file
  const handleDownload = async (file: ReceivedFile) => {
    if (!storage) return;
    
    try {
      const fileData = await storage.getFile(file.name);
      if (!fileData) {
        throw new Error(t('errors.fileNotFound'));
      }
      
      const url = URL.createObjectURL(fileData);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: t('downloadSuccess'),
        description: t('downloadSuccessDescription', { fileName: file.name }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('errors.downloadFailed'),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Delete a file
  const handleDelete = async (file: ReceivedFile) => {
    if (!storage) return;
    
    try {
      await storage.deleteFile(file.name);
      setFiles(files.filter(f => f.name !== file.name));
      
      toast({
        title: t('deleteSuccess'),
        description: t('deleteSuccessDescription', { fileName: file.name }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('errors.deleteFailed'),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
        >
          <DynamicIcon name="inbox" className="h-3.5 w-3.5 mr-1" />
          <span>{t('title')}</span>
          {files.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {files.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        
        <div className="relative h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <DynamicIcon name="loader-2" className="h-8 w-8 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <DynamicIcon name="inbox" className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-muted-foreground">{t('noFiles')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.fileName')}</TableHead>
                  <TableHead>{t('table.fileSize')}</TableHead>
                  <TableHead>{t('table.receivedDate')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.name}>
                    <TableCell className="font-medium">{file.name}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{formatDate(file.lastModified)}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownload(file)}
                      >
                        <DynamicIcon name="download" className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(file)}
                      >
                        <DynamicIcon name="trash-2" className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={() => loadFiles()} disabled={loading}>
            <DynamicIcon name="refresh-cw" className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
