import { useState, useRef, useEffect } from "react";
import { Peer, DataConnection } from 'peerjs';
import { 
  ConnectionState,
  PeerRole,
  createPeer, 
  serializeMessage, 
  deserializeMessage, 
  MessageType, 
  SharedFileInfo,
} from '@/lib/webrtc';

// Define types for the pending requests
interface PendingFileRequest {
  resolve: (data: SharedFileInfo | null) => void;
  reject: (error: Error) => void;
  path: string;
}

interface PendingDirectoryRequest {
  resolve: (data: SharedFileInfo[]) => void;
  reject: (error: Error) => void;
  path: string;
}

type RequestId = string;

export function useWebRTCClient() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<PeerRole>(PeerRole.HOST);
  const [peer, setPeer] = useState<Peer | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  
  // Store pending requests with their resolvers
  const pendingFileRequests = useRef<Map<RequestId, PendingFileRequest>>(new Map());
  const pendingDirectoryRequests = useRef<Map<RequestId, PendingDirectoryRequest>>(new Map());

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);
  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  const handleOnData = (conn: DataConnection, data: string) => {
    try {
      const message = deserializeMessage(data as string);
      
      switch (message.type) {
        case MessageType.DIRECTORY_REQUEST:
          // 处理远程的目录列表响应
          if (message.requestId && pendingDirectoryRequests.current.has(message.requestId)) {
            const request = pendingDirectoryRequests.current.get(message.requestId)!;
            request.resolve(message.payload);
            pendingDirectoryRequests.current.delete(message.requestId);
          } else {
            console.log('Received directory request:', message.payload);
          }
          break;
          
        case MessageType.FILE_DATA:
          // 处理远程的文件数据响应
          if (message.requestId && pendingFileRequests.current.has(message.requestId)) {
            const request = pendingFileRequests.current.get(message.requestId)!;
            request.resolve(message.payload);
            pendingFileRequests.current.delete(message.requestId);
          } else {
            console.log('Received file data:', message.payload);
          }
          break;
          
        case MessageType.ERROR:
          // 处理错误响应
          setError(message.payload?.message || message.payload);
          
          // 检查是否有关联的请求需要拒绝
          if (message.requestId) {
            if (pendingFileRequests.current.has(message.requestId)) {
              const request = pendingFileRequests.current.get(message.requestId)!;
              request.reject(new Error(message.payload?.message || message.payload));
              pendingFileRequests.current.delete(message.requestId);
            } else if (pendingDirectoryRequests.current.has(message.requestId)) {
              const request = pendingDirectoryRequests.current.get(message.requestId)!;
              request.reject(new Error(message.payload?.message || message.payload));
              pendingDirectoryRequests.current.delete(message.requestId);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  const handleConnection = (conn: DataConnection) => {
    setConnectionState(ConnectionState.CONNECTING);
    setConnection(conn);
        
    // 设置连接事件
    conn.on('open', () => {
      console.log('Client connection opened');
      setConnectionState(ConnectionState.CONNECTED);
    });
    
    conn.on('data', (data) => {
      handleOnData(conn, data as string);
    });
    
    conn.on('close', () => {
      console.log('Client connection closed');
      setConnectionState(ConnectionState.DISCONNECTED);
      setConnection(null);
    });
    
    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setError(`连接错误: ${err}`);
      setConnectionState(ConnectionState.ERROR);
    });
  }

  // 初始化客户端
  const initializeClient = (connectionId: string) => {
    try {
      setConnectionState(ConnectionState.INITIALIZING);
      setRole(PeerRole.CLIENT);
      setError(null);
      setConnectionId(connectionId);
      
      // 创建一个Peer（不指定ID）
      const peer = createPeer();
      setPeer(peer);
      
      // 监听 open 事件
      peer.on('open', () => {
        console.log('Client peer opened');
        
        // 连接到主机
        const conn = peer.connect(connectionId, {
          reliable: true
        });
        handleConnection(conn);
      });
      
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setError(`连接错误: ${err}`);
        setConnectionState(ConnectionState.ERROR);
      });
      
      peer.on('disconnected', () => {
        console.log('Client peer disconnected');
        setConnectionState(ConnectionState.DISCONNECTED);
        // 尝试重新连接
        peer.reconnect();
      });
      
      peer.on('close', () => {
        console.log('Client peer closed');
        setConnectionState(ConnectionState.DISCONNECTED);
        setPeer(null);
        setConnection(null);
      });
    } catch (err: any) {
      setError(`初始化错误: ${err.message}`);
      setConnectionState(ConnectionState.ERROR);
    }
  }

  const disconnect = () => {
    if (connectionRef.current) {
      connectionRef.current.close();
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setPeer(null);
    setConnection(null);
    setConnectionId(null);
    setError(null);
  }

  // 请求文件
  async function requestFile(filePath: string): Promise<SharedFileInfo | null> {
    if (!connectionRef.current) {
      setError('未连接');
      return null;
    }
    
    // 生成唯一请求ID
    const requestId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建请求Promise
    const requestPromise = new Promise<SharedFileInfo | null>((resolve, reject) => {
      const pendingRequest: PendingFileRequest = {
        resolve,
        reject,
        path: filePath
      };
      
      pendingFileRequests.current.set(requestId, pendingRequest);
      
      // 设置超时处理
      setTimeout(() => {
        if (pendingFileRequests.current.has(requestId)) {
          pendingFileRequests.current.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, 30000); // 30秒超时
    });
    
    // 发送请求
    const message = {
      type: MessageType.FILE_REQUEST,
      payload: filePath,
      requestId
    };
    
    connectionRef.current.send(serializeMessage(message));
    return requestPromise;
  }

  // 请求目录
  async function requestDirectory(path: string): Promise<SharedFileInfo[]> {
    if (!connectionRef.current) {
      setError('未连接');
      return [];
    }
    
    // 生成唯一请求ID
    const requestId = `dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建请求Promise
    const requestPromise = new Promise<SharedFileInfo[]>((resolve, reject) => {
      const pendingRequest: PendingDirectoryRequest = {
        resolve,
        reject,
        path
      };
      
      pendingDirectoryRequests.current.set(requestId, pendingRequest);
      
      // 设置超时处理
      setTimeout(() => {
        if (pendingDirectoryRequests.current.has(requestId)) {
          pendingDirectoryRequests.current.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, 30000); // 30秒超时
    });
    
    // 发送请求
    const message = {
      type: MessageType.DIRECTORY_REQUEST,
      payload: path,
      requestId
    };
    
    connectionRef.current.send(serializeMessage(message));
    return requestPromise;
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
    requestDirectory,
  }
}