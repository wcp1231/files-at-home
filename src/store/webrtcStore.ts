import { create } from 'zustand';
import { Peer, DataConnection } from 'peerjs';
import { 
  createPeer, 
  serializeMessage, 
  deserializeMessage, 
  MessageType, 
  SharedFileInfo,
  sendData,
  handleToSharedFileInfo
} from '@/utils/webrtcUtils';
import { FSFile } from './fileSystemStore';
import { FSDirectory } from './fileSystemStore';

// 连接状态枚举
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// 角色枚举
export enum PeerRole {
  HOST = 'host',
  CLIENT = 'client',
}

// WebRTC 状态接口
interface WebRTCState {
  // 状态
  connectionState: ConnectionState;
  role: PeerRole | null;
  peer: Peer | null;
  connection: DataConnection | null;
  connectionId: string | null;
  error: string | null;
  remoteFiles: SharedFileInfo[];

  getDirectory?: (path: string, recursive: boolean) => FSDirectory | null;
  getFile?: (filePath: string) => FSFile | null;
  
  // 操作
  initializeHost: (getDirectory: (path: string, recursive: boolean) => FSDirectory | null, getFile: (filePath: string) => FSFile | null) => Promise<string>;
  initializeClient: (connectionId: string) => void;
  disconnect: () => void;
  sendDirectory: (path: string) => void;
  requestFile: (filePath: string) => void;
  requestDirectory: (path: string) => void;
  setError: (error: string | null) => void;
  setRemoteFiles: (files: SharedFileInfo[]) => void;
}

