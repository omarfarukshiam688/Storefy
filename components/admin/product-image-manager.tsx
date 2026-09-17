'use client';

import * as React from 'react';
import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Upload, Image, Trash2, Star, ArrowUp, ArrowDown, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadProductImage, updateProductImage, deleteProductImage, reorderProductImages } from '@/lib/products/image-client';
import type { ProductImage } from '@/types';

type PendingProductImage = ProductImage & { pending?: boolean; progress?: number; error?: string };

interface ProductImageManagerProps {
  productId?: string;
  initialImages: ProductImage[];
  disabled?: boolean;
  onImagesChange?: (images: ProductImage[]) => void;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  error?: string;
}

export const ProductImageManager = forwardRef<ProductImageManagerHandle, ProductImageManagerProps>(
  ({ productId, initialImages, disabled, onImagesChange }, ref) => {
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  console.log('[DIAGNOSTIC] product-image-manager.tsx initialImages count:', initialImages.length, 'images count:', images.length);

  useEffect(() => {
    console.log('[DIAGNOSTIC] product-image-manager.tsx useEffect initialImages count:', initialImages.length, 'current images count:', images.length);
    setImages(initialImages);
  }, [initialImages]);

  const notifyChange = useCallback(() => {
    onImagesChange?.([...images, ...pendingImages.map(p => ({
      id: p.id,
      tenant_id: '',
      product_id: productId || '',
      storage_path: '',
      url: p.previewUrl,
      display_order: images.length + pendingImages.indexOf(p),
      is_primary: false,
      alt_text: null,
      mime_type: p.file.type,
      file_size: p.file.size,
      width: null,
      height: null,
      original_filename: p.file.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))]);
  }, [images, pendingImages, onImagesChange, productId]);

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Client-side validation
    for (const file of fileArray) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}. Allowed: JPEG, PNG, WebP, GIF`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5 MB limit`);
        return;
      }
    }

    const currentTotal = images.length + pendingImages.length;
    if (currentTotal + fileArray.length > 8) {
      toast.error(`Maximum 8 images per product. You already have ${currentTotal}.`);
      return;
    }

    const newPending: PendingImage[] = fileArray.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
    }));

    setPendingImages(prev => [...prev, ...newPending]);
    notifyChange();
  }, [images.length, pendingImages.length, notifyChange]);

  const removePending = useCallback((id: string) => {
    setPendingImages(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
    notifyChange();
  }, [notifyChange]);

  const uploadPending = useCallback(async (targetProductId: string) => {
    if (pendingImages.length === 0) return { uploaded: 0, failed: 0 };
    setIsUploading(true);
    let uploaded = 0;
    let failed = 0;

    for (const pending of pendingImages) {
      try {
        const uploadedImage = await uploadProductImage(targetProductId, pending.file);
        setImages(prev => [...prev, uploadedImage]);
        URL.revokeObjectURL(pending.previewUrl);
        uploaded++;
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error(`Failed to upload ${pending.file.name}`);
        failed++;
      }
    }

    setPendingImages([]);
    notifyChange();
    setIsUploading(false);
    return { uploaded, failed };
  }, [pendingImages, notifyChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Reorder handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  }, []);

  const handleDragOverItem = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDropItem = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newImages = [...images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, removed);

    // Optimistic update
    setImages(newImages);
    notifyChange();
    setDraggedIndex(null);

    if (productId) {
      try {
        setIsReordering(true);
        await reorderProductImages(productId, newImages.map(img => img.id));
      } catch (err) {
        console.error('Reorder failed:', err);
        toast.error('Failed to reorder images');
        // Revert on failure
        setImages(images);
        notifyChange();
      } finally {
        setIsReordering(false);
      }
    }
  }, [images, draggedIndex, productId, notifyChange]);

  const moveImage = useCallback(async (index: number, direction: 'up' | 'down') => {
    if (index < 0 || index >= images.length) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const newImages = [...images];
    const [removed] = newImages.splice(index, 1);
    newImages.splice(newIndex, 0, removed);

    setImages(newImages);
    notifyChange();

    if (productId) {
      try {
        setIsReordering(true);
        await reorderProductImages(productId, newImages.map(img => img.id));
      } catch (err) {
        console.error('Reorder failed:', err);
        toast.error('Failed to reorder images');
        setImages(images);
        notifyChange();
      } finally {
        setIsReordering(false);
      }
    }
  }, [images, productId, notifyChange]);

  const handleSetPrimary = useCallback(async (imageId: string) => {
    try {
      await updateProductImage(imageId, { is_primary: true });
      // Optimistic update
      setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId })));
      notifyChange();
      toast.success('Primary image updated');
    } catch (err) {
      console.error('Set primary failed:', err);
      toast.error('Failed to set primary image');
    }
  }, [notifyChange]);

  const handleDelete = useCallback(async (imageId: string) => {
    const confirmDelete = window.confirm('Delete this image? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const result = await deleteProductImage(imageId);
      if (!result.storageDeleted) {
        toast.error('Image record deleted but storage cleanup failed. Please contact support.');
      } else {
        toast.success('Image deleted');
      }
      setImages(prev => prev.filter(img => img.id !== imageId));
      notifyChange();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete image');
    }
  }, [notifyChange]);

  const handleAltTextChange = useCallback(async (imageId: string, altText: string) => {
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, alt_text: altText } : img));
    try {
      await updateProductImage(imageId, { alt_text: altText });
    } catch (err) {
      console.error('Alt text update failed:', err);
      toast.error('Failed to update alt text');
    }
  }, []);

  const allImages: PendingProductImage[] = [...images, ...pendingImages.map(p => ({
    id: p.id,
    tenant_id: '',
    product_id: productId || '',
    storage_path: '',
    url: p.previewUrl,
    display_order: images.length + pendingImages.indexOf(p),
    is_primary: false,
    alt_text: null,
    mime_type: p.file.type,
    file_size: p.file.size,
    width: null,
    height: null,
    original_filename: p.file.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pending: true,
    progress: p.progress,
    error: p.error,
  } as PendingProductImage))];

  useImperativeHandle(ref, () => ({
    uploadPending,
  }), [uploadPending]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Product images</h3>
        <div className="text-xs text-muted-foreground">
          {images.length + pendingImages.length}/8 images
        </div>
      </div>

      {/* Dropzone / Upload Area */}
      <div
        ref={dropzoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          'hover:border-primary/50 focus-within:border-primary',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={e => e.target.files && handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled}
          aria-label="Upload product images"
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium">Drag & drop images here, or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max 8 images &bull; 5 MB each &bull; JPEG, PNG, WebP, GIF
        </p>
        {pendingImages.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {pendingImages.map(p => (
              <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                {p.error && (
                  <div className="absolute inset-0 bg-destructive/90 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <button
                  onClick={() => removePending(p.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Remove pending image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {allImages.map((image, index) => (
            <div
              key={image.id}
              draggable={!image.pending && !disabled}
              onDragStart={e => !image.pending && !disabled && handleDragStart(e, index)}
              onDragOver={e => !image.pending && !disabled && handleDragOverItem(e, index)}
              onDrop={e => !image.pending && !disabled && handleDropItem(e, index)}
              className={cn(
                'relative group rounded-lg border border-border overflow-hidden bg-white',
                'transition-shadow hover:shadow-md',
                dragOverIndex === index && 'border-primary bg-primary/5 ring-2 ring-primary',
                image.pending && 'opacity-70',
                disabled && 'opacity-50'
              )}
            >
              <div className="aspect-square relative overflow-hidden">
                {image.url ? (
                    <img
                      src={image.url}
                      alt={image.alt_text || image.original_filename}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                {image.pending && image.progress !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${image.progress}%` }}
                    />
                  </div>
                )}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-white text-xs font-medium">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    Primary
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {image.original_filename}
                  </span>
                  {image.is_primary ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary"
                      onClick={() => {}}
                      disabled
                      aria-label="Primary image"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleSetPrimary(image.id)}
                      disabled={disabled || image.pending || isReordering}
                      aria-label="Set as primary image"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveImage(index, 'up')}
                    disabled={disabled || index === 0 || isReordering || image.pending}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveImage(index, 'down')}
                    disabled={disabled || index === images.length - 1 || isReordering || image.pending}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(image.id)}
                    disabled={disabled || isReordering || image.pending}
                    aria-label="Delete image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Label htmlFor={`alt-${image.id}`} className="text-xs font-medium">
                  Alt text
                </Label>
                <Input
                  id={`alt-${image.id}`}
                  type="text"
                  value={image.alt_text || ''}
                  onChange={e => handleAltTextChange(image.id, e.target.value)}
                  placeholder="Accessibility description"
                  disabled={disabled || image.pending}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {allImages.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Image className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">No images yet. Upload your first product image above.</p>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Uploading images...</span>
          </div>
        </div>
      )}
    </div>
  );
});
ProductImageManager.displayName = 'ProductImageManager';

export type ProductImageManagerHandle = {
  uploadPending: (productId: string) => Promise<{ uploaded: number; failed: number }>;
};