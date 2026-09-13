'use client';

import * as React from 'react';
import {
  Store,
  Layers,
  BarChart3,
  Users,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Layers,
    title: 'Product management',
    description: 'Organize catalog, pricing, and stock in one place.',
  },
  {
    icon: ShoppingCart,
    title: 'Order workflow',
    description: 'Track orders from purchase to delivery.',
  },
  {
    icon: Users,
    title: 'Customer records',
    description: 'Keep customer data structured and accessible.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Understand sales trends with clear reporting.',
  },
];

export function AuthPanel() {
  return (
    <div className="relative hidden h-screen w-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white lg:flex">
      {/* Premium background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top-right radial glow */}
        <div className="absolute -right-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        {/* Bottom-left subtle glow */}
        <div className="absolute -bottom-1/4 -left-1/4 h-1/3 w-1/3 rounded-full bg-purple-500/5 blur-3xl" />
        {/* Top radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,_rgba(59,130,246,0.1),_transparent_60%)]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between px-10 py-8">
        {/* Logo section */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Storefy</span>
        </div>

        {/* Main content */}
        <div className="max-w-md space-y-8">
          {/* Headline section */}
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Build your storefront with confidence
            </h2>
            <p className="text-lg text-blue-100/80">
              Multi-tenant SaaS platform for small businesses. Manage products,
              orders, and customers from one place.
            </p>
          </div>

          {/* Visual illustration area - Abstract gradient design */}
          <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6">
            {/* Decorative circles and elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-16 w-16 rounded-full border-2 border-blue-400/40 bg-blue-400/10 backdrop-blur-sm" />
                  <div className="h-12 w-12 rounded-xl border-2 border-purple-400/40 bg-purple-400/10 backdrop-blur-sm" />
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-10 w-10 rounded-lg border-2 border-blue-300/40 bg-blue-300/10 backdrop-blur-sm" />
                  <div className="h-14 w-14 rounded-full border-2 border-purple-300/40 bg-purple-300/10 backdrop-blur-sm" />
                  <div className="h-8 w-8 rounded-md border-2 border-blue-400/40 bg-blue-400/10 backdrop-blur-sm" />
                </div>
              </div>
            </div>
            {/* Floating sparkle icon */}
            <div className="absolute top-4 right-4">
              <Sparkles className="h-6 w-6 text-blue-300/60" />
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-400/50 hover:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 group-hover:bg-blue-500/30 transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm font-medium leading-snug">{title}</p>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Storefy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
