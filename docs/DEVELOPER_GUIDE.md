# WhatsApp Outreach — Developer Guide

A self-hosted WhatsApp Business outreach platform: manage templates, run
campaigns against a prospect list, receive replies via webhook, and continue
conversations from a built-in inbox.

This guide walks a developer through **recreating the project from scratch**
and **integrating it into an existing lead generation platform**.

---

## 1. Overview

### What it does

| Feature              | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| Templates            | Create / sync / delete WhatsApp message templates via Meta Graph API     |
| Prospects            | CRUD + bulk CSV import of contacts                                       |
| Campaigns            | Assign templates, select prospects, launch a broadcast with variables    |
| Inbox                | See all inbound replies, continue conversations with free-form messages  |
| Webhook              | Receives incoming messages and delivery status updates from Meta         |
| Dashboard            | Aggregate stats (templates, campaigns, prospects, sent, replies)         |

### High-level flow

```
  ┌───────────┐      ┌──────────────┐       ┌──────────────┐
  │ Templates │─────▶│ Campaigns     │──────▶│ Launch (POST)│
  └───────────┘      │ (prospects +  │       │  → Meta API  │
                     │  variables)   │       └──────┬───────┘
  ┌───────────┐      └───────────────┘              │
  │ Prospects │─────▶                               ▼
  └───────────┘                              ┌─────────────┐
                                             │ Meta        │
  ┌──────────────────────────────────────┐   │ WhatsApp    │
  │ Webhook: /api/webhooks/whatsapp      │◀──│ (sends +    │
  │  • stores incoming messages (Reply)  │   │  receives)  │
  │  • updates message status (SENT→…)   │   └─────────────┘
  └──────────────────┬───────────────────┘
                     │
                     ▼
               ┌──────────┐     reply in thread    ┌───────────┐
               │  Inbox   │───────────────────────▶│ Send text │
               └──────────┘    (free-form msg)     └───────────┘
```

---

## 2. Tech Stack

| Layer       | Choice                                                |
| ----------- | ----------------------------------------------------- |
| Framework   | Next.js 16.2.4 (App Router + Turbopack)               |
| UI          | React 19, Tailwind CSS 4, Lucide icons                |
| Language    | TypeScript 5                                          |
| Persistence | File-based JSON in `data/` (no DB required)           |
| External    | Meta Graph API v21.0 (WhatsApp Business Cloud)        |
| Hosting     | Any Node-capable host (we use Railway)                |

> **Note**: this Next.js version has breaking changes from what most docs show.
> See `node_modules/next/dist/docs/` for the authoritative API and conventions
> used in this codebase.

---

## 3. Meta WhatsApp Business Prerequisites

Before the app can send or receive messages you need, from
**Meta Business Suite → WhatsApp Manager**:

1. A **WhatsApp Business Account (WABA)** → copy the **Business Account ID**
2. A **Phone Number** registered to that WABA → copy the **Phone Number ID**
3. A **Permanent Access Token** with these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. A **Verify Token** of your choosing (any random string) — you'll enter the
   same value in your app's Settings page and in Meta's webhook config.

Optional but recommended:
- Add your test recipient phone numbers to the allowed list if you're still in
  development mode.

---

## 4. Project Setup

```bash
git clone <your-fork>
cd wtsp-outreach
npm install
npm run dev            # http://localhost:3000
```

No environment variables are needed locally. All configuration (API token,
phone number ID, WABA ID, webhook verify token) is entered through the
**Settings page** in the UI and stored in `data/settings.json`.

### First-time local setup

1. `npm run dev`
2. Open `http://localhost:3000/settings`
3. Enter your Meta credentials + a verify token, click **Save**
4. For webhook testing from local dev, expose the port with ngrok:
   ```bash
   ngrok http 3000
   ```
   Then use the `https://...ngrok...app/api/webhooks/whatsapp` URL in Meta.

---

## 5. Project Structure

