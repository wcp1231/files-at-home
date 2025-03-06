import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home, RefreshCw } from 'lucide-react';
import { useFileBrowserStore } from '@/store/fileBrowserStore';

export default function HeaderToolbar() {
  const { 
    breadcrumbs, 
    navigateToBreadcrumb, 
    refreshCurrentDirectory
  } = useFileBrowserStore();

  const handleBreadcrumbClick = async (index: number) => {
    await navigateToBreadcrumb(index);
  };

  const handleRefresh = async () => {
    await refreshCurrentDirectory();
  };

  return (
    <div className="flex items-center py-2 divide-x-1 space-x-2">
      <div className="flex items-center px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBreadcrumbClick(0)}
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center pl-2 overflow-x-auto">
        {breadcrumbs.map((crumb: string, index: number) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-sm"
              onClick={() => handleBreadcrumbClick(index)}
            >
              {index === 0 ? 'Home' : crumb}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}