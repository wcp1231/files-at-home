import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home, RefreshCw } from 'lucide-react';

interface HeaderToolbarProps {
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function HeaderToolbar({
  breadcrumbs,
  onBreadcrumbClick,
  onRefresh
}: HeaderToolbarProps) {
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