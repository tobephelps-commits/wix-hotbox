# Phase 11 Discovery: WIX Editor Automation Capabilities

**Date:** 2026-01-31
**Depth:** Level 2 (Standard Research)
**Question:** Which of the 32 pending manual fixes can be automated via WIX REST API, Velo, or MCP tools?

---

## Research Summary

### WIX REST API Capabilities (Confirmed)

| Capability | API Available | Used in v0.1 |
|-----------|--------------|--------------|
| Product CRUD (create, read, update, delete) | YES | YES |
| Product variant pricing/SKU/visibility | YES | YES |
| Product media (add images via URL) | YES | YES |
| Product description updates | YES | YES (size guides) |
| Collection membership (add/remove) | YES | YES |
| Checkout policy configuration | YES | YES |
| Abandoned checkout query | YES (read-only) | NO |
| Page content editing (headings, text, images) | **NO** | N/A |
| Page URL slug changes | **NO** | N/A |
| Navigation menu structure | **NO** | N/A |
| Footer content/layout | **NO** | N/A |
| Mobile layout configuration | **NO** | N/A |
| Product gallery settings | **NO** | N/A |
| Responsive breakpoint settings | **NO** | N/A |
| Image alt text on page elements | **NO** | N/A |
| App management (install/uninstall) | YES (via MCP) | YES (chat widget) |

### WIX Velo Capabilities

Velo (formerly Corvid) enables client-side JavaScript on WIX sites via `$w()` selectors:
- CAN modify text element content at runtime (e.g., `$w('#text1').text = 'New heading'`)
- CAN set HTML content including heading levels
- CAN hide/show/collapse elements
- CANNOT change visual layout, positioning, or responsive behavior
- CANNOT add new elements to pages
- CANNOT modify navigation menu structure
- **Requires Velo to be enabled on the site** — adds complexity for a non-technical store owner

**Conclusion:** Velo is not practical for these fixes. The fixes are design/layout changes, not content updates. Velo would add runtime JavaScript complexity without addressing the core issues (fixed-width layout, missing mobile menu component, gallery settings).

### WIX Dashboard (Manual UI)

These settings are accessible through the WIX Dashboard UI but NOT via REST API:
- Abandoned cart recovery email automation
- Order confirmation/shipping email templates
- Shipping rates and free shipping thresholds
- SEO settings (URL slugs, meta descriptions)
- App installations and configuration

### WIX MCP Docker Server

The project has a WIX MCP integration available (MCP_DOCKER) with tools for:
- `CallWixSiteAPI` — Make REST API calls to the WIX site
- `SearchWixRESTDocumentation` — Search WIX API docs
- `ManageWixSite` — Site-level management

However, the MCP server was not reachable during planning. Even when available, it wraps the same REST API — so the same limitations apply (no page content editing).

---

## Fix Automation Classification

### Already Automated in v0.1

| Fix | Method | Phase |
|-----|--------|-------|
| CR-2: Chat widget removal | WIX MCP (app uninstall) | 02-01 |
| CR-4: LMNT products hidden | WIX API (product visibility) | 02-01 |
| CL-4: Big Barn Team Hat description | WIX API (product update) | 02-01 |
| CK-1: Checkout policies (5 total) | WIX API (checkout settings) | 04-01 |
| CK-2: Size guides (105 products) | WIX API (product descriptions) | 04-02 |

### NOT Automatable (Confirmed)

All remaining fixes fall into categories the WIX REST API does not support:
- **Page content** — H1 headings, alt text, copyright year, page text
- **Navigation** — Menu structure, footer links, hamburger menu
- **Layout** — Mobile responsive design, gallery settings, element positioning
- **Settings** — URL slugs, abandoned cart emails, shipping configuration

These MUST be done manually in WIX Editor or WIX Dashboard.

---

## Conclusion

**Phase 11's automation scope is limited to:**
1. Consolidating the 32 fixes into a single actionable document
2. Building verification scripts to track completion progress
3. Documenting the API automation boundary
4. Running any remaining product-level API fixes (likely none beyond v0.1)

**The primary value of Phase 11 is operational:** transforming scattered fix guides into a single prioritized checklist with automated progress tracking.

---

*Sources: WIX REST API Reference (dev.wix.com), WIX Velo Documentation (dev.wix.com/docs/velo), WIX Help Center (support.wix.com), project codebase analysis*
