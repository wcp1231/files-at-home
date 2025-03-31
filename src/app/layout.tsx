import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/Header";
import { NextIntlClientProvider } from 'next-intl';
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
    default: 'FolderPort - Instant Folder Sharing',
    template: '%s | FolderPort'
  },
  description: 'Instantly share folders securely anywhere. Supports large files, cross-platform, and encryption. No registration required.',
  keywords: ['share folders', 'folder sharing', 'files transfer', 'encrypted transfer', 'large file transfer'],
  authors: [{ name: 'Folder Port Team' }],
  creator: 'Folder Port Team',
  publisher: 'Folder Port',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://folderport.com',
    title: 'FolderPort - Instant Folder Sharing',
    description: 'Instantly share folders securely anywhere. Supports large files, cross-platform, and encryption. No registration required.',
    siteName: 'FolderPort',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FolderPort - Instant Folder Sharing',
    description: 'Instantly share folders securely anywhere. Supports large files, cross-platform, and encryption. No registration required.',
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
              description: 'Instantly share folders securely anywhere. Supports large files, cross-platform, and encryption. No registration required.',
              applicationCategory: 'Folder Sharing',
              operatingSystem: 'All',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
              },
              featureList: [
                'Instant folders sharing',
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
  );
}
