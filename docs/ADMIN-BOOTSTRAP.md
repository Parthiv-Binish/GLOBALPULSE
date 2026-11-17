# GLOBALPULSE — First administrator bootstrap

The first administrator is promoted manually by the project owner. Public signup always creates the least-privileged `user` role. A user cannot edit their own role because the database grants profile updates only on `display_name`.

## 1. Create the owner account

1. Open the production GLOBALPULSE website.
2. Select **Create account**.
3. Register using the email address that should own administration.
4. Confirm the email using the Supabase Auth confirmation message.
5. Sign in once so the `profiles` row is created by the database trigger.

## 2. Configure Supabase Auth redirects

In Supabase Dashboard → Authentication → URL Configuration:

- Set **Site URL** to `https://globalpulse-parthivs-projects-0af44f70.vercel.app`.
- Add `https://globalpulse-parthivs-projects-0af44f70.vercel.app/**` to **Redirect URLs**.
- For local development only, optionally add `http://localhost:5173/**`.
- Save the configuration.

This is required for email confirmation and password recovery to return to the deployed application.

## 3. Promote the verified account

Open Supabase Dashboard → SQL Editor for the GLOBALPULSE project. Replace the email literal below with the exact email used in step 1, then run:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('YOUR-OWNER-EMAIL@example.com')
);
```

Verify exactly one row was updated. If zero rows were updated, confirm the user has completed signup and email confirmation.

## 4. Verify admin access

1. Sign out and sign back in to refresh the session/profile.
2. The **Administration** navigation item should appear.
3. Add providers only from the allowlisted official sources.
4. Newly created providers are disabled until reviewed.
5. Use the audit log table to review administrator actions.

## Security

- Never set an account's role through browser developer tools or client-side SQL.
- Do not expose the Supabase service-role key.
- Do not promote an account based only on a display name.
- Keep the owner email protected by MFA in the identity provider where available.
- If the owner account is compromised, disable the account in Supabase Auth and rotate relevant credentials.
