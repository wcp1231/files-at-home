import React from 'react';

interface ShareHeaderProps {
  error: string | null;
}

export default function ShareHeader({ error }: ShareHeaderProps) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">分享目录</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
    </>
  );
} 