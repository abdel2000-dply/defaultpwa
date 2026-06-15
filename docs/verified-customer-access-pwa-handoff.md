# VerifiedCustomerAccess PWA Handoff

This document lists the PWA files needed to move the `VerifiedCustomerAccess` storefront flow into another PlentyONE PWA.

## Files to copy

Copy these files into the same paths in the target PWA:

- `apps/web/app/pages/verify-access.vue`
- `apps/web/app/composables/useVerifiedCustomerAccess/index.ts`
- `apps/web/app/composables/useVerifiedCustomerAccess/types.ts`
- `apps/web/app/composables/useVerifiedCustomerAccess/useVerifiedCustomerAccess.ts`

Also copy or merge these changes:

- `apps/web/app/composables/index.ts`
  - Add:
    ```ts
    export * from './useVerifiedCustomerAccess';
    ```
- `apps/web/app/lang/en.json`
  - Merge the `verifiedCustomerAccess` translation block.
- `apps/web/app/lang/de.json`
  - Merge the `verifiedCustomerAccess` translation block if German is enabled.

## Required routing/proxy setup

The PWA must be able to call the plugin storefront REST endpoints through `/rest`:

- `POST /rest/verified-customer-access/verify-access`
- `POST /rest/verified-customer-access/assign-customer-class`

In local development, the existing proxy should forward `/rest/...` to the Plenty system domain.

Example target:

```text
https://l2e9r36f5zp2.c01-14.plentymarkets.com
```

## Current flow

1. User opens:

   ```text
   /verify-access
   ```

2. User enters access code and email.

3. PWA calls:

   ```text
   POST /rest/verified-customer-access/verify-access
   ```

   Body:

   ```json
   {
     "code": "ABC123",
     "email": "customer@example.com"
   }
   ```

4. If verification returns `success: false`:
   - the page shows a red error alert
   - a negative notification is shown
   - the user is not redirected
   - assignment is not called

5. If verification returns `success: true`, PWA immediately calls:

   ```text
   POST /rest/verified-customer-access/assign-customer-class
   ```

   with the same `{ code, email }`.

6. If assignment returns `success: false`:
   - the page shows a red error alert
   - a negative notification is shown
   - the user is not redirected

7. If assignment returns `success: true`:
   - existing customer flow redirects to login
   - register flow redirects to register

## User-facing messages

Existing customer/login case:

```text
Access has been verified, please login to continue.
```

Register case:

```text
No record was found for the provided email.
```

Maximum usage case:

```text
This access code has reached the maximum number of allowed uses.
```

## Backend expectation

The simplified PWA flow assigns the customer class before login/register. Therefore the backend endpoint below must support pre-login assignment:

```text
POST /rest/verified-customer-access/assign-customer-class
```

If that endpoint still requires a logged-in Plenty session, the PWA will correctly show the backend error and will not redirect.

## Not handled by PWA

The PWA does not implement product or category visibility logic. Visibility is handled by Plenty backend customer class configuration.
