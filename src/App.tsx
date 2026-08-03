import { useRef, useState } from "react";
import { AnalyticsPanels } from "./components/AnalyticsPanels";
import { formatDate, formatInteger } from "./components/formatters";
import { SummaryGrid } from "./components/SummaryGrid";
import { YearlyActivity } from "./components/YearlyActivity";
import { useDataContext } from "./context";
import { tripsToCsv } from "./data/exportTrips";
import { downloadFile } from "./utils";

const UBER_TRIPS_URL = "https://riders.uber.com/trips";
const UBER_DATA_URL = "https://help.uber.com/riders/article/download-your-data?nodeId=2c86900d-8408-4bac-b92a-956d793acd11";

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
        <p>{error ?? "Sign in to Uber, then use the Analyze trips button that appears automatically on the Trips page."}</p>
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
  const { analytics, collectedAt, error, failedTripCount, importUberData, records, status, trips } = useDataContext();
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importState, setImportState] = useState<"error" | "idle" | "loading" | "success">("idle");

  const exportTrips = (format: "csv" | "json") => {
    if (format === "csv") {
      downloadFile(filename("csv"), tripsToCsv(trips), "text/csv;charset=utf-8");
      return;
    }

    downloadFile(filename("json"), JSON.stringify(records, null, 2), "application/json;charset=utf-8");
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setImportState("loading");
    setImportMessage("Reading your Uber export locally…");
    try {
      const result = await importUberData(file);
      setImportState("success");
      setImportMessage(
        result.added > 0
          ? `Added ${formatInteger(result.added)} historical trips. ${formatInteger(result.duplicates)} duplicates were skipped.`
          : `No new trips were added. All ${formatInteger(result.duplicates)} imported trips were already present.`,
      );
    } catch (reason) {
      setImportState("error");
      setImportMessage(reason instanceof Error ? reason.message : "Could not read this Uber data export.");
    } finally {
      if (importInput.current) {
        importInput.current.value = "";
      }
    }
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
            <button type="button" disabled={importState === "loading"} onClick={() => importInput.current?.click()}>
              {importState === "loading" ? "Importing…" : "Add older trips"} <span aria-hidden="true">＋</span>
            </button>
            <input
              ref={importInput}
              hidden
              type="file"
              accept=".zip,.csv,application/zip,text/csv"
              onChange={(event) => void handleImport(event.currentTarget.files?.[0])}
            />
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

        <aside className="notice notice-history">
          <span aria-hidden="true">＋</span>
          <p>
            <strong>Rides older than Uber’s live history are missing?</strong> Add the ZIP or Trips Data CSV from your official Uber data
            export. It is merged locally with fetched and previously cached trips.{" "}
            <a href={UBER_DATA_URL} target="_blank" rel="noreferrer">
              Request your Uber data ↗
            </a>
          </p>
        </aside>

        {importMessage && (
          <aside className={`notice notice-import-${importState}`} role={importState === "error" ? "alert" : "status"}>
            <span aria-hidden="true">{importState === "error" ? "!" : "✓"}</span>
            <p>{importMessage}</p>
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
