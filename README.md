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

One Awin publisher account covers the five Awin merchants above — apply to
each individually from the Awin dashboard once approved. Partnerize and
FlexOffers need separate accounts.

## Setup: connecting the real feed

1. Sign up for Awin, then Partnerize and FlexOffers separately.
2. Once approved on Awin, get a datafeed API key and a Feed ID per Awin
   merchant, then add these as GitHub repo secrets
   (Settings → Secrets and variables → Actions):
   - `AWIN_DATAFEED_API_KEY`
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
