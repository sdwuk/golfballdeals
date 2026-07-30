# GolfBallDeals.co.uk

A one-page site showing the top 20 UK golf ball deals, ranked by discount off
RRP, refreshed once a day at ~12:00 UK time. Live at
[golfballdeals.co.uk](https://golfballdeals.co.uk), hosted on GitHub Pages.

## How it works

- `index.html` — the site itself. Single file, inline CSS/JS. Renders the
  embedded sample data immediately, then overrides it by fetching
  `./data/deals.json` if reachable — so it always shows something even
  before a real feed is connected.
- `data/deals.json` — the current top 20 deals. Overwritten daily by the
  fetch script and committed back to the repo by GitHub Actions.
- `scripts/fetch-deals.js` — Node script that pulls each retailer's
  affiliate product feed, filters to golf balls, ranks by discount, and
  writes the top 20 to `data/deals.json`. Awin is a real, working
  integration; Partnerize and FlexOffers are stubbed pending account setup.
- `.github/workflows/daily-refresh.yml` — runs the fetch script twice daily
  (11:00 & 12:00 UTC, to cover the UK's GMT/BST shift) and commits the
  updated `data/deals.json` if it changed.
- `privacy.html` — cookies / affiliate disclosure page, linked from the
  footer.
- `CNAME` / `.nojekyll` — custom domain config and a flag that stops GitHub
  Pages running the site through Jekyll (needed since files start with `.`
  and there's no `_config.yml`).

## Retailers & affiliate networks

| Site | Network |
|---|---|
| Clubhouse Golf | Awin |
| GolfSupport | Awin |
| Snainton Golf | Awin |
| Scottsdale Golf | Awin (also on Avelon) |
| Sports Direct | Likely Awin — unconfirmed, verify on sign-up |
| American Golf | Partnerize |
| GolfOnline | FlexOffers |
| OnlineGolf | Partnerize |
| Amazon UK | Amazon Associates (tag `golfballdeals-21`) — approved, but no live product feed yet; PA-API needs 3 sales in 180 days to unlock, so deals are sourced manually with tagged links in the meantime |

One Awin publisher account covers the five Awin merchants above — apply to
each individually from the Awin dashboard once approved. Partnerize and
FlexOffers need separate accounts.

### Auto-affiliation (no per-merchant approval needed)

In addition to the networks above, the site uses auto-affiliation services
that rewrite outbound retailer links into affiliate links automatically at
click time — no need to be individually approved by each retailer first:

- **Skimlinks** — live, script installed in `index.html` (site ID
  `306990X1795264`).
- **Sovrn (Commerce)** — under consideration, not yet installed. Add the
  same way once a site ID is issued: drop their script tag right before
  `</body>` in `index.html`, and update `privacy.html`'s disclosure/cookie
  sections to name them explicitly.

These are a genuinely useful stopgap since they don't block on Awin/
Partnerize/FlexOffers approvals, but note they typically pay a smaller
share of commission than a direct affiliate relationship with the retailer
— worth switching a retailer over to its direct network once approved,
rather than relying on Skimlinks/Sovrn for everything long-term.

### Awin application status (as of 31 Jul 2026)

Awin publisher account approved — publisher ID `3013085`, datafeed API key
obtained and stored as a GitHub secret. Individual merchant programme
applications submitted, all still pending approval:

| Advertiser | Awin advertiser ID | Feed available? |
|---|---|---|
| Scottsdale Golf | 813 | yes |
| Clubhouse Golf | 39290 | yes |
| Callaway Golf (brand direct) | 19186 | yes |
| Affordable Golf | 82141 | yes |
| Hot Golf UK | 76732 | yes |
| Jam Golf (UK) | 7912 | **no** — Awin has no datafeed for this merchant even once approved |
| Discount Golf Store | 10153 | **no** — same |
| Major Golf Direct | 83219 | **no** — same |

Applied to but out of scope for this site (not golf-ball retailers) —
skip: Evelyn Gold (jewellery), Payntr Golf EU (golf shoes only).

GolfSupport, Snainton Golf, and Sports Direct — three of the original
target merchants — don't appear in the applications submitted so far;
need to confirm whether those were applied to separately or still need
applying to.

Feed IDs (as opposed to advertiser IDs) aren't visible until each
programme approves the application, so nothing here can be wired into
`scripts/fetch-deals.js` yet — the daily manual-scan process covers the
gap until approvals land.

## Affiliate link priority (data/merchants.json)

Every deal card's "View deal" link is resolved client-side at render time
by `resolveAffiliateLink()` in `index.html`, using `data/merchants.json`
as the source of truth. Priority order per merchant:

1. **Direct affiliate network** — if `merchants.json` marks that merchant's
   `direct.status` as `"approved"` (Awin deep link, or an Amazon Associates
   tagged link). This pays the most and has no middleman.
2. **Skimlinks or Sovrn** — whichever `fallbackPreference` names. Both are
   auto-affiliation services that don't require per-merchant approval.
   `fallbackPreference` is currently a placeholder (`"skimlinks"`) since
   neither network's real per-merchant commission data is available yet —
   Sovrn's Merchant API needs their campaign approved first, which needs
   real clicks through an installed Sovrn link before they'll review it.
   Flip `fallbackPreference` to `"sovrn"` once real numbers show it pays
   better for our retailers.
3. **Plain, unaffiliated link** — if a merchant isn't covered by either
   fallback network and has no direct relationship. `resolveAffiliateLink`
   falls through to this automatically; nothing to configure.

Each deal in `data/deals.json` carries a `merchantId` matching an entry in
`merchants.json`. When applying to/getting approved by a new network for a
merchant, just update that merchant's `direct` block — every card linking
there (past and future) picks up the change automatically, no need to
regenerate `data/deals.json`.

The Featured deal section at the foot of `index.html` is a deliberate
exception — it's a static, manually-placed Sovrn verification link (kept
live so Sovrn can see real clicks for campaign approval) and is **not**
run through `resolveAffiliateLink`, so it won't get silently swapped out
by the priority logic above.

Credential handling: Skimlinks' publisher ID and Sovrn's campaign `key`
are both meant to be public — each network's own docs show them embedded
directly in outbound link URLs — so they live in `merchants.json` in this
public repo. Sovrn's separate API *secret* (used for their authenticated
backend API, e.g. pulling real commission data) is not public and is
never committed here.

## Sitemap

`sitemap.xml` + `robots.txt` at the repo root, submitted to Google Search
Console. Since the homepage's deal content changes daily, the daily scan
task refreshes `sitemap.xml`'s `<lastmod>` for `/` each run it makes a
change — `changefreq` is set to `daily` accordingly.

## Setup: connecting the real feed

1. Sign up for Awin, then Partnerize and FlexOffers separately. *(done for
   Awin — see status above)*
2. Once approved on Awin, get a datafeed API key and a Feed ID per Awin
   merchant, then add these as GitHub repo secrets
   (Settings → Secrets and variables → Actions):
   - `AWIN_DATAFEED_API_KEY` *(already set)*
   - `AWIN_CLUBHOUSE_ID`, `AWIN_CLUBHOUSE_FEED_ID`
   - `AWIN_GOLFSUPPORT_ID`, `AWIN_GOLFSUPPORT_FEED_ID`
   - `AWIN_SNAINTON_ID`, `AWIN_SNAINTON_FEED_ID`
   - `AWIN_SCOTTSDALE_ID`, `AWIN_SCOTTSDALE_FEED_ID`
   - `AWIN_SPORTSDIRECT_ID`, `AWIN_SPORTSDIRECT_FEED_ID`
3. Implement `fetchFromPartnerize()` and `fetchFromFlexOffers()` in
   `scripts/fetch-deals.js` once those account details are available —
   return shape should match `fetchFromAwin()`.
4. Trigger the workflow manually from the Actions tab (`workflow_dispatch`)
   to verify `data/deals.json` updates with real data, or run locally:

   ```bash
   AWIN_DATAFEED_API_KEY=... node scripts/fetch-deals.js --force
   ```

   (`--force` skips the "must be ~12:00 UK time" guard for local testing.)

## Local preview

No build step — just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```
