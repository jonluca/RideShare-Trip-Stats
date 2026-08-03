import type { EatsAnalytics } from "../analytics/eatsAnalytics";
import { eatsOrdersToCsv } from "../data/exportEats";
import type { UberEatsOrder } from "../types/UberEats";
import { downloadFile } from "../utils";
import { EatsAnalyticsPanels } from "./EatsAnalyticsPanels";
import { EatsSummaryGrid } from "./EatsSummaryGrid";
import { EatsYearlyActivity } from "./EatsYearlyActivity";
import { formatCount, formatDate } from "./formatters";

const UBER_DATA_URL = "https://help.uber.com/riders/article/download-your-data?nodeId=2c86900d-8408-4bac-b92a-956d793acd11";

interface EatsDashboardProps {
  analytics: EatsAnalytics;
  importLoading: boolean;
  importedAt: string | null;
  onImport: () => void;
  orders: UberEatsOrder[];
}

function filename(extension: "csv" | "json") {
  return `uber-eats-orders-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function EatsDashboard({ analytics, importLoading, importedAt, onImport, orders }: EatsDashboardProps) {
  const exportOrders = (format: "csv" | "json") => {
    if (format === "csv") {
      downloadFile(filename("csv"), eatsOrdersToCsv(orders), "text/csv;charset=utf-8");
      return;
    }
    downloadFile(filename("json"), JSON.stringify(orders, null, 2), "application/json;charset=utf-8");
  };
  const dateRange =
    analytics.firstOrderTime !== null && analytics.lastOrderTime !== null
      ? `${formatDate(analytics.firstOrderTime)} – ${formatDate(analytics.lastOrderTime)}`
      : "Your complete order history";
  const importedTimestamp = importedAt ? Date.parse(importedAt) : Number.NaN;

  return (
    <>
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Uber Eats dashboard</p>
          <h1>
            Your Eats history,
            <br />
            <span>decoded.</span>
          </h1>
          <p className="intro-copy">
            {dateRange} · {formatCount(analytics.totalOrders, "order")} analyzed
          </p>
        </div>
        <div className="export-actions" aria-label="Uber Eats data actions">
          <button type="button" disabled={importLoading} onClick={onImport}>
            {importLoading ? "Importing…" : "Import Uber data"} <span aria-hidden="true">＋</span>
          </button>
          <button type="button" onClick={() => exportOrders("csv")}>
            Export Eats CSV <span aria-hidden="true">↓</span>
          </button>
          <button type="button" onClick={() => exportOrders("json")}>
            Export JSON <span aria-hidden="true">↓</span>
          </button>
        </div>
      </section>

      <aside className="notice notice-history">
        <span aria-hidden="true">＋</span>
        <p>
          <strong>Add or refresh Uber Eats history from your official Uber export.</strong> Import the ZIP, or select Eats Order Details and
          Eats Restaurant Names CSV files together. Items, prices, customizations, and restaurant names stay in this browser.{" "}
          <a href={UBER_DATA_URL} target="_blank" rel="noreferrer">
            Request your Uber data ↗
          </a>
        </p>
      </aside>

      <EatsSummaryGrid analytics={analytics} />
      {analytics.yearlyActivity.length > 0 && <EatsYearlyActivity activity={analytics.yearlyActivity} />}
      <EatsAnalyticsPanels analytics={analytics} />

      {(analytics.currencyTotals.length > 1 || analytics.unconvertedCurrencies.length > 0 || analytics.unlabelledPriceCount > 0) && (
        <aside className="notice">
          <span aria-hidden="true">i</span>
          <p>
            Cross-currency figures marked with “~” use the bundled {analytics.exchangeRateDate} rate snapshot.
            {analytics.unlabelledPriceCount > 0 &&
              ` Uber omitted a currency label for ${formatCount(analytics.unlabelledPriceCount, "completed order total")}, so those amounts are not mixed into converted spending.`}
            {analytics.unconvertedCurrencies.length > 0 && ` No USD rate was available for ${analytics.unconvertedCurrencies.join(", ")}.`}
          </p>
        </aside>
      )}

      <p className="view-timestamp">
        {Number.isFinite(importedTimestamp) ? `Eats import updated ${formatDate(importedTimestamp)}` : "Eats data stored locally"}
      </p>
    </>
  );
}