// 创建 store
const useWebRTCStore = create<WebRTCState>((set, get) => ({
  // 初始状态
  connectionState: ConnectionState.DISCONNECTED,
  role: null,
  peer: null,
  connection: null,
  connectionId: null,
  error: null,
  remoteFiles: [],

  getDirectory: undefined,
  getFile: undefined,
  
  // 初始化主机
  initializeHost: async (getDirectory: (path: string, recursive: boolean) => FSDirectory | null, getFile: (filePath: string) => FSFile | null) => {
    try {
      set({ 
        connectionState: ConnectionState.CONNECTING,
        role: PeerRole.HOST,
        error: null
      });
      
      // 创建一个随机 ID 的 Peer
      const peer = createPeer();
      set({ peer, getDirectory, getFile });
      
      // 设置事件监听器
      peer.on('open', (id) => {
        console.log('Host peer ID:', id);
        // 使用 peer ID 作为连接 ID
        set({ connectionId: id });
      });
      
      peer.on('connection', (conn) => {
        console.log('Host received connection');
        
        // 保存连接
        set({ connection: conn });
        
        // 设置连接事件
        conn.on('open', () => {
          console.log('Host connection opened');
          set({ connectionState: ConnectionState.CONNECTED });
          // 连接成功后发送文件列表
          get().sendDirectory('/');
        });
        
        conn.on('data', (data) => {
          try {
            const message = deserializeMessage(data as string);
            
            switch (message.type) {
              case MessageType.FILE_REQUEST:
                // 处理文件请求
                handleFileRequest(message.payload, getFile, conn);
                break;
              case MessageType.DIRECTORY_REQUEST:
                // 处理目录请求
                handleDirectoryRequest(message.payload, getDirectory, conn);
                break;
              case MessageType.ERROR:
                set({ error: message.payload });
                break;
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });
        
        conn.on('close', () => {
          console.log('Host connection closed');
          set({ 
            connectionState: ConnectionState.DISCONNECTED,
            connection: null
          });
        });
        
        conn.on('error', (err) => {
          console.error('Connection error:', err);
          set({ 
            error: `连接错误: ${err}`,
            connectionState: ConnectionState.ERROR
          });
        });
      });
      
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        set({ 
          error: `连接错误: ${err}`,
          connectionState: ConnectionState.ERROR
        });
      });
      
      peer.on('disconnected', () => {
        console.log('Host peer disconnected');
        set({ connectionState: ConnectionState.DISCONNECTED });
        // 尝试重新连接
        peer.reconnect();
      });
      
      peer.on('close', () => {
        console.log('Host peer closed');
        set({ 
          connectionState: ConnectionState.DISCONNECTED,
          peer: null,
          connection: null
        });
      });
      
      // 等待生成连接 ID
      return new Promise((resolve) => {
        const checkConnectionId = () => {
          const connectionId = get().connectionId;
          if (connectionId) {
            resolve(connectionId);
          } else {
            setTimeout(checkConnectionId, 100);
          }
        };
        checkConnectionId();
      });
    } catch (err: any) {
      set({ 
        error: `初始化错误: ${err.message}`,
        connectionState: ConnectionState.ERROR
      });
      throw err;
    }
  },
  
  // 初始化客户端
  initializeClient: (connectionId: string) => {
    try {
      set({ 
        connectionState: ConnectionState.CONNECTING,
        role: PeerRole.CLIENT,
        error: null,
        connectionId
      });
      
      // 创建一个Peer（不指定ID）
      const peer = createPeer();
      set({ peer });
      
      // 监听 open 事件
      peer.on('open', () => {
        console.log('Client peer opened');
        
        // 连接到主机
        const conn = peer.connect(connectionId, {
          reliable: true
        });
        
        set({ connection: conn });
        
        // 设置连接事件
        conn.on('open', () => {
          console.log('Client connection opened');
          set({ connectionState: ConnectionState.CONNECTED });
        });
        
        conn.on('data', (data) => {
          try {
            const message = deserializeMessage(data as string);
            
            switch (message.type) {
              case MessageType.DIRECTORY_REQUEST:
                // 处理文件列表
                set({ remoteFiles: message.payload });
                break;
              case MessageType.FILE_DATA:
                // 处理文件数据
                console.log('Received file data:', message.payload);
                break;
              case MessageType.ERROR:
                set({ error: message.payload });
                break;
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });
        
        conn.on('close', () => {
          console.log('Client connection closed');
          set({ 
            connectionState: ConnectionState.DISCONNECTED,
            connection: null
          });
        });
        
        conn.on('error', (err) => {
          console.error('Connection error:', err);
          set({ 
            error: `连接错误: ${err}`,
            connectionState: ConnectionState.ERROR
          });
        });
      });
      
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        set({ 
          error: `连接错误: ${err}`,
          connectionState: ConnectionState.ERROR
        });
      });
      
      peer.on('disconnected', () => {
        console.log('Client peer disconnected');
        set({ connectionState: ConnectionState.DISCONNECTED });
        // 尝试重新连接
        peer.reconnect();
      });
      
      peer.on('close', () => {
        console.log('Client peer closed');
        set({ 
          connectionState: ConnectionState.DISCONNECTED,
          peer: null,
          connection: null
        });
      });
    } catch (err: any) {
      set({ 
        error: `初始化错误: ${err.message}`,
        connectionState: ConnectionState.ERROR
      });
    }
  },
  
  // 断开连接
  disconnect: () => {
    const { peer, connection } = get();
    
    if (connection) {
      connection.close();
    }
    
    if (peer) {
      peer.destroy();
    }
    
    set({
      connectionState: ConnectionState.DISCONNECTED,
      role: null,
      peer: null,
      connection: null,
      connectionId: null,
      error: null,
      remoteFiles: []
    });
  },
  
  // 发送文件列表
  sendDirectory: async (path: string) => {
    const { connection } = get();
    
    if (!connection) {
      set({ error: '未连接或未选择共享目录' });
      return;
    }
    
    try {
      const files = await get().getDirectory!(path, true)?.getFiles();
      if (!files) {
        set({ error: '目录不存在' });
        return;
      }
      const sharedFiles = await Promise.all(files.map(async (file) => {
        return await handleToSharedFileInfo(file);
      }));
      
      const message = {
        type: MessageType.DIRECTORY_REQUEST,
        payload: sharedFiles
      };
      
      sendData(connection, message);
    } catch (err: any) {
      set({ error: `发送文件列表失败: ${err.message}` });
    }
  },
  
  // 请求文件
  requestFile: (filePath: string) => {
    const { connection } = get();
    
    if (!connection) {
      set({ error: '未连接' });
      return;
    }
    
    const message = {
      type: MessageType.FILE_REQUEST,
      payload: filePath
    };
    
    sendData(connection, message);
  },

  // 请求目录
  requestDirectory: (path: string) => {
    const { connection } = get();
    
    if (!connection) {
      set({ error: '未连接' });
      return;
    }
    
    const message = {
      type: MessageType.DIRECTORY_REQUEST,
      payload: path
    };
    
    sendData(connection, message);
  },
  
  // 设置错误
  setError: (error: string | null) => {
    set({ error });
  },
  
  // 设置远程文件列表
  setRemoteFiles: (files: SharedFileInfo[]) => {
    set({ remoteFiles: files });
  }
}));

// 处理文件请求
async function handleFileRequest(
  filePath: string, 
  getFile: (filePath: string) => FSFile | null,
  conn: DataConnection
) {
  try {
    const file = getFile(filePath);
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
      }
    };
    
    sendData(conn, message);
  } catch (err: any) {
    const errorMessage = {
      type: MessageType.ERROR,
      payload: `获取文件失败: ${err.message}`
    };
    
    sendData(conn, errorMessage);
  }
}

// 处理目录请求
async function handleDirectoryRequest(
  path: string,
  getDirectory: (path: string, recursive: boolean) => FSDirectory | null,
  conn: DataConnection
) {
  try {
    const directory = getDirectory(path, true);
    if (!directory) {
      const errorMessage = {
        type: MessageType.ERROR,
        payload: '目录不存在'
      };
      sendData(conn, errorMessage);
      return;
    }
    const files = await directory.getFiles();
    const sharedFiles = await Promise.all(files.map(async (file) => {
      return await handleToSharedFileInfo(file);
    }));
    
    const message = {
      type: MessageType.DIRECTORY_REQUEST,
      payload: sharedFiles
    };
    
    sendData(conn, message);
  } catch (err: any) {
    const errorMessage = {
      type: MessageType.ERROR,
      payload: `获取目录失败: ${err.message}`
    };
    sendData(conn, errorMessage);
  }
}

export default useWebRTCStore; 