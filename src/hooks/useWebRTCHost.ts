import { useState, useRef, useEffect } from "react";
import { Peer, DataConnection } from 'peerjs';
import { FSDirectory, FSFile } from "@/lib/filesystem";
import { 
  ConnectionState,
  PeerRole,
  HostConnectionManager
} from '@/lib/webrtc';

interface UseWebRTCHostProps {
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  getFile: (filePath: string) => Promise<FSFile | null>;
}

export function useWebRTCHost({ getDirectory, getFile }: UseWebRTCHostProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<PeerRole>(PeerRole.HOST);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  // 使用 useRef 保存 HostConnectionManager 实例，确保它在重新渲染之间保持稳定
  const connectionManager = useRef<HostConnectionManager | null>(null);
  
  // 初始化 HostConnectionManager
  useEffect(() => {
    connectionManager.current = new HostConnectionManager(
      getDirectory,
      getFile,
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
      (errorMsg) => setError(errorMsg),
      (id) => setConnectionId(id)
    );
    
    return () => {
      // 在组件卸载时断开连接
      if (connectionManager.current) {
        connectionManager.current.disconnect();
      }
    };
  }, [getDirectory, getFile]);

  // 初始化主机
  const initializeHost = async () => {
    setRole(PeerRole.HOST);
    setError(null);
    
    if (connectionManager.current) {
      await connectionManager.current.initializeHost();
      return connectionId;
    }
    
    return null;
  }

  // 断开连接
  const disconnect = () => {
    if (connectionManager.current) {
      connectionManager.current.disconnect();
    }
    
    setConnectionId(null);
    setError(null);
  }

  return {
    connectionState,
    connectionId,
    connection,
    error,
    peer,
    initializeHost,
    disconnect,
  }
}