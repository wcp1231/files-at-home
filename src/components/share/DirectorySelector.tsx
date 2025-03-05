import React from 'react';
import { FaFolder } from 'react-icons/fa';

interface DirectorySelectorProps {
  onSelectDirectory: () => Promise<void>;
}

export default function DirectorySelector({ onSelectDirectory }: DirectorySelectorProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between py-6 px-4">
      <div className="flex items-center mb-4 md:mb-0">
        <div className="bg-blue-50 p-4 rounded-full mr-4">
          <FaFolder className="text-blue-500 text-2xl" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1">选择要分享的目录</h2>
          <p className="text-gray-600 text-sm">
            选择一个目录后，系统将生成一个分享链接，您可以将此链接发送给他人以共享目录内容。
          </p>
        </div>
      </div>
      
      <button
        onClick={onSelectDirectory}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors whitespace-nowrap"
      >
        选择目录
      </button>
    </div>
  );
} 