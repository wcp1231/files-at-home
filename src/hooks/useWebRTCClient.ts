import { useState, useRef, useEffect } from "react";
import { Peer, DataConnection } from 'peerjs';
import { 
  ConnectionState,
  PeerRole,
  SharedFileData,
  SharedFileInfo,
} from '@/lib/webrtc';
import { ClientConnectionManager } from '@/lib/webrtc';

export function useWebRTCClient() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<PeerRole>(PeerRole.HOST);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  // 使用 useRef 保存 ConnectionManager 实例，确保它在重新渲染之间保持稳定
  const connectionManager = useRef<ClientConnectionManager | null>(null);
  
  // 初始化 ConnectionManager
  useEffect(() => {
    connectionManager.current = new ClientConnectionManager(
      (state) => {
        setConnectionState(state);
        
        // 更新连接状态相关状态
        if (state === ConnectionState.CONNECTED) {
          if (connectionManager.current) {
            setPeer(connectionManager.current.getPeer());
            setConnection(connectionManager.current.getConnection());
          }
        } else if (state === ConnectionState.DISCONNECTED) {
          setPeer(null);
          setConnection(null);
        }
      },
      (errorMsg) => setError(errorMsg)
    );
    
    return () => {
      // 在组件卸载时断开连接
      if (connectionManager.current) {
        connectionManager.current.disconnect();
      }
    };
  }, []);

  // 初始化客户端
  const initializeClient = (id: string) => {
    setRole(PeerRole.CLIENT);
    setError(null);
    setConnectionId(id);
    
    if (connectionManager.current) {
      connectionManager.current.initializeClient(id);
    }
  }

  // 断开连接
  const disconnect = () => {
    if (connectionManager.current) {
      connectionManager.current.disconnect();
    }
    
    setConnectionId(null);
    setError(null);
  }

  // 请求文件
  async function requestFile(filePath: string): Promise<SharedFileInfo | null> {
    if (!connectionManager.current) {
      setError('管理器未初始化');
      return null;
    }
    
    try {
      return await connectionManager.current.getRequestManager().requestFile(filePath);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }

  // 请求文件数据
  async function requestFileData(filePath: string): Promise<SharedFileData | null> {
    if (!connectionManager.current) {
      setError('管理器未初始化');
      return null;
    }
    
    try {
      return await connectionManager.current.getRequestManager().requestFileData(filePath);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }

  // 请求目录
  async function requestDirectory(path: string): Promise<SharedFileInfo[]> {
    if (!connectionManager.current) {
      setError('管理器未初始化');
      return [];
    }
    
    try {
      return await connectionManager.current.getRequestManager().requestDirectory(path);
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }

  return {
    connectionState,
    error,
    role,
    peer,
    connection,
    initializeClient,
    disconnect,
    requestFile,
    requestFileData,
    requestDirectory,
  }
}