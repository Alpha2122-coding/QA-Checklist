## QA Checklist Pro — Runable Full Stack Cleanup (Step-by-step)

### Step 1 — Baseline run check (DONE)
- [x] Verified Node/npm are available.
- [x] Verified server entry is `server.js`.
- [x] Verified legacy UI exists at `public/index.html` using `public/script.js`.
- [x] Verified React scaffold exists under `client/`.

### Step 2 — Fix missing scripts (NEEDS ACTION)
- [x] Add missing `security-test.js` (referenced by `npm run test:security`).


### Step 3 — Install & run (NEEDS ACTION)
- [ ] `npm install`
- [ ] `npm test`
- [ ] `npm start`

### Step 4 — Verify runtime endpoints (NEEDS ACTION)
- [ ] Check `http://localhost:3000/api/health` returns JSON.
- [ ] Login page loads (legacy UI) and API calls succeed.

### Step 5 — Optional: React wiring validation (NEEDS ACTION)
- [ ] Run `npm run build` (client) and confirm server serves `public/dist/index.html`.
- [ ] If React is not fully wired, ensure at least legacy UI works end-to-end.

