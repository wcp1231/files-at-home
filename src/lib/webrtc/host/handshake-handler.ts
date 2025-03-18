import { DataConnection } from 'peerjs';
import { HostInfo, MessageType, MetaRequest } from '@/lib/webrtc';
import { hostCrypto } from '../crypto';

/**
 * Handles the handshake process on the host side.
 * This class is responsible for validating client metadata requests
 * and completing the handshake process.
 */
export class HostHandshakeHandler {
  private hostInfo: HostInfo;
  private connection: DataConnection;
  private mismatchCount: number = 0;
  private readonly MAX_MISMATCH_COUNT = 3;
  
  // Callbacks for handshake events
  private onHandshakeComplete: () => void;
  private onHandshakeFailed: (error: string) => void;
  
  constructor(
    connection: DataConnection,
    onHandshakeComplete: () => void,
    onHandshakeFailed: (error: string) => void
  ) {
    this.hostInfo = new HostInfo();
    this.connection = connection;
    this.onHandshakeComplete = onHandshakeComplete;
    this.onHandshakeFailed = onHandshakeFailed;
  }
  
  /**
   * Handle a meta request during the handshake phase
   */
  async handleMetaRequest(requestId: string, request: MetaRequest) {
    // 获取 API 版本和客户端信息
    const { message } = request;

    // 如果不需要加密，则直接返回
    if (message === 'hello' && !hostCrypto.hasKey()) {
      this.onHandshakeComplete();
      this.sendMetaResponse(requestId, 'hello');
      return
    }
    // 如果需要加密，则则告知客户端
    if (message === 'hello' && hostCrypto.hasKey()) {
      this.sendMetaResponse(requestId, 'encrypted');
      return
    }

    const isPassphraseValid = await this.checkPassphrase(message)
    
    if (isPassphraseValid) {
      this.onHandshakeComplete();
      this.sendMetaResponse(requestId, 'hello');
      return
    }

    if (this.mismatchCount < this.MAX_MISMATCH_COUNT) {
      this.sendMetaResponse(requestId, 'mismatch');
      return
    }

    // TODO 断开连接（或停止接受新连接）
    // TODO 发送错误消息
    this.sendError(requestId, 'error');
    this.onHandshakeFailed('Passphrase mismatch');
  }

  private async checkPassphrase(message: string): Promise<boolean> {
    const { encrypted, iv } = JSON.parse(message);
    let decrypted = ''
    try {
      decrypted = await hostCrypto.decryptString(encrypted, iv);
    } catch (err: unknown) {
      this.mismatchCount++
    }
    // 判断解密后的内容是否为 hello
    return decrypted === 'hello'
  }

  private sendMetaResponse(requestId: string, message: string) {
    const wrtcMessage = {
      type: MessageType.META_RESPONSE,
      payload: {
        ...this.hostInfo.getMeta(),
        message
      },
      requestId
    };

    this.connection.send(wrtcMessage);
  }
  
  /**
   * Send an error message during handshake
   */
  private sendError(requestId: string, errorMessage: string) {
    const message = {
      type: MessageType.ERROR,
      payload: { error: errorMessage },
      requestId
    };
    
    this.connection.send(message);
  }
}

export default HostHandshakeHandler; 