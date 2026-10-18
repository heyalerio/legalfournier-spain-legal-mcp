# Contact retry recovery

The MCP signs the operation key inside the request body. WordPress verifies
that the header matches it and binds the key to the user-supplied case fields.
Attribution and changing proxy metadata do not change the operation.

Durable phases are `reserved`, `inserting`, and `accepted`. A database
compare-and-swap claims `inserting`, so a lost advisory-lock connection cannot
give two workers permission to insert. Validation failures release only an
unchanged reservation. A pre-insert failure can retry the same key. An uncertain
insert remains guarded; a subsequent request first looks up the deterministic
lead ID and recovers an existing acceptance.

Acceptance is persisted before notification attempts. Retrying an accepted
operation returns that acceptance and never resends mail. This prevents
duplicate attempts but cannot guarantee email delivery. `pending` or
`needs_reconciliation` notification status is visible to the MCP caller.

If `inserting` persists without an entry, an operator must confirm that no
worker is still running and inspect the relevant failure before releasing the
reservation. Do not generate a new key or delete the guard as a blind retry.
Inspect the hashed operation in `wp_options` and the corresponding `lead_id`
in the existing lead view; do not copy client case data into logs or tickets.
Reconcile notification delivery separately before attempting any resend.

The isolated PHP test harness never boots WordPress, creates a lead or sends
mail. Production checks validate PHP syntax, the database locking primitives,
read-only endpoints, and the original service/WordPress isolation.
