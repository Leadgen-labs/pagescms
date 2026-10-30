# CMS language and site overview

The language preference is attached to the normalized collaborator email, so it exists before account registration and is shared across that person's projects. Supported values are `cs` (default) and `en`.

- Invitation forms select the initial language. Inviting an existing account preserves its current preference.
- Collaborator managers can change the language in the collaborator list, after the existing repository write-access checks.
- Signed-in users can change their own preference using the sidebar switch or Settings > Profile. The server uses that preference on subsequent sessions and devices.
- Invitations (including resends), access notifications and login OTP emails use the recipient's preference for their subject and complete body.
- The shared UI dictionary covers standard administration controls. Repository content, custom field labels and third-party error messages retain their original text unless a dictionary translation exists; changing the interface language does not translate website content.

`language_preference` is introduced by migration `0013_language_preference.sql`. Apply migrations before serving this version. The existing `npm run build` postbuild migration step handles this on Vercel. Older versions can ignore the added table during a rollback.

## Overview availability

`callWebsBot` now rejects malformed upstream responses instead of returning an empty object. Read-only `/cms/overview` requests can retry a trusted fallback after network or non-JSON failures. Set `WEBS_BOT_FALLBACK_URL` on the CMS server when needed. The known `mcp.mobilut.com` endpoint has an explicit fallback to the same application's workers.dev URL. Application JSON permission denials are returned without retry; mutating operations are never replayed. Redirects are rejected.

The overview keeps the management guide available during API errors, cancels outdated requests when changing repositories, and includes a bilingual guide with a prominent MCP connection card.

## Verification

```sh
node --test scripts/test-language.mjs scripts/test-webs-overview.mjs
npx tsc --noEmit --incremental false
```

The tests render both languages of all three CMS email templates, validate preference ownership and locale values, and cover WAF HTML responses, network failures, signed retries and authorization denials. No real emails are sent.

Local browser checks used mocked authenticated APIs: CZ/EN switching, initial account preference, persistence in a fresh browser context, failed-save recovery, overview failure, desktop/mobile layouts and dark mode. The overview passed axe WCAG A/AA checks with no reported violations. Production login and the database migration still require a deployment smoke check.
