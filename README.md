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
