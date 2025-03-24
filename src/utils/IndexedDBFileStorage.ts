/**
 * IndexedDB File Storage Utility
 * 
 * A utility class for storing and retrieving files in IndexedDB.
 * Features:
 * - Store files in chunks for better memory management
 * - Write using streams or chunk-by-chunk approach
 * - Retrieve complete files by name
 */

type FileMetadata = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  chunkSize: number;
  totalChunks: number;
};

export class IndexedDBFileStorage {
  private dbName: string;
  private dbVersion: number;
  private chunkSize: number;
  private db: IDBDatabase | null = null;
  private ready: Promise<void>;

  /**
   * Creates a new IndexedDBFileStorage instance
   * 
   * @param dbName The name of the IndexedDB database
   * @param dbVersion The version of the database
   * @param chunkSize The size of each chunk in bytes (default: 1MB)
   */
  constructor(dbName = 'fileStorage', dbVersion = 1, chunkSize = 1024 * 1024) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.chunkSize = chunkSize;
    this.ready = this.initDB();
  }

  /**
   * Initializes the IndexedDB database
   * Creates object stores for file metadata and chunks if they don't exist
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        reject(new Error('Failed to open IndexedDB database', { cause: event }));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'name' });
          metadataStore.createIndex('name', 'name', { unique: true });
        }
        
        // Create chunks store
        if (!db.objectStoreNames.contains('chunks')) {
          const chunksStore = db.createObjectStore('chunks', { keyPath: 'key' });
          chunksStore.createIndex('fileNameChunkIndex', ['fileName', 'index'], { unique: true });
        }
      };
    });
  }

  /**
   * Stores a file in the database by breaking it into chunks
   * 
   * @param file The file to store
   * @returns A promise that resolves when the file is stored
   */
  public async storeFile(file: File): Promise<void> {
    await this.ready;
    
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    
    // Store metadata
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      chunkSize: this.chunkSize,
      totalChunks
    };
    
    await this.storeMetadata(metadata);
    
    // Store chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);
      await this.storeChunk(file.name, i, chunk);
    }
  }

  /**
   * Stores a file from an array of chunks
   * 
   * @param fileName The name of the file
   * @param fileType The MIME type of the file
   * @param chunks Array of file chunks (Blob/ArrayBuffer/Uint8Array)
   * @param lastModified Last modified timestamp (optional)
   * @returns A promise that resolves when the file is stored
   */
  public async storeFileFromChunks(
    fileName: string, 
    fileType: string, 
    chunks: Array<Blob | ArrayBuffer | Uint8Array>,
    lastModified = Date.now()
  ): Promise<void> {
    await this.ready;
    
    // Convert non-Blob chunks to Blobs
    const blobChunks = chunks.map(chunk => {
      if (chunk instanceof Blob) return chunk;
      return new Blob([chunk], { type: fileType });
    });
    
    // Calculate total size
    const totalSize = blobChunks.reduce((size, chunk) => size + chunk.size, 0);
    
    // Store metadata
    const metadata: FileMetadata = {
      name: fileName,
      size: totalSize,
      type: fileType,
      lastModified,
      chunkSize: this.chunkSize,
      totalChunks: blobChunks.length
    };
    
    await this.storeMetadata(metadata);
    
    // Store chunks
    for (let i = 0; i < blobChunks.length; i++) {
      await this.storeChunk(fileName, i, blobChunks[i]);
    }
  }

  /**
   * Stores a file from a ReadableStream
   * 
   * @param fileName The name of the file
   * @param fileType The MIME type of the file
   * @param stream ReadableStream of the file data
   * @param lastModified Last modified timestamp (optional)
   * @returns A promise that resolves when the file is stored
   */
  public async storeFileFromStream(
    fileName: string,
    fileType: string,
    stream: ReadableStream<Uint8Array>,
    lastModified = Date.now()
  ): Promise<void> {
    await this.ready;
    
    // We need a reader to read from the stream
    const reader = stream.getReader();
    
    const chunks: Blob[] = [];
    let totalSize = 0;
    let currentChunk: Uint8Array[] = [];
    let currentChunkSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        currentChunk.push(value);
        currentChunkSize += value.length;
        
        // If we've accumulated enough data for a chunk, store it
        if (currentChunkSize >= this.chunkSize) {
          const blob = new Blob(currentChunk, { type: fileType });
          chunks.push(blob);
          totalSize += blob.size;
          
          currentChunk = [];
          currentChunkSize = 0;
        }
      }
      
      // Don't forget the last partial chunk
      if (currentChunk.length > 0) {
        const blob = new Blob(currentChunk, { type: fileType });
        chunks.push(blob);
        totalSize += blob.size;
      }
      
      // Now store all chunks
      const metadata: FileMetadata = {
        name: fileName,
        size: totalSize,
        type: fileType,
        lastModified,
        chunkSize: this.chunkSize,
        totalChunks: chunks.length
      };
      
      await this.storeMetadata(metadata);
      
      for (let i = 0; i < chunks.length; i++) {
        await this.storeChunk(fileName, i, chunks[i]);
      }
      
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Creates a new writer for streaming data into IndexedDB
   * 
   * @param fileName The name of the file
   * @param fileType The MIME type of the file
   * @param fileSize The total size of the file in bytes (if known)
   * @param lastModified Last modified timestamp (optional)
   * @returns A WritableStream for writing chunks of data
   */
  public createFileWriter(
    fileName: string,
    fileType: string,
    fileSize?: number,
    lastModified = Date.now()
  ): WritableStream<Uint8Array> {
    let chunkIndex = 0;
    let currentChunk: Uint8Array[] = [];
    let currentChunkSize = 0;
    let totalWrittenSize = 0;

    const start = (async () => {
      await this.ready;
        
        // Create temporary metadata if we know the file size
        if (fileSize !== undefined) {
          const metadata: FileMetadata = {
            name: fileName,
            size: fileSize,
            type: fileType,
            lastModified,
            chunkSize: this.chunkSize,
            totalChunks: Math.ceil(fileSize / this.chunkSize)
          };
          
          await this.storeMetadata(metadata);
        }
    }).bind(this);

    const write = (async (chunk: Uint8Array) => {
      currentChunk.push(chunk);
      currentChunkSize += chunk.length;
      totalWrittenSize += chunk.length;
      
      // If we've accumulated enough data for a chunk, store it
      if (currentChunkSize >= this.chunkSize) {
        const blob = new Blob(currentChunk, { type: fileType });
        await this.storeChunk(fileName, chunkIndex++, blob);
        
        currentChunk = [];
        currentChunkSize = 0;
      }
    }).bind(this);

    const close = (async () => {
      // Store any remaining data as the final chunk
      if (currentChunk.length > 0) {
        const blob = new Blob(currentChunk, { type: fileType });
        await this.storeChunk(fileName, chunkIndex++, blob);
      }
      
      // Update metadata with final size if it wasn't provided initially
      if (fileSize === undefined) {
        const metadata: FileMetadata = {
          name: fileName,
          size: totalWrittenSize,
          type: fileType,
          lastModified,
          chunkSize: this.chunkSize,
          totalChunks: chunkIndex
        };
        
        await this.storeMetadata(metadata);
      }
    }).bind(this);

    const abort = (async () => {
      // In case of abort, we could clean up partial uploads here
      // This is a simplistic implementation
      await this.deleteFile(fileName);
    }).bind(this);
    
    const writableStream = new WritableStream<Uint8Array>({
      start,
      write,
      close,
      abort,
    });
    
    return writableStream;
  }

  /**
   * Appends a chunk to an existing file
   * 
   * @param fileName The name of the file
   * @param chunk The chunk data (Blob, ArrayBuffer or Uint8Array)
   * @returns A promise that resolves when the chunk is stored
   */
  public async appendChunk(
    fileName: string,
    chunk: Blob | ArrayBuffer | Uint8Array
  ): Promise<void> {
    await this.ready;
    
    // Get metadata to determine the next chunk index
    const metadata = await this.getMetadata(fileName);
    if (!metadata) {
      throw new Error(`File ${fileName} does not exist`);
    }
    
    // Convert to Blob if needed
    const blobChunk = chunk instanceof Blob 
      ? chunk 
      : new Blob([chunk], { type: metadata.type });
    
    // Store the new chunk
    const nextChunkIndex = metadata.totalChunks;
    await this.storeChunk(fileName, nextChunkIndex, blobChunk);
    
    // Update metadata
    metadata.totalChunks += 1;
    metadata.size += blobChunk.size;
    await this.storeMetadata(metadata);
  }

  /**
   * Retrieves a file from the database
   * 
   * @param fileName The name of the file to retrieve
   * @returns A promise that resolves with the File object, or null if not found
   */
  public async getFile(fileName: string): Promise<File | null> {
    await this.ready;
    
    const metadata = await this.getMetadata(fileName);
    if (!metadata) return null;
    
    const chunks: Blob[] = [];
    
    // Retrieve all chunks
    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunk = await this.getChunk(fileName, i);
      if (!chunk) {
        throw new Error(`Missing chunk ${i} for file ${fileName}`);
      }
      chunks.push(chunk);
    }
    
    // Combine chunks into a single blob
    const fileBlob = new Blob(chunks, { type: metadata.type });
    
    // Create a File from the blob
    return new File(
      [fileBlob], 
      metadata.name, 
      { 
        type: metadata.type,
        lastModified: metadata.lastModified
      }
    );
  }
  
  /**
   * Creates a ReadableStream to read the file data
   * 
   * @param fileName The name of the file to read
   * @returns A promise that resolves with a ReadableStream of the file data, or null if not found
   */
  public async getFileStream(fileName: string): Promise<ReadableStream<Uint8Array> | null> {
    await this.ready;
    
    const metadata = await this.getMetadata(fileName);
    if (!metadata) return null;
    
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        // We use this to store state across multiple pulls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any)._streamState = {
          fileName,
          currentChunk: 0,
          totalChunks: metadata.totalChunks,
          controller
        };
      },
      
      pull: async (controller) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = (this as any)._streamState;
        
        if (state.currentChunk >= state.totalChunks) {
          controller.close();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (this as any)._streamState;
          return;
        }
        
        try {
          const chunk = await this.getChunk(state.fileName, state.currentChunk++);
          if (!chunk) {
            throw new Error(`Missing chunk ${state.currentChunk - 1} for file ${state.fileName}`);
          }
          
          // Convert Blob to ArrayBuffer and then to Uint8Array
          const arrayBuffer = await chunk.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          controller.enqueue(uint8Array);
          
        } catch (error) {
          controller.error(error);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (this as any)._streamState;
        }
      }
    });
  }

  /**
   * Lists all files stored in the database
   * 
   * @returns A promise that resolves with an array of file metadata
   */
  public async listFiles(): Promise<FileMetadata[]> {
    await this.ready;
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to list files'));
      };
    });
  }

  /**
   * Deletes a file from the database
   * 
   * @param fileName The name of the file to delete
   * @returns A promise that resolves when the file is deleted
   */
  public async deleteFile(fileName: string): Promise<void> {
    await this.ready;
    
    // Get metadata to know how many chunks to delete
    const metadata = await this.getMetadata(fileName);
    if (!metadata) return; // File doesn't exist, nothing to do
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['metadata', 'chunks'], 'readwrite');
      
      // Delete metadata
      const metadataStore = transaction.objectStore('metadata');
      metadataStore.delete(fileName);
      
      // Delete all chunks
      const chunksStore = transaction.objectStore('chunks');
      const index = chunksStore.index('fileNameChunkIndex');
      
      for (let i = 0; i < metadata.totalChunks; i++) {
        const keyRange = IDBKeyRange.only([fileName, i]);
        const cursorRequest = index.openCursor(keyRange);
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
          }
        };
      }
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = () => {
        reject(new Error(`Failed to delete file ${fileName}`));
      };
    });
  }

  /**
   * Closes the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Deletes the entire database
   * 
   * @returns A promise that resolves when the database is deleted
   */
  public async deleteDatabase(): Promise<void> {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to delete database ${this.dbName}`));
      };
    });
  }

  // Private helper methods

  /**
   * Stores file metadata in the database
   * 
   * @param metadata The file metadata to store
   */
  private async storeMetadata(metadata: FileMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put(metadata);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to store metadata for ${metadata.name}`));
      };
    });
  }

  /**
   * Retrieves file metadata from the database
   * 
   * @param fileName The name of the file
   * @returns A promise that resolves with the file metadata, or null if not found
   */
  private async getMetadata(fileName: string): Promise<FileMetadata | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(fileName);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to retrieve metadata for ${fileName}`));
      };
    });
  }

  /**
   * Stores a chunk of a file in the database
   * 
   * @param fileName The name of the file
   * @param index The index of the chunk
   * @param chunk The chunk data (as a Blob)
   */
  private async storeChunk(fileName: string, index: number, chunk: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const request = store.put({
        key: `${fileName}-${index}`,
        fileName,
        index,
        data: chunk
      });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to store chunk ${index} for ${fileName}`));
      };
    });
  }

  /**
   * Retrieves a chunk of a file from the database
   * 
   * @param fileName The name of the file
   * @param index The index of the chunk
   * @returns A promise that resolves with the chunk data, or null if not found
   */
  private async getChunk(fileName: string, index: number): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.get(`${fileName}-${index}`);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to retrieve chunk ${index} for ${fileName}`));
      };
    });
  }
}
