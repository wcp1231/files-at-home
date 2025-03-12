import { Download, Play, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { TableCell } from "../ui/table";
import { formatModifiedTime, isVideoFile, isPdfFile } from "@/utils/browserUtil";
import { formatFileSize } from "@/lib/filesystem/util";
import { FileViewEntry } from "./FileBrowser";
import { getFileIcon } from './FileIcons';
import { useFileBrowserStore } from "@/store/fileBrowserStore";
export function getFileOperation(file: FileViewEntry): React.ReactNode {
  const { handleFileDownload, handlePlayVideo, handleViewPdf } = useFileBrowserStore();
  if (file.isDirectory) {
    return null;
  }
  if (isVideoFile(file)) {
    return (
      <>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleFileDownload(file)}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayVideo(file)}>
          <Play className="h-4 w-4" />
        </Button>
      </>
    );
  }
  if (isPdfFile(file)) {
    return (
      <>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleFileDownload(file)}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleViewPdf(file)}>
          <FileText className="h-4 w-4" />
        </Button>
      </>
    );
  }
  return (
    <>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleFileDownload(file)}>
        <Download className="h-4 w-4" />
      </Button>
    </>
  );
}

export function FileListItem({ file }: { file: FileViewEntry; }) {
  return (
    <>
      <TableCell className="p-2">
        <div className="flex items-center">
          <div className="mr-2">
            {getFileIcon(file)}
          </div>
          <span>{file.name}</span>
        </div>
      </TableCell>
      <TableCell className="p-2">
        {file.type}
      </TableCell>
      <TableCell className="p-2 text-right">
        {file.size !== undefined && !file.isDirectory ? formatFileSize(file.size) : ''}
      </TableCell>
      <TableCell className="p-2 text-right">
        {formatModifiedTime(file.modifiedAt)}
      </TableCell>
      <TableCell className="p-2">
        <div className="flex items-center gap-2">
          {getFileOperation(file)}
        </div>
      </TableCell>
    </>
  );
}