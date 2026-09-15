import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { listCategories } from '@/lib/products';
import { ProductForm } from '@/components/admin/product-form';
import { DashboardHeader } from '@/components/auth/dashboard-header';

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
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader profileName={context.profile.name} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">New product</h1>
            <p className="text-muted-foreground mt-1">Add a new product to your catalog.</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 lg:p-8">
            <ProductForm mode="create" categories={categories} />
          </div>
        </div>
      </main>
    </div>
  );
}
