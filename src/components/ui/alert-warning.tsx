import React from 'react';
import { AlertTriangle } from "lucide-react";

const AlertWarning = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      <AlertTriangle />
    </div>
  );
};

export default AlertWarning;