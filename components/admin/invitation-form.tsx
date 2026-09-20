'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface InvitationFormProps {
  onInvitationCreated: () => void;
}

export function InvitationForm({ onInvitationCreated }: InvitationFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'tenant_admin' | 'tenant_staff'>('tenant_staff');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details);
        } else {
          toast.error(data.error || 'Failed to send invitation');
        }
        return;
      }

      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      setRole('tenant_staff');
      onInvitationCreated();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="email" className="text-sm font-semibold">
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="h-11 px-4 text-base"
        />
        {errors.email && (
          <p className="text-sm font-medium text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="role" className="text-sm font-semibold">
          Role
        </Label>
        <Select
          value={role}
          onValueChange={(value: 'tenant_admin' | 'tenant_staff') => setRole(value)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="role" className="h-11">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tenant_admin">Admin</SelectItem>
            <SelectItem value="tenant_staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm font-medium text-destructive">{errors.role}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {isSubmitting ? 'Sending invitation...' : 'Send invitation'}
      </Button>
    </form>
  );
}
