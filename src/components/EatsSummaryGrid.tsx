import type { EatsAnalytics } from "../analytics/eatsAnalytics";
import { formatCount, formatCurrency, formatDecimal, formatInteger, formatUsd } from "./formatters";

function spendSummary(analytics: EatsAnalytics): { detail: string; value: string } {
  if (analytics.currencyTotals.length === 1) {
    const total = analytics.currencyTotals[0]!;
    return {
      detail: `${formatCount(analytics.pricedOrderCount, "completed order")} with a recorded total`,
      value: formatCurrency(total.amount, total.currency),
    };
  }
  if (analytics.convertedOrderCount > 0) {
    return {
      detail: `Estimated USD across ${formatInteger(analytics.currencyTotals.length)} currencies`,
      value: `~${formatUsd(analytics.totalUsd)}`,
    };
  }
  if (analytics.unlabelledPriceCount > 0) {
    return {
      detail: "Recorded amount; Uber did not label the currency",
      value: `${formatDecimal(analytics.unlabelledAmount)}*`,
    };
  }
  return { detail: "No order totals were included", value: "—" };
}

export function EatsSummaryGrid({ analytics }: { analytics: EatsAnalytics }) {
  const spend = spendSummary(analytics);
  const favorite = analytics.restaurantCounts[0];
  return (
    <section className="summary-grid" aria-label="Uber Eats lifetime summary">
      <article className="summary-card summary-card-featured">
        <span className="summary-label">Total orders</span>
        <strong>{formatInteger(analytics.totalOrders)}</strong>
        <span className="summary-detail">
          {formatCount(analytics.completedOrders, "completed order")} · {formatCount(analytics.activeDays, "active day")}
        </span>
      </article>
      <article className="summary-card">
        <span className="summary-label">Total spent</span>
        <strong>{spend.value}</strong>
        <span className="summary-detail">{spend.detail}</span>
      </article>
      <article className="summary-card">
        <span className="summary-label">Items ordered</span>
        <strong>{formatInteger(analytics.totalItems)}</strong>
        <span className="summary-detail">
          {analytics.averageItemsPerOrder === null
            ? "No completed item data"
            : `${formatDecimal(analytics.averageItemsPerOrder)} per order`}
        </span>
      </article>
      <article className="summary-card">
        <span className="summary-label">Restaurants</span>
        <strong>{formatInteger(analytics.uniqueRestaurants)}</strong>
        <span className="summary-detail">
          {favorite ? `${favorite.label} · ${formatCount(favorite.count, "order")}` : "No restaurant data"}
        </span>
      </article>
    </section>
  );
}
