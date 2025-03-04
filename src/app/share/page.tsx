'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaFolder, FaLink, FaCopy, FaCheck } from 'react-icons/fa';
import useWebRTCStore, { ConnectionState, PeerRole } from '@/store/webrtcStore';
import FileManager from '@/components/FileManager';
import useFileSystemStore from '@/store/fileSystemStore';

export default function SharePage() {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const { rootDir, setRootDir, selectDirectory, getDirectory, getFile } = useFileSystemStore();

  const { 
    connectionState, 
    connectionId, 
    error, 
    initializeHost, 
    disconnect 
  } = useWebRTCStore();


  
  // 当连接 ID 变化时更新分享 URL
  useEffect(() => {
    if (connectionId) {
      const url = `${window.location.origin}/receive?id=${connectionId}`;
      setShareUrl(url);
    } else {
      setShareUrl('');
    }
  }, [connectionId]);
  
  // 选择目录
  const handleSelectDirectory = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      // 设置文件系统的根目录
      setRootDir(dirHandle);
      await Promise.all([
        selectDirectory('/'),
        // 初始化 WebRTC 主机
        initializeHost(getDirectory, getFile)
      ]);
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };
  
  // 复制分享链接
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // 断开连接
  const handleDisconnect = () => {
    disconnect();
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">分享目录</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {connectionState === ConnectionState.DISCONNECTED && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-blue-50 p-6 rounded-full mb-4">
              <FaFolder className="text-blue-500 text-4xl" />
            </div>
            <h2 className="text-xl font-semibold mb-2">选择要分享的目录</h2>
            <p className="text-gray-600 mb-4 text-center">
              选择一个目录后，系统将生成一个分享链接，您可以将此链接发送给他人以共享目录内容。
            </p>
            <button
              onClick={handleSelectDirectory}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
            >
              选择目录
            </button>
          </div>
        )}
        
        {connectionState === ConnectionState.CONNECTING && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">正在初始化连接...</p>
          </div>
        )}
        
        {(connectionState === ConnectionState.CONNECTED || (connectionState === ConnectionState.CONNECTING && connectionId)) && (
          <div className="flex flex-col">
            <div className="flex flex-col items-center justify-center py-4 mb-4 border-b">
              <div className="bg-green-50 p-4 rounded-full mb-4">
                <FaLink className="text-green-500 text-3xl" />
              </div>
              <h2 className="text-xl font-semibold mb-2">目录已准备好分享</h2>
              <p className="text-gray-600 mb-4 text-center">
                您正在分享目录: <span className="font-semibold">{`/`}</span>
              </p>
              
              <div className="w-full max-w-md bg-gray-50 p-3 rounded-md flex items-center mb-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-grow bg-transparent border-none focus:outline-none text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="ml-2 p-2 text-gray-500 hover:text-blue-500"
                  title="复制链接"
                >
                  {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
                </button>
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                Peer ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{connectionId}</span>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleDisconnect}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md transition-colors"
                >
                  断开连接
                </button>
              </div>
            </div>
            
            {/* 文件管理器组件 */}
            {rootDir && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4">共享目录内容</h3>
                <FileManager initialPath="/" />
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="text-center">
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