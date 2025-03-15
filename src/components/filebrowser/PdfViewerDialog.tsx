'use client'

import React, { useRef, useState, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import "core-js/proposals/promise-with-resolvers";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import useResizeObserver from '@react-hook/resize-observer';
import { formatFileSize } from '@/lib/filesystem/util';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { toast } from '@/hooks/use-toast';

// Function to detect if we need to use legacy build
function shouldUseLegacyBuild() {
  try {
    if (typeof window === 'undefined') return false;
    
    const ua = window.navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    
    console.log(isSafari ? 'Running on Safari' : 'Not running on Safari');
    if (!isSafari) return false;
    
    // Extract Safari version - matches "Version/18" format
    const match = ua.match(/Version\/(\d+)/i);
    console.log('Safari version:', match);
    if (!match || !match[1]) return true; // If we can't determine version, use legacy to be safe
    
    const version = parseInt(match[1]);
    return version < 18; // Use legacy build for Safari versions equal or below 18
  } catch (e) {
    console.error('Error detecting Safari version:', e);
    return false;
  }
}

// Function to initialize PDF worker
function initPDFWorker() {
  try {
    if (typeof window !== 'undefined') {
      const useLegacy = shouldUseLegacyBuild();
      // Use local worker file instead of unpkg
      const workerSrc = useLegacy 
        ? new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href
        : new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
      console.log('Setting PDF worker to:', workerSrc);
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      pdfjs.GlobalWorkerOptions.workerPort = null;
    }
  } catch (e) {
    console.error('Error setting PDF worker:', e);
  }
}

// Initialize the worker at root
initPDFWorker();

const useWidth = (target: React.RefObject<HTMLDivElement | null>) => {
  const [width, setWidth] = useState<number | undefined>();

  useLayoutEffect(() => {
    setWidth(target.current?.getBoundingClientRect().width)
  }, [target.current]);

  useResizeObserver(target, (entry) => setWidth(entry.contentRect.width));
  return width;
};

export default function PdfViewerDialog() {
  const {
    pdfDialogOpen,
    selectedFile, 
    pdfUrl,
    setPdfUrl,
    setPdfDialogOpen
  } = useFileBrowserStore();

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const wrapperDiv = useRef(null);
  const width = useWidth(wrapperDiv);

  const handleClose = () => {
    setPdfDialogOpen(false);
    setPdfUrl(null);
    setNumPages(null);
    setPageNumber(1);
  }

  const onOpenChange = (open: boolean) => {
    setPdfDialogOpen(open);
    if (!open) {
      handleClose();
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const changePage = (offset: number) => {
    if (!numPages) return;
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.max(1, Math.min(numPages, newPageNumber));
    });
  }

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  if (!selectedFile) return null;
  if (!pdfUrl) return null;

  return (
    <Dialog open={pdfDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[100vh] p-0 py-6 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className='px-6'>
          <DialogTitle className=''>
            {selectedFile.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center max-h-[80vh] overflow-scroll">
          <div className="relative w-full" ref={wrapperDiv}>
            {pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onError={(error) => {
                  toast({
                    title: 'PDF loading error',
                    description: error.message,
                  });
                  handleClose();
                }}
                loading={<div className="text-center py-10">正在加载 PDF...</div>}
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={width ?? 800}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            )}
          </div>
        </div>
        {/* 固定在视口中间的导航按钮 */}
        {numPages && numPages > 1 && (
          <>
            <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
              <button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="p-3 rounded-full bg-secondary/80 hover:bg-secondary disabled:opacity-50 disabled:hover:bg-secondary/80 transition-all shadow-lg hover:shadow-xl"
                aria-label="上一页"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
            </div>

            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
              <button
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                className="p-3 rounded-full bg-secondary/80 hover:bg-secondary disabled:opacity-50 disabled:hover:bg-secondary/80 transition-all shadow-lg hover:shadow-xl"
                aria-label="下一页"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* 页码显示 */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 px-4 py-2 bg-secondary/40 rounded-full text-sm z-50">
              {pageNumber} / {numPages}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 