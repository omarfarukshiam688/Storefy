import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { listCategories } from '@/lib/products';
import { ProductForm } from '@/components/admin/product-form';

export default async function NewProductPage() {
  try {
    await requireAuthUser();
  } catch {
    redirect('/login');
  }

  let context;
  try {
    context = await getTenantContext();
  } catch {
    redirect('/dashboard/onboarding');
  }

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const categories = await listCategories(context.activeTenant.id);

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">New product</h1>
        <p className="text-muted-foreground mt-1">Add a new product to your catalog.</p>
      </div>

      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 lg:p-8">
        <ProductForm mode="create" categories={categories} />
      </div>
    </div>
  );
}
