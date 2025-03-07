import { HEADER_KEY, MessageType } from "@/types/worker";
import { MESSAGE_TYPE } from "@/types/worker";
import { ConnectionState } from "..";

export class WorkerManager {
  public static channel: MessageChannel | null = null;
  public static worker: ServiceWorkerRegistration | null = null;
  public static writer: Map<string, WritableStreamDefaultWriter<Uint8Array>> = new Map();
  public static messageHandler: (path: string, writer: WritableStreamDefaultWriter<Uint8Array>) => Promise<void> = async () => {};

  public static async register(): Promise<ServiceWorkerRegistration | null> {
    if (!navigator.serviceWorker) {
      console.warn("Service Worker Not Supported");
      return Promise.resolve(null);
    }
    try {
      const serviceWorker = await navigator.serviceWorker.getRegistration("./");
      if (serviceWorker) {
        WorkerManager.worker = serviceWorker;
        WorkerManager.initChannel();
        return Promise.resolve(serviceWorker);
      }
      const worker = await navigator.serviceWorker.register(
        "/sw.js",
        { scope: "/receive" }
      );
      WorkerManager.worker = worker;
      WorkerManager.initChannel();
      return worker;
    } catch (error) {
      console.warn("Service Worker Register Error", error);
      return Promise.resolve(null);
    }
  }

  private static async initChannel() {
    if (!WorkerManager.channel) {
      WorkerManager.channel = new MessageChannel();
      WorkerManager.channel.port1.onmessage = WorkerManager.onMessage;
      WorkerManager.worker?.active?.postMessage({ type: MESSAGE_TYPE.INIT_CHANNEL }, [
        WorkerManager.channel.port2,
      ]);
      WorkerManager.heartbeat();
    }
  }

  public static heartbeat() {
    WorkerManager.worker?.active?.postMessage({ type: MESSAGE_TYPE.INIT_CHANNEL });
    setTimeout(() => {
      WorkerManager.heartbeat();
    }, 5000);
  }

  public static setMessageHandler(handler: (path: string, writer: WritableStreamDefaultWriter<Uint8Array>) => Promise<void>) {
    WorkerManager.messageHandler = handler;
  }

  public static onWebRTCStateChange(state: ConnectionState) {
    WorkerManager.worker?.active?.postMessage({ type: MESSAGE_TYPE.WEBRTC_STATE_CHANGE, state });
  }

  public static async onMessage(event: MessageEvent) {
    const { path, writable } = event.data;
    const writer = writable.getWriter();
    // 处理未创建 peer 的情况
    try {
      await WorkerManager.messageHandler(path, writer);
    } finally {
      writer.close();
    }
  }

  public static isTrustEnv() {
    return location.protocol === "https:" || location.hostname === "localhost";
  }

  /**
   * 这个是 github 上找到的一个实现方式
   * 开始下载时先给 sw 传递 readable
   * 然后 sw 中拦截 iframe 的请求
   * 这里保留做参考 https://github.com/WindRunnerMax/FileTransfer
   */
  public static start(fileId: string, fileName: string, fileSize: number, fileTotal: number) {
    // 在 TransformStream 不可用的情况下 https://caniuse.com/?search=TransformStream
    // 需要在 Service Worker 中使用 ReadableStream 写入数据 fa28d9d757ddeda9c93645362
    // 通过 controller.enqueue 将 ArrayBuffer 数据写入即可
    // 直接使用 ReadableStream 需要主动处理 BackPressure 时降低写频率
    // 而 TransformStream 实际上内部实现了 BackPressure 的自动处理机制
    const ts = new TransformStream();
    WorkerManager.channel!.port1.postMessage(
      <MessageType>{
        key: MESSAGE_TYPE.TRANSFER_START,
        id: fileId,
        readable: ts.readable,
      },
      // 转移所有权至 Service Worker
      [ts.readable]
    );
    WorkerManager.writer.set(fileId, ts.writable.getWriter());
    // 需要通过 iframe 发起下载请求 在 Service Worker 中拦截请求
    // 这里如果 A 的 DOM 上引用了 B 的 iframe 框架
    // 此时 B 中存在的 SW 可以拦截 A 的 iframe 创建的请求
    // 当然前提是 A 创建的 iframe 请求是请求的 B 源下的地址
    const src =
      `/${fileId}` +
      `?${HEADER_KEY.FILE_ID}=${fileId}` +
      `&${HEADER_KEY.FILE_SIZE}=${fileSize}` +
      `&${HEADER_KEY.FILE_TOTAL}=${fileTotal}` +
      `&${HEADER_KEY.FILE_NAME}=${fileName}`;
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.src = src;
    iframe.id = fileId;
    document.body.appendChild(iframe);
  }

  public static async post(fileId: string, data: ArrayBuffer) {
    const writer = WorkerManager.writer.get(fileId);
    if (!writer) return void 0;
    // 感知 BackPressure 需要主动 await ready
    await writer.ready;
    return writer.write(new Uint8Array(data));
  }

  public static close(fileId: string) {
    const iframe = document.getElementById(fileId);
    iframe && iframe.remove();
    WorkerManager.channel?.port1.postMessage(<MessageType>{
      key: MESSAGE_TYPE.TRANSFER_CLOSE,
      id: fileId,
    });
    const writer = WorkerManager.writer.get(fileId);
    // 必须关闭 Writer 否则浏览器无法感知下载完成
    writer?.close();
    WorkerManager.writer.delete(fileId);
  }
}