import * as React from 'react';
import { cn } from '@/lib/utils';

export function ArrowIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-arrow-up-right', className)}
      {...props}
    >
      <path d="M7 17l9-9" />
      <path d="M7 8h9v9" />
    </svg>
  );
}
