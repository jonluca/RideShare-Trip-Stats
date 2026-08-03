import { AnalyticsPanels } from "./components/AnalyticsPanels";
import { formatDate, formatInteger } from "./components/formatters";
import { SummaryGrid } from "./components/SummaryGrid";
import { YearlyActivity } from "./components/YearlyActivity";
import { useDataContext } from "./context";
import { tripsToCsv } from "./data/exportTrips";
import { downloadFile } from "./utils";

const UBER_TRIPS_URL = "https://riders.uber.com/trips";

function filename(extension: "csv" | "json") {
  return `rideshare-trips-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function PageHeader() {
  return (
    <header className="dashboard-header">
      <a className="brand" href={UBER_TRIPS_URL} target="_blank" rel="noreferrer">
        <span className="brand-mark" aria-hidden="true">
          R
        </span>
        <span>RideShare Trip Stats</span>
      </a>
      <span className="local-badge">
        <span aria-hidden="true">●</span> Analyzed locally
      </span>
    </header>
  );
}

function EmptyState({ error }: { error?: string | null }) {
  return (
    <main className="state-page">
      <div className="state-card">
        <span className="state-icon" aria-hidden="true">
          ↗
        </span>
        <p className="eyebrow">{error ? "Something went wrong" : "No trip data yet"}</p>
        <h1>{error ? "We couldn’t open your results." : "Run the extension from Uber Trips."}</h1>
        <p>
          {error ??
            "Sign in to Uber, wait for your trip history to appear, then click the RideShare Trip Stats icon in your browser toolbar."}
        </p>
        <a className="primary-button" href={UBER_TRIPS_URL} target="_blank" rel="noreferrer">
          Open Uber Trips <span aria-hidden="true">↗</span>
        </a>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="loading-page" aria-live="polite" aria-busy="true">
      <div className="loading-mark" aria-hidden="true">
        <span />
      </div>
      <p>Preparing your lifetime analytics…</p>
    </main>
  );
}

export default function App() {
  const { analytics, collectedAt, error, failedTripCount, records, status, trips } = useDataContext();

  const exportTrips = (format: "csv" | "json") => {
    if (format === "csv") {
      downloadFile(filename("csv"), tripsToCsv(trips), "text/csv;charset=utf-8");
      return;
    }

    downloadFile(filename("json"), JSON.stringify(records, null, 2), "application/json;charset=utf-8");
  };

  if (status === "loading") {
    return (
      <>
        <PageHeader />
        <LoadingState />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <PageHeader />
        <EmptyState error={error} />
      </>
    );
  }

  if (!analytics || analytics.totalTrips === 0) {
    return (
      <>
        <PageHeader />
        <EmptyState />
      </>
    );
  }

  const dateRange =
    analytics.firstTripTime !== null && analytics.lastTripTime !== null
      ? `${formatDate(analytics.firstTripTime)} – ${formatDate(analytics.lastTripTime)}`
      : "Your complete trip history";
  const collectedTimestamp = collectedAt ? Date.parse(collectedAt) : Number.NaN;

  return (
    <div className="page-shell">
      <PageHeader />
      <main className="dashboard-main">
        <section className="dashboard-intro">
          <div>
            <p className="eyebrow">Lifetime dashboard</p>
            <h1>
              Your Uber history,
              <br />
              <span>decoded.</span>
            </h1>
            <p className="intro-copy">
              {dateRange} · {formatInteger(analytics.totalTrips)} trips analyzed
            </p>
          </div>
          <div className="export-actions" aria-label="Export trip data">
            <button type="button" onClick={() => exportTrips("csv")}>
              Export CSV <span aria-hidden="true">↓</span>
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
              <strong>{formatInteger(failedTripCount)} trips could not be loaded.</strong> Uber may have temporarily rate-limited those
              requests. Run the extension again to retry them.
            </p>
          </aside>
        )}

        <SummaryGrid analytics={analytics} />

        {analytics.yearlyActivity.length > 0 && <YearlyActivity activity={analytics.yearlyActivity} />}
        <AnalyticsPanels analytics={analytics} />

        {(analytics.currencyTotals.length > 1 || analytics.unconvertedCurrencies.length > 0) && (
          <aside className="notice">
            <span aria-hidden="true">i</span>
            <p>
              Cross-currency figures marked with “~” are estimates using the bundled {analytics.exchangeRateDate} rate snapshot.
              {analytics.unconvertedCurrencies.length > 0 &&
                ` No USD rate was available for ${analytics.unconvertedCurrencies.join(", ")}.`}
            </p>
          </aside>
        )}
      </main>

      <footer className="dashboard-footer">
        <span>{Number.isFinite(collectedTimestamp) ? `Analyzed ${formatDate(collectedTimestamp)}` : "Stored only in this browser"}</span>
        <span>Not affiliated with Uber</span>
        <a href="https://github.com/jonluca/RideShare-Trip-Stats" target="_blank" rel="noreferrer">
          View source ↗
        </a>
      </footer>
    </div>
  );
}
