import { useState, useRef, useEffect } from "react";
import { Peer, DataConnection } from 'peerjs';
import { FSDirectory, FSFile } from "@/lib/filesystem";
import { 
  ConnectionState,
  PeerRole,
  createPeer, 
  serializeMessage, 
  deserializeMessage, 
  MessageType, 
  SharedFileInfo,
  handleToSharedFileInfo,
} from '@/lib/webrtc';


interface UseWebRTCHostProps {
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  getFile: (filePath: string) => Promise<FSFile | null>;
}

// 处理文件请求
async function handleFileRequest(
  conn: DataConnection,
  filePath: string, 
  getFile: (filePath: string) => Promise<FSFile | null>,
  requestId?: string
) {
  try {
    const file = await getFile(filePath);
    if (!file) {
      throw new Error('文件不存在');
    }
    
    // 发送文件数据
    const message = {
      type: MessageType.FILE_DATA,
      payload: {
        path: filePath,
        name: file.name,
        type: file.type,
        size: file.size,
        // 在实际应用中，这里需要分块发送文件内容
        // 这里简化处理，实际应用中不应该这样做
        // data: await file.text()
      },
      requestId
    };
    
    conn.send(serializeMessage(message));
  } catch (err: any) {
    const errorMessage = {
      type: MessageType.ERROR,
      payload: {
        message: err.message || '文件处理错误',
        path: filePath
      },
      requestId
    };
    
    conn.send(serializeMessage(errorMessage));
  }
}

// 处理目录请求
async function handleDirectoryRequest(
  conn: DataConnection,
  path: string,
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>,
  requestId?: string
) {
  try {
    const directory = await getDirectory(path, false);
    
    if (!directory) {
      throw new Error('目录不存在');
    }
    
    // 将目录中的文件和子目录转换为可共享的格式
    const fileList: SharedFileInfo[] = [];
    
    // 获取目录中的文件列表
    const files = await directory.getFiles();
    for (const entry of files) {
      fileList.push(handleToSharedFileInfo(entry));
    }
    
    // 发送目录信息
    const message = {
      type: MessageType.DIRECTORY_REQUEST,
      payload: fileList,
      requestId
    };
    
    conn.send(serializeMessage(message));
  } catch (err: any) {
    const errorMessage = {
      type: MessageType.ERROR,
      payload: {
        message: err.message || '目录处理错误',
        path
      },
      requestId
    };
    
    conn.send(serializeMessage(errorMessage));
  }
}


export function useWebRTCHost({ getDirectory, getFile }: UseWebRTCHostProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<PeerRole>(PeerRole.HOST);
  const [peer, setPeer] = useState<Peer | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const connectionIdRef = useRef<string | null>(null);

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
        case MessageType.FILE_REQUEST:
          // 处理文件请求
          handleFileRequest(conn, message.payload, getFile, message.requestId);
          break;
        case MessageType.DIRECTORY_REQUEST:
          // 处理目录请求
          handleDirectoryRequest(conn, message.payload, getDirectory, message.requestId);
          break;
        case MessageType.ERROR:
          setError(message.payload);
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  const handleConnection = (conn: DataConnection) => {
    setConnection(conn);
    // 设置连接事件
    conn.on('open', () => {
      console.log('Host connection opened');
      setConnectionState(ConnectionState.CONNECTED);
    });

    conn.on('data', (data) => {
      handleOnData(conn, data as string);
    });

    conn.on('close', () => {
      console.log('Host connection closed');
      setConnectionState(ConnectionState.DISCONNECTED);
      setConnection(null);
    });
    
    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setError(`连接错误: ${err}`);
      setConnectionState(ConnectionState.ERROR);
    });
  }

  const initializeHost = async () => {
    setConnectionState(ConnectionState.INITIALIZING);
    setRole(PeerRole.HOST);

    // 创建一个随机 ID 的 Peer
    const peer = createPeer();

    // 设置事件监听器
    peer.on('open', (id) => {
      console.log('Host peer ID:', id, peer.id);
      setConnectionState(ConnectionState.WAITING_FOR_CONNECTION);
      // 使用 peer ID 作为连接 ID
      setConnectionId(id);
    });

    peer.on('connection', (conn) => {
      console.log('Host received connection');
      handleConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError(`连接错误: ${err}`);
      setConnectionState(ConnectionState.ERROR);
    });
    
    peer.on('disconnected', () => {
      console.log('Host peer disconnected');
      setConnectionState(ConnectionState.DISCONNECTED);
      // 尝试重新连接
      peer.reconnect();
    });
    
    peer.on('close', () => {
      console.log('Host peer closed');
      setConnectionState(ConnectionState.DISCONNECTED);
      setPeer(null);
      setConnection(null);
    });
    setPeer(peer);

    // 等待生成连接 ID
    return new Promise<string>((resolve) => {
      const checkConnectionId = () => {
        if (connectionIdRef.current) {
          resolve(connectionIdRef.current);
        } else {
          setTimeout(checkConnectionId, 100);
        }
      };
      checkConnectionId();
    });
  }

  // 断开连接
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