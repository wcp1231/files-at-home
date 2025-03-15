'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { formatFileSize } from '@/lib/filesystem/util';

export default function ImageViewerDialog() {
  const {
    imageDialogOpen,
    selectedFile,
    imageUrl,
    setImageUrl,
    setImageDialogOpen
  } = useFileBrowserStore();

  const handleClose = () => {
    setImageDialogOpen(false);
    setImageUrl(null);
  }

  const onOpenChange = (open: boolean) => {
    setImageDialogOpen(open);
    if (!open) {
      handleClose();
    }
  }

  if (!selectedFile) return null;
  if (!imageUrl) return null;

  return (
    <Dialog open={imageDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[100vh] p-0 py-6 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className='px-6'>
          <DialogTitle className=''>
            {selectedFile.name}
            {selectedFile.size !== undefined && (
              <span className="ml-2 text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-center max-h-[80vh] overflow-auto p-4">
          <div className="relative">
            <img
              src={imageUrl}
              alt={selectedFile.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              style={{ 
                minHeight: '200px',
                background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px'
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 