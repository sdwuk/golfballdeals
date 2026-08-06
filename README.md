# GolfBallDeals.co.uk

A one-page site showing the best UK golf ball deals, ranked by discount off
RRP, refreshed once a day at ~12:00 UK time. Live at
[golfballdeals.co.uk](https://golfballdeals.co.uk), hosted on GitHub Pages.

## How it works

- `index.html` — the site itself. Single file, inline CSS/JS. Renders the
  embedded sample data immediately, then overrides it by fetching
  `./data/deals.json` if reachable — so it always shows something even
  before a real feed is connected.
- `data/deals.json` — the current deal list. Overwritten daily by the
  fetch script and committed back to the repo by GitHub Actions. No fixed
  size — see "Deal list size & per-partner minimum" below.
- `scripts/fetch-deals.js` — Node script that pulls each retailer's
  affiliate product feed, filters to golf balls, and writes the result to
  `data/deals.json`, applying the per-partner minimum described below.
  Awin is a real, working integration; Partnerize and FlexOffers are
  stubbed pending account setup.
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

In addition to the networks above, the site uses an auto-affiliation
service that rewrites outbound retailer links into affiliate links
automatically at click time — no need to be individually approved by each
retailer first:

- **Sovrn (Commerce)** — live, client-side link rewriting handled in
  `index.html`'s `resolveAffiliateLink()` using the campaign key in
  `data/merchants.json`. Sovrn's campaign approval was still pending as of
  the last check — worth confirming current status in the Sovrn dashboard,
  since links may not earn commission until it's approved (the featured
  rank-20 slot exists specifically to generate real clicks for that
  review).
- ~~**Skimlinks**~~ — removed 6 Aug 2026. Skimlinks ended the relationship
  with this site, so its script and all related config/links were pulled
  from `index.html`, `data/merchants.json`, and `privacy.html`. Sovrn is
  now the sole fallback network.

This is a genuinely useful stopgap since it doesn't block on Awin/
Partnerize/FlexOffers approvals, but note it typically pays a smaller
share of commission than a direct affiliate relationship with the retailer
— worth switching a retailer over to its direct network once approved,
rather than relying on Sovrn for everything long-term.

### Awin application status (as of 6 Aug 2026)

Awin publisher account approved — publisher ID `3013085`, datafeed API key
obtained and stored as a GitHub secret. Individual merchant programme
applications submitted; most still pending approval.

| Advertiser | Awin advertiser ID | Feed available? | Status |
|---|---|---|---|
| Scottsdale Golf | 813 | yes | pending |
| Clubhouse Golf | 39290 | yes | pending |
| Callaway Golf (brand direct) | 19186 | yes | pending |
| Affordable Golf | 82141 | yes | pending |
| Hot Golf UK | 76732 | yes | pending |
| Major Golf Direct | 83219 | **no** — Awin has no datafeed for this merchant even once approved | **approved 6 Aug 2026** |
| Jam Golf (UK) | 7912 | **no** — same | pending |
| Discount Golf Store | 10153 | **no** — same | pending |

Major Golf Direct is now wired into `data/merchants.json` as `approved`
with `advertiserId "83219"`, so `resolveAffiliateLink()` will build a
direct Awin deep link for it as soon as a deal in `data/deals.json`
carries `"merchantId": "majorgolf"`. Since Awin has no datafeed for this
merchant, `scripts/fetch-deals.js` can't pull its products automatically —
deals need to be added manually, the same way Amazon's are.

Applied to but out of scope for this site (not golf-ball retailers) —
skip: Evelyn Gold (jewellery), Payntr Golf EU (golf shoes only).

GolfSupport, Snainton Golf, and Sports Direct — three of the original
target merchants — don't appear in the applications submitted so far;
need to confirm whether those were applied to separately or still need
applying to.

Feed IDs (as opposed to advertiser IDs) aren't visible until each
programme approves the application, so nothing here can be wired into
`scripts/fetch-deals.js` for the feed-eligible merchants yet — the daily
manual-scan process covers the gap until those approvals land.

## Affiliate link priority (data/merchants.json)

Every deal card's "View deal" link is resolved client-side at render time
by `resolveAffiliateLink()` in `index.html`, using `data/merchants.json`
as the source of truth. Priority order per merchant:

1. **Direct affiliate network** — if `merchants.json` marks that merchant's
   `direct.status` as `"approved"` (Awin deep link, or an Amazon Associates
   tagged link). This pays the most and has no middleman.
2. **Sovrn** — the auto-affiliation fallback network. Doesn't require
   per-merchant approval. (Skimlinks was previously an alternate fallback
   here but was removed 6 Aug 2026 when Skimlinks ended the relationship;
   Sovrn is now the only fallback.)
3. **Plain, unaffiliated link** — if a merchant isn't covered by Sovrn and
   has no direct relationship. `resolveAffiliateLink` falls through to
   this automatically; nothing to configure.

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

Credential handling: Sovrn's campaign `key` is meant to be public — their
own docs show it embedded directly in outbound link URLs — so it lives in
`merchants.json` in this public repo. Sovrn's separate API *secret* (used
for their authenticated backend API, e.g. pulling real commission data) is
not public and is never committed here.

## Outbound click tracking (Google Analytics)

