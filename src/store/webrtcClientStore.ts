import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Peer } from 'peerjs';
import { 
  ConnectionState,
  PeerRole,
  SharedFileInfo,
  FileTransfer
} from '@/lib/webrtc';
import { ClientConnectionManager } from '@/lib/webrtc/client';
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { useFileBrowserStore } from '@/components/filebrowser';
import { enableMapSet } from 'immer';
import { toast } from '@/hooks/use-toast';

enableMapSet();

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
  connectionId: string | null;
  fileTransfers: Map<string, FileTransfer>;
  
  // 内部引用
  _connectionManager: ClientConnectionManager | null;
  
  // 动作
  initializeClient: (id: string) => void;
  disconnect: () => void;
  requestFile: (filePath: string) => Promise<FileViewEntry | null>;
  requestDirectory: (path: string) => Promise<FileViewEntry[]>;
  cancelFileTransfer: (fileId: string) => void;
  clearCompletedTransfers: () => void;
  onError: (error: string | null) => void;
  
  // 内部使用的帮助方法
  _createConnectionManager: () => void;
  _setConnectionState: (state: ConnectionState) => void;
  _setPeer: (peer: Peer | null) => void;
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
    fileTransfers: new Map(),
    _connectionManager: null,

    _createConnectionManager: () => {
      const { _setConnectionState, onError, _updateFileTransfer, _connectionManager, requestFile, requestDirectory } = get();
      const { setCallbacks, initialize, cleanup, setConnected } = useFileBrowserStore.getState();
      const manager = new ClientConnectionManager(
        (state) => {
          _setConnectionState(state);
          // 更新连接状态相关状态
          if (state === ConnectionState.CONNECTED) {
            if (_connectionManager) {
              set((draft) => {
                draft.peer = _connectionManager.getPeer();
              });
            }
            setCallbacks({
              onFileSelect: requestFile,
              onDirectorySelect: requestDirectory,
            });
            setConnected(true);  // 设置 FileBrowserStore 的连接状态为已连接
            initialize('/');
          } else if (state === ConnectionState.DISCONNECTED) {
            set((draft) => {
              draft.peer = null;
            });
            setCallbacks({
              onFileSelect: undefined,
              onDirectorySelect: undefined,
            });
            setConnected(false);  // 设置 FileBrowserStore 的连接状态为未连接
            cleanup();
          }
        },
        (errorMsg) => onError(errorMsg),
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
    
    _setPeer: (peer) => set((draft) => {
      draft.peer = peer;
    }),
    
    _setConnectionId: (id) => set((draft) => {
      draft.connectionId = id;
    }),
    
    // 更新文件传输
    _updateFileTransfer: (transfer) => set((draft) => {
      draft.fileTransfers.set(transfer.fileId, transfer);
    }),

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
        get()._connectionManager!.initializeClient(id);
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
        state.onError('管理器未初始化');
        return null;
      }
      
      try {
        const file =  await state._connectionManager.requestFile(filePath);
        return mapFSEntryToFileEntry(file);
      } catch (err: unknown) {
        state.onError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    
    // 请求目录
    requestDirectory: async (path) => {
      const state = get();
      if (!state._connectionManager) {
        state.onError('管理器未初始化');
        return [];
      }
      
      try {
        const files =  await state._connectionManager.requestDirectory(path);
        return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
      } catch (err: unknown) {
        state.onError(err instanceof Error ? err.message : String(err));
        return [];
      }
    },
    
    // 取消文件传输
    cancelFileTransfer: (fileId) => {
      const state = get();
      if (state._connectionManager) {
        state._connectionManager.cancelFileTransfer(fileId);
      }
    },
    
    // 清除已完成的传输记录
    clearCompletedTransfers: () => set((draft) => {
      draft.fileTransfers = new Map(Array.from(draft.fileTransfers.entries()).filter(([, transfer]) => 
        transfer.status !== 'completed' && 
        transfer.status !== 'error' && 
        transfer.status !== 'cancelled'
      ));
    })
  }))
);

