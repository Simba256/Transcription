I have asked AI to develop a hand-off sheet of all the features that I want based on Firebase, since you are using Firebase. It might help. I know it seems like I am nitpicking, but I just want to stand out from the other transcript companies, including Descript. Here is what AI came up with based on my months of work in training it to know what is needed for my website. 
# Merged Developer Handoff — Fixes Required vs SOW & Client Requests

*Project:* Talk To Text Canada
*Site:* [https://transcription-eight-xi.vercel.app](https://transcription-eight-xi.vercel.app)
*Date:* 2025-09-24

*Instruction:* Single consolidated list of features

---

## A) Subscriptions & Billing (SOW)

 1.⁠ ⁠Subscription plans (monthly and annual, tiered) are not available.
 2.⁠ ⁠Subscription checkout to purchase a plan is not exposed.
 3.⁠ ⁠Upgrade, renew, and cancel actions are not available to customers.
 4.⁠ ⁠Billing Portal entry point is not present anywhere in the app.
 5.⁠ ⁠Customer dashboard does not show subscription status (plan name, renewal date, current status).
 6.⁠ ⁠Customer dashboard does not show invoices or receipts.
 7.⁠ ⁠Pricing page presents credit packs and states there are no subscriptions.

## B) Customer Dashboard (SOW)

 1.⁠ ⁠Subscription status is not displayed.
 2.⁠ ⁠Billing history and receipts are not displayed.
 3.⁠ ⁠Payment details beyond credit debits are not displayed.

## C) Transcript Editor — Client‑Requested Features (post‑draft)

 1.⁠ ⁠Speaker labels are not shown and there is no show/hide toggle.
 2.⁠ ⁠Speaker mapping dialog is not present.
 3.⁠ ⁠Filler‑word removal controls are not present (None / Light / Moderate / Aggressive with Preview and Apply).
 4.⁠ ⁠Timecode insertion control is not present (None / 30s / 60s / 300s / 600s).
 5.⁠ ⁠Canadian English spelling/grammar toggles are not present; medical/legal vocabulary toggles are not present.
 6.⁠ ⁠Formatting preset controls are not present (Intelligent Verbatim vs Strict Verbatim; numerals, capitalization, bullets options).
 7.⁠ ⁠Sensitivity controls are not present (PII de‑identification and profanity masking).
 8.⁠ ⁠Custom terms list is not present or persisted with the transcript.
 9.⁠ ⁠Version controls are not present (Autosave indicator, Manual Save, Revert to last save, Compare with last save).
10.⁠ ⁠Audio controls are not present (±5s skip, speed slider, load by URL/file).
11.⁠ ⁠Share link for a transcript is not present.
12.⁠ ⁠Backend editor actions are not wired (save full transcript state to backend; locked PDF export route).

Notes: TXT/PDF/DOCX exports exist via dropdown; this item is not missing.

## D) LegalScript Studio Intake (client request)

 1.⁠ ⁠Legal intake form is not integrated into the live product flow for legal deliverables.
 2.⁠ ⁠Intake fields for document type, jurisdiction/venue, style, timestamp cadence, speaker labels, confidentiality, letterhead, and special instructions are not available to end users.
 3.⁠ ⁠The legal workflow (intake → upload → status → review → finished document) is not available in the client portal.

## E) Admin Dashboard (SOW)

 1.⁠ ⁠User management actions are not available (role change, deactivate/reactivate, password reset).
 2.⁠ ⁠Subscription management is not available (assign/change plan, adjust credits, view a user's invoices).
 3.⁠ ⁠Job management actions are not available (reprocess job, manual transcription trigger, delete job).
 4.⁠ ⁠Data export is not available (no CSV/JSON export of users, jobs, or transactions).
 5.⁠ ⁠System settings page is not available.

## F) AI Features (SOW + client request)

 1.⁠ ⁠Speaker identification is not surfaced to users on transcript pages.
 2.⁠ ⁠Transcript pages do not provide a control to show/hide speaker labels.

## G) Bugs & UX Mismatches (observed)

 1.⁠ ⁠Edit transcript view renders a blank page instead of the transcript content.
 2.⁠ ⁠Transcript view shows raw object text in places (e.g., "[object Object]").
 3.⁠ ⁠Duplicate "Save Changes" buttons appear on one screen in the transcript area.
 4.⁠ ⁠Edit flow does not show a clear success confirmation after saving.

---

*This document lists only what is required and not delivered. It intentionally omits implementation guidance.*

---

## Appendix A — Firebase mapping for every missing item

*Stack translation:* Auth = Firebase Auth (custom claims for roles). Data = Firestore. Files = Firebase Storage. Backend = Cloud Functions (HTTP/callable + triggers). Queueing = Pub/Sub or Cloud Tasks. Payments = Stripe Checkout + Billing Portal (webhooks → Functions). Region: *northamerica-northeast1*.

### A) Subscriptions & Billing (SOW)

•⁠  ⁠Map: Stripe products/prices for Monthly/Annual. Checkout Session → success → write ⁠ subscriptions ⁠ doc under user. Stripe webhooks mirror ⁠ status ⁠, ⁠ current_period_end ⁠, and invoices into Firestore.

### B) Customer Dashboard (SOW)

•⁠  ⁠Map: Read from ⁠ users ⁠, ⁠ subscriptions ⁠, ⁠ invoices ⁠, ⁠ credit_ledger ⁠, ⁠ jobs ⁠. Show plan card, renewal date, invoices list.

### C) Transcript Editor — Client‑Requested Features

•⁠  ⁠Map: Save editor state to ⁠ transcripts/{jobId} ⁠ (⁠ content_html ⁠, ⁠ segments ⁠, ⁠ speaker_map ⁠, ⁠ filters ⁠, ⁠ timecodes ⁠, ⁠ style_preset ⁠, ⁠ has_pii_redactions ⁠, ⁠ word_count ⁠). Autosave creates docs in ⁠ transcripts/{jobId}/versions/{versionId} ⁠. Exports generated by Functions to Storage; links shown in UI. Speaker labels/toggle read from ⁠ segments ⁠ and ⁠ speaker_map ⁠. Audio controls use Storage file URL with authorized access.

### D) LegalScript Studio Intake

•⁠  ⁠Map: ⁠ jobs/{jobId}/legal_intake ⁠ doc holds all intake fields; apply those to editor defaults and exports.

### E) Admin Dashboard (SOW)

•⁠  ⁠Map: Admin UI requires ⁠ admin ⁠ claim. Actions are callable Functions: role change, credit adjust, plan change, reprocess, manual transcription, delete job. Exports stream Firestore query results to CSV/JSON in Storage.

### F) AI Features

•⁠  ⁠Map: Transcription pipeline: Storage upload finalize → Function calls Speech service → writes ⁠ jobs/{jobId} ⁠ + ⁠ transcripts/{jobId} ⁠ segments with diarization. Speaker identification surfaced via ⁠ segments[*].speaker ⁠ and ⁠ speaker_map ⁠.

### G) Bugs & UX

•⁠  ⁠Map: Not stack specific; ensure editor loads from ⁠ transcripts/{jobId}.content_html ⁠ and does not render objects.

---

## Appendix B — Firestore schema draft (collections, fields, indexes)

### Collections and key fields

•⁠  ⁠⁠ users/{uid} ⁠: email, display_name, role ("user"|"admin"), credits, stripe_customer_id, plan_id, subscription_status, renewal_at, created_at, updated_at
•⁠  ⁠⁠ subscriptions/{uid}/{subId} ⁠: plan_id, status, current_period_start, current_period_end, cancel_at, cancel_at_period_end, created_at, updated_at
•⁠  ⁠⁠ invoices/{uid}/{invoiceId} ⁠: amount_due, currency, hosted_invoice_url, invoice_pdf_url, status, created_at
•⁠  ⁠⁠ credit_ledger/{entryId} ⁠: uid, job_id, amount (+/-), reason ("purchase"|"debit"|"adjust"), created_at
•⁠  ⁠⁠ jobs/{jobId} ⁠: owner_uid, filename, duration_sec, source ("ai"|"human"|"hybrid"), status ("queued"|"processing"|"complete"|"error"), created_at, completed_at, credits_used, audio_storage_path, transcript_id, intake_present (bool)
•⁠  ⁠⁠ transcripts/{jobId} ⁠: content_html, segments (array of {start_ms,end_ms,text,speaker,confidence}), speaker_map (obj), filters (obj), timecodes ("none"|"30s"|"60s"|"300s"|"600s"), style_preset ("intelligent"|"strict"), has_pii_redactions (bool), word_count, last_saved_at, versions_count
•⁠  ⁠⁠ transcripts/{jobId}/versions/{versionId} ⁠: content_html, diff_summary, created_at, created_by
•⁠  ⁠⁠ shares/{shareId} ⁠: target ("transcript"), job_id, created_by, created_at, expires_at, token_hash, permissions ("view"|"comment")
•⁠  ⁠⁠ termbanks/{ownerId}/terms/{termId} ⁠: term, variant, notes, added_by, created_at
•⁠  ⁠⁠ settings/app ⁠ (singleton): feature_flags, limits, default_timecode, default_style
•⁠  ⁠⁠ audits/{auditId} ⁠: actor_uid, action, target_ref, before, after, sha256, created_at
•⁠  ⁠⁠ webhooks/stripe_events/{evtId} ⁠: raw, type, handled_at

### Suggested composite indexes

•⁠  ⁠⁠ jobs ⁠ where owner_uid == :uid order by created_at desc
•⁠  ⁠⁠ invoices ⁠ where *name* has prefix of uid or field user_uid == :uid order by created_at desc
•⁠  ⁠⁠ credit_ledger ⁠ where uid == :uid order by created_at desc
•⁠  ⁠⁠ shares ⁠ where token_hash == :hash
•⁠  ⁠⁠ transcripts/{jobId}/versions ⁠ order by created_at desc

---

## Appendix C — Security rules skeleton (Firestore & Storage)

### Firestore rules (high‑level)

•⁠  ⁠⁠ /users/{uid} ⁠: read/write by same ⁠ uid ⁠; read/write by admin claim.
•⁠  ⁠⁠ /subscriptions/{uid}/{subId} ⁠ and ⁠ /invoices/{uid}/{invoiceId} ⁠: read by same ⁠ uid ⁠; writes only via service account (Functions).
•⁠  ⁠⁠ /jobs/{jobId} ⁠: read if ⁠ resource.data.owner_uid == request.auth.uid ⁠ or admin; writes by owner or Functions.
•⁠  ⁠⁠ /transcripts/{jobId} ⁠ and ⁠ /transcripts/{jobId}/versions/{versionId} ⁠: read if owner or admin or valid share token; writes by owner for ⁠ content_html ⁠ and by Functions for versions.
•⁠  ⁠⁠ /shares/{shareId} ⁠: create by owner; read by admin; token-based access checked in Functions (no direct read without token).
•⁠  ⁠⁠ /credit_ledger/{entryId} ⁠: read by same user; writes by Functions.
•⁠  ⁠⁠ /audits/{auditId} ⁠ and ⁠ /webhooks/stripe_events/{evtId} ⁠: read/write only by Functions (service account).

### Storage rules (high‑level)

•⁠  ⁠⁠ /uploads/{uid}/** ⁠ and ⁠ /exports/{uid}/** ⁠: read/write by same ⁠ uid ⁠ or admin. Public access denied. Signed URLs only when sharing.

### Auth & roles

•⁠  ⁠Firebase Auth. Admin role via *custom claims*. All admin UI requires ⁠ request.auth.token.admin == true ⁠.

---

*End of appendices.*