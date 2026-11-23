'use client';

import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResourceCenterImageUploadProps {
  value: string | null;
  onChange: (storagePath: string | null) => void;
  assetType: 'documentation/cover' | 'blog/videos/thumbnail' | 'blog/articles/cover' | 'changelog/release';
  contentId: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function ResourceCenterImageUpload({
  value,
  onChange,
  assetType,
  contentId,
  label,
  required = false,
  disabled = false,
}: ResourceCenterImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreview = previewUrl || value;

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const file = fileArray[0];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Unsupported file type: ${file.name}. Allowed: JPEG, PNG, WebP, AVIF`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 5 MB limit`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('asset_type', assetType);
      formData.append('content_id', contentId);
      if (value) {
        formData.append('old_storage_path', value);
      }

      const response = await fetch('/api/resource-center/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.storage_path);
      setPreviewUrl(null);
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [assetType, contentId, value, onChange]);

  const handleRemove = useCallback(async () => {
    if (!value) return;

    const confirmRemove = window.confirm('Remove this image?');
    if (!confirmRemove) return;

    try {
      const response = await fetch(`/api/resource-center/upload?storage_path=${encodeURIComponent(value)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      onChange(null);
      toast.success('Image removed');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to remove image');
    }
  }, [value, onChange]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}

      <div
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          'hover:border-violet-400/50 focus-within:border-violet-400',
          isUploading && 'opacity-50 cursor-wait',
          disabled && 'opacity-50 cursor-not-allowed',
          currentPreview && 'border-transparent bg-transparent p-0'
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || isUploading}
          aria-label={label ? `Upload ${label.toLowerCase()}` : 'Upload image'}
        />

        {currentPreview && !isUploading ? (
          <div className="relative">
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src={currentPreview}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/90 shadow-md"
                  onClick={triggerFileInput}
                  disabled={disabled || isUploading}
                  aria-label="Replace image"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/90 shadow-md text-destructive hover:bg-destructive/10"
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                  aria-label="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Click the upload icon to replace, or the trash icon to remove</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              {isUploading ? 'Uploading...' : 'Drag & drop image here, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Max 5 MB &bull; JPEG, PNG, WebP, AVIF
            </p>
            {isUploading && (
              <div className="mt-4 w-full max-w-xs mx-auto">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 text-center">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </>
        )}
      </div>

      {required && !value && !isUploading && (
        <p className="text-xs text-red-500">This field is required</p>
      )}
    </div>
  );
}