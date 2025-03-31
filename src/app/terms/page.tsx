import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Terms of Service - FolderPort',
  description: 'Terms and conditions for using FolderPort services',
  alternates: {
    canonical: '/terms'
  },
}

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert">
        <p className="text-muted-foreground mb-4">Last updated: March 31, 2025</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p>
          Welcome to FolderPort. By accessing or using our service, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Use of Service</h2>
        <p>
          FolderPort provides a platform for sharing files and folders securely. You are responsible for all data that you transmit through our service and for maintaining the confidentiality of any access credentials.
        </p>
        <p>
          You agree not to use our service to:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Violate any laws or regulations</li>
          <li>Share illegal or prohibited content</li>
          <li>Infringe upon intellectual property rights</li>
          <li>Distribute malware or harmful code</li>
          <li>Interfere with the service&apos;s operation</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Privacy</h2>
        <p>
          Your privacy is important to us. Our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> explains how we collect, use, and protect your personal information.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Service Availability</h2>
        <p>
          We strive to provide an uninterrupted service, but we do not guarantee that the service will be available at all times. We reserve the right to suspend or terminate the service at any time without notice.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Intellectual Property</h2>
        <p>
          The service and its original content, features, and functionality are owned by FolderPort and are protected by international copyright, trademark, and other intellectual property laws.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitation of Liability</h2>
        <p>
          In no event shall FolderPort be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to Terms</h2>
        <p>
          We reserve the right to modify or replace these terms at any time. It is your responsibility to review these terms periodically for changes. Your continued use of the service following the posting of any changes constitutes acceptance of those changes.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at <a href="mailto:contact@folderport.com" className="text-primary hover:underline">contact@folderport.com</a>.
        </p>
      </div>
      
      <div className="mt-8 border-t pt-4">
        <Link href="/" className="text-primary hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
