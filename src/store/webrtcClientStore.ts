import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Peer, DataConnection } from 'peerjs';
import { 
  ConnectionState,
  PeerRole,
  SharedFileInfo,
  FileTransfer
} from '@/lib/webrtc';
import { ClientConnectionManager } from '@/lib/webrtc/client';
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { useFileBrowserStore } from '@/components/filebrowser';

// 将FSEntry映射到FileEntry
function mapFSEntryToFileEntry(entry: SharedFileInfo | null): FileViewEntry | null {
  if (!entry) {
    return null;
  }
  return {
    name: entry.name,
    path: entry.path,
    size: entry.size,
    type: entry.type,
    modifiedAt: entry.modifiedAt,
    isDirectory: entry.isDirectory
  };
}

// WebRTC 客户端状态接口
interface WebRTCClientState {
  // 状态
  connectionState: ConnectionState;
  error: string | null;
  role: PeerRole;
  peer: Peer | null;
  connection: DataConnection | null;
  connectionId: string | null;
  fileTransfers: FileTransfer[];
  
  // 内部引用
  _connectionManager: ClientConnectionManager | null;
  
  // 动作
  initializeClient: (id: string) => void;
  disconnect: () => void;
  requestFile: (filePath: string) => Promise<FileViewEntry | null>;
  requestFileData: (filePath: string) => Promise<Blob | null>;
  requestDirectory: (path: string) => Promise<FileViewEntry[]>;
  cancelFileTransfer: (fileId: string) => void;
  clearCompletedTransfers: () => void;
  
  // 内部使用的帮助方法
  _createConnectionManager: () => void;
  _setConnectionState: (state: ConnectionState) => void;
  _setError: (error: string | null) => void;
  _setPeer: (peer: Peer | null) => void;
  _setConnection: (connection: DataConnection | null) => void;
  _setConnectionId: (id: string | null) => void;
  _updateFileTransfer: (transfer: FileTransfer) => void;
}

// 创建 WebRTC 客户端 store
export const useWebRTCClientStore = create<WebRTCClientState>()(
  immer((set, get) => ({
    // 初始状态
    connectionState: ConnectionState.DISCONNECTED,
    error: null,
    role: PeerRole.CLIENT,
    peer: null,
    connection: null,
    connectionId: null,
    fileTransfers: [],
    _connectionManager: null,

    _createConnectionManager: () => {
      const { _setConnectionState, _setError, _updateFileTransfer, _connectionManager, requestFile, requestFileData, requestDirectory } = get();
      const { setCallbacks, initialize, cleanup } = useFileBrowserStore.getState();
      const manager = new ClientConnectionManager(
        (state) => {
          _setConnectionState(state);
          // 更新连接状态相关状态
          if (state === ConnectionState.CONNECTED) {
            if (_connectionManager) {
              set((draft) => {
                draft.peer = _connectionManager.getPeer();
                draft.connection = _connectionManager.getConnection();
              });
            }
            setCallbacks({
              onFileSelect: requestFile,
              onFileData: requestFileData,
              onDirectorySelect: requestDirectory,
              renderFileIcon: undefined
            });
            initialize('/');
          } else if (state === ConnectionState.DISCONNECTED) {
            set((draft) => {
              draft.peer = null;
              draft.connection = null;
            });
            setCallbacks({
              onFileSelect: undefined,
              onFileData: undefined,
              onDirectorySelect: undefined,
              renderFileIcon: undefined
            });
            cleanup();
          }
        },
        (errorMsg) => _setError(errorMsg),
        (transfer) => {
          _updateFileTransfer(transfer);
        }
      );
      set((draft) => {
        draft._connectionManager = manager;
      });
    },
    
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
    
    // 更新文件传输
    _updateFileTransfer: (transfer) => set((draft) => {
      const index = draft.fileTransfers.findIndex(t => t.fileId === transfer.fileId);
      
      if (index !== -1) {
        // 更新现有传输
        draft.fileTransfers[index] = transfer;
      } else {
        // 添加新传输
        draft.fileTransfers.push(transfer);
      }
    }),
    
    // 初始化客户端
    initializeClient: (id) => {
      set((draft) => {
        draft.role = PeerRole.CLIENT;
        draft.error = null;
        draft.connectionId = id;
      });

      if (!get()._connectionManager) {
        get()._createConnectionManager();
      }
      
      if (get()._connectionManager) {
        get()._connectionManager.initializeClient(id);
      }
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
      });
    },
    
    // 请求文件信息
    requestFile: async (filePath) => {
      const state = get();
      if (!state._connectionManager) {
        set((draft) => { draft.error = '管理器未初始化'; });
        return null;
      }
      
      try {
        const file =  await state._connectionManager.getRequestManager().requestFile(filePath);
        return mapFSEntryToFileEntry(file);
      } catch (err: any) {
        set((draft) => { draft.error = err.message; });
        return null;
      }
    },
    
    // 请求文件数据
    requestFileData: async (filePath) => {
      const state = get();
      if (!state._connectionManager) {
        set((draft) => { draft.error = '管理器未初始化'; });
        return null;
      }
      
      try {
        return await state._connectionManager.getRequestManager().requestFileData(filePath);
      } catch (err: any) {
        set((draft) => { draft.error = err.message; });
        return null;
      }
    },
    
    // 请求目录
    requestDirectory: async (path) => {
      const state = get();
      if (!state._connectionManager) {
        set((draft) => { draft.error = '管理器未初始化'; });
        return [];
      }
      
      try {
        const files =  await state._connectionManager.getRequestManager().requestDirectory(path);
        return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
      } catch (err: any) {
        set((draft) => { draft.error = err.message; });
        return [];
      }
    },
    
    // 取消文件传输
    cancelFileTransfer: (fileId) => {
      const state = get();
      if (state._connectionManager) {
        state._connectionManager.getRequestManager().cancelFileTransfer(fileId);
      }
    },
    
    // 清除已完成的传输记录
    clearCompletedTransfers: () => set((draft) => {
      draft.fileTransfers = draft.fileTransfers.filter(transfer => 
        transfer.status !== 'completed' && 
        transfer.status !== 'error' && 
        transfer.status !== 'cancelled'
      );
    })
  }))
);

