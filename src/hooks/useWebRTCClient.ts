import { useState, useRef, useEffect } from "react";
import { Peer, DataConnection } from 'peerjs';
import { 
  ConnectionState,
  PeerRole,
  SharedFileInfo,
  FileTransfer
} from '@/lib/webrtc';
import { ClientConnectionManager } from '@/lib/webrtc';

export function useWebRTCClient() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<PeerRole>(PeerRole.CLIENT);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  // 文件传输相关状态
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
  
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
      (errorMsg) => setError(errorMsg),
      (transfer) => {
        // 更新文件传输状态
        setFileTransfers(prevTransfers => {
          // 查找是否已存在该传输
          const index = prevTransfers.findIndex(t => t.fileId === transfer.fileId);
          
          if (index !== -1) {
            // 更新现有传输
            const updatedTransfers = [...prevTransfers];
            updatedTransfers[index] = transfer;
            return updatedTransfers;
          } else {
            // 添加新传输
            return [...prevTransfers, transfer];
          }
        });
      }
    );
    
    return () => {
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
  async function requestFileData(filePath: string): Promise<Blob | null> {
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

  // 取消文件传输
  const cancelFileTransfer = (fileId: string) => {
    if (connectionManager.current) {
      connectionManager.current.getRequestManager().cancelFileTransfer(fileId);
    }
  };
  
  // 清除已完成的传输记录
  const clearCompletedTransfers = () => {
    setFileTransfers(prevTransfers => 
      prevTransfers.filter(transfer => 
        transfer.status !== 'completed' && 
        transfer.status !== 'error' && 
        transfer.status !== 'cancelled'
      )
    );
  };

  console.log('connectionState', connectionState);
  return {
    connectionState,
    error,
    role,
    peer,
    connection,
    connectionId,
    initializeClient,
    disconnect,
    requestFile,
    requestFileData,
    requestDirectory,
    // 文件传输相关
    fileTransfers,
    cancelFileTransfer,
    clearCompletedTransfers
  }
}