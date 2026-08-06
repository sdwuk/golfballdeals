/**
 * fetch-deals.js
 * ----------------------------------------------------------------------
 * Pulls golf ball products from each retailer's affiliate feed, filters
 * to golf balls, and writes deals.json — the file index.html fetches on
 * load.
 *
 * SELECTION POLICY (changed 6 Aug 2026 — no more fixed "top 20"):
 * Every retailer with live feed products gets a guaranteed floor of its
 * top 5 premium + top 5 budget deals (by discount off RRP), even if
 * those wouldn't rank in the global top tier. There's no overall cap —
 * the total list grows as more retailers come online. See MIN_PER_TIER
 * below and applyPerMerchantFloor(). `rank` in the output is still a
 * pure global discount ranking across the whole merged list, purely for
 * display/sort purposes — it does NOT gate inclusion.
 *
 * Run manually with:   node scripts/fetch-deals.js
 * Run daily via:        .github/workflows/daily-refresh.yml
 *
 * WHY THE TIME GUARD BELOW:
 * GitHub Actions cron runs in UTC, but the UK alternates between GMT
 * and BST across the year. The workflow fires twice a day (11:00 and
 * 12:00 UTC) and this script only does real work on whichever of those
 * two runs actually lands at ~12:00 UK local time. Pass --force to
 * skip the guard when testing locally.
 * ----------------------------------------------------------------------
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'deals.json');
const FORCE = process.argv.includes('--force');

// ----------------------------------------------------------------------
// 1. TIME GUARD — only proceed if it's ~midday UK time (see note above)
// ----------------------------------------------------------------------
function isRoughlyUKNoon() {
  const ukHour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(new Date())
  );
  return ukHour === 12;
}

// ----------------------------------------------------------------------
// 2. RETAILER CONFIG — fill in real IDs once you're approved on each
//    network. Nothing here runs against a real feed until you do.
// ----------------------------------------------------------------------
const RETAILERS = [
  {
    site: 'Clubhouse Golf',
    merchantId: 'clubhousegolf', // must match an id in data/merchants.json
    network: 'awin',
    awinAdvertiserId: process.env.AWIN_CLUBHOUSE_ID || null,
    awinFeedId: process.env.AWIN_CLUBHOUSE_FEED_ID || null,
  },
  {
    site: 'GolfSupport',
    merchantId: 'golfsupport',
    network: 'awin',
    awinAdvertiserId: process.env.AWIN_GOLFSUPPORT_ID || null,
    awinFeedId: process.env.AWIN_GOLFSUPPORT_FEED_ID || null,
  },
  {
    site: 'Snainton Golf',
    merchantId: 'snaintongolf',
    network: 'awin',
    awinAdvertiserId: process.env.AWIN_SNAINTON_ID || null,
    awinFeedId: process.env.AWIN_SNAINTON_FEED_ID || null,
  },
  {
    site: 'Scottsdale Golf',
    merchantId: 'scottsdalegolf',
    network: 'awin', // also on Avelon — see TODO below
    awinAdvertiserId: process.env.AWIN_SCOTTSDALE_ID || null,
    awinFeedId: process.env.AWIN_SCOTTSDALE_FEED_ID || null,
  },
  {
    site: 'American Golf',
    merchantId: 'americangolf',
    network: 'partnerize', // TODO: implement — see fetchFromPartnerize() below
  },
  {
    site: 'GolfOnline',
    merchantId: 'golfonline',
    network: 'flexoffers', // TODO: implement — see fetchFromFlexOffers() below
  },
  {
    site: 'OnlineGolf',
    merchantId: 'onlinegolf',
    network: 'partnerize', // TODO: implement — see fetchFromPartnerize() below
  },
  {
    site: 'Sports Direct',
    merchantId: 'sportsdirect',
    network: 'awin', // unverified — confirm network when you sign up
    awinAdvertiserId: process.env.AWIN_SPORTSDIRECT_ID || null,
    awinFeedId: process.env.AWIN_SPORTSDIRECT_FEED_ID || null,
  },
  {
    site: 'Affordable Golf',
    merchantId: 'affordablegolf',
    network: 'awin',
    awinAdvertiserId: process.env.AWIN_AFFORDABLEGOLF_ID || null,
    awinFeedId: process.env.AWIN_AFFORDABLEGOLF_FEED_ID || null,
  },
  // Major Golf Direct (advertiserId 83219, approved 6 Aug 2026) is
  // deliberately NOT listed here — Awin has no product datafeed for this
  // merchant even once approved, so it can only ever be manually curated
  // straight into data/deals.json with merchantId "majorgolf". Same for
  // any other Awin merchant flagged "no datafeed" in README.md.

  // Callaway Golf (19186), Hot Golf UK (76732), Jam Golf (7912), and
  // Discount Golf Store (10153) are pending Awin approval — add feed
  // entries here (and matching merchantId rows in data/merchants.json)
  // once each is approved and a feed ID is issued.
];

// Keywords used to decide whether a product is a golf ball at all, and
// whether it's "premium" (tour-level) or "budget". Extend freely.
const GOLF_BALL_REGEX = /\bgolf ball/i;
const PREMIUM_KEYWORDS = /(pro v1|chrome soft|tp5|tour b|z-star|z star|pro plus|avx|staff model|rb tour|tour speed)/i;

// Per-merchant floor: guarantee at least this many premium + this many
// budget deals per retailer (by discount off RRP), regardless of how
// they'd rank globally. See applyPerMerchantFloor() in MAIN below.
const MIN_PER_TIER = 5;

// ----------------------------------------------------------------------
// 3. AWIN — real, documented integration
//    Docs: https://help.awin.com/docs/product-feed
//    Feed URL format: https://productdata.awin.com/datafeed/download/apikey/{API_KEY}/language/any/fid/{FEED_ID}/columns/...
// ----------------------------------------------------------------------
async function fetchFromAwin(retailer) {
  const apiKey = process.env.AWIN_DATAFEED_API_KEY;
  if (!apiKey || !retailer.awinFeedId) {
    console.warn(`[skip] ${retailer.site}: missing AWIN_DATAFEED_API_KEY or feed id — add as a GitHub secret once you're approved.`);
    return [];
  }

  // merchant_image_url is the merchant's main product photo (for golf ball
  // dozens this is almost always the box/pack shot). large_image is a
  // secondary image some merchants also supply — when present and
  // different, we use it as the "exact ball" close-up; otherwise we fall
  // back to the same photo for both slots (see parseAwinCsv below).
  const columns = ['aw_product_id', 'product_name', 'search_price', 'rrp_price', 'aw_deep_link', 'merchant_category', 'merchant_image_url', 'large_image'].join(',');
  const url = `https://productdata.awin.com/datafeed/download/apikey/${apiKey}/language/any/fid/${retailer.awinFeedId}/columns/${columns}/format/csv/delimiter/%2C/compression/none/`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[warn] ${retailer.site}: Awin feed request failed (${res.status})`);
    return [];
  }
  const csv = await res.text();
  return parseAwinCsv(csv, retailer.site, retailer.merchantId);
}

// Minimal CSV parser that handles quoted fields — avoids pulling in a
// dependency for a small, fairly predictable feed format.
function parseAwinCsv(csv, siteName, merchantId) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);

  const idx = (name) => headers.indexOf(name);
  const products = [];

  for (const row of rows) {
    const name = row[idx('product_name')] || '';
    if (!GOLF_BALL_REGEX.test(name)) continue;

    const price = parseFloat(row[idx('search_price')]);
    const rrp = parseFloat(row[idx('rrp_price')]) || price;
    if (!price || !rrp || rrp <= price) continue;

    const boxImage = row[idx('merchant_image_url')] || null;
    const secondaryImage = row[idx('large_image')] || null;
    // Only treat the secondary image as a distinct "ball" shot if the
    // merchant actually supplied one different from the main photo.
    const ballImage = (secondaryImage && secondaryImage !== boxImage) ? secondaryImage : boxImage;

    products.push({
      brand: name.split(' ')[0],
      model: name,
      site: siteName,
      merchantId,
      tier: PREMIUM_KEYWORDS.test(name) ? 'premium' : 'budget',
      price,
      rrp,
      discount: Math.round(((rrp - price) / rrp) * 100),
      url: row[idx('aw_deep_link')] || '#',
      boxImage,
      ballImage,
    });
  }
  return products;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

// ----------------------------------------------------------------------
// 4. PARTNERIZE / FLEXOFFERS / AVELON — TODO
//    These need real API details (auth flow + feed structure) which
//    depend on your specific approval with each network. Fill these in
//    once you've signed up — the return shape should match fetchFromAwin.
// ----------------------------------------------------------------------
async function fetchFromPartnerize(retailer) {
  console.warn(`[todo] ${retailer.site}: Partnerize integration not yet implemented.`);
  return [];
}

async function fetchFromFlexOffers(retailer) {
  console.warn(`[todo] ${retailer.site}: FlexOffers integration not yet implemented.`);
  return [];
}

// ----------------------------------------------------------------------
// 4b. PER-MERCHANT FLOOR — every retailer with feed products gets at
//     least MIN_PER_TIER premium + MIN_PER_TIER budget deals included,
//     picked by highest discount within that retailer/tier, regardless
//     of how they'd stack up against other retailers globally. This is
//     what makes the list grow rather than stay capped at a fixed size.
// ----------------------------------------------------------------------
function applyPerMerchantFloor(allProducts) {
  const bySite = new Map();
  for (const p of allProducts) {
    if (!bySite.has(p.site)) bySite.set(p.site, []);
    bySite.get(p.site).push(p);
  }

  const selected = [];
  for (const [site, products] of bySite) {
    for (const tier of ['premium', 'budget']) {
      const tierProducts = products
        .filter((p) => p.tier === tier)
        .sort((a, b) => b.discount - a.discount);

      if (tierProducts.length < MIN_PER_TIER) {
        console.warn(`[floor] ${site}: only ${tierProducts.length} ${tier} deal(s) available — MIN_PER_TIER is ${MIN_PER_TIER}, including all of them.`);
      }
      selected.push(...tierProducts.slice(0, MIN_PER_TIER));
    }
  }
  return selected;
}

// ----------------------------------------------------------------------
// 5. MAIN
// ----------------------------------------------------------------------
async function main() {
  if (!FORCE && !isRoughlyUKNoon()) {
    console.log('Not ~12:00 UK time yet on this cron tick — skipping run.');
    return;
  }

  const results = await Promise.all(
    RETAILERS.map((retailer) => {
      if (retailer.network === 'awin') return fetchFromAwin(retailer);
      if (retailer.network === 'partnerize') return fetchFromPartnerize(retailer);
      if (retailer.network === 'flexoffers') return fetchFromFlexOffers(retailer);
      return [];
    })
  );

  const allProducts = results.flat();

  if (allProducts.length === 0) {
    console.warn('No live products fetched from any network — leaving existing deals.json untouched.');
    return;
  }

  // No fixed cap — every retailer's top MIN_PER_TIER premium + MIN_PER_TIER
  // budget deals are guaranteed a spot. `rank` below is a pure global
  // discount ordering for display purposes only; it doesn't gate inclusion.
  const floored = applyPerMerchantFloor(allProducts);

  const deals = floored
    .sort((a, b) => b.discount - a.discount)
    .map((p, i) => ({ rank: i + 1, ...p }));

  const output = {
    lastUpdated: new Date().toISOString(),
    isSampleData: false,
    deals,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${deals.length} deals to ${OUTPUT_PATH} (no fixed cap — ${bySiteSummary(floored)})`);
}

function bySiteSummary(deals) {
  const counts = new Map();
  for (const d of deals) counts.set(d.site, (counts.get(d.site) || 0) + 1);
  return [...counts.entries()].map(([site, n]) => `${site}: ${n}`).join(', ');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