```
wtsp-outreach/
├── data/                             # JSON persistence (gitignored)
│   ├── campaigns.json
│   ├── messages.json
│   ├── prospects.json
│   ├── replies.json
│   ├── settings.json
│   └── templates.json
├── src/
│   ├── app/
│   │   ├── api/                      # Route handlers (route.ts)
│   │   │   ├── campaigns/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── launch/route.ts
│   │   │   ├── prospects/
│   │   │   ├── replies/
│   │   │   │   ├── route.ts                    # list / mark read
│   │   │   │   ├── conversations/route.ts      # grouped by prospect
│   │   │   │   ├── send/route.ts               # outbound free-form reply
│   │   │   │   └── thread/[prospectId]/route.ts
│   │   │   ├── settings/
│   │   │   ├── stats/
│   │   │   ├── templates/
│   │   │   │   ├── route.ts
│   │   │   │   ├── sync/route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   └── webhooks/
│   │   │       └── whatsapp/route.ts           # GET verify + POST events
│   │   ├── campaigns/                # UI pages (page.tsx)
│   │   ├── inbox/
│   │   ├── prospects/
│   │   ├── settings/
│   │   ├── templates/
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Dashboard
│   ├── components/                   # Reusable UI (modal, sidebar, badges)
│   └── lib/
│       ├── store.ts                  # File-based data layer
│       ├── whatsapp.ts               # Meta Graph API wrappers
│       └── template-vars.ts          # {{n}} variable parsing / resolution
├── package.json
├── next.config.ts
└── tsconfig.json
```

### App-router conventions

- Any file named `route.ts` under `src/app/api/` becomes an HTTP endpoint.
  Export `GET`, `POST`, `PUT`, `DELETE` as async functions.
- Dynamic segments: `[id]/route.ts` → `params` is a `Promise<{ id: string }>`
  (must `await`).
- UI pages: `page.tsx` rendered as React Server Components unless marked
  `"use client"`. All interactive pages in this project are client components.

---

## 6. Data Model

All defined in [src/lib/store.ts](../src/lib/store.ts). Each entity has a
dedicated JSON file and a small CRUD wrapper.

### Template
```ts
{
  id, name, category, language,
  headerType, headerText,
  bodyText,
  footerText, buttons,
  metaStatus: "PENDING" | "APPROVED" | "REJECTED",
  metaId: string | null,
  createdAt, updatedAt
}
```

### Prospect
```ts
{ id, phoneNumber, name, email, tags, createdAt }
```
`phoneNumber` should be stored in international E.164-like format. The
`getByPhone()` lookup is tolerant of `+` and non-digit differences.

### Campaign
```ts
{
  id, name, description,
  status: "DRAFT" | "RUNNING" | "COMPLETED",
  templateIds: string[],
  launchedAt, completedAt,
  totalSent, totalFailed,
  createdAt
}
```

### Message (outbound)
```ts
{
  id,
  campaignId,          // "direct" for inbox-sent messages
  prospectId,
  templateId,          // null for direct messages
  bodyText,            // set for direct messages, null for templates
  status: "SENT" | "DELIVERED" | "READ" | "FAILED",
  metaMessageId,
  errorMessage,
  sentAt,
  createdAt
}
```

### Reply (inbound)
```ts
{
  id,
  prospectId,          // null if sender has no matching prospect
  fromPhone,
  messageText,         // text or "[Image]"/"[Audio]"/etc. placeholder
  mediaType,           // "image" | "video" | "audio" | "document" | "sticker" | "location" | null
  metaMessageId,
  timestamp,           // ISO, from Meta's epoch
  isRead,
  createdAt
}
```

### Settings (single-row)
```ts
{ whatsappApiToken, phoneNumberId, businessAccountId, webhookVerifyToken }
```

---

## 7. API Reference

