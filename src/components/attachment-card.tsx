import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Media } from "@/types";
import {
  Download,
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileCogIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  X,
} from "lucide-react";
import { useState } from "react";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function getFileIconFromData(file: Media) {
  const extension = file.original_name.split(".").pop()?.toLowerCase() ?? "";

  if (file.mime_type.startsWith("video/")) {
    return <FileVideoIcon size={24} />;
  }

  if (file.mime_type.startsWith("audio/")) {
    return <FileAudioIcon size={24} />;
  }

  if (file.mime_type.startsWith("text/") || ["txt", "md", "rtf", "pdf"].includes(extension)) {
    return <FileTextIcon size={24} />;
  }

  if (
    [
      "html",
      "css",
      "js",
      "jsx",
      "ts",
      "tsx",
      "json",
      "xml",
      "php",
      "py",
      "rb",
      "java",
      "c",
      "cpp",
      "cs",
      "cpp",
      "cs",
    ].includes(extension)
  ) {
    return <FileCodeIcon size={24} />;
  }

  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) {
    return <FileArchiveIcon size={24} />;
  }

  if (
    ["exe", "msi", "app", "apk", "deb", "rpm"].includes(extension) ||
    file.mime_type.startsWith("application/")
  ) {
    return <FileCogIcon size={24} />;
  }

  return <FileIcon size={24} />;
}

interface FilePreviewProps {
  file: Media;
  isSender?: boolean;
  isEditMode?: boolean;
  onClick: () => void;
  onImageClick?: () => void;
  onRefresh?: (fileId: string) => Promise<void>;
  disabled?: boolean;
}

const AttachmentCard: React.FC<FilePreviewProps> = ({
  file,
  isSender = true,
  isEditMode = false,
  onClick,
  onImageClick,
  onRefresh,
  disabled,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isThumbLoaded, setIsThumbLoaded] = useState(false);
  const [hasRetried, setHasRetried] = useState(false);

  const lastDotIndex = file?.original_name.lastIndexOf(".") ?? -1;
  const fileName =
    lastDotIndex !== -1 ? file.original_name.slice(0, lastDotIndex) : file.original_name;
  const fileExt = lastDotIndex !== -1 ? file.original_name.slice(lastDotIndex) : "";

  if (!file) return null;

  const isImage = file.mime_type?.startsWith("image/");
  if (isImage && !isEditMode) {
    return (
      <div className={`relative size-full rounded overflow-hidden`}>
        {!isLoaded && (
          <Skeleton
            variant={isSender ? "revert" : "default"}
            className="absolute inset-0 size-full"
          />
        )}
        <img
          key={file.url}
          src={file.url}
          alt={file.original_name}
          loading="lazy"
          className={`block size-full object-cover cursor-pointer transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.();
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!hasRetried && onRefresh) {
              setHasRetried(true);
              onRefresh(file.id).catch(console.error);
            }
          }}
        />
      </div>
    );
  }

  const iconBgClass = isSender
    ? "bg-[#17171a] dark:bg-[#f9f9f9]"
    : "dark:bg-[#17171a] bg-[#f9f9f9]";

  return (
    <Card
      variant={isSender ? "revert" : "default"}
      className={`flex flex-row items-center w-full p-2 gap-3 rounded-md shadow-none overflow-hidden ${isSender ? "" : "bg-background border"}`}
    >
      <div
        className={`shrink-0 size-10 flex items-center justify-center rounded-md ${iconBgClass} overflow-hidden relative`}
      >
        {isImage ? (
          <>
            {!isThumbLoaded && <Skeleton className="absolute inset-0 size-full rounded-md" />}
            <img
              src={file.url}
              alt={file.original_name}
              loading="lazy"
              className={`size-full object-cover ${!isThumbLoaded ? "opacity-0" : ""}`}
              onLoad={() => setIsThumbLoaded(true)}
              onError={() => {
                if (!hasRetried && onRefresh) {
                  setHasRetried(true);
                  onRefresh(file.id).catch(console.error);
                }
              }}
            />
          </>
        ) : (
          getFileIconFromData(file)
        )}
      </div>

      <div
        className={`flex flex-col flex-1 min-w-0 ${isSender ? "text-background" : "text-foreground"}`}
      >
        <div className="flex w-full items-center min-w-0" title={file.original_name}>
          <span className="truncate text-sm font-medium">{fileName}</span>
          <span className="text-sm font-medium whitespace-nowrap shrink-0">{fileExt}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{formatBytes(file.file_size)}</p>
      </div>

      <Button
        variant={isSender ? "ghostRevert" : "ghost"}
        size="icon"
        disabled={disabled}
        className="shrink-0 size-8 rounded-md"
        onClick={onClick}
      >
        {isEditMode ? (
          <X className={isSender ? "text-background" : "text-foreground"} size={18} />
        ) : (
          <Download className={isSender ? "text-background" : "text-foreground"} size={18} />
        )}
      </Button>
    </Card>
  );
};

export default AttachmentCard;
