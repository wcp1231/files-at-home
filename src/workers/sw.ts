/// <reference lib="webworker" />

export type {};
declare let self: ServiceWorkerGlobalScope;

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

const holder = {};

self.addEventListener('message', (event) => {
  if (event.ports.length > 0) {
    holder.port = event.ports[0];
  }
  if (!holder.port) {
    console.log('port missing');
  }
});

// Fetch event - intercept requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/receive/download') {
    event.respondWith(fetch(event.request));
    return;
  }
  console.log('[Service Worker] Fetch', url);
  const filePath = url.searchParams.get('path');
  const fileName = url.searchParams.get('name')!;
  const fileSize = url.searchParams.get('size')!;
  if (!filePath) {
    event.respondWith(new Response(null, { status: 404 }));
    return;
  }
  const ts = new TransformStream();
  holder.port!.postMessage({
    type: 'TRANSFER_START',
    path: filePath,
    writable: ts.writable,
  }, [ts.writable]);
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
  const response = new Response(ts.readable, {
    headers: responseHeader,
  });
  return event.respondWith(response);
}); 
