import { DynamicIcon } from 'lucide-react/dynamic'
import { Button } from "../ui/button";
import { TableCell } from "../ui/table";
import { formatModifiedTime, isVideoFile, isPdfFile } from "@/utils/browserUtil";
import { formatFileSize } from "@/lib/filesystem/util";
import { FileViewEntry } from "./FileBrowser";
import { getFileIcon } from './FileIcons';
import { useFileBrowserStore } from "@/store/fileBrowserStore";

function FileOperations({ file }: { file: FileViewEntry }) {
  const { handleFileDownload, handlePlayVideo, handleViewPdf } = useFileBrowserStore();
  if (file.isDirectory) {
    return null;
  }
  if (isVideoFile(file)) {
    return (
      <>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleFileDownload(file)}>
          <DynamicIcon name="download" className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayVideo(file)}>
          <DynamicIcon name="play" className="h-4 w-4" />
        </Button>
      </>
    );
  }
  if (isPdfFile(file)) {
    return (
      <>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleFileDownload(file)}>
          <DynamicIcon name="download" className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleViewPdf(file)}>
          <DynamicIcon name="file-text" className="h-4 w-4" />
        </Button>
      </>
    );
  }
  return (
    <>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleFileDownload(file)}>
        <DynamicIcon name="download" className="h-4 w-4" />
      </Button>
    </>
  );
}

export function FileListItem({ file }: { file: FileViewEntry; }) {
  const { showOperations } = useFileBrowserStore();
  return (
    <>
      <TableCell className="px-4 py-2">
        <div className="flex items-center">
          <div className="mr-2">
            {getFileIcon(file)}
          </div>
          <span>{file.name}</span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-2">
        {file.type}
      </TableCell>
      <TableCell className="px-4 py-2 text-right">
        {file.size !== undefined && !file.isDirectory ? formatFileSize(file.size) : ''}
      </TableCell>
      <TableCell className="px-4 py-2">
        {formatModifiedTime(file.modifiedAt)}
      </TableCell>
      {showOperations && (
        <TableCell className="px-4 py-2">
          <div className="flex items-center gap-2">
            <FileOperations file={file} />
          </div>
        </TableCell>
      )}
    </>
  );
}