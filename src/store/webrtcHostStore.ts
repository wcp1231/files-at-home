import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { 
  ConnectionState,
  HostConnectionManager
} from '@/lib/webrtc';
import { FileFSFile, FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { useFileBrowserStore } from '@/components/filebrowser';
import { toast } from '@/hooks/use-toast';
import { ClientConnectionInfo } from '@/lib/webrtc/host/enhanced-connection';

// 将FSEntry映射到FileEntry
function mapFSEntryToFileEntry (entry: FSEntry | null): FileViewEntry | null {
  if (!entry) {
    return null;
  }
  const isFile = entry instanceof FSFile || entry instanceof FileFSFile;
  return {
    name: entry.name,
    path: entry.path,
    size: isFile ? entry.size : undefined,
    type: isFile ? entry.type : undefined,
    modifiedAt: isFile ? entry.modifiedAt : undefined,
    isDirectory: entry instanceof FSDirectory
  };
}

// WebRTC 主机状态接口
interface WebRTCHostState {
  // 状态
  peerId: string;
  isConnectionInitialized: boolean;
  connections: ClientConnectionInfo[];
  connectionState: ConnectionState;
  error: string | null;
  connectionId: string | null;
  isInitialized: boolean;
  encryptionPassphrase: string | null;

  setPeerId: (peerId: string) => void;
  
  // 访问处理函数
  setFilesystemHandlers: (getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>, getFile: (filePath: string) => Promise<FSFile | null>, listFiles: (path: string) => Promise<FSEntry[] | null>) => void;
  getDirectory: ((path: string, recursive: boolean) => Promise<FSDirectory | null>) | null;
  getFile: ((filePath: string) => Promise<FSFile | null>) | null;
  listFiles: ((path: string) => Promise<FSEntry[] | null>) | null;
  
  // 内部引用
  _connectionManager: HostConnectionManager | null;
  
  // 动作
  initializeHost: (passphrase: string) => Promise<boolean>;
  disconnect: () => void;
  disconnectClient: (clientId: string) => void;

  onError: (error: string | null) => void;
  
  // 内部使用的帮助方法
  _initialize: () => void;
  _getFileEntry: (path: string) => Promise<FileViewEntry | null>;
  _getListFilesEntry: (path: string) => Promise<FileViewEntry[]>;
}

// 创建 WebRTC 主机 store
export const useWebRTCHostStore = create<WebRTCHostState>()(
  immer((set, get) => ({
    // 初始状态
    peerId: '',
    isConnectionInitialized: false,
    connections: [],
    connectionState: ConnectionState.DISCONNECTED,
    error: null,
    connectionId: null,
    isInitialized: false,
    getDirectory: null,
    getFile: null,
    listFiles: null,
    encryptionPassphrase: null,
    _connectionManager: null,

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
    _initialize: () => {
      // 如果已经初始化过，直接返回
      if (get().isInitialized) return;
      
      const { getDirectory, getFile, listFiles } = get();

      if (!getDirectory || !getFile || !listFiles) {
        toast({
          title: '必须先设置 getDirectory 和 getFile 处理函数',
          description: '请确保在 store 中正确配置 getDirectory、getFile 和 listFiles 处理函数',
        });
        return;
      }

      const manager = new HostConnectionManager(
        getDirectory,
        listFiles,
        getFile,
        {
          onClientConnected: (clientId) => {
            set((draft) => {
              draft.connectionId = clientId;
              draft.connectionState = ConnectionState.CONNECTED;
              draft.connections = manager.getAllClientInfo();
            })
          },
          onClientActivated: (clientId) => {
            set((draft) => {
              draft.connectionId = clientId;
              draft.connectionState = ConnectionState.CONNECTED;
              draft.connections = manager.getAllClientInfo();
            })
          },
          onClientDisconnected: () => {
            set((draft) => {
              draft.connectionId = null;
              draft.connectionState = ConnectionState.WAITING_FOR_CONNECTION;
              draft.connections = manager.getAllClientInfo();
            })
          },
          onStateChanged: (state) => {
            set((draft) => {
              draft.connectionState = state;
            })
          },
          onEncryptionPassphraseGenerated: (passphrase) => {
            set((draft) => {
              draft.encryptionPassphrase = passphrase;
            })
          },
          onError: (error) => {
            get().onError(error)
          }
        }
      );
      
      set(state => {
        state._connectionManager = manager;
        state.isInitialized = true;
      });
    },
    
    onError: (error) => {
      if (error) {
        toast({
          title: 'Error',
          description: error,
        });
      }
      set((draft) => {
        draft.error = error;
      });
    },

    _getFileEntry: async (path: string) => {
      const { getFile, onError } = get();
      if (!getFile) {
        onError('必须先设置 getFile 处理函数');
        return null;
      }
      onError(null);
      try {
        const file = await getFile(path);
        return mapFSEntryToFileEntry(file);
      } catch (err) {
        onError('无法加载文件');
        return null;
      }
    },

    _getListFilesEntry: async (path: string) => {
      const { listFiles, onError } = get();
      if (!listFiles) {
        onError('必须先设置 listFiles 处理函数');
        return [];
      }
      try {
        const files = await listFiles(path);
        if (!files) return [];  
        return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
      } catch (err) {
        onError('无法加载目录内容');
        return [];
      }
    },
    
    // 初始化主机
    initializeHost: async (passphrase: string) => {
      const state = get();
      
      // 确保已设置文件系统处理函数
      if (!state.getDirectory || !state.getFile) {
        state.onError('必须先设置 getDirectory 和 getFile 处理函数');
        return false;
      }

      if (!state.peerId) {
        state.onError('必须先设置 peerId');
        return false;
      }

      set((draft) => {
        draft.connectionState = ConnectionState.INITIALIZING;
      })
      
      // 确保 store 已初始化
      if (!state.isInitialized) {
        state._initialize();
      }
      
      set((draft) => {
        draft.error = null;
        draft.isConnectionInitialized = true;
      });
      
      if (get()._connectionManager) {
        // 如果提供了密码，使用带密码的初始化方法
        await get()._connectionManager!.initializeHost(state.peerId, passphrase)
        return true;
      }
      
      return false;
    },
    
    // 断开连接
    disconnect: () => {
      const { _connectionManager } = get();
      if (_connectionManager) {
        _connectionManager.disconnectAll();
        set({ connectionState: ConnectionState.DISCONNECTED });
      }
    },

    // 断开指定客户端连接
    disconnectClient: (clientId: string) => {
      const { _connectionManager } = get();
      if (_connectionManager) {
        _connectionManager.disconnectClient(clientId);
      }
    }
  }))
);
