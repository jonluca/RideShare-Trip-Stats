import type { TripAnalytics } from "../analytics/tripAnalytics";
import { formatCurrency, formatDecimal, formatDuration, formatInteger, formatUsd } from "./formatters";

interface SummaryGridProps {
  analytics: TripAnalytics;
}

function spendSummary(analytics: TripAnalytics): { detail: string; value: string } {
  if (analytics.currencyTotals.length === 1) {
    const total = analytics.currencyTotals[0]!;
    return {
      detail: `${formatInteger(analytics.paidTripCount)} trips with a recorded fare`,
      value: formatCurrency(total.amount, total.currency),
    };
  }

  if (analytics.convertedFareCount > 0) {
    return {
      detail: `Estimated USD across ${formatInteger(analytics.currencyTotals.length)} currencies`,
      value: `~${formatUsd(analytics.totalUsd)}`,
    };
  }

  return { detail: "No parseable fares found", value: "—" };
}

export function SummaryGrid({ analytics }: SummaryGridProps) {
  const spend = spendSummary(analytics);

  return (
    <section className="summary-grid" aria-label="Lifetime summary">
      <article className="summary-card summary-card-featured">
        <span className="summary-label">Total trips</span>
        <strong>{formatInteger(analytics.totalTrips)}</strong>
        <span className="summary-detail">
          {formatInteger(analytics.completedTrips)} completed · {formatInteger(analytics.activeDays)} active days
        </span>
      </article>
      <article className="summary-card">
        <span className="summary-label">Total spent</span>
        <strong>{spend.value}</strong>
        <span className="summary-detail">{spend.detail}</span>
      </article>
      <article className="summary-card">
        <span className="summary-label">Time in rides</span>
        <strong>{formatDuration(analytics.totalDurationMs)}</strong>
        <span className="summary-detail">
          {analytics.averageDurationMs === null ? "No valid trip times" : `${formatDuration(analytics.averageDurationMs)} average trip`}
        </span>
      </article>
      <article className="summary-card">
        <span className="summary-label">Distance</span>
        <strong>{formatInteger(analytics.totalDistanceMiles)} mi</strong>
        <span className="summary-detail">
          {analytics.averageDistanceMiles === null
            ? "No distance data available"
            : `${formatDecimal(analytics.averageDistanceMiles)} mi average`}
        </span>
      </article>
    </section>
  );
}
