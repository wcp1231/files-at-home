import React, { useEffect } from 'react';
import { ConnectionState } from '@/lib/webrtc';
import ConnectionInfo from './ConnectionInfo';
import { useWebRTCHostStore } from '@/store/webrtcHostStore';

interface ConnectionPanelProps {}

// 使用模块级变量来跟踪连接状态，确保它在组件重新渲染或卸载时不会重置
// 这样可以防止重复初始化连接
let isConnectionInitialized = false;

export default function ConnectionPanel({}: ConnectionPanelProps) {
  // 使用 useWebRTCHost hook 管理 WebRTC 连接
  const {
    connectionState,
    connectionId,
    error,
    initializeHost,
    disconnect
  } = useWebRTCHostStore();

  // 只在需要时初始化连接
  useEffect(() => {
    initializeHost();
    return () => {
      // 只在开发环境或调试时记录日志
      console.log('ConnectionPanel unmounting, but keeping initialization state');
      // 注意：我们不再调用 disconnect()，除非真的需要断开连接
      // 例如，如果应用程序正在关闭或用户明确要求断开连接
    };
  }, [initializeHost]);

  // 监听连接状态变化
  useEffect(() => {
    // 如果连接状态变为 DISCONNECTED 或 ERROR，并且不是由用户主动断开的
    // 可以选择是否自动重连
    if ((connectionState === ConnectionState.DISCONNECTED || 
         connectionState === ConnectionState.ERROR) && 
        isConnectionInitialized) {
      
      console.log(`Connection state changed to ${connectionState}, but keeping initialization state`);
      
      // 在这里可以选择是否自动尝试重新连接
      // 例如:
      // setTimeout(() => {
      //   initializeHost().catch(console.error);
      // }, 5000);
    }
  }, [connectionState, initializeHost]);

  // 连接成功状态
  return (
    <ConnectionInfo 
      error={error} 
      connectionState={connectionState} 
      connectionId={connectionId} 
      disconnect={disconnect} 
    />
  );
}