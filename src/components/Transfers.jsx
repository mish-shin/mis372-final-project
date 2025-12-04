// src/components/Transfers.jsx
import { useEffect, useState } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
import "../styles.css";

export default function Transfers() {
  const { state, signIn, getBasicUserInfo } = useAuthContext();

  const [accounts, setAccounts] = useState([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load all accounts with balances for the logged-in user
  async function loadAccountsForUser() {
    try {
      const userInfo = await getBasicUserInfo();
      const userId = userInfo.sub; // must match user_id stored in DB

      // 1) Get list of accounts for this user
      const res = await fetch(
        `http://localhost:5000/api/accounts?user_id=${encodeURIComponent(
          userId
        )}`
      );
      const data = await res.json();
      const list = data || [];

      // 2) For each account, fetch details (to get balance)
      const accountsWithBalances = await Promise.all(
        list.map(async (acct) => {
          try {
            const resDetails = await fetch(
              `http://localhost:5000/api/accounts/${acct.account_id}`
            );
            const det = await resDetails.json();
            return { ...acct, balance: det.balance };
          } catch (err) {
            console.error("Failed to load details for account", acct.account_id, err);
            return { ...acct, balance: 0 };
          }
        })
      );

      setAccounts(accountsWithBalances);
    } catch (err) {
      console.error("Failed to load accounts for transfer:", err);
      setError("Unable to load accounts. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  // On login state change, load accounts
  useEffect(() => {
    if (state.isAuthenticated) {
      setLoading(true);
      loadAccountsForUser();
    } else {
      // follow same pattern as Dashboard: trigger login if needed
      signIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticated]);

  async function handleTransfer(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!fromAccountId || !toAccountId) {
      setError("Please select both a From and To account.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("From and To accounts must be different.");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a positive transfer amount.");
      return;
    }

    const fromAccount = accounts.find(
      (a) => a.account_id === Number(fromAccountId)
    );
    if (fromAccount && Number(fromAccount.balance) < numericAmount) {
      setError("Insufficient funds in the source account.");
      return;
    }

    setSubmitting(true);

    try {
      // 1️⃣ Withdraw from the "from" account
      const withdrawRes = await fetch(
        `http://localhost:5000/api/accounts/${fromAccountId}/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericAmount,
            description:
              description ||
              `Transfer to account #${toAccountId}`,
          }),
        }
      );

      if (!withdrawRes.ok) {
        const errData = await withdrawRes.json().catch(() => ({}));
        console.error("Withdraw (transfer) failed:", errData);
        setError(errData.error || "Transfer failed while withdrawing.");
        return;
      }

      // 2️⃣ Deposit into the "to" account
      const depositRes = await fetch(
        `http://localhost:5000/api/accounts/${toAccountId}/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericAmount,
            description:
              description ||
              `Transfer from account #${fromAccountId}`,
          }),
        }
      );

      if (!depositRes.ok) {
        const errData = await depositRes.json().catch(() => ({}));
        console.error("Deposit (transfer) failed:", errData);
        setError(
          errData.error || "Transfer failed while depositing into destination."
        );
        return;
      }

      setMessage("Transfer completed successfully.");
      setAmount("");
      setDescription("");

      // Reload balances so UI updates
      await loadAccountsForUser();
    } catch (err) {
      console.error("Transfer failed:", err);
      setError("Unexpected error performing transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="container">Loading accounts…</div>;
  }

  if (!accounts.length) {
    return (
      <div className="container">
        <h1 className="title">Transfers</h1>
        <p className="subtitle">
          You do not have any accounts yet to transfer between.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="title">Transfer between accounts</h1>
      <p className="subtitle">
        Move money from one of your accounts to another.
      </p>

      <form onSubmit={handleTransfer}>
        <div className="form-row">
          <label>From account</label>
          <select
            className="input"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map((acct) => (
              <option key={acct.account_id} value={acct.account_id}>
                {acct.name} •••• {acct.account_number.slice(-4)}{" "}
                {typeof acct.balance === "number" &&
                  `( $${Number(acct.balance).toFixed(2)} )`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>To account</label>
          <select
            className="input"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map((acct) => (
              <option key={acct.account_id} value={acct.account_id}>
                {acct.name} •••• {acct.account_number.slice(-4)}{" "}
                {typeof acct.balance === "number" &&
                  `( $${Number(acct.balance).toFixed(2)} )`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="form-row">
          <label>Description (optional)</label>
          <input
            type="text"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Move money to savings"
          />
        </div>

        {error && <p>{error}</p>}
        {message && <p>{message}</p>}

        <button
          type="submit"
          className="action-button"
          disabled={submitting}
        >
          {submitting ? "Transferring…" : "Submit transfer"}
        </button>
      </form>
    </div>
  );
}
