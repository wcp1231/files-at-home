import React from 'react';

export default function ConnectingIndicator() {
  return (
    <div className="flex items-center justify-center py-6 px-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-4"></div>
      <p className="text-gray-600">正在初始化连接...</p>
    </div>
  );
} 