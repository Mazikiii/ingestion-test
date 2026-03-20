## Pause Tracking

### Overview

Pause tracking lets users stop email ingestion without revoking Gmail permissions or deleting the connection. The user can resume later with no re-authentication required.

This is distinct from disconnect, which is a full teardown requiring the user to go through OAuth again.

### Mechanism

Add an `is_active` boolean column to the `gmail_connection` table, defaulting to `true`.

The webhook handler checks this flag before doing any work:

```typescript
async function handleGmailWebhook(req, res) {
  res.status(200).send("ok");

  const connection = await connectionRepo.findByUserId(userId);
  if (!connection.is_active) {
    logger.info("user paused — skipping ingestion");
    return;
  }

  const email = await gmailClient.getEmail(messageId);
  const parsed = await gemini.parse(email);
  await saveTransaction(parsed);
}
```

When `is_active` is `false`:
- Gmail still pushes to Pub/Sub (metadata only, negligible cost)
- Webhook receives and acknowledges the push (one cheap DB read)
- Gmail API fetch is skipped
- Gemini parsing is skipped
- No DB writes for new transactions

### API Surface

```
PATCH /gmail-connection  body: { is_active: false }  // pause
PATCH /gmail-connection  body: { is_active: true }   // resume
GET   /gmail-connection                             // status
```

Logout should NOT set `is_active = false`. Logout only clears the local session. The connection remains active server-side.

### Edge Cases

**Pub/Sub message retention**

Gmail/Pub/Sub do not hold undelivered messages indefinitely. If paused longer than the retention window, emails during that gap are not delivered via push.

Mitigation: on resume, call `history.list` from the last known transaction timestamp to backfill missed emails.

**Backlog on resume**

When a user unpauses, the next Gmail push processes normally. Gmail's lookback window (via `history.list`, typically 7-30 days) handles recovery for recent emails. Older emails are not captured.

**Indefinite inactivity**

A paused user who never returns incurs no meaningful cost — webhook hits are cheap DB reads with no downstream work. Consider an automated pause after 90 days of no login as a resource optimization.

### What Not To Do

- Do not set `is_active = false` on logout. Logout is a session action, not a connection action.
- Do not delete the Pub/Sub subscription on pause. Subscriptions are tied to the OAuth grant and are expensive to recreate.
- Do not treat pause and disconnect as equivalent. They serve different user intents.

### Implementation Checklist

- Add `is_active` column to `gmail_connection` table
- Update webhook handler to check `is_active` before ingestion
- Add pause/resume endpoint to PATCH `/gmail-connection`
- On resume: call `history.list` from last transaction timestamp to backfill
- Frontend: pause/resume toggle in settings screen
