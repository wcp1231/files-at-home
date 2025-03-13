import { redirect } from 'next/navigation'
import { customAlphabet } from 'nanoid'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // 禁用缓存

const getNanoId = (): string => {
  const nanoid = customAlphabet('167890ABCDEFGHJKLMNPQRSTWYZabcdefghjkmnpqrstwyz', 10)
  return nanoid()
}

export default function NewSharePage() {
  const nanoId = getNanoId()
  redirect(`/share/${nanoId}`)
} 