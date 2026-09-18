'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { SectionToggle } from './section-toggle';

interface ReviewsEditorProps {
  section: { section_key: string; is_enabled: boolean; config: Record<string, unknown> };
  onUpdate: (config: Record<string, unknown>, isEnabled: boolean) => void;
}

export function ReviewsEditor({ section, onUpdate }: ReviewsEditorProps) {
  const isEnabled = section.is_enabled;
  const heading = (section.config.heading as string) || 'Reviews';
  const description = (section.config.description as string) || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Reviews Section</h3>
        <SectionToggle checked={isEnabled} onCheckedChange={(checked) => onUpdate(section.config as Record<string, unknown>, checked)} />
      </div>

      {isEnabled && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="reviews-heading" className="text-sm font-semibold">
              Section Heading
            </Label>
            <input
              id="reviews-heading"
              type="text"
              value={heading}
              onChange={(e) => onUpdate({ ...section.config, heading: e.target.value }, isEnabled)}
              placeholder="Reviews"
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="reviews-description" className="text-sm font-semibold">
              Description (optional)
            </Label>
            <textarea
              id="reviews-description"
              value={description}
              onChange={(e) => onUpdate({ ...section.config, description: e.target.value }, isEnabled)}
              placeholder="What our customers say"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Customer reviews will appear here once the reviews module is available.
          </p>
        </div>
      )}
    </div>
  );
}
