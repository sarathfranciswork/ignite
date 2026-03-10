"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import type { CampaignAttachment } from "@/types/campaign";

interface FileUploadProps {
  files: CampaignAttachment[];
  onChange: (files: CampaignAttachment[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  className?: string;
  label?: string;
}

export function FileUpload({
  files,
  onChange,
  accept,
  multiple = true,
  maxSizeMB = 10,
  className,
  label = "Upload files",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: CampaignAttachment[] = Array.from(fileList)
        .filter((file) => file.size <= maxSizeMB * 1024 * 1024)
        .map((file) => ({
          id: generateId(),
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileSize: file.size,
          mimeType: file.type,
        }));

      onChange(multiple ? [...files, ...newFiles] : newFiles.slice(0, 1));
    },
    [files, onChange, multiple, maxSizeMB],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (id: string) => {
      onChange(files.filter((f) => f.id !== id));
    },
    [files, onChange],
  );

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
        )}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-1">
          Drag & drop or click to browse. Max {maxSizeMB}MB per file.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          aria-label={label}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon size={16} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {file.fileName}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatFileSize(file.fileSize)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label={`Remove ${file.fileName}`}
              >
                <X size={14} className="text-gray-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
