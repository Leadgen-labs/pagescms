# CMS language and site overview

The language preference is attached to the normalized collaborator email, so it exists before account registration and is shared across that person's projects. Supported values are `cs` (default) and `en`.

- Invitation forms select the initial language. Inviting an existing account preserves its current preference.
- Collaborator managers can change the language in the collaborator list, after the existing repository write-access checks.
- Signed-in users can change their own preference using the sidebar switch or Settings > Profile. The server uses that preference on subsequent sessions and devices.
- Invitations (including resends), access notifications and login OTP emails use the recipient's preference for their subject and complete body.
- The shared UI dictionary covers navigation, editor controls, media, validation, collaborator management, settings, administrative tables, timestamps and authored server messages. Unrecognized external errors use localized recovery instructions. Changing the interface language does not translate website content or user-authored field labels.

`language_preference` is introduced by migration `0013_language_preference.sql`. Apply migrations before serving this version. The existing `npm run build` postbuild migration step handles this on Vercel. Older versions can ignore the added table during a rollback.

## Overview availability

`callWebsBot` now rejects malformed upstream responses instead of returning an empty object. Read-only `/cms/overview` requests can retry a trusted fallback after network or non-JSON failures. Set `WEBS_BOT_FALLBACK_URL` on the CMS server when needed. The known `mcp.mobilut.com` endpoint has an explicit fallback to the same application's workers.dev URL. Application JSON permission denials are returned without retry; mutating operations are never replayed. Redirects are rejected.

The overview keeps the management guide available during API errors, cancels outdated requests when changing repositories, and includes a bilingual guide with a prominent MCP connection card.

For a single-site overview the CMS signs a `repositoryAccess` claim only after checking the session's access to that exact repository. Invited CMS collaborators, private-repository members and GitHub writers do not also need an entry in the bot's contact list. Reading a public repository alone does not qualify. This claim grants only the redacted client overview; it does not grant agency administration, all-site listings, submission records or bot mutation permissions.

## Verification

```sh
npm test
npx tsc --noEmit --incremental false
```

The tests render both languages of all three CMS email templates, validate preference ownership and locale values, and cover WAF HTML responses, network failures, signed retries and authorization denials. No real emails are sent.

Local browser checks used mocked authenticated APIs: CZ/EN switching, initial account preference, persistence in a fresh browser context, failed-save recovery, overview failure, desktop/mobile layouts and dark mode. The overview passed axe WCAG A/AA checks with no reported violations. Production login and the database migration still require a deployment smoke check.

## Bot and MCP

`POST /api/internal/language` is an internal HMAC-authenticated lookup using `WEBS_BOT_SECRET` / `CMS_CHAT_SECRET`. The body contains the email and optionally a language. Only the trusted bot uses this endpoint; changing a preference from MCP occurs only after successful email OTP verification. Timestamp checks, constant-time signature verification and a body limit apply before database work. No browser session can query or change another user through this endpoint.

Deploy this CMS version and migration before the companion bot change. The bot uses this preference for authenticated MCP tools, OAuth pages and codes, CMS chat, queued replies, preview/deployment emails, reminders and monthly reports. The bot uses request-scoped language storage and the `nodejs_als` compatibility flag; there is no mutable global current-user locale. If a configured preference service is unavailable, processing fails for retry instead of sending a message in an incorrect default language.

The browser smoke test covered both languages of collaborator invitation, OTP entry and incorrect-code errors, account settings and the overview, without real emails. The static UI coverage test requires authored JSX copy to be registered for translation.
