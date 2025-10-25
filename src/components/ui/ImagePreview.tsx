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

  // Generate a placeholder image based on the URL
  const generatePlaceholder = (url?: string) => {
    if (!url) return null;
    
    // Extract domain for a more meaningful placeholder
    try {
      const domain = new URL(url).hostname;
      const initial = domain.charAt(0).toUpperCase();
      
      // Create a simple SVG placeholder with domain initial
      const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#f3f4f6"/>
          <text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#6b7280">
            ${initial}
          </text>
          <text x="50" y="65" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">
            ${domain.length > 10 ? domain.substring(0, 10) + '...' : domain}
          </text>
        </svg>
      `;
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } catch {
      // Fallback if URL parsing fails
      const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#f3f4f6"/>
          <text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#6b7280">
            IMG
          </text>
        </svg>
      `;
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
  };

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
            <div className="text-gray-400 text-lg mb-1">🖼️</div>
            <span className="text-gray-500 text-xs">Preview unavailable</span>
          </div>
        )}
      </div>
    );
  }

  const placeholderUrl = generatePlaceholder(url);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-gray-100', sizeClasses[size], className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
        </div>
      )}
      
      {/* Try to load the original image */}
      <img
        src={url}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      
      {/* Show placeholder while loading or if image fails */}
      {(isLoading || hasError) && placeholderUrl && (
        <img
          src={placeholderUrl}
          alt={`${alt} placeholder`}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            isLoading ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

export default ImagePreview;