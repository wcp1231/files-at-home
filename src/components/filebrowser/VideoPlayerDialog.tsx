import React from 'react';
import { formatFileSize } from '@/lib/filesystem/util';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { useFileBrowserStore } from '@/store/fileBrowserStore';

export default function VideoPlayerDialog() {
  const {
    videoDialogOpen,
    selectedFile, 
    videoUrl,
    setVideoUrl,
    setVideoDialogOpen
  } = useFileBrowserStore();

  const handleClose = () => {
    setVideoDialogOpen(false);
    setVideoUrl(null);
  }

  const onOpenChange = (open: boolean) => {
    setVideoDialogOpen(open);
    if (!open) {
      handleClose();
    }
  }

  if (!selectedFile) return null;
  if (!videoUrl) return null;

  return (
    <Dialog open={videoDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] overflow-scroll" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{selectedFile.name}</DialogTitle>
          <DialogDescription>
            {selectedFile.size !== undefined ? formatFileSize(selectedFile.size) : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {videoUrl && (
            <ReactPlayer 
              className="absolute top-0 left-0"
              url={videoUrl}
              controls
              width="100%"
              height="100%"
              onError={(e) => {
                console.error('Video playback error', e);
                handleClose();
              }}
              config={{file:{attributes:{preload:'none'}}}}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}