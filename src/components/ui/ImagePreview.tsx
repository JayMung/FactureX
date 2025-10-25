import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  url?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  url, 
  alt = 'Image preview', 
  className,
  fallback,
  size = 'md'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const proxyUrl = url ? `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}` : null;

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!url) {
    return (
      <div className={cn(sizeClasses[size], 'bg-gray-100 rounded-lg flex items-center justify-center', className)}>
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn(sizeClasses[size], 'bg-gray-100 rounded-lg flex items-center justify-center', className)}>
        {fallback || (
          <div className="text-center">
            <div className="text-gray-400 text-2xl mb-1">❌</div>
            <span className="text-gray-500 text-xs">Image unavailable</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-gray-100', sizeClasses[size], className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
        </div>
      )}
      <img
        src={proxyUrl}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};

export default ImagePreview;