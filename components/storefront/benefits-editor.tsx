'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SectionToggle } from './section-toggle';

interface BenefitsEditorProps {
  section: { section_key: string; is_enabled: boolean; config: Record<string, unknown> };
  onUpdate: (config: Record<string, unknown>, isEnabled: boolean) => void;
}

export function BenefitsEditor({ section, onUpdate }: BenefitsEditorProps) {
  const isEnabled = section.is_enabled;
  const heading = (section.config.heading as string) || 'Why Choose Us';
  const description = (section.config.description as string) || '';
  const benefits = (section.config.benefits as Array<{ icon: string; title: string; description: string }>) || [
    { icon: 'CheckCircle', title: '', description: '' },
    { icon: 'ShieldCheck', title: '', description: '' },
    { icon: 'Truck', title: '', description: '' },
  ];

  const updateBenefit = (index: number, field: string, value: string) => {
    const newBenefits = benefits.map((b, i) => (i === index ? { ...b, [field]: value } : b));
    onUpdate({ ...section.config, benefits: newBenefits }, isEnabled);
  };

  const addBenefit = () => {
    if (benefits.length >= 4) return;
    const newBenefits = [...benefits, { icon: 'Star', title: '', description: '' }];
    onUpdate({ ...section.config, benefits: newBenefits }, isEnabled);
  };

  const removeBenefit = (index: number) => {
    if (benefits.length <= 1) return;
    const newBenefits = benefits.filter((_, i) => i !== index);
    onUpdate({ ...section.config, benefits: newBenefits }, isEnabled);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Why Choose Us</h3>
        <SectionToggle checked={isEnabled} onCheckedChange={(checked) => onUpdate(section.config as Record<string, unknown>, checked)} />
      </div>

      {isEnabled && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="why-heading" className="text-sm font-semibold">
              Heading
            </Label>
            <input
              id="why-heading"
              type="text"
              value={heading}
              onChange={(e) => onUpdate({ ...section.config, heading: e.target.value }, isEnabled)}
              placeholder="Why Choose Us"
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="why-description" className="text-sm font-semibold">
              Description (optional)
            </Label>
            <textarea
              id="why-description"
              value={description}
              onChange={(e) => onUpdate({ ...section.config, description: e.target.value }, isEnabled)}
              placeholder="What makes your business stand out?"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Benefits (up to 4)</Label>
            {benefits.map((benefit, index) => (
              <div key={index} className="rounded-lg border border-border bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Benefit {index + 1}</span>
                  {benefits.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => removeBenefit(index)}
                      aria-label={`Remove benefit ${index + 1}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.061-.94-1.75-1.8-1.643l-3.197.392c-.51.063-.982.255-1.372.554l-2.566 2.566c-.39.39-.902.61-1.457.61H9.69a2.25 2.25 0 00-1.457.61l-2.566-2.566c-.39-.3-.862-.491-1.372-.554l-3.197-.392C2.18 4.061 1.24 4.75 1.24 5.811v.916" />
                      </svg>
                    </Button>
                  )}
                </div>
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium text-slate-600">Title</Label>
                  <input
                    type="text"
                    value={benefit.title}
                    onChange={(e) => updateBenefit(index, 'title', e.target.value)}
                    placeholder="Fresh & Homemade"
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium text-slate-600">Description</Label>
                  <textarea
                    value={benefit.description}
                    onChange={(e) => updateBenefit(index, 'description', e.target.value)}
                    placeholder="Carefully prepared with quality ingredients."
                    rows={2}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
              </div>
            ))}
            {benefits.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBenefit}
                className="w-full"
              >
                Add Benefit
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
