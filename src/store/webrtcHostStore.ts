import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Peer, DataConnection } from 'peerjs';
import { 
  ConnectionState,
  PeerRole,
  HostConnectionManager
} from '@/lib/webrtc';
import { FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { useFileBrowserStore } from '@/components/filebrowser';

// 将FSEntry映射到FileEntry
function mapFSEntryToFileEntry (entry: FSEntry | null): FileViewEntry | null {
  if (!entry) {
    return null;
  }
  return {
    name: entry.name,
    path: entry.path,
    size: entry instanceof FSFile ? entry.size : undefined,
    type: entry instanceof FSFile ? entry.type : undefined,
    modifiedAt: entry instanceof FSFile ? entry.modifiedAt : undefined,
    isDirectory: !(entry instanceof FSFile)
  };
}

// WebRTC 主机状态接口
interface WebRTCHostState {
  // 状态
  peerId: string;
  isConnectionInitialized: boolean;
  connectionState: ConnectionState;
  error: string | null;
  role: PeerRole;
  peer: Peer | null;
  connection: DataConnection | null;
  connectionId: string | null;
  isInitialized: boolean;
  encryptionKey: string | null;

  setPeerId: (peerId: string) => void;
  
  // 访问处理函数
  setFilesystemHandlers: (getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>, getFile: (filePath: string) => Promise<FSFile | null>, listFiles: (path: string) => Promise<FSEntry[] | null>) => void;
  getDirectory: ((path: string, recursive: boolean) => Promise<FSDirectory | null>) | null;
  getFile: ((filePath: string) => Promise<FSFile | null>) | null;
  listFiles: ((path: string) => Promise<FSEntry[] | null>) | null;
  
  // 内部引用
  _connectionManager: HostConnectionManager | null;
  
  initialize: () => void;
  
  // 动作
  initializeHost: (passphrase: string) => Promise<string | null>;
  disconnect: () => void;
  
  // 内部使用的帮助方法
  _setConnectionManager: (manager: HostConnectionManager) => void;
  _setConnectionState: (state: ConnectionState) => void;
  _setError: (error: string | null) => void;
  _setPeer: (peer: Peer | null) => void;
  _setConnection: (connection: DataConnection | null) => void;
  _setConnectionId: (id: string | null) => void;
  _getFileEntry: (path: string) => Promise<FileViewEntry | null>;
  _getListFilesEntry: (path: string) => Promise<FileViewEntry[]>;
  _setEncryptionKey: (key: string | null) => void;
}

// 创建 WebRTC 主机 store
export const useWebRTCHostStore = create<WebRTCHostState>()(
  immer((set, get) => ({
    // 初始状态
    peerId: '',
    isConnectionInitialized: false,
    connectionState: ConnectionState.DISCONNECTED,
    error: null,
    role: PeerRole.HOST,
    peer: null,
    connection: null,
    connectionId: null,
    isInitialized: false,
    getDirectory: null,
    getFile: null,
    listFiles: null,
    _connectionManager: null,
    encryptionKey: null,
    setFilesystemHandlers: (getDirectory, getFile, listFiles) => { 
      set((state) => {
        state.getDirectory = getDirectory;
        state.getFile = getFile;
        state.listFiles = listFiles;
      })
      const { _getListFilesEntry, _getFileEntry } = get();
      useFileBrowserStore.getState().setCallbacks({
        onFileSelect: _getFileEntry,
        onDirectorySelect: _getListFilesEntry,
      });
    },

    setPeerId: (peerId: string) => set((state) => {
      state.peerId = peerId;
    }),
    
    // 初始化方法
    initialize: () => {
      // 如果已经初始化过，直接返回
      if (get().isInitialized) return;
      
      const { getDirectory, getFile, listFiles } = get();

      if (!getDirectory || !getFile || !listFiles) {
        console.error('必须先设置 getDirectory 和 getFile 处理函数');
        return;
      }

      const manager = new HostConnectionManager(
        getDirectory,
        listFiles,
        getFile,
        (connectionState) => {
          const store = get();
          store._setConnectionState(connectionState);
          
          // 更新连接状态相关状态
          if (connectionState === ConnectionState.CONNECTED) {
            if (manager) {
              store._setPeer(manager.getPeer());
              store._setConnection(manager.getConnection());
            }
          } else if (connectionState === ConnectionState.DISCONNECTED) {
            store._setPeer(null);
            store._setConnection(null);
          }
        },
        (errorMsg) => get()._setError(errorMsg),
        (id) => get()._setConnectionId(id),
        (key) => get()._setEncryptionKey(key)
      );
      
      set(state => {
        state._connectionManager = manager;
        state.isInitialized = true;
      });
    },
    
    // 设置连接管理器
    _setConnectionManager: (manager) => set((state) => {
      state._connectionManager = manager;
    }),
    
    // 状态更新方法
    _setConnectionState: (state) => set((draft) => {
      draft.connectionState = state;
    }),
    
    _setError: (error) => set((draft) => {
      draft.error = error;
    }),
    
    _setPeer: (peer) => set((draft) => {
      draft.peer = peer;
    }),
    
    _setConnection: (connection) => set((draft) => {
      draft.connection = connection;
    }),
    
    _setConnectionId: (id) => set((draft) => {
      draft.connectionId = id;
    }),

    _getFileEntry: async (path: string) => {
      const { getFile, _setError } = get();
      if (!getFile) {
        _setError('必须先设置 getFile 处理函数');
        return null;
      }
      _setError(null);
      try {
        const file = await getFile(path);
        return mapFSEntryToFileEntry(file);
      } catch (err) {
        console.error('Error selecting file:', err);
        _setError('无法加载文件');
        return null;
      }
    },

    _getListFilesEntry: async (path: string) => {
      const { listFiles, _setError } = get();
      if (!listFiles) {
        _setError('必须先设置 listFiles 处理函数');
        return [];
      }
      try {
        const files = await listFiles(path);
        if (!files) return [];  
        return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
      } catch (err) {
        console.error('Error listing directory:', err);
        _setError('无法加载目录内容');
        return [];
      }
    },

    _setEncryptionKey: (key) => set((draft) => {
      draft.encryptionKey = key;
    }),
    
    // 初始化主机
    initializeHost: async (passphrase: string) => {
      const state = get();
      
      // 确保已设置文件系统处理函数
      if (!state.getDirectory || !state.getFile) {
        state._setError('必须先设置 getDirectory 和 getFile 处理函数');
        return null;
      }

      if (!state.peerId) {
        state._setError('必须先设置 peerId');
        return null;
      }
      
      // 确保 store 已初始化
      if (!state.isInitialized) {
        state.initialize();
      }
      
      set((draft) => {
        draft.role = PeerRole.HOST;
        draft.error = null;
        draft.isConnectionInitialized = true;
      });
      
      if (get()._connectionManager) {
        // 如果提供了密码，使用带密码的初始化方法
        await get()._connectionManager!.initializeHost(state.peerId, passphrase).catch((err) => {
          console.error('Failed to initialize host with passphrase:', err);
          set((draft) => {
            draft.connectionId = null;
            draft.error = err.message;
          });
        });
        return get().connectionId;
      }
      
      return null;
    },
    
    // 断开连接
    disconnect: () => {
      const state = get();
      if (state._connectionManager) {
        state._connectionManager.disconnect();
      }
      
      set((draft) => {
        draft.connectionId = null;
        draft.error = null;
        draft.isConnectionInitialized = false;
      });
    }
  }))
);
