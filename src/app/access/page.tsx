import { Metadata } from 'next';
import AccessView from '@/components/access/AccessView';

export const metadata: Metadata = {
  title: 'FolderPort - Fast & Secure Folder Access',
  description: 'Access folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
  robots: {
    index: false,
    follow: false,
  }
}

export default async function AccessPage() {
  return (
    <AccessView />
  );
} 