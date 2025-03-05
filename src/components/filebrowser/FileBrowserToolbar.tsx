import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface FileBrowserToolbarProps {
  currentPath: string;
  onNavigateUp: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function FileBrowserToolbar({ 
  currentPath, 
  onNavigateUp, 
  onRefresh 
}: FileBrowserToolbarProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted/30">
      <div>
        {currentPath !== '/' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateUp}
            className="flex items-center text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        )}
      </div>
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="flex items-center text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>
    </div>
  );
} 