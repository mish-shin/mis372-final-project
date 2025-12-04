import { useState } from "react";

const API_BASE = "https://api.massive.com";
const API_KEY = import.meta.env.VITE_MASSIVE_API_KEY;
const MILLISECONDS_PER_DAY = 86_400_000;

const DEFAULT_DATE = new Date(Date.now() - 45 * MILLISECONDS_PER_DAY)
  .toISOString()
  .slice(0, 10);

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatNumber = (value, digits = 2) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatPercent = (value, digits = 2) => {
  const formatted = formatNumber(Math.abs(value), digits);
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatted}%`;
};

const fetchFromMassive = async (endpoint, params = {}) => {
  if (!API_KEY) {
    throw new Error(
      "Missing MASSIVE API key. Add VITE_MASSIVE_API_KEY to your .env file."
    );
  }

  const url = new URL(`${API_BASE}${endpoint}`);
  const searchParams = new URLSearchParams({
    ...params,
    apiKey: API_KEY,
  });
  url.search = searchParams.toString();

  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.error || response.statusText;
    throw new Error(message);
  }

  if (payload?.status && payload.status !== "OK") {
    throw new Error(payload.message || payload.status);
  }

  return payload;
};

const fetchDailyBar = async (ticker, isoDate) => {
  let attempts = 0;
  let cursor = new Date(`${isoDate}T00:00:00Z`);

  while (attempts < 5) {
    const formatted = cursor.toISOString().slice(0, 10);

    const data = await fetchFromMassive(
      `/v2/aggs/ticker/${ticker}/range/1/day/${formatted}/${formatted}`,
      { adjusted: "true", limit: "1" }
    );

    if (data?.results?.length) {
      return { ...data.results[0], isoDate: formatted };
    }

    cursor = new Date(cursor.getTime() - MILLISECONDS_PER_DAY);
    attempts += 1;
  }

  throw new Error(
    "No trading data found within the past five sessions. Try another date."
  );
};

const fetchLatestClose = async (ticker) => {
  const data = await fetchFromMassive(`/v2/aggs/ticker/${ticker}/prev`, {
    adjusted: "true",
  });
  const bar = data?.results?.[0];

  if (!bar) {
    throw new Error("Unable to load the most recent trading session.");
  }

  return {
    ...bar,
    isoDate: new Date(bar.t).toISOString().slice(0, 10),
  };
};

const fetchLatestDividend = async (ticker) =>
  fetchFromMassive("/v3/reference/dividends", {
    ticker,
    limit: "1",
    order: "desc",
  });

export default function Stocks() {
  const [formValues, setFormValues] = useState({
    ticker: "AAPL",
    date: DEFAULT_DATE,
    amount: "1000",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: name === "ticker" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!formValues.ticker.trim()) {
      setError("Please enter a stock ticker.");
      return;
    }

    if (!formValues.date) {
      setError("Please choose a trade date.");
      return;
    }

    const amountNum = Number(formValues.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Investment amount must be greater than zero.");
      return;
    }

    setLoading(true);

    try {
      const normalizedTicker = formValues.ticker.trim().toUpperCase();

      const [purchaseBar, latestBar] = await Promise.all([
        fetchDailyBar(normalizedTicker, formValues.date),
        fetchLatestClose(normalizedTicker),
      ]);

      const shares = amountNum / purchaseBar.c;
      const currentValue = shares * latestBar.c;
      const profit = currentValue - amountNum;
      const roi = (profit / amountNum) * 100;
      const daysHeld = Math.max(
        1,
        Math.round((latestBar.t - purchaseBar.t) / MILLISECONDS_PER_DAY)
      );

      const annualizedReturn =
        daysHeld > 0
          ? (Math.pow(currentValue / amountNum, 365 / daysHeld) - 1) * 100
          : null;

      let lastDividend = null;
      try {
        const dividendPayload = await fetchLatestDividend(normalizedTicker);
        lastDividend = dividendPayload?.results?.[0] ?? null;
      } catch (dividendError) {
        console.warn("Dividend data unavailable", dividendError);
      }

      setResult({
        ticker: normalizedTicker,
        purchaseDate: purchaseBar.isoDate,
        latestDate: latestBar.isoDate,
        purchaseClose: purchaseBar.c,
        latestClose: latestBar.c,
        shares,
        currentValue,
        profit,
        roi,
        annualizedReturn: Number.isFinite(annualizedReturn)
          ? annualizedReturn
          : null,
        daysHeld,
        lastDividend,
        investedAmount: amountNum,
      });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">What if I invested?</h1>
      <p className="subtitle">
        Enter a stock, pick a past trade date, and see how a one-time
        investment would have performed.
      </p>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="stocks-layout">
        {/* Input card (left / ~70%) */}
        <form onSubmit={handleSubmit} className="account-card stocks-input-card">
          <p className="stocks-disclaimer">
            This is a hypothetical calculation using recent MASSIVE market data.
            Backtesting is limited to approximately the last two years of
            trading days and does not constitute financial advice.
          </p>

          <div className="stocks-field">
            <label htmlFor="ticker" className="stocks-label">
              Ticker
            </label>
            <div className="form-row">
              <input
                id="ticker"
                name="ticker"
                type="text"
                className="input"
                value={formValues.ticker}
                onChange={handleChange}
                placeholder="AAPL"
                maxLength={5}
              />
            </div>
          </div>

          <div className="stocks-field">
            <label htmlFor="date" className="stocks-label">
              Trade date (within last 2 years)
            </label>
            <div className="form-row">
              <input
                id="date"
                name="date"
                type="date"
                className="input"
                value={formValues.date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="stocks-field">
            <label htmlFor="amount" className="stocks-label">
              Amount invested (USD)
            </label>
            <div className="form-row">
              <input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                className="input"
                value={formValues.amount}
                onChange={handleChange}
                placeholder="1000"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="form-row stocks-submit-row">
            <button type="submit" className="action-button">
              {loading ? "Calculating..." : "Run backtest"}
            </button>
          </div>

          {error && <p className="stocks-error">{error}</p>}
        </form>

        {/* Side info panel (right / ~30%) */}
        <aside className="account-card stocks-side-panel">
          <h2 className="stocks-side-title">How this backtest works</h2>
          <p className="accounts-intro-text">
            Use this tool to sanity-check how a one-time lump sum would have
            performed, using daily adjusted closing prices.
          </p>
          <ul className="stocks-side-list">
            <li>
              Backtest window is limited to roughly the last{" "}
              <strong>two years</strong> due to the free data tier.
            </li>
            <li>
              Prices are <strong>adjusted for splits</strong> but exclude
              transaction costs and taxes.
            </li>
            <li>
              The tool shows the most recent <strong>dividend</strong> if one is
              available for the ticker.
            </li>
          </ul>
          <p className="accounts-intro-text">
            Treat this as an educational feature, not a recommendation to buy or
            sell any security.
          </p>
        </aside>
      </div>

      {/* Results section stays visually consistent with Dashboard cards */}
      {result && (
        <section className="quick-actions-section">
          <h2 className="recent-title">Your hypothetical return</h2>

          <div className="account-grid">
            {/* Summary card */}
            <div className="account-card">
              <div className="account-card-header-row">
                <div>
                  <div className="accounts-intro-text">Ticker</div>
                  <div className="account-balance">{result.ticker}</div>
                </div>
                <div>
                  <div className="accounts-intro-text">Shares</div>
                  <div className="account-number">
                    {formatNumber(result.shares, 4)}
                  </div>
                </div>
              </div>

              <p className="accounts-intro-text">
                You invested{" "}
                <strong>{formatCurrency(result.investedAmount)}</strong> on{" "}
                {result.purchaseDate} at{" "}
                {formatCurrency(result.purchaseClose)} per share.
              </p>
              <p className="accounts-intro-text">
                Latest close on {result.latestDate}:{" "}
                {formatCurrency(result.latestClose)} per share.
              </p>
            </div>

            {/* Performance card */}
            <div className="account-card">
              <div className="accounts-intro-text">Current value</div>
              <div className="account-balance">
                {formatCurrency(result.currentValue)}
              </div>

              <p className="accounts-intro-text">
                Total gain / loss:{" "}
                <span
                  className={
                    result.profit >= 0
                      ? "positive stocks-strong"
                      : "negative stocks-strong"
                  }
                >
                  {formatCurrency(result.profit)} (
                  {formatPercent(result.roi)})
                </span>
              </p>

              <p className="accounts-intro-text">
                Days held: <strong>{result.daysHeld}</strong>
                {result.annualizedReturn != null && (
                  <>
                    {" "}
                    • Annualized:{" "}
                    <span
                      className={
                        result.annualizedReturn >= 0
                          ? "positive stocks-strong"
                          : "negative stocks-strong"
                      }
                    >
                      {formatPercent(result.annualizedReturn)}
                    </span>
                  </>
                )}
              </p>

              {result.lastDividend && (
                <p className="accounts-intro-text">
                  Last dividend:{" "}
                  {formatCurrency(result.lastDividend.cash_amount)} per share
                  (ex-date {result.lastDividend.ex_dividend_date})
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
