import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileBrowserHeaderProps {
  title: string;
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => Promise<void>;
}

export function FileBrowserHeader({ 
  title, 
  breadcrumbs, 
  onBreadcrumbClick 
}: FileBrowserHeaderProps) {
  return (
    <div className="p-4 bg-card border-b">
      <h2 className="text-xl font-semibold">{title}</h2>
      
      {/* 面包屑导航 */}
      <div className="flex items-center mt-2 text-sm overflow-x-auto space-x-1">
        {breadcrumbs.map((part, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onBreadcrumbClick(index)}
            >
              {index === 0 ? <Home className="h-3 w-3 mr-1" /> : null}
              <span className="truncate max-w-[150px]">
                {index === 0 ? 'Home' : part}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 