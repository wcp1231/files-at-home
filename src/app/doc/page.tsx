import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Documentation - FolderPort',
  description: 'Learn how to use FolderPort for secure file sharing',
  alternates: {
    canonical: '/documentation'
  },
}

export default function Documentation() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">FolderPort Documentation</h1>
      
      <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert">
        <p className="text-muted-foreground mb-4">Last updated: March 31, 2025</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Getting Started</h2>
        <p>
          FolderPort is a secure, browser-based file sharing platform that allows you to share files and folders with others without registration. 
          This guide will walk you through the basic features and how to use them effectively.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Sharing Files and Folders</h2>
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Step 1: Access the Share Page</h3>
          <p>
            From the homepage, click on the <strong>Share Folder</strong> button or navigate to the <Link href="/share" className="text-primary hover:underline">/share</Link> page.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 2: Select Files or Folders</h3>
          <p>
            You have two options:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Share a Folder:</strong> Click the &quot;Select folder&quot; button and choose the folder you want to share.</li>
            <li><strong>Share Files:</strong> If your browser doesn&apos;t support folder selection or you only want to share specific files, click the &quot;Select files&quot; button.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 3: Configure Sharing Options</h3>
          <p>
            After selecting your files or folder, you can configure additional options:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Passphrase Protection:</strong> For added security, you can set an optional passphrase that recipients will need to enter to access your files.</li>
            <li><strong>Allow Uploads:</strong> Toggle this option to allow recipients to upload files to your shared folder.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 4: Start Sharing</h3>
          <p>
            Click the &quot;Share&quot; button to begin sharing. FolderPort will generate a unique sharing link and QR code.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 5: Share the Link</h3>
          <p>
            Copy the sharing link and send it to your recipients through your preferred communication channel (email, messaging app, etc.).
            Alternatively, they can scan the QR code with their mobile device.
          </p>
        </div>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Accessing Shared Files</h2>
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Step 1: Access the Access Page</h3>
          <p>
            From the homepage, click on the <strong>Access Folder</strong> button or navigate to the <Link href="/access" className="text-primary hover:underline">/access</Link> page.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 2: Enter the Sharing Link</h3>
          <p>
            Paste the sharing link you received into the input field and click &quot;Connect&quot;.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 3: Enter Passphrase (If Required)</h3>
          <p>
            If the shared content is protected with a passphrase, you&apos;ll be prompted to enter it.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 4: Browse and Download Files</h3>
          <p>
            Once connected, you can browse the shared folder structure, preview supported file types directly in your browser, 
            and download individual files or entire folders.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Step 5: Upload Files (If Allowed)</h3>
          <p>
            If the sharer has enabled uploads, you&apos;ll see an upload button that allows you to add files to the shared folder.
          </p>
        </div>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Security Features</h2>
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">End-to-End Encryption</h3>
          <p>
            FolderPort uses peer-to-peer technology to transfer files directly between devices, without storing them on our servers.
            This ensures your data remains private and secure.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Passphrase Protection</h3>
          <p>
            For additional security, you can set a passphrase when sharing files. This passphrase is used to encrypt the data
            during transfer, ensuring that only those with the passphrase can access your files.
          </p>
          
          <h3 className="text-xl font-medium mt-6 mb-2">Temporary Sharing</h3>
          <p>
            Shared links are only active while your browser tab remains open and you&apos;re actively sharing. Once you click
            &quot;Stop Sharing&quot; or close your browser, the link becomes inactive, and no one can access your files anymore.
          </p>
        </div>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Troubleshooting</h2>
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Connection Issues</h3>
          <p>
            If you&apos;re having trouble connecting:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Ensure both the sharer and recipient are using modern browsers (Chrome, Firefox, Edge, Safari).</li>
            <li>Check that the sharing link is correct and complete.</li>
            <li>Try refreshing the page if the worker status shows as not running.</li>
            <li>Some corporate networks or firewalls may block peer-to-peer connections. Try using a different network if possible.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-6 mb-2">File Preview Issues</h3>
          <p>
            If file previews aren&apos;t working:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Make sure you&apos;re using a supported browser.</li>
            <li>Some file types may not support preview. In this case, you can download the file to view it.</li>
          </ul>
        </div>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Best Practices</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>Use a passphrase for sensitive files.</li>
          <li>Share the passphrase through a different communication channel than the sharing link for maximum security.</li>
          <li>Only enable uploads if you trust the recipients.</li>
          <li>For large files or folders, keep your device awake and connected until the transfer is complete.</li>
        </ul>
      </div>
      
      <div className="mt-8 border-t pt-4">
        <Link href="/" className="text-primary hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
