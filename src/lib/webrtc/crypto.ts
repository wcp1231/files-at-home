import { Buffer } from 'buffer';

/**
 * WebRTC 加密工具，提供文件数据的端到端加密
 */
export class WebRTCCrypto {
  private encryptionKey: CryptoKey | null = null;
  private ready: Promise<void>;
  private salt: Uint8Array;
  
  constructor() {
    // 初始化加密模块
    this.ready = this.initialize();
    // 创建盐值 - 这可以是固定的，因为我们将使用密码作为变量部分
    this.salt = new TextEncoder().encode('WebRTC-Files-E2EE-Salt-Value');
  }
  
  /**
   * 初始化加密模块
   */
  private async initialize(): Promise<void> {
    // 确保 crypto API 可用
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API 不可用，无法提供端到端加密');
    }
  }
  
  /**
   * 等待加密模块准备完成
   */
  async waitReady(): Promise<void> {
    return this.ready;
  }
  
  /**
   * 从用户输入的文本生成加密密钥
   * @param passphrase 用户输入的密码或短语
   * @return 可分享的密钥格式（用于显示）
   */
  async generateKeyFromPassphrase(passphrase: string): Promise<string> {
    if (!passphrase || passphrase.trim().length === 0) {
      throw new Error('密码不能为空');
    }
    
    // 从密码导入密钥材料
    const keyMaterial = await this.getKeyMaterialFromPassphrase(passphrase);
    
    // 使用 PBKDF2 派生最终的加密密钥
    this.encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 100000, // 高迭代次数增加安全性
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // 不可导出
      ['encrypt', 'decrypt']
    );
    
    // 返回一个标准化格式的可分享密码
    // 为了让用户方便记忆，我们可以返回原始密码或其哈希的截断版本
    return this.formatPassphraseForSharing(passphrase);
  }
  
  /**
   * 将用户密码格式化为可分享的格式
   */
  private formatPassphraseForSharing(passphrase: string): string {
    // 这个示例直接返回原始密码，也可以进行额外处理如添加连字符等
    return passphrase;
  }
  
  /**
   * 从密码中获取密钥材料
   */
  private async getKeyMaterialFromPassphrase(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    
    // 从密码导入密钥材料
    return window.crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
  }
  
  /**
   * 使用给定的密码短语设置加密密钥
   */
  async setKeyFromPassphrase(passphrase: string): Promise<void> {
    if (!passphrase || passphrase.trim().length === 0) {
      throw new Error('密码不能为空');
    }
    
    // 从密码导入密钥材料
    const keyMaterial = await this.getKeyMaterialFromPassphrase(passphrase);
    
    // 使用 PBKDF2 派生最终的加密密钥
    this.encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * 加密数据
   */
  async encrypt(data: Uint8Array): Promise<{ encrypted: Uint8Array, iv: string }> {
    if (!this.encryptionKey) {
      throw new Error('没有可用的加密密钥');
    }
    
    // 为每个加密操作生成唯一的初始化向量(IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // 加密数据
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.encryptionKey,
      data
    );
    
    return {
      encrypted: new Uint8Array(encryptedBuffer),
      iv: Buffer.from(iv).toString('base64')
    };
  }
  
  /**
   * 解密数据
   */
  async decrypt(encryptedData: Uint8Array, ivBase64: string): Promise<Uint8Array> {
    if (!this.encryptionKey) {
      throw new Error('没有可用的解密密钥');
    }
    
    // 还原 IV
    const iv = Buffer.from(ivBase64, 'base64');
    
    // 解密数据
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.encryptionKey,
      encryptedData
    );
    
    return new Uint8Array(decryptedBuffer);
  }

  async encryptString(plainText: string): Promise<{ encrypted: string, iv: string }> {
    const encodedPlaintext = new TextEncoder().encode(plainText);
    const { encrypted, iv } = await this.encrypt(encodedPlaintext);
    return { encrypted: Buffer.from(encrypted).toString('base64'), iv };
  }

  async decryptString(encryptedText: string, iv: string): Promise<string> {
    const decryptedData = await this.decrypt(Buffer.from(encryptedText, 'base64'), iv);
    return new TextDecoder().decode(decryptedData);
  }

  /**
   * 检查是否有设置密钥
   */
  hasKey(): boolean {
    return this.encryptionKey !== null;
  }
  
  /**
   * 清除密钥
   */
  clearKey(): void {
    this.encryptionKey = null;
  }
}

// 提供两个单例实例，分别用于主机端和客户端
export const hostCrypto = new WebRTCCrypto();
export const clientCrypto = new WebRTCCrypto(); 