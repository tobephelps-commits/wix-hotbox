# Phase 17: User Setup Required

**Generated:** 2026-02-01
**Phase:** 17-ss-activewear-api-integration
**Status:** Incomplete

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `SS_ACCOUNT_NUMBER` | S&S Activewear -> My Account -> Account Number | `.env` |
| [ ] | `SS_API_KEY` | S&S Activewear -> My Account -> API Key (click Show) | `.env` |

## Account Setup

- [ ] **S&S Activewear wholesale account**
  - Skip if: Already have S&S Activewear wholesale account
  - Location: https://www.ssactivewear.com/
  - Details: Sign up for a wholesale account. API access is included with active accounts.

## Verification

After adding credentials to `.env`, verify they work:

```bash
# Quick credential check (returns true/false)
npx tsx -e "
import { validateSSCredentials } from './scripts/ss-activewear/index.js';
validateSSCredentials().then(valid => {
  console.log(valid ? 'Credentials valid' : 'Credentials invalid');
  process.exit(valid ? 0 : 1);
});
"
```

---
**Once all items complete:** Mark status as "Complete"