Added 6 Aug 2026. Every "View deal" click fires a custom GA4 event —
`outbound_click` — via the existing gtag.js snippet (measurement ID
`G-HRN035HKMQ`), just before the click opens the retailer in a new tab.
Implemented as one delegated click listener on `#deals-grid`
(`trackOutboundClicks()` near the bottom of `index.html`'s script), reading
`data-*` attributes that `cardHTML()` stamps onto each `<a class="cta">`.
Because links open with `target="_blank"`, there's no navigation race —
no need for `event_callback`/beacon workarounds to make sure the hit lands.

Event parameters sent with every `outbound_click`:

| Parameter | Example | Notes |
|---|---|---|
| `link_url` | `https://www.awin1.com/cread.php?...` | the actual resolved href |
| `link_domain` | `www.awin1.com` | parsed from `link_url` |
| `merchant_id` | `majorgolf` | matches `data/merchants.json` |
| `site_name` | `Major Golf Direct` | |
| `network` | `awin` \| `amazon-associates` \| `sovrn` \| `sovrn-featured` \| `none` | which tier `resolveAffiliateLink()` actually used — see `resolveNetworkLabel()`, which shares logic with the link builder so the two can't drift apart |
| `brand` | `Titleist` | |
| `model` | `Pro V1 Golf Balls (12 Pack)` | |
| `tier` | `premium` \| `budget` \| `featured` | |
| `discount_percent` | `47` | numeric |
| `price_gbp` | `29.99` | numeric |
| `rank` | `3` | homepage discount-sort position at click time |
| `is_featured` | `true` | |

**To actually see these broken out in GA4 reports**, each parameter needs
registering once in *Admin → Custom definitions → Create custom
dimension* (or *custom metric* for `discount_percent`/`price_gbp` if you
want averages/sums), mapped to the matching event parameter name above.
Firing the event alone only gets you a raw event count — the custom
dimensions are what let you build an Exploration report like "outbound
clicks by `network` × `merchant_id`" or "average `discount_percent` of
clicked deals by `tier`". This step can't be done from the codebase — it's
a one-time manual step in the GA4 property admin UI.

Separately, GA4's built-in **Enhanced measurement** (Admin → Data Streams
→ your web stream) already auto-tracks generic outbound-link clicks
site-wide with no code required — it's off by default only if someone
disabled it. That gives basic `link_domain` data but none of the
deal-specific parameters above, so the two are complementary, not
redundant.

## Sitemap

`sitemap.xml` + `robots.txt` at the repo root, submitted to Google Search
Console. Since the homepage's deal content changes daily, the daily scan
task refreshes `sitemap.xml`'s `<lastmod>` for `/` each run it makes a
change — `changefreq` is set to `daily` accordingly.

## Deal list size & per-partner minimum

Changed 6 Aug 2026: the site no longer caps the deal list at a fixed count
("top 20"). Instead, **every affiliated partner is guaranteed at least its
top 5 premium deals and top 5 budget deals** (by discount off RRP), even if
those wouldn't otherwise rank in the global top tier. The total list size
grows as more partners are added rather than staying fixed — a partner
with fewer than 5 genuine deals in a tier just contributes all it has.

This applies uniformly, whether a partner's deals come from the automated
`scripts/fetch-deals.js` feed pull (`applyPerMerchantFloor()`, keyed on
`MIN_PER_TIER = 5`) or from manual curation (Amazon, Major Golf Direct).
For manually curated partners, apply the same 5+5 floor by hand when
picking deals — it isn't currently enforced in code for those, since
there's no live feed to pull a full catalog from.

The `rank` field in `data/deals.json` is still a pure global discount
ranking across the whole merged list (used for default sort order on the
homepage) — it's cosmetic and doesn't gate whether a deal is included.

## Deal sourcing strategy

Two kinds of listing appear on the site, both manually verified against the
retailer's own product page (never a search-result summary):

- **Discount deals** — a genuine current markdown (real crossed-out RRP,
  lower current price). Shown with a red `-X%` badge.
- **Best price found** — the current price for one of the most popular golf
  ball models on the market, even when it isn't discounted right now. Shown
  with a neutral "Best price found" tag instead of a discount badge, so it's
  never confused with a real markdown.

The target brand/model list is sourced from a credible published ranking —
currently [MyGolfSpy's Nov 2025 reader survey of top golf ball brands](https://mygolfspy.com/news-opinion/survey-results-the-top-10-golf-ball-brands-of-2025/)
(Titleist, Maxfli, Callaway, Srixon, TaylorMade, Vice, Costco/Kirkland,
Bridgestone, Wilson, Mizuno, plus PXG/Legato/Snell/Seed/OnCore/Cut/Pinnacle/
Volvik/Noodle as "other notables") — aiming for roughly 20 brands, ~20
premium + ~20 budget models, expanding a few verified entries at a time via
the daily scan rather than in one batch. Niche US direct-to-consumer brands
(Maxfli, Kirkland, PXG, Legato, Snell, Seed, OnCore, Cut) may not have
verifiable UK retail listings — they're skipped rather than guessed at.

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
   - `AWIN_AFFORDABLEGOLF_ID`, `AWIN_AFFORDABLEGOLF_FEED_ID`
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
