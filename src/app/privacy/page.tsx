import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Privacy Policy - FolderPort',
  description: 'Privacy policy for FolderPort services',
  alternates: {
    canonical: '/privacy'
  },
}

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert">
        <p className="text-muted-foreground mb-4">Last updated: March 31, 2025</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p>
          At FolderPort, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
        <p>
          Our service is designed with privacy in mind. We collect minimal information necessary to provide our service:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li><strong>Connection Information:</strong> Temporary connection IDs and session data required to establish peer-to-peer connections.</li>
          <li><strong>Usage Data:</strong> Anonymous usage statistics to improve our service.</li>
          <li><strong>Device Information:</strong> Browser type, operating system, and device information for compatibility purposes.</li>
        </ul>
        <p>
          <strong>We do not:</strong>
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Store the content of files you share</li>
          <li>Monitor the content of your transfers</li>
          <li>Collect personal identification information unless explicitly provided</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
        <p>
          We use the collected information for:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Providing and maintaining our service</li>
          <li>Improving and optimizing our service</li>
          <li>Detecting and preventing technical issues</li>
          <li>Analyzing usage patterns to enhance user experience</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your information:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>End-to-end encryption for file transfers</li>
          <li>Secure peer-to-peer connections</li>
          <li>Optional passphrase protection for shared content</li>
        </ul>
        <p>
          However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Cookies and Local Storage</h2>
        <p>
          We use browser local storage and IndexedDB to store necessary information for the functioning of our service, such as connection preferences and temporary file data. These technologies are essential for the proper operation of our service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Third-Party Services</h2>
        <p>
          Our service may contain links to third-party websites or services that are not owned or controlled by FolderPort. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Children&apos;s Privacy</h2>
        <p>
          Our service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at <a href="mailto:contact@folderport.com" className="text-primary hover:underline">contact@folderport.com</a>.
        </p>
      </div>
      
      <div className="mt-8 border-t pt-4">
        <Link href="/" className="text-primary hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
