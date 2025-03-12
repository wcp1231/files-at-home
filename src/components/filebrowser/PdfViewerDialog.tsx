'use client'

import React, { useRef, useState, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';


// 设置 PDF.js worker 路径
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
                  console.error('PDF loading error', error);
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