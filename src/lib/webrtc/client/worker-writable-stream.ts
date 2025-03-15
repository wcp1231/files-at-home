import { WorkerManager } from "./worker";

// 兼容苹果系统的 safari 浏览器
export class WorkerWritableStream extends WritableStream {
  constructor(private readonly fileId: string) {
    super();
  }

  getWriter(): WritableStreamDefaultWriter<Uint8Array> {
    return new WorkerWritableStreamWriter(this, this.fileId);
  }
}

export class WorkerWritableStreamWriter extends WritableStreamDefaultWriter<Uint8Array> {
  constructor(private readonly stream: WorkerWritableStream, private readonly fileId: string) {
    super(stream);
  }

  write(chunk: Uint8Array): Promise<void> {
    console.log('[WorkerWritableStreamWriter] write', this.fileId, chunk.length);
    return WorkerManager.sendPortMessage(<MessageEvent>{
      data: {
        type: 'TRANSFER_CHUNK',
        fileId: this.fileId,
        chunk,
      },
    });
  }

  close(): Promise<void> {
    console.log('[WorkerWritableStreamWriter] close', this.fileId);
    return WorkerManager.sendPortMessage(<MessageEvent>{
      data: {
        type: 'TRANSFER_END',
        fileId: this.fileId,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abort(reason?: any): Promise<void> {
    console.log('[WorkerWritableStreamWriter] abort', this.fileId, reason);
    return WorkerManager.sendPortMessage(<MessageEvent>{
      data: {
        type: 'TRANSFER_CANCEL',
        fileId: this.fileId,
      },
    });
  }

  releaseLock(): void {
    super.releaseLock();
  }
}
