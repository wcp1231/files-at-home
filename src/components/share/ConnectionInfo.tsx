import React, { useState } from 'react';
import { FaLink, FaCopy, FaCheck } from 'react-icons/fa';

interface ConnectionInfoProps {
  connectionId: string | null;
  shareUrl: string;
  onDisconnect: () => void;
}

export default function ConnectionInfo({ connectionId, shareUrl, onDisconnect }: ConnectionInfoProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between py-3 px-4 mb-4 border-b">
      <div className="flex items-center">
        <div className="bg-green-50 p-2 rounded-full mr-3">
          <FaLink className="text-green-500 text-xl" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">目录已准备好分享</h2>
          <p className="text-sm text-gray-600">
            Peer ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{connectionId}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center mt-2 md:mt-0">
        <div className="bg-gray-50 p-2 rounded-md flex items-center mr-3">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="w-40 md:w-64 bg-transparent border-none focus:outline-none text-sm"
          />
          <button
            onClick={handleCopyLink}
            className="ml-2 p-1 text-gray-500 hover:text-blue-500"
            title="复制链接"
          >
            {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
          </button>
        </div>
        
        <button
          onClick={onDisconnect}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 text-sm rounded-md transition-colors"
        >
          断开连接
        </button>
      </div>
    </div>
  );
} 