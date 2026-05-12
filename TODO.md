# QA Checklist Pro — Upgrade TODO

## Step 0 — Decide scope
- [x] Confirm legacy vanilla UI remains primary (public/index.html + public/script.js)
- [ ] Keep React scaffold only if it helps; otherwise retire/remove it after verifying build artifacts

## Step 1 — Security hardening (backend)
- [ ] Tighten Helmet CSP (remove unsafe-inline when possible)
- [ ] Harden CORS (restrict origins instead of origin:true)
- [ ] Improve validation for all write endpoints (shape/length)
- [ ] Remove default admin credentials from server console (env-gated)

## Step 2 — Security hardening (frontend)
- [ ] Remove inline handler patterns that break strict CSP
- [ ] Ensure all dynamically generated HTML avoids unsafe injection patterns
- [ ] Improve cookie/security settings & UI handling on session expiry

## Step 3 — UI/UX improvements
- [ ] Polish layout responsiveness + spacing
- [ ] Improve accessibility: ARIA labels, focus management for modals
- [ ] Add additional sample data so app looks complete immediately

## Step 4 — Functionality expansion
- [ ] Enhance dashboard stats, filtering, search responsiveness
- [ ] Add more realistic categories/tests/suites/sheets/worksheet samples
- [ ] Make export/import more robust with validation

## Step 5 — Code optimization
- [ ] Refactor public/script.js: reduce globals, improve structure and maintainability
- [ ] Remove unused/duplicate files and committed build artifacts

## Step 6 — Verification
- [ ] Run `npm test`
- [ ] Run `npm run test:security`
- [ ] Manual smoke test: Chrome, Firefox, mobile sizes

