/// <reference lib="webworker" />

export type {};
declare let self: ServiceWorkerGlobalScope;
const holder = {} as {
  port: MessagePort | null;
  state: string | null;
};

function findReceiveClient(clients: readonly Client[]) {
  for (const client of clients) {
    const url = new URL(client.url);
    // 返回没有 hash 的 receive 页面
    if (url.pathname === '/receive' && url.hash === '') {
      return client;
    }
  }
  return null;
}

function handleInitChannel(event: ExtendableMessageEvent) {
  if (event.ports.length > 0) {
    holder.port = event.ports[0];
  }
}

function handleWebrtcStateChange(event: ExtendableMessageEvent) {
  const state = event.data.state;
  holder.state = state;
}

function handlePing(event: ExtendableMessageEvent) {
  if (!holder.port) {
    console.log('port missing');
  }
}

/**
 * 在 Service Worker 中检查页面状态是否正常
 * 也就是是否有 receive 页面，并且 WebRTC 连接是否正常
 * @returns 
 */
async function checkStateOK() {
  const allClients = await self.clients.matchAll({
    includeUncontrolled: true,
  });
  const client = findReceiveClient(allClients);
  if (!client) {
    return false;
  }
  if (holder.state !== 'connected') {
    return false;
  }
  return true;
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
  holder.port!.postMessage({
    type: 'TRANSFER_START',
    path: filePath,
    writable: ts.writable,
  }, [ts.writable]);
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
  holder.port!.postMessage({
    type: 'TRANSFER_START',
    path: filePath,
    start,
    end: end + 1,
    writable: ts.writable,
  }, [ts.writable]);
  return new Response(ts.readable, {
    status: 206,
    statusText: 'Partial Content',
    headers: responseHeader,
  });
}

// Install event - cache initial resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install', event);
  // 跳过等待 直接激活
  // 新的 Service Worker 安装完成后会进入等待阶段
  // 直到旧的 Service Worker 被完全卸载后 再进行激活
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate', event);
  // 激活后立即接管所有的客户端页面 无需等待页面刷新
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
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
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/receive') {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith((async () => {
    const receivePageOk = await checkStateOK();
    if (!receivePageOk) {
      return await fetch(event.request);
    }
    console.log('receivePageOk', receivePageOk, holder.state);
    // 下载文件
    if (url.hash === '#download') {
      return proxyDownloadRequest(event, url);
    }
    if (url.hash === '#play') {
      return proxyPlayRequest(event, url);
    }
    // 其他请求
    return await fetch(event.request);
  })());
}); 
