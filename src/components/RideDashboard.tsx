import type { TripAnalytics } from "../analytics/tripAnalytics";
import { tripsToCsv } from "../data/exportTrips";
import type { NormalizedTrip } from "../data/trips";
import type { GetTrip } from "../types/UberApi";
import { downloadFile } from "../utils";
import { AnalyticsPanels } from "./AnalyticsPanels";
import { formatCount, formatDate } from "./formatters";
import { SummaryGrid } from "./SummaryGrid";
import { YearlyActivity } from "./YearlyActivity";

const UBER_DATA_URL = "https://help.uber.com/riders/article/download-your-data?nodeId=2c86900d-8408-4bac-b92a-956d793acd11";

interface RideDashboardProps {
  analytics: TripAnalytics;
  collectedAt: string | null;
  failedTripCount: number;
  importLoading: boolean;
  onImport: () => void;
  records: GetTrip[];
  trips: NormalizedTrip[];
}

function filename(extension: "csv" | "json") {
  return `rideshare-trips-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function RideDashboard({ analytics, collectedAt, failedTripCount, importLoading, onImport, records, trips }: RideDashboardProps) {
  const exportTrips = (format: "csv" | "json") => {
    if (format === "csv") {
      downloadFile(filename("csv"), tripsToCsv(trips), "text/csv;charset=utf-8");
      return;
    }
    downloadFile(filename("json"), JSON.stringify(records, null, 2), "application/json;charset=utf-8");
  };
  const dateRange =
    analytics.firstTripTime !== null && analytics.lastTripTime !== null
      ? `${formatDate(analytics.firstTripTime)} – ${formatDate(analytics.lastTripTime)}`
      : "Your complete trip history";
  const collectedTimestamp = collectedAt ? Date.parse(collectedAt) : Number.NaN;

  return (
    <>
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Ride dashboard</p>
          <h1>
            Your Uber rides,
            <br />
            <span>decoded.</span>
          </h1>
          <p className="intro-copy">
            {dateRange} · {formatCount(analytics.totalTrips, "trip")} analyzed
          </p>
        </div>
        <div className="export-actions" aria-label="Ride data actions">
          <button type="button" disabled={importLoading} onClick={onImport}>
            {importLoading ? "Importing…" : "Import Uber data"} <span aria-hidden="true">＋</span>
          </button>
          <button type="button" onClick={() => exportTrips("csv")}>
            Export rides CSV <span aria-hidden="true">↓</span>
          </button>
          <button type="button" onClick={() => exportTrips("json")}>
            Export JSON <span aria-hidden="true">↓</span>
          </button>
        </div>
      </section>

      {failedTripCount > 0 && (
        <aside className="notice notice-warning">
          <span aria-hidden="true">!</span>
          <p>
            <strong>{formatCount(failedTripCount, "trip")} could not be loaded.</strong> Uber may have temporarily rate-limited those
            requests. Run the extension again to retry them.
          </p>
        </aside>
      )}

      <aside className="notice notice-history">
        <span aria-hidden="true">＋</span>
        <p>
          <strong>Rides older than Uber’s live history are missing?</strong> Import the official Uber data ZIP or Rider Trips Data CSV. It
          is merged locally with fetched and previously cached trips.{" "}
          <a href={UBER_DATA_URL} target="_blank" rel="noreferrer">
            Request your Uber data ↗
          </a>
        </p>
      </aside>

      <SummaryGrid analytics={analytics} />
      {analytics.yearlyActivity.length > 0 && <YearlyActivity activity={analytics.yearlyActivity} />}
      <AnalyticsPanels analytics={analytics} />

      {(analytics.currencyTotals.length > 1 || analytics.unconvertedCurrencies.length > 0) && (
        <aside className="notice">
          <span aria-hidden="true">i</span>
          <p>
            Cross-currency figures marked with “~” are estimates using the bundled {analytics.exchangeRateDate} rate snapshot.
            {analytics.unconvertedCurrencies.length > 0 && ` No USD rate was available for ${analytics.unconvertedCurrencies.join(", ")}.`}
          </p>
        </aside>
      )}

      <p className="view-timestamp">
        {Number.isFinite(collectedTimestamp) ? `Ride analysis updated ${formatDate(collectedTimestamp)}` : "Ride data stored locally"}
      </p>
    </>
  );
}