All routes return JSON. No authentication is built in (see
[§12 Security](#12-security--hardening)).

### Templates

| Method | Route                          | Body / Query                                      |
| ------ | ------------------------------ | ------------------------------------------------- |
| GET    | `/api/templates`               | —                                                 |
| POST   | `/api/templates`               | `{ name, category, language, headerText?, bodyText, footerText?, buttons?, syncToMeta? }` |
| PUT    | `/api/templates/:id`           | partial template                                  |
| DELETE | `/api/templates/:id`           | —                                                 |
| POST   | `/api/templates/sync`          | — pulls all templates from Meta                   |

`POST /api/templates` with `syncToMeta: true` returns **502** if Meta rejects
the template, with `error` describing the reason (e.g. duplicate name, invalid
category). Local record is still created so the user can retry / edit.

### Prospects

| Method | Route                          | Body                                          |
| ------ | ------------------------------ | --------------------------------------------- |
| GET    | `/api/prospects`               | returns `Prospect[]` with `_count.messages`   |
| POST   | `/api/prospects`               | `Prospect` *or* `Prospect[]` for bulk import  |
| PUT    | `/api/prospects/:id`           | partial prospect                              |
| DELETE | `/api/prospects/:id`           | —                                             |

### Campaigns

| Method | Route                                  | Body                                       |
| ------ | -------------------------------------- | ------------------------------------------ |
| GET    | `/api/campaigns`                       | list                                       |
| POST   | `/api/campaigns`                       | `{ name, description?, templateIds }`     |
| GET    | `/api/campaigns/:id`                   | detail with templates + messages           |
| PUT    | `/api/campaigns/:id`                   | partial campaign                           |
| DELETE | `/api/campaigns/:id`                   | cascade-deletes messages                   |
| POST   | `/api/campaigns/:id/launch`            | see below                                  |

**Launch body:**
```ts
{
  prospectIds?: string[],                // empty/omitted = all
  headerVariables?: { [n: number]: { source, value? } },
  bodyVariables?:   { [n: number]: { source, value? } }
}
```
where `source` is `"static" | "prospect_name" | "prospect_email" | "prospect_phone"`.

Missing mappings for `{{n}}` placeholders in the template → 400.

### Replies / Inbox

| Method | Route                                      | Description                                  |
| ------ | ------------------------------------------ | -------------------------------------------- |
| GET    | `/api/replies`                             | all replies (optional `?prospectId=`)        |
| PUT    | `/api/replies`                             | `{ ids: string[] }` — mark read              |
| GET    | `/api/replies/conversations`               | grouped by prospect, with `unreadCount`      |
| GET    | `/api/replies/thread/:prospectId`          | interleaved sent + received, auto-marks read |
| POST   | `/api/replies/send`                        | `{ prospectId, text }` → sends free-form     |

### Webhook

| Method | Route                                | Behavior                                     |
| ------ | ------------------------------------ | -------------------------------------------- |
| GET    | `/api/webhooks/whatsapp`             | Meta verification handshake                  |
| POST   | `/api/webhooks/whatsapp`             | receives messages + status updates           |

Always returns `200` to acknowledge to Meta (even for ignored events).

### Settings / Stats

| Method | Route              | Notes                                |
| ------ | ------------------ | ------------------------------------ |
| GET    | `/api/settings`    | returns the saved credentials        |
| PUT    | `/api/settings`    | whole-object replace                 |
| GET    | `/api/stats`       | dashboard aggregates                 |

---

## 8. Meta Integration Details

### 8.1 Sending messages

Two functions in [src/lib/whatsapp.ts](../src/lib/whatsapp.ts):

- `sendTemplateMessage(phone, name, language, { headerParams?, bodyParams? })`
  — used by campaign launch. Builds a `components` array with `{ type, parameters }`
  only when params are provided. Works for no-variable templates out of the box.

- `sendTextMessage(phone, text)` — used by inbox replies. Plain
  `{ type: "text", text: { body } }`. **Only works inside the 24-hour
  conversation window.** Outside the window, Meta requires a template.

Both throw on non-2xx, extracting `error_user_msg`, `code`, and
`error_subcode` from Meta's response for meaningful error messages.

### 8.2 Template creation

`createMetaTemplate(template)` builds a component array based on which
fields are filled (`HEADER`, `BODY`, `FOOTER`, `BUTTONS`) and POSTs to
`/v21.0/{businessAccountId}/message_templates`.

Common rejection causes (mirrored in the UI's error banner):

| Error                                        | Cause                                                           |
| -------------------------------------------- | --------------------------------------------------------------- |
| `Invalid parameter` (code 100)               | usually name format, category/content mismatch, duplicate name  |
| `Template name already exists` (132001)      | Meta blocks reused names for 30 days post-delete                |
| `Param name requires ...`                    | name has uppercase / spaces / hyphens                           |
| `The category 'MARKETING' is no longer ...`  | Meta auto-rejects some cold outreach under MARKETING            |

The UI auto-formats template names to lowercase + underscores as you type.

### 8.3 Webhook

`GET` request from Meta contains:
```
?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
```
If `hub.verify_token` matches `settings.webhookVerifyToken`, we return
`hub.challenge` as plain text → Meta marks the webhook verified.

`POST` payloads have:
```
entry[].changes[].value.messages[]   // inbound
entry[].changes[].value.statuses[]   // delivery status updates
```

The `messages[]` handler supports all WhatsApp message types and will
**auto-create a Prospect** if the sender's phone doesn't match any existing
one (using the profile name from `contacts[]` when present).

Status updates flow through `messages.updateStatus(metaMessageId, status)`,
mapping `sent → SENT`, `delivered → DELIVERED`, `read → READ`, `failed → FAILED`.

---

## 9. Template Variables

Templates may contain `{{1}}`, `{{2}}`, etc. in the **header text** and/or
**body text**. Helpers in [src/lib/template-vars.ts](../src/lib/template-vars.ts):

- `extractVariables(text)` → sorted unique placeholder numbers
- `buildParamsArray(nums, mappings, prospect)` → ordered strings ready for Meta

At campaign launch time, each variable must be mapped to one of:
```
static         → fixed string used for every prospect
prospect_name  → prospect.name  (empty string if null)
prospect_email → prospect.email (empty string if null)
prospect_phone → prospect.phoneNumber
```

The launch modal auto-detects variables and shows a live preview rendered
against the first selected prospect.

---

## 10. Deployment

### Railway (or similar PaaS)

1. Connect the repo to Railway
2. Railway auto-detects Next.js → sets `npm run build` + `npm start`
3. Set the start command if needed: `next start -p $PORT`
4. Deploy

#### ⚠️ Ephemeral filesystem caveat

Railway wipes `data/` on every redeploy. For production you **must** either:

**Option A: Attach a persistent volume.** Railway supports volumes — mount one
at `/app/data` so the JSON files survive.

**Option B: Swap the store for a real database.** Keep the `store.ts`
interface identical and back it with Postgres / SQLite / Redis / etc. This
is the recommended long-term path — see [§11](#11-integration-with-a-lead-generation-platform).

### Webhook must be HTTPS and public

Meta only accepts HTTPS webhooks and only from publicly reachable hosts. For
local development use ngrok or Cloudflare Tunnel. For prod, your Railway URL
(`https://*.up.railway.app/...`) works out of the box.

---

## 11. Integration with a Lead Generation Platform

There are four typical integration points. Pick the ones you need; each is
additive.

### 11.1 Push prospects in

If your lead-gen system already manages contacts, POST them in bulk to
`/api/prospects`:

```ts
await fetch("https://wa-outreach/api/prospects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify([
    { phoneNumber: "14155551234", name: "Alice", email: "a@x.com", tags: "icp,q2" },
    { phoneNumber: "442071234567", name: "Bob",   email: "b@y.com", tags: "icp" },
  ]),
});
```

**Recommended extension**: add an `externalId` field to `Prospect` so you can
track the source lead's ID for bidirectional sync. The change is:

1. Add `externalId: string | null` to the `Prospect` interface in
   [src/lib/store.ts](../src/lib/store.ts).
2. Include it in `prospects.create()` and `/api/prospects` validation.
3. Add a `getByExternalId()` lookup for idempotent upserts.

### 11.2 Trigger campaigns programmatically

```ts
// 1. Create a campaign referencing an already-synced template
const camp = await fetch("/api/campaigns", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Q2 ICP outreach",
    templateIds: [TEMPLATE_ID],
  }),
}).then(r => r.json());

// 2. Launch against a selection
await fetch(`/api/campaigns/${camp.id}/launch`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prospectIds: ["abc...", "def..."],
    bodyVariables: {
      1: { source: "prospect_name" },
      2: { source: "static", value: "premium plan" },
    },
  }),
});
```

### 11.3 Receive reply events in your platform

The webhook handler currently only writes to local JSON. To forward events
upstream, extend the handler in
[src/app/api/webhooks/whatsapp/route.ts](../src/app/api/webhooks/whatsapp/route.ts):

```ts
import { forwardToCRM } from "@/lib/forward";

function handleIncomingMessage(msg, contacts) {
  // ... existing logic ...
  const reply = replies.create({ ... });
  forwardToCRM({ type: "reply", reply, prospectId });   // ← add this
}

function handleStatusUpdate(status) {
  const updated = messages.updateStatus(status.id, ...);
  if (updated) forwardToCRM({ type: "status", message: updated });
}
```

`forwardToCRM` is any fire-and-forget `fetch` to your internal webhook —
keep it non-blocking so Meta still gets its 200 quickly (Meta retries failed
deliveries, which can duplicate replies).

### 11.4 Pull data out

- **All prospects**: `GET /api/prospects`
- **All replies**: `GET /api/replies`
- **Dashboard metrics**: `GET /api/stats`
- **Thread for a specific contact**: `GET /api/replies/thread/:prospectId`

If your lead-gen platform needs real-time updates, prefer push (§11.3) over
polling.

### 11.5 Migration from JSON store to Postgres

The `store.ts` module is intentionally the only data-access layer. To swap
storage, reimplement the six exports (`templates`, `prospects`, `campaigns`,
`messages`, `replies`, `settings`) with the same method signatures. Nothing
else in the codebase needs to change.

Recommended schema (Prisma-style):

```prisma
model Prospect {
  id          String   @id @default(cuid())
  externalId  String?  @unique                // ← integration hook
  phoneNumber String
  name        String?
  email       String?
  tags        String?
  createdAt   DateTime @default(now())
  messages    Message[]
  replies     Reply[]
}

model Template { ... }
model Campaign { ... templateIds String[] ... }
model Message  { ... campaignId String? ... bodyText String? ... }
model Reply    { ... prospectId String? ... }
model Settings { ... }
```

---

## 12. Security & Hardening

### Current state

- **No authentication.** Anyone with the URL can hit every endpoint.
- No CSRF protection on mutating routes.
- Meta credentials are stored in plain JSON on disk.
- The webhook only verifies Meta's `hub.verify_token` for the verification
  handshake, not for actual event POSTs. Meta signs payloads with an app
  secret — verification is not yet implemented.

### Before going to real production

1. **Add an API key layer** for internal API calls from the lead-gen
   platform. A minimal pattern: check `Authorization: Bearer <key>` against
   `process.env.INTERNAL_API_KEY` in every route.
2. **Add user auth** for the dashboard UI (NextAuth, Clerk, Auth0).
3. **Verify webhook signatures.** Meta sends `X-Hub-Signature-256` — HMAC-SHA256
   of the raw body with your App Secret. Validate before trusting the event.
4. **Move secrets off disk.** Read `whatsappApiToken` and friends from
   `process.env`; keep the settings page for read-only display, or remove it.
5. **Rate-limit the webhook + prospect bulk import** routes.
6. **Add structured logging** (Pino, etc.) — right now we use `console.error`
   for Meta errors which is adequate for Railway logs but opaque.

---

## 13. Known Limitations

- **File-based store is single-instance.** Horizontal scaling will corrupt
  data. Migrate to a real DB before running more than one replica.
- **No retry on failed sends.** `FAILED` messages in `data/messages.json`
  require manual re-launch.
- **No 24-hour window check for inbox replies.** The send button is always
  enabled — Meta will return an error if the window has closed.
- **Header variables only support TEXT format.** IMAGE / VIDEO / DOCUMENT
  headers need Meta's media-upload API and a `header_handle` — not yet
  wired up.
- **Schedule field exists but is unused.** Campaigns launch immediately.
- **Single template per campaign.** `templateIds[]` is stored but only index
  0 is used at launch. Multi-step sequences aren't implemented.

---

## 14. Troubleshooting

| Symptom                                          | Check                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Template creation → "Invalid parameter"          | name format (lowercase + underscores), category match, duplicate name |
| Webhook verification fails in Meta               | `webhookVerifyToken` in Settings matches the one entered in Meta      |
| Webhook marked verified but no replies appear    | Meta subscription fields — subscribe to `messages` field              |
| "Recipient phone number not in allowed list"     | dev app — add the number in Meta's test recipient list                |
| Reply from inbox returns error                   | 24-hour window closed — must re-engage with a template first          |
| Settings empty after redeploy                    | Railway ephemeral FS — attach a volume or move to DB                  |
| Template shows `metaId: null` but no error shown | rebuild — the surfaced-error patch must be deployed                   |

---

## 15. Extending — Suggested Next Steps

Ordered by typical value for a lead-gen integration:

1. Add `externalId` on `Prospect` + upsert-by-externalId endpoint
2. Add API key middleware on all `/api/*` routes
3. Forward webhook events to an internal `FORWARD_WEBHOOK_URL`
4. Replace `store.ts` with Prisma + Postgres
5. Implement scheduled campaigns (cron + `scheduledAt`)
6. Verify Meta webhook signatures
7. Template media-header support (image/video)
8. Multi-step sequences (send template A, wait N hours, then B)

Each of these is independent; tackle them in the order your integration
actually needs them.
