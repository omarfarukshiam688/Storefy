'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { TenantStorefrontSection, StorefrontSectionKey } from '@/types';
import { HeroEditor } from './hero-editor';
import { CategoriesSectionEditor } from './categories-section-editor';
import { FeaturedProductsSectionEditor } from './featured-products-section-editor';
import { BenefitsEditor } from './benefits-editor';
import { AboutUsEditor } from './about-editor';
import { ReviewsEditor } from './reviews-editor';
import { ContactEditor } from './contact-editor';

interface StorefrontSectionsEditorProps {
  tenantId: string;
  tenantSlug: string;
  initialSections: TenantStorefrontSection[];
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  categories: 'Categories',
  featured_products: 'Featured Products',
  why_choose_us: 'Why Choose Us',
  about_us: 'About Us',
  reviews: 'Reviews',
  contact: 'Contact',
  footer: 'Footer',
};

export function StorefrontSectionsEditor({ tenantId, tenantSlug, initialSections }: StorefrontSectionsEditorProps) {
  const [sections, setSections] = React.useState<TenantStorefrontSection[]>(initialSections);
  const [activeSection, setActiveSection] = React.useState<StorefrontSectionKey | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  const updateSection = useCallback(
    (sectionKey: StorefrontSectionKey, config: Record<string, unknown>, isEnabled: boolean) => {
      setSections((prev) =>
        prev.map((s) => (s.section_key === sectionKey ? { ...s, config, is_enabled: isEnabled } : s))
      );
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/storefront/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      toast.success('Homepage configuration saved');
      setHasChanges(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, sections]);

  const handleReorder = useCallback(
    (newOrder: StorefrontSectionKey[]) => {
      setSections((prev) => {
        const sectionMap = new Map(prev.map((s) => [s.section_key, s]));
        const reordered = newOrder.map((key, index) => {
          const existing = sectionMap.get(key);
          return existing ? { ...existing, display_order: index } : null;
        }).filter(Boolean) as TenantStorefrontSection[];
        return reordered;
      });
      setHasChanges(true);
    },
    []
  );

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    const newOrder = newSections.map((s) => s.section_key);
    setSections(newSections);
    handleReorder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    const newOrder = newSections.map((s) => s.section_key);
    setSections(newSections);
    handleReorder(newOrder);
  };

  const renderSectionEditor = () => {
    const active = sections.find((s) => s.section_key === activeSection);
    if (!active) return null;

    const makeUpdater = (key: StorefrontSectionKey) => (config: Record<string, unknown>, isEnabled: boolean) => {
      updateSection(key, config, isEnabled);
    };

    switch (active.section_key) {
      case 'hero':
        return <HeroEditor section={active} onUpdate={makeUpdater('hero')} tenantId={tenantId} />;
      case 'categories':
        return <CategoriesSectionEditor section={active} onUpdate={makeUpdater('categories')} />;
      case 'featured_products':
        return <FeaturedProductsSectionEditor section={active} onUpdate={makeUpdater('featured_products')} />;
      case 'why_choose_us':
        return <BenefitsEditor section={active} onUpdate={makeUpdater('why_choose_us')} />;
      case 'about_us':
        return <AboutUsEditor section={active} onUpdate={makeUpdater('about_us')} tenantId={tenantId} />;
      case 'reviews':
        return <ReviewsEditor section={active} onUpdate={makeUpdater('reviews')} />;
      case 'contact':
        return <ContactEditor section={active} onUpdate={makeUpdater('contact')} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
            Sections
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Toggle sections on/off and reorder them.
          </p>
        </div>
        <div className="space-y-1">
          {sections.map((section, index) => {
            const isActive = activeSection === section.section_key;
            const isLocked = section.section_key === 'footer';
            return (
              <div
                key={section.id}
                 className={[
                   'flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                   isActive
                     ? 'border-violet-200 bg-violet-50'
                     : 'border-border bg-white hover:border-violet-200',
                   isLocked ? 'opacity-80' : '',
                 ].join(' ')}
                 onClick={() => !isLocked && setActiveSection(section.section_key as StorefrontSectionKey)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     if (!isLocked) setActiveSection(section.section_key as StorefrontSectionKey);
                   }
                 }}
                 role="button"
                 tabIndex={0}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {SECTION_LABELS[section.section_key] || section.section_key}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!isLocked && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveUp(index);
                        }}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDown(index);
                        }}
                        disabled={index === sections.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {isLocked && (
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/s/${tenantSlug}`} target="_blank" rel="noopener noreferrer">
              Preview
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-slate-50/50 p-6">
        {activeSection ? (
          <div className="animate-fade-in">
            {renderSectionEditor()}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-center">
            <div>
              <p className="text-sm font-medium text-slate-900">Select a section to configure</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click on any section from the list to edit its content.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
