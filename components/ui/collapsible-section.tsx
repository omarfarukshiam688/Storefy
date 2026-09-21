'use client';

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <CollapsiblePrimitive.Root defaultOpen={defaultOpen} className={cn('rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm', className)}>
      <CollapsiblePrimitive.CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'group w-full flex items-center justify-between gap-4 p-5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'transition-colors hover:bg-muted/30'
          )}
        >
          <div className="flex-1 text-left">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              'group-data-[state=open]:rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </CollapsiblePrimitive.CollapsibleTrigger>
      <CollapsiblePrimitive.CollapsibleContent forceMount>
        <div data-collapsible-content className="overflow-hidden transition-all duration-200 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="pt-2 pb-5">{children}</div>
        </div>
      </CollapsiblePrimitive.CollapsibleContent>
    </CollapsiblePrimitive.Root>
  );
}