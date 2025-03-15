import Link from "next/link";

import { DynamicIcon } from "lucide-react/dynamic";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-12 items-center max-w-3xl text-center">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            在家轻松分享文件
          </h1>
          <p className="text-xl text-muted-foreground">
            Files@Home 让你在家庭网络中快速、安全地分享文件，无需互联网连接
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <Link
            className="group relative rounded-lg border p-6 hover:border-foreground/40 transition-colors"
            href="/share"
          >
            <div className="flex items-center gap-4">
              <DynamicIcon name="share-2" className="h-6 w-6" />
              <h3 className="font-semibold">分享目录</h3>
            </div>
            <p className="mt-3 text-muted-foreground text-sm">
              选择要分享的文件夹，生成分享链接，轻松访问
            </p>
          </Link>

          <Link
            className="group relative rounded-lg border p-6 hover:border-foreground/40 transition-colors"
            href="/receive"
          >
            <div className="flex items-center gap-4">
              <DynamicIcon name="download" className="h-6 w-6" />
              <h3 className="font-semibold">接收分享</h3>
            </div>
            <p className="mt-3 text-muted-foreground text-sm">
              通过分享链接快速访问和下载分享的文件
            </p>
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-8 w-full">
          <div className="flex items-center gap-4 mb-4">
            <DynamicIcon name="laptop" className="h-6 w-6" />
            <h3 className="font-semibold">主要特点</h3>
          </div>
          <ul className="grid gap-4 text-sm text-muted-foreground text-left list-disc list-inside">
            <li>简单易用的界面，一键分享和下载</li>
            <li>P2P 传输，无需服务器</li>
            <li>支持大文件传输，不受文件大小限制</li>
            <li>支持加密传输，保护隐私</li>
            <li>无需注册和登录，即开即用</li>
          </ul>
        </div>
      </main>

      <footer className="flex gap-6 flex-wrap items-center justify-center text-sm text-muted-foreground">
        <a
          className="hover:text-foreground transition-colors"
          href="#"
        >
          使用文档
        </a>
        <span>·</span>
        <a
          className="hover:text-foreground transition-colors"
          href="#"
        >
          关于项目
        </a>
      </footer>
    </div>
  );
}
