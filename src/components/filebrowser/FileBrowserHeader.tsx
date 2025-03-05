import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home, ArrowLeft, RefreshCw } from 'lucide-react';

interface FileBrowserHeaderProps {
  title: string;
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface ToolBarAndBreadcrumbsProps {
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function ToolBarAndBreadcrumbs({
  breadcrumbs,
  onBreadcrumbClick,
  onRefresh
}: ToolBarAndBreadcrumbsProps) {
  return (
    <div className="flex items-center p-2 divide-x-1 space-x-2">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="flex items-center text-xs h-6"
          title="刷新"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center overflow-x-auto">
        {breadcrumbs.map((part, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-sm"
              onClick={() => onBreadcrumbClick(index)}
            >
              {index === 0 ? <Home className="h-3 w-3 mr-1" /> : null}
              <span className="truncate max-w-[150px]">
                {index === 0 ? 'Root' : part}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
    

export function FileBrowserHeader({ 
  title, 
  breadcrumbs, 
  onBreadcrumbClick,
  onRefresh
}: FileBrowserHeaderProps) {
  return (
    <div className="bg-card border-b">
      {/* 标题 */}
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      
      {/* 工具栏和面包屑导航 */}
      <ToolBarAndBreadcrumbs 
        breadcrumbs={breadcrumbs} 
        onBreadcrumbClick={onBreadcrumbClick} 
        onRefresh={onRefresh} 
      />
    </div>
  );
} 