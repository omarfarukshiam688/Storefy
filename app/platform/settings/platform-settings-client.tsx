'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function PlatformSettingsClient() {
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [newEmail, setNewEmail] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/platform/settings');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load settings');
        }

        setEmail(data.email);
        setNewEmail(data.email);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);

    try {
      const response = await fetch('/api/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email');
      }

      toast.success(data.message || 'Email updated successfully');
      setEmail(newEmail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);

    try {
      const response = await fetch('/api/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password',
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success(data.message || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-[-0.07em] text-slate-900">
            Account Settings
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Manage your platform Super Admin credentials.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Email Address</CardTitle>
                <CardDescription>
                  Update your Super Admin account email
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-email">Current Email</Label>
                <Input
                  id="current-email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="superadmin@example.com"
                  required
                />
                <p className="text-xs text-slate-500">
                  A verification email will be sent to the new address.
                </p>
              </div>
              <CardFooter className="p-0">
                <Button type="submit" loading={savingEmail} disabled={savingEmail || newEmail === email}>
                  {savingEmail ? 'Updating...' : 'Update Email'}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your Super Admin account password
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <p className="text-xs text-slate-500">
                  Must be at least 8 characters long.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <CardFooter className="p-0">
                <Button type="submit" loading={savingPassword} disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
