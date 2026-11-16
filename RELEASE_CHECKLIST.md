# Release checkpoint — 2026-11-16

Verdict: **blocked for live release**. This run focuses on roadmap 7.4 and
preserves the interrupted booking reliability fixes. No production writes,
settings changes, real accounts or email sends are authorized by these tests.

Statuses: **verified**, **needs fixing**, **owner-blocked**, **optional**.
Verification below is local unless explicitly marked live. Historical evidence
is identified separately; an old checkbox or deployment success is not a runtime test.

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| 7.3 signed expiry and revocation | verified | Commit `a3d0940`; 286-test historical checkpoint plus fresh isolated `sessions` pass before this run's booking edits. Signed expiry/tamper rejection, logout/password revocation and protected negative paths. |
| Guest wizard and retry safety | verified | Local browser save with reference, failed send, lost successful response, refresh/retry; MongoDB unique request-key index and concurrent API receipts. Final run results recorded in ROADMAP. |
| Server dates, times, blocked dates, availability privacy | verified | Vancouver date boundary unit checks; direct API impossible dates, slot bounds, durations, ages and blocked date rejection; availability contains busy times only. |
| Customer/admin golden paths (7.4) | verified | Real signup/login, own booking/history/profile/cancellation, admin confirmation/private notes/override, review approval/rejection and logout revocation pass on compiled production. Generated fixtures only; see ROADMAP for commands. |
| Public pages, phone layout, keyboard, reduced motion, SEO | verified | Prior navigation/accessibility/motion/SEO suites documented in ROADMAP. Reuse unchanged behavior; focused regression results recorded there. Physical devices, screen reader and live sharing remain unverified. |
| Live database / production settings | owner-blocked | Historical handoff reports wrong Vercel connection. Public web reads in this session could not access the site; this is not proof of the current error. Owner must rotate Atlas credentials, verify connection, configure production, then authorize deployment. |
| Booking email and password reset (6.1/6.2) | owner-blocked | No implementation or credentials. Owner approved preparing Resend earlier; this narrower run stops at 7.4. Next run: implement provider-independent preparation, mock tests, expiring single-use hashed reset tokens and retry-safe notifications; real delivery requires Resend account/key and verified sender. |
| Production admin access (3.4/8.2) | owner-blocked | Real accounts remain deferred until owners choose credentials. Test admins do not create production access. |
| Live trusted client IP / hosting choice | owner-blocked | Local spoofing/unit evidence is historical. Intended Vercel header implementation inspected; live edge behavior and commercial hosting suitability require owner review before launch. |
| Dependency security | verified | Fresh npm audit: zero known vulnerabilities; no dependencies changed in this run. |
| Backup / restore / rollback procedure | needs fixing | Not verified in this scoped 7.4 run. Prepare and rehearse with disposable data before requesting live release approval. |
| Photos / custom domain | optional | Existing initials artwork and hosting address remain usable; deferred. |

## Owner actions, in order

1. Provide Resend setup privately: account, verified sender domain/address, API
   key in environment settings, and notification recipient. Never paste keys in
   Git or the handoff. Authorize test delivery to designated recipients later.
2. Choose hosting suitable for the site's use. Repair Atlas connectivity and
   production environment settings only in an explicitly authorized release step.
3. Choose real admin credentials and authorize their creation.
4. After remaining code/recovery preparation, authorize deployment and a live
   smoke test with clearly designated disposable data. Check phones, live
   email/reset delivery, rate-limit identity, logs and sharing preview.

Local setup and repeatable checks: README. Latest evidence and exact next task:
ROADMAP's newest session handoff. Do not mark live release ready from a build alone.
