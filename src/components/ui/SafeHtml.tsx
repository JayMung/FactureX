/**
 * Safe HTML Component
 * Renders HTML content safely by encoding it to prevent XSS attacks
 */

import React from 'react';
import { encodeHtml } from '@/lib/xss-protection';

interface SafeHtmlProps {
  content: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  title?: string;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({ 
  content, 
  className, 
  as: Component = 'span',
  title
}) => {
  const encodedContent = encodeHtml(content || '');
  
  return (
    <Component className={className} title={title}>
      {encodedContent}
    </Component>
  );
};

export default SafeHtml;
