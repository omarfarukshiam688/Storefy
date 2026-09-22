import { requireSuperAdmin } from '@/lib/auth/tenant';
import PlatformSettingsClient from './platform-settings-client';

export default async function PlatformSettingsPage() {
  await requireSuperAdmin();

  return <PlatformSettingsClient />;
}
