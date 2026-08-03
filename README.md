# RideShare Trip Stats

RideShare Trip Stats is a private, open-source browser extension that turns your Uber trip history into a lifetime dashboard. It reports ride counts, spending by currency, estimated cross-currency totals, time, distance, yearly activity, ride patterns, and notable trips. Results can be exported as CSV or JSON.

[Install from the Chrome Web Store](https://chrome.google.com/webstore/detail/uber-trip-stats/kddlnbejbpknoedebeojobofnbdfhpnm)

## How to use it

1. Open [Uber Trips](https://riders.uber.com/trips) and sign in.
2. Wait until your past trips appear.
3. Click the RideShare Trip Stats icon in the browser toolbar. If it is hidden, open the extensions menu and pin it first.
4. A draggable **Analyze trips** button appears on Uber. Move it wherever you like, then click it to start.
5. Keep the Uber tab open while the extension reads your history. The results dashboard opens automatically.

Clicking the extension from another page opens Uber Trips for you.

## Privacy

The extension reads data directly from Uber while you are signed in, performs analysis locally, and saves the latest dataset in local extension storage. Trip data is not sent to an analytics server. See [PRIVACY.md](./PRIVACY.md) for the complete policy.

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

- `entrypoints/launcher.ts` injects the draggable on-page trigger after the user clicks the extension toolbar icon.
- `entrypoints/rideshare.ts` collects activity IDs, reuses stable cached trips, and fetches new or recent trip details with bounded concurrency and retry backoff.
- `src/data/` owns local persistence, trip normalization, and CSV export.
- `src/analytics/` calculates the complete dashboard in one pass over normalized trips.
- `src/components/` contains presentation-only dashboard components.

## Credits

Created by JonLuca DeCaro and Roberto Andrade. RideShare Trip Stats is not affiliated with Uber.
