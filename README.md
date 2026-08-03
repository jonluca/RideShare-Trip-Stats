# RideShare Trip Stats

RideShare Trip Stats is a private, open-source browser extension that turns your Uber rides and Uber Eats orders into lifetime dashboards. Ride analytics cover counts, spending by currency, time, distance, yearly activity, patterns, and notable trips. Eats analytics cover orders, restaurants, repeat items, spending, cadence, yearly activity, and completion status. Results can be exported as CSV or JSON.

[Install from the Chrome Web Store](https://chrome.google.com/webstore/detail/uber-trip-stats/kddlnbejbpknoedebeojobofnbdfhpnm)

## How to use it

1. Open [Uber Trips](https://riders.uber.com/trips) and sign in.
2. Wait until your past trips appear.
3. The draggable **Analyze trips** button appears automatically. Move it wherever you like, then click it to start.
4. Keep the Uber tab open while the extension reads your history. The results dashboard opens automatically.

You can also click the RideShare Trip Stats toolbar icon to start. Clicking it from another page opens Uber Trips for you.

### Analyzing Uber Eats

1. Open [Uber Eats Past Orders](https://www.ubereats.com/orders) and sign in.
2. Wait until your recent orders appear.
3. Click the draggable **Analyze Eats** button. Keep the tab open while the extension follows Uber Eats' own order-history pages.
4. The results dashboard opens automatically with order totals, favorite restaurants, repeat items, ordering cadence, yearly activity, and status breakdowns.

The live collector stores completed, cancelled, and other historical orders returned by Uber Eats, including items, customizations, restaurant details, and prices. Later refreshes stop as soon as they reach a page already present in a complete local cache, making repeat collections much faster.

For an archive fallback, request your official [Uber data download](https://help.uber.com/riders/article/download-your-data?nodeId=2c86900d-8408-4bac-b92a-956d793acd11), choose **Import Uber data** on the dashboard, and select the ZIP. If you extracted it first, select **Eats Order Details** and **Eats Restaurant Names** together. Live and imported orders are merged by order ID without double-counting. Both collection methods run locally; your order data is never uploaded by the extension.

### Adding older history

Uber's live Riders activity feed may expose only a recent window. The extension preserves trips collected by earlier versions and never removes cached trips simply because they disappear from that feed.

To add older rides that Uber no longer returns live, request the same official data download. On the results dashboard, choose **Import Uber data** and select either the downloaded ZIP or its Rider Trips Data CSV. The import is processed locally and merged without duplicating rides already fetched.

## Privacy

The extension reads ride and Eats history directly from Uber while you are signed in, performs all analysis locally, and saves the merged datasets in local extension storage. User-selected Uber ZIP/CSV exports are processed entirely in the browser. Ride and order data is not sent to an analytics server. See [PRIVACY.md](./PRIVACY.md) for the complete policy.

Cross-currency estimates use a dated snapshot of the [European Central Bank reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html). Native-currency totals remain available when a USD reference rate is unavailable.

## Browser support

One WXT/React codebase produces Manifest V3 builds for:

- Chrome, Brave, Arc, Opera, and other Chromium browsers
- Microsoft Edge
- Firefox
- Safari, after conversion to a Safari Web Extension with Xcode

## Development

Node.js 22 or newer and npm are required.

```sh
npm install
npm run dev
```

Use `npm run dev:firefox` for Firefox development. Before submitting a change, run:

```sh
npm run check
npm run build
```

WXT writes browser-specific builds to `.output/`. Run `npm run zip` to create store-ready archives for each browser. The Safari archive still needs to be converted into a native Safari Web Extension wrapper with Xcode.

## Architecture

- `entrypoints/launcher.content.ts` adds the matching draggable trigger on Uber Trips and Uber Eats Past Orders, including across client-side navigation.
- `src/collector/` collects rides with bounded detail concurrency and Eats with cursor-based history pagination; both use local caching, retry backoff, and a shared progress overlay.
- `src/data/` owns legacy-cache recovery, separate ride/Eats persistence, Uber archive import, normalization, and CSV export.
- `src/analytics/` calculates ride and Eats dashboards independently in one pass over each normalized dataset.
- `src/components/` contains presentation-only dashboard components.

## Credits

Created by JonLuca DeCaro and Roberto Andrade. RideShare Trip Stats is not affiliated with Uber.
