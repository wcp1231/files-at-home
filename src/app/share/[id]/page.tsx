import { redirect } from 'next/navigation'
import { Metadata } from "next";
import ShareView from "@/components/share/ShareView";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'FolderPort - Fast & Secure Folder Sharing',
  description: 'Share folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
  robots: {
    index: false,
    follow: false,
  }
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !/^[1-9A-Za-z]{10}$/.test(id)) {
    redirect('/share');
  }
  
  return (
    <ShareView id={id} />
  );
} 