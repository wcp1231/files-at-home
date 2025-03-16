'use client'

import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { formatFileSize } from '@/lib/filesystem/util';

export default function AudioPlayerDialog() {
  const {
    audioDialogOpen,
    selectedFile,
    audioUrl,
    setAudioUrl,
    setAudioDialogOpen
  } = useFileBrowserStore();

  const audioRef = useRef<HTMLAudioElement>(null);

  const handleClose = () => {
    setAudioDialogOpen(false);
    setAudioUrl(null);
  }

  const onOpenChange = (open: boolean) => {
    setAudioDialogOpen(open);
    if (!open) {
      handleClose();
    }
  }

  useEffect(() => {
    // 当对话框打开时自动播放
    if (audioDialogOpen && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Auto-play failed:', error);
      });
    }
  }, [audioDialogOpen]);

  if (!selectedFile) return null;
  if (!audioUrl) return null;

  return (
    <Dialog open={audioDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{selectedFile.name}</span>
            {selectedFile.size !== undefined && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 pt-4">
          <div className="w-full bg-muted rounded-lg p-6">
            <audio
              ref={audioRef}
              controls
              className="w-full"
              controlsList="nodownload"
              preload="metadata"
            >
              <source src={audioUrl} type={selectedFile.type || 'audio/mpeg'} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 