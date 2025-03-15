/// <reference lib="webworker" />
const sw = self as unknown as ServiceWorkerGlobalScope; // we still need to override the "self" variable

const holder = {} as {
  port: MessagePort | null;
  state: string | null;
  heartbeat: number;
  streams: Map<string, WritableStreamDefaultWriter<Uint8Array>>;
};

function checkHeartbeat() {
  if (Date.now() - holder.heartbeat > 2000) {
    return false;
  }
  return true;
}

function handlePortMessage(event: MessageEvent) {
  const data = event.data.data;
  const type = data.type;
  if (type === 'TRANSFER_CHUNK') {
    const fileId = data.fileId;
    const stream = holder.streams.get(fileId);
    if (!stream) {
      return;
    }
    stream.write(data.chunk);
    return
  }
  if (type === 'TRANSFER_END') {
    const fileId = data.fileId;
    const stream = holder.streams.get(fileId);
    if (!stream) {
      return;
    }
    stream.close();
    return
  }
  if (type === 'TRANSFER_ERROR') {
    const fileId = data.fileId;
    const stream = holder.streams.get(fileId);
    if (!stream) {
      return;
    }
    stream.abort();
    return
  }
  if (type === 'TRANSFER_CANCEL') {
    const fileId = data.fileId;
    const stream = holder.streams.get(fileId);
    if (!stream) {
      return;
    }
    stream.abort();
    return
  }
}

function handleInitChannel(event: ExtendableMessageEvent) {
  if (event.ports.length > 0) {
    holder.port = event.ports[0];
    holder.port.onmessage = (event) => {
      handlePortMessage(event);
    };
    holder.streams = new Map();
  }
}

function handleWebrtcStateChange(event: ExtendableMessageEvent) {
  const state = event.data.state;
  holder.state = state;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handlePing(event: ExtendableMessageEvent) {
  if (!holder.port) {
    console.warn('[Service Worker] Port missing');
  }
  holder.heartbeat = Date.now();
}

/**
 * 在 Service Worker 中检查页面状态是否正常
 * 也就是是否有 receive 页面，并且 WebRTC 连接是否正常
 * @returns 
 */
function checkStateOK() {
  if (!checkHeartbeat()) {
    return false;
  }
  if (holder.state !== 'connected') {
    return false;
  }
  return true;
}

function startTransfer(payload: { fileId: string, path: string, start?: number, end?: number }, writable: WritableStream) {
  try {
    holder.port!.postMessage({
      ...payload,
      type: 'TRANSFER_START',
      writable,
    }, [writable]);
    return;
  } catch (error) {
    console.error('[Service Worker] Transfer start failed', error);
  }
  holder.streams.set(payload.fileId, writable.getWriter());
  holder.port!.postMessage({
    ...payload,
    type: 'TRANSFER_START',
  }, []);
}

// 代理下载请求
function proxyDownloadRequest(event: FetchEvent, url: URL) {
  const filePath = url.searchParams.get('path');
  const fileName = url.searchParams.get('name')!;
  const fileSize = url.searchParams.get('size')!;
  if (!filePath) {
    return new Response(null, { status: 404 });
  }
  const newFileName = encodeURIComponent(fileName).replace(/\*/g, "%2A");
  const responseHeader = new Headers({
    'X-File-Size': fileSize,
    'X-File-Name': newFileName,
    "Content-Type": "application/octet-stream; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'",
    "X-Content-Security-Policy": "default-src 'none'",
    "X-WebKit-CSP": "default-src 'none'",
    "X-XSS-Protection": "1; mode=block",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Content-Disposition": "attachment; filename*=UTF-8''" + newFileName,
    "Content-Length": fileSize,
  });
  const ts = new TransformStream();
  const payload = { 
    fileId: `download#${filePath}`,
    path: filePath,
  };
  startTransfer(payload, ts.writable);
  return new Response(ts.readable, {
    headers: responseHeader,
  });
}

function getRange(range: string, fileSize: number, chunkSize: number) {
  const [startStr, endStr] = range.split('-')
  const start = parseInt(startStr);
  const end = endStr ? parseInt(endStr) : Math.min(fileSize - 1, start + chunkSize - 1);
  return [start, end];
}

/**
 * 代理播放请求
 * 这类请求比较特殊，支持 206 分块请求
 * 
 * @param event 
 * @param url 
 */
function proxyPlayRequest(event: FetchEvent, url: URL) {
  const request = event.request;
  const filePath = url.searchParams.get('path');
  const fileSize = url.searchParams.get('size')!;
  const chunkSize = url.searchParams.get('chunkSize')!;
  const type = url.searchParams.get('type')!;
  const range = request.headers.get('Range')?.split('=')[1];
  if (!range) {
    return new Response(null, { status: 400 });
  }
  const [start, end] = getRange(range, parseInt(fileSize), parseInt(chunkSize));
  const responseHeader = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Length': `${end - start + 1}`,
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Content-Type': type,
  });
  const ts = new TransformStream();
  const payload = { 
    fileId: `play#${filePath}#${start}-${end}`,
    path: filePath!,
    start,
    end: end + 1,
  };
  startTransfer(payload, ts.writable);
  return new Response(ts.readable, {
    status: 206,
    statusText: 'Partial Content',
    headers: responseHeader,
  });
}

// Install event - cache initial resources
sw.addEventListener('install', (event) => {
  console.log('[Service Worker] Install', event);
  // 跳过等待 直接激活
  // 新的 Service Worker 安装完成后会进入等待阶段
  // 直到旧的 Service Worker 被完全卸载后 再进行激活
  sw.skipWaiting();
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate', event);
  // 激活后立即接管所有的客户端页面 无需等待页面刷新
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('message', (event) => {
  const type = event.data.type;
  if (type === 'INIT_CHANNEL') {
    handleInitChannel(event);
    return;
  }
  if (type === 'WEBRTC_STATE_CHANGE') {
    handleWebrtcStateChange(event);
    return;
  }
  if (type === 'PING') {
    handlePing(event);
    return;
  }
});

// Fetch event - intercept requests
sw.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/access') {
    event.respondWith(fetch(event.request));
    return;
  }
  const receivePageOk = checkStateOK();
  if (!receivePageOk) {
    event.respondWith(fetch(event.request));
    return;
  }
  // 下载文件
  if (url.hash === '#download') {
    event.respondWith(proxyDownloadRequest(event, url));
    return;
  }
  if (url.hash === '#play') {
    event.respondWith(proxyPlayRequest(event, url));
    return;
  }
  event.respondWith(fetch(event.request));
}); 
