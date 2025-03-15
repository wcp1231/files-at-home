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
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] overflow-scroll" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{selectedFile.name}</DialogTitle>
          <DialogDescription>
            {selectedFile.size !== undefined ? formatFileSize(selectedFile.size) : ''}
            {numPages && ` • ${pageNumber} / ${numPages} 页`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center">
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
          
          {numPages && numPages > 1 && (
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                上一页
              </button>
              <span className="flex items-center">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 