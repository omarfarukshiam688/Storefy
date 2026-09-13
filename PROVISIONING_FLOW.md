# User Provisioning & Tenant Onboarding Flow

## Complete Signup → Profile → Tenant → Tenant Members Journey

### Phase 1: User Registration

**Trigger:** User submits signup form at `/auth/signup`

```
1. POST /auth/signup (Supabase Auth)
   ↓
2. User created in auth.users
   ↓
3. Database trigger: handle_new_user()
   ├─ Creates profiles row
   ├─ Sets name, email, avatar_url from metadata
   └─ default_tenant_id = NULL (user has no tenant yet)
```

**Database State After Registration:**

- ✅ `auth.users` row created
- ✅ `profiles` row created (no tenant)
- ❌ `tenants` row: NOT created
- ❌ `tenant_members` row: NOT created

---

### Phase 2: Email Verification

**Trigger:** User clicks verification link

```
1. Email link from Supabase → /auth/callback?code=...&type=signup
   ↓
2. POST /auth/callback exchanges code for session
   ↓
3. Browser redirected to /dashboard (default next parameter)
```

**RLS Check:** `email_confirmed_at` verified by middleware

---

### Phase 3: Dashboard Layout Redirect Logic

```
GET /dashboard (or any dashboard/* route)
   ↓
1. requireAuthUser() - must be authenticated
   ├─ ✅ PASS: User has valid session
   └─ ❌ FAIL: Redirect to /login
   ↓
2. Check email_confirmed_at
   ├─ ✅ PASS: Email verified
   └─ ❌ FAIL: Redirect to /verify-email
   ↓
3. userHasTenant(user.id)
   └─ Queries: SELECT COUNT(*) FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
   ├─ ✅ PASS (count > 0): User has tenant → Load getTenantContext()
   └─ ❌ FAIL (count = 0): User has NO tenant → Redirect to /dashboard/onboarding
   ↓
4. getTenantContext()
   └─ Fetches user's default_tenant_id and membership details
      (Only executed if userHasTenant = true)
```

**At this point:** New user redirected to `/dashboard/onboarding`

---

### Phase 4: Tenant Onboarding

**Page:** GET `/dashboard/onboarding`

```
1. Page loads (client component)
   ├─ useEffect fetches default plan
   │  └─ SELECT id FROM plans WHERE is_active=true
   │     ORDER BY price_monthly ASC LIMIT 1
   └─ Initializes form state

2. User enters:
   ├─ Store name (e.g., "My Awesome Store")
   ├─ Store slug (e.g., "my-awesome-store")
   │  └─ Real-time validation: GET /api/tenants/check-slug?slug=...
   └─ Submits form

3. Client-side validation:
   ├─ Zod schema check
   ├─ Slug must be available (≥3 chars, lowercase, alphanumeric+hyphens)
   ├─ No reserved slugs (admin, api, www, mail, ftp)
   └─ Submit button disabled until slug available = true
```

---

### Phase 5: Tenant Creation API

**Route:** POST `/api/tenants/create`

```
1. getAuthUser() - Verify authenticated
   ├─ ✅ PASS: Session valid
   └─ ❌ FAIL: Return 401

2. Validate request body
   ├─ Schema: { name, slug, plan_id }
   ├─ ✅ PASS: Continue
   └─ ❌ FAIL: Return 400 { error, details }

3. isSlugAvailable(slug)
   ├─ Query: SELECT COUNT(*) FROM tenants WHERE slug = ?
   ├─ ✅ PASS (count = 0): Continue
   └─ ❌ FAIL (count > 0): Return 409 "Slug taken"

4. createTenantForUser(userId, name, slug, plan_id)
   ├─ Step A: INSERT INTO tenants (name, slug, plan_id, settings)
   │  └─ Server-side insert (bypasses RLS because using service_role context)
   │  └─ Returns: { id, name, slug, ... }
   │
   ├─ Step B: INSERT INTO tenant_members (tenant_id, user_id, role)
   │  └─ user_id = auth.uid() (RLS policy: user can insert own membership)
   │  └─ role = 'tenant_admin' (auto-granted to creator)
   │  └─ ✅ SUCCESS (with fixed RLS policy)
   │
   ├─ Step C: UPDATE profiles SET default_tenant_id WHERE id = user_id
   │  └─ Sets the newly created tenant as default
   │  └─ ✅ SUCCESS
   │
   └─ Return: 201 { success: true, tenant: {...} }

5. Client-side redirect
   └─ toast.success("Store created successfully!")
   └─ router.push('/dashboard')
```

