name: Daily deals refresh

on:
  schedule:
    # Fires twice daily in UTC to cover both UK clock states (GMT/BST).
    # fetch-deals.js checks the real UK local time and only does work
    # on whichever run actually lands at ~12:00 UK time — the other is
    # a cheap no-op.
    - cron: '0 11 * * *'
    - cron: '0 12 * * *'
  workflow_dispatch: {}   # lets you trigger a manual refresh from the Actions tab

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch latest deals
        env:
          AWIN_DATAFEED_API_KEY: ${{ secrets.AWIN_DATAFEED_API_KEY }}
          AWIN_CLUBHOUSE_ID: ${{ secrets.AWIN_CLUBHOUSE_ID }}
          AWIN_CLUBHOUSE_FEED_ID: ${{ secrets.AWIN_CLUBHOUSE_FEED_ID }}
          AWIN_GOLFSUPPORT_ID: ${{ secrets.AWIN_GOLFSUPPORT_ID }}
          AWIN_GOLFSUPPORT_FEED_ID: ${{ secrets.AWIN_GOLFSUPPORT_FEED_ID }}
          AWIN_SNAINTON_ID: ${{ secrets.AWIN_SNAINTON_ID }}
          AWIN_SNAINTON_FEED_ID: ${{ secrets.AWIN_SNAINTON_FEED_ID }}
          AWIN_SCOTTSDALE_ID: ${{ secrets.AWIN_SCOTTSDALE_ID }}
          AWIN_SCOTTSDALE_FEED_ID: ${{ secrets.AWIN_SCOTTSDALE_FEED_ID }}
          AWIN_SPORTSDIRECT_ID: ${{ secrets.AWIN_SPORTSDIRECT_ID }}
          AWIN_SPORTSDIRECT_FEED_ID: ${{ secrets.AWIN_SPORTSDIRECT_FEED_ID }}
        run: node scripts/fetch-deals.js

      - name: Commit updated deals.json (if changed)
        run: |
          git config user.name "dozen-watch-bot"
          git config user.email "actions@users.noreply.github.com"
          if ! git diff --quiet -- data/deals.json; then
            git add data/deals.json
            git commit -m "Daily deals refresh: $(date -u +'%Y-%m-%d')"
            git push
          else
            echo "No change to deals.json — nothing to commit."
          fi
