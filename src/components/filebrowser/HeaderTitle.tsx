import React, { ReactNode } from 'react';

interface HeaderTitleProps {
  title: string;
  children?: ReactNode;
}

export function HeaderTitle({ 
  title, 
  children
}: HeaderTitleProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && (
        <div className="ml-auto">
          {children}
        </div>
      )}
    </div>
  );
} 