---

### Phase 6: Post-Onboarding Dashboard Access

**Route:** GET `/dashboard`

Now when user accesses dashboard:

```
1. Dashboard layout checks userHasTenant(user.id)
   ├─ Query: SELECT COUNT(*) FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = true
   ├─ ✅ PASS (count = 1): Tenant found
   └─ Continue to getContext()

2. getTenantContext() loads:
   ├─ User's tenant_members entry
   ├─ User's role (tenant_admin, tenant_staff, etc.)
   ├─ User's tenant details
   └─ Sets up RLS context for page

3. Dashboard page renders
   ├─ Welcome message with tenant info
   ├─ Quick actions (Settings for admins only)
   └─ Store information card
```

---

## Database State After Complete Onboarding

| Table            | Row                  | Status                                                |
| ---------------- | -------------------- | ----------------------------------------------------- |
| `auth.users`     | User row             | ✅ Created during signup                              |
| `profiles`       | User's profile       | ✅ Created during signup; `default_tenant_id` now set |
| `tenants`        | New tenant           | ✅ Created during onboarding                          |
| `tenant_members` | User as tenant_admin | ✅ Created during onboarding                          |
| `plans`          | Reference            | ✅ Linked to tenant                                   |

---

## Key RLS Policies Enabling This Flow

### 1. Profile Creation (Auth Trigger)

```sql
-- Automatic: handle_new_user() trigger creates profile on auth.users insert
```

### 2. Tenant Creation (Server-side API)

```sql
-- No RLS restriction: Uses server context which bypasses RLS
-- API endpoint handles authorization via getAuthUser()
```

### 3. Tenant Membership Insertion (RLS Policy)

```sql
-- Users can insert their own membership
create policy "Users can insert their own membership"
  on public.tenant_members
  for insert
  to public
  with check (user_id = auth.uid());

-- This enables: INSERT INTO tenant_members (tenant_id, user_id, role)
-- Because user_id = auth.uid() passes the check
```

### 4. Read Access (Membership-based)

```sql
-- Tenant admins can read their tenant
create policy "Tenant members can read their tenant"
  on public.tenants
  for select
  to authenticated
  using (public.is_tenant_member(id));

-- is_tenant_member() function checks if user exists in tenant_members
```

---

## Error Handling & Edge Cases

### New User Arrives at /dashboard

- ✅ Checks pass through Phase 3 steps 1-2 (auth, email)
- ✅ Step 3 finds NO tenant_members rows
- ✅ Redirects to /dashboard/onboarding
- ✅ User is guided through tenant creation

### Duplicate Slug Submission

- ❌ isSlugAvailable() returns false
- ❌ API returns 409 "Slug already taken"
- ✅ User sees error toast and can retry with different slug

### Plan Fetch Failure During Onboarding

- ❌ No active plans found
- ✅ Error toast: "Failed to load plans. Please try again later."
- ✅ Submit button remains disabled
- ✅ User can refresh page to retry

### Database Transaction Partial Failure

- If tenant created but tenant_members insert fails:
  - ❌ API returns 500 "Failed to create tenant membership"
  - ⚠️ Orphaned tenant row (no members) remains in DB
  - ✅ User can retry, or admin can clean up via super_admin role

---

## Testing the Complete Flow

```bash
# 1. Register new user at /auth/signup
# 2. Verify email (check inbox or use Supabase dashboard)
# 3. Login - automatically redirected to /dashboard/onboarding
# 4. Enter store name and slug
# 5. Check slug availability in real-time (3+ chars)
# 6. Submit form
# 7. See success toast
# 8. Redirected to /dashboard
# 9. View dashboard with tenant info and quick actions
# 10. Click Settings (admin only) → /dashboard/settings
# 11. Update store info, contact details, currency, timezone
# 12. Save changes
```

---

## Version History

- **Module 3**: Signup page UI redesign
- **Module 4**: Tenant onboarding & store configuration
  - Issue discovered: Missing RLS policy prevented tenant_members insertion
  - Fix: Added "Users can insert their own membership" policy to 007_tenant_rls.sql
  - Status: ✅ Fixed and verified (build passing, lint clean)
