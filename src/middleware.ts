import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 检查是否是 HTTP 请求
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-forwarded-proto')?.includes('https')) {
    // 构建 HTTPS URL
    const httpsUrl = `https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`
    // 返回 307 临时重定向
    return NextResponse.redirect(httpsUrl, 307)
  }
  
  return NextResponse.next()
}

// 配置中间件匹配所有路由
export const config = {
  matcher: '/:path*',
} 