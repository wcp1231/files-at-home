import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/Header";
import { NextIntlClientProvider } from 'next-intl';
import { HighlightInit } from '@highlight-run/next/client'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://folderport.com'),
  title: {
    default: 'FolderPort - Fast & Secure Folder Sharing',
    template: '%s | FolderPort'
  },
  description: 'Share folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
  keywords: ['folder sharing', 'file transfer', 'P2P', 'online preview', 'encrypted transfer', 'large file transfer'],
  authors: [{ name: 'FolderPort Team' }],
  creator: 'FolderPort Team',
  publisher: 'FolderPort',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://folderport.com',
    title: 'FolderPort - Fast & Secure Folder Sharing',
    description: 'Share folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
    siteName: 'FolderPort',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FolderPort - Fast & Secure Folder Sharing',
    description: 'Share folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
};

export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  return (
    <>
      <HighlightInit
				projectId={'jd40w90g'}
				serviceName="folderport"
        disableOtelTracing
				networkRecording={{
					enabled: false,
				}}
			/>
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://folderport.com" />
      </head>
      <body 
        className={`min-h-screen bg-background font-sans ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'FolderPort',
              description: 'Share folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
              applicationCategory: 'File Sharing',
              operatingSystem: 'All',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
              },
              featureList: [
                'No registration required',
                'Secure P2P transfer',
                'Large file support',
                'Online file preview',
                'AES encryption',
                'Cross-platform support'
              ]
            })
          }}
        />
      </body>
    </html>
    </>
  );
}
