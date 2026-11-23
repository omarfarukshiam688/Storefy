import { requireSuperAdmin } from '@/lib/auth/tenant';
import { ResourceCenterClient } from './resource-center-client';

export default async function PlatformResourceCenterPage() {
  await requireSuperAdmin();

  return <ResourceCenterClient />;
}