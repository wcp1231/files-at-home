'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaFolder } from 'react-icons/fa';
import useWebRTCStore, { ConnectionState } from '@/store/webrtcStore';
import { SharedFileInfo } from '@/utils/webrtcUtils';
import RemoteFileManager from '@/components/RemoteFileManager';

export default function ReceivePage() {
  const searchParams = useSearchParams();
  const [connectionIdInput, setConnectionIdInput] = useState('');
  
  const { 
    connectionState, 
    error, 
    initializeClient, 
    disconnect,
    requestFile,
    requestDirectory
  } = useWebRTCStore();
  
  // 从 URL 参数中获取连接 ID
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setConnectionIdInput(id);
      handleConnect(id);
    }
  }, [searchParams]);
  
  // 连接到主机
  const handleConnect = (id: string = connectionIdInput) => {
    if (!id) return;
    initializeClient(id);
  };
  
  // 断开连接
  const handleDisconnect = () => {
    disconnect();
  };
  
  // 处理文件请求
  const handleFileSelect = (file: SharedFileInfo) => {
    if (!file.isDirectory) {
      requestFile(file.path);
    }
  };

  // 处理目录请求
  const handleDirectorySelect = (file: SharedFileInfo) => {
    console.log('directory select', file)
  };
  
  // 渲染连接表单
  const renderConnectionForm = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">连接到分享</h2>
      <div className="mb-4">
        <label htmlFor="connectionId" className="block text-sm font-medium text-gray-700 mb-1">
          连接 ID
        </label>
        <input
          type="text"
          id="connectionId"
          value={connectionIdInput}
          onChange={(e) => setConnectionIdInput(e.target.value)}
          placeholder="粘贴连接 ID 或 URL"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={() => handleConnect()}
        disabled={!connectionIdInput || connectionState === ConnectionState.CONNECTING}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {connectionState === ConnectionState.CONNECTING ? '连接中...' : '连接'}
      </button>
    </div>
  );
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">接收分享</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {connectionState === ConnectionState.DISCONNECTED && renderConnectionForm()}
      
      {connectionState === ConnectionState.CONNECTING && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">正在连接...</p>
        </div>
      )}
      
      {connectionState === ConnectionState.CONNECTED && (
        <div className="mb-6">
          <RemoteFileManager onFileSelect={handleFileSelect} onDirectorySelect={handleDirectorySelect} />
          
          <div className="mt-4 text-center">
            <button
              onClick={handleDisconnect}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors"
            >
              断开连接
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center mt-6">
        <Link
          href="/"
          className="text-blue-500 hover:underline"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
} 