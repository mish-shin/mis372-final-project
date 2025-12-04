import { useEffect, useState } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
import "../styles.css";
import AccountCards from "./AccountCards";

export default function Dashboard() {
  const { state, signIn, getBasicUserInfo } = useAuthContext();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [showBalance, setShowBalance] = useState(true); // global balance visibility
  const [accounts, setAccounts] = useState([]); // all accounts for this user (with balance)
  const [selectedAccountId, setSelectedAccountId] = useState(null); // active account
  const [account, setAccount] = useState(null); // detailed active account
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const [newAccountName, setNewAccountName] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Delete account confirmation UI
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Load all accounts and their balances for the logged-in user
  async function loadAccountsForUser() {
    try {
      const userInfo = await getBasicUserInfo();
      const userId = userInfo.sub; // must match user_id stored in DB

      // 1) Get basic accounts list
      const res = await fetch(
        `${BACKEND_URL}/api/accounts?user_id=${encodeURIComponent(
          userId
        )}`
      );
      const data = await res.json();
      const list = data || [];

      // 2) For each account, fetch details (to get balance + transactions)
      const detailsById = {};
      const accountsWithBalances = await Promise.all(
        list.map(async (acct) => {
          try {
            const resDetails = await fetch(
              `${BACKEND_URL}/api/accounts/${acct.account_id}`
            );
            const det = await resDetails.json();
            detailsById[acct.account_id] = det;
            return { ...acct, balance: det.balance };
          } catch (err) {
            console.error(
              "Failed to load details for account",
              acct.account_id,
              err
            );
            return { ...acct, balance: 0 };
          }
        })
      );

      setAccounts(accountsWithBalances);

      if (accountsWithBalances.length > 0) {
        const ids = accountsWithBalances.map((a) => a.account_id);
        let accountIdToUse = selectedAccountId;
        if (!accountIdToUse || !ids.includes(accountIdToUse)) {
          accountIdToUse = accountsWithBalances[0].account_id;
        }

        setSelectedAccountId(accountIdToUse);
        const selectedDetails = detailsById[accountIdToUse];
        if (selectedDetails) {
          setAccount(selectedDetails);
          setTransactions(selectedDetails.transactions || []);
        }
      } else {
        setSelectedAccountId(null);
        setAccount(null);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoading(false);
    }
  }

  // Load a single account (details + balance) when user clicks a card or after actions
  async function loadAccountDetails(accountId) {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/accounts/${accountId}`
      );
      const data = await res.json();

      setAccount(data);
      setTransactions(data.transactions || []);

      // Patch this account's balance into the accounts list
      setAccounts((prev) =>
        prev.map((acct) =>
          acct.account_id === data.account_id
            ? { ...acct, balance: data.balance }
            : acct
        )
      );
    } catch (err) {
      console.error("Failed to load account:", err);
    }
  }

  // Handle selecting an account card from the child component
  const handleSelectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    loadAccountDetails(accountId);
  };

  // On login state change, load all accounts
  useEffect(() => {
    if (state.isAuthenticated) {
      setLoading(true);
      loadAccountsForUser();
    } else {
      setAccounts([]);
      setAccount(null);
      setTransactions([]);
      setSelectedAccountId(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticated]);

  async function handleDeposit(e) {
    e.preventDefault();
    const amount = Number(depositAmount);

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid deposit amount.");
      return;
    }

    if (!selectedAccountId) {
      alert("No account selected.");
      return;
    }

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/accounts/${selectedAccountId}/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: "Dashboard deposit",
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Deposit failed:", errData);
        alert(errData.error || "Deposit failed");
        return;
      }

      setDepositAmount("");
      await loadAccountDetails(selectedAccountId);
    } catch (err) {
      console.error("Deposit error:", err);
      alert("Deposit error");
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid withdraw amount.");
      return;
    }

    if (!selectedAccountId) {
      alert("No account selected.");
      return;
    }

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/accounts/${selectedAccountId}/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: "Dashboard withdraw",
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Withdraw failed:", errData);
        alert(errData.error || "Withdraw failed");
        return;
      }

      setWithdrawAmount("");
      await loadAccountDetails(selectedAccountId);
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("Withdraw error");
    }
  }

  // Create a new account and make it active
  async function handleCreateAccount(e) {
    e.preventDefault();

    if (!newAccountName.trim()) {
      alert("Please enter a name for the new account.");
      return;
    }

    try {
      setCreatingAccount(true);
      const userInfo = await getBasicUserInfo();
      const userId = userInfo.sub;

      const res = await fetch(`${BACKEND_URL}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: newAccountName.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Create account failed:", errData);
        alert(errData.error || "Failed to create account.");
        return;
      }

      const created = await res.json();
      setNewAccountName("");

      // Load details for the new account (to get its balance)
      await loadAccountDetails(created.account_id);

      // Add to local list; balance will be patched by loadAccountDetails
      setAccounts((prev) => [...prev, { ...created, balance: 0 }]);
      setSelectedAccountId(created.account_id);
    } catch (err) {
      console.error("Create account error:", err);
      alert("Error creating account.");
    } finally {
      setCreatingAccount(false);
    }
  }

  // Delete the currently selected account (with confirmation)
  async function handleDeleteAccount() {
    if (!account || !selectedAccountId) {
      alert("No account selected to delete.");
      return;
    }

    // require exact match of the account name
    if (deleteConfirmText.trim() !== account.name) {
      alert("Account name does not match. Please type it exactly to confirm.");
      return;
    }

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/accounts/${selectedAccountId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Delete account failed:", errData);
        alert(errData.error || "Failed to delete account.");
        return;
      }

      // Remove from local state
      const remaining = accounts.filter(
        (a) => a.account_id !== selectedAccountId
      );

      if (remaining.length === 0) {
        // No accounts left
        setAccounts([]);
        setAccount(null);
        setTransactions([]);
        setSelectedAccountId(null);
      } else {
        // Pick the first remaining as active
        const next = remaining[0];
        setAccounts(remaining);
        setSelectedAccountId(next.account_id);
        await loadAccountDetails(next.account_id);
      }

      // Reset delete UI
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } catch (err) {
      console.error("Delete account error:", err);
      alert("Error deleting account.");
    }
  }

  // Not logged in
if (!state.isAuthenticated) {
  return (
    <div className="container">
      <h1 className="title">Welcome</h1>
      <p className="subtitle">
        Sign in or create a new account to access your dashboard.
      </p>

      <button className="action-button" onClick={() => signIn()}>
        Log in / Sign up
      </button>
    </div>
  );
}


  if (loading) {
    return (
      <div className="container">
        <p>Loading your accounts...</p>
      </div>
    );
  }

  // Authenticated but no accounts yet
  if (!account) {
    return (
      <div className="container">
        <h1 className="title">Welcome!</h1>
        <p className="subtitle">
          You’re logged in, but no accounts were found for your user.
        </p>

        <div className="no-account-card">
          <h2 className="recent-title">Create your first account</h2>
          <form onSubmit={handleCreateAccount} className="form-row">
            <input
              type="text"
              placeholder="Account name (e.g. Main Checking)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="input"
            />
            <button
              type="submit"
              className="action-button"
              disabled={creatingAccount}
            >
              {creatingAccount ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🔢 Total balance across ALL accounts
  const totalBalance = accounts.reduce(
    (sum, acct) => sum + Number(acct.balance || 0),
    0
  );

  const activeAccountLabel = `${account.name} •••• ${account.account_number.slice(
    -4
  )}`;

  return (
    <div className="container">
      <h1 className="title">Welcome back!</h1>
      <p className="subtitle">Here’s what’s happening today.</p>

      {/* BLUE CARD: total balance of ALL accounts */}
      <div className="balance-card">
        <div className="balance-header">
          <div>
            <h3>Total Balance</h3>
            <p className="balance-subtitle">
              Sum of all your accounts (use the button to show/hide all
              balances)
            </p>
          </div>

          <button
            onClick={() => setShowBalance(!showBalance)}
            className="show-hide-button"
          >
            {showBalance ? "Hide all balances" : "Show all balances"}
          </button>
        </div>

        <p className="balance-amount">
          {showBalance
            ? `$${totalBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}`
            : "•••••"}
        </p>
      </div>

      {/* "Your Accounts" */}
      <h2 className="recent-title">Your Accounts</h2>

      <div className="accounts-intro-wrapper">
        <p className="accounts-intro-text">
          Click a card to set the active account. Deposits and withdrawals will
          apply to the active account.
        </p>
      </div>

      {/* Account Grid via component */}
      <AccountCards
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        showBalance={showBalance}
        onSelectAccount={handleSelectAccount}
      />

      {/* Quick Actions: 2-column layout */}
      <div className="quick-actions-section">
        <h2 className="recent-title">Quick Actions</h2>

        <p className="quick-actions-label">
          Performing actions on:{" "}
          <span className="quick-actions-active-name">
            {activeAccountLabel}
          </span>
        </p>

        <div className="quick-actions-grid">
          {/* LEFT COLUMN: Deposit / Withdraw */}
          <div className="quick-actions-column quick-actions-column-left">
            <form onSubmit={handleDeposit} className="form-row">
              <input
                type="number"
                step="0.01"
                placeholder="Deposit amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="input"
              />
              <button type="submit" className="action-button">
                Deposit
              </button>
            </form>

            <form onSubmit={handleWithdraw} className="form-row">
              <input
                type="number"
                step="0.01"
                placeholder="Withdraw amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="input"
              />
              <button type="submit" className="action-button">
                Withdraw
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Create Account / Delete Account */}
          <div className="quick-actions-column quick-actions-column-right">
            {/* Create Account */}
            <div className="create-account-section">
              <h3 className="create-account-title">Create New Account</h3>

              <form
                onSubmit={handleCreateAccount}
                className="create-account-form"
              >
                <input
                  type="text"
                  placeholder="New account name (e.g. Savings)"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="input"
                />
                <button
                  type="submit"
                  className="action-button"
                  disabled={creatingAccount}
                >
                  {creatingAccount ? "..." : "Add"}
                </button>
              </form>

              <p className="create-account-helper">
                Your new account will appear above immediately.
              </p>
            </div>

            {/* Delete Account */}
            <div className="delete-account-section">
              <h3 className="delete-account-title">Delete Active Account</h3>
              <p className="delete-account-helper">
                To permanently delete this account, click{" "}
                <strong>Delete this account</strong>, then type the account name
                exactly as shown: <strong>{account.name}</strong> and confirm.
              </p>

              {!showDeleteConfirm && (
                <button
                  type="button"
                  className="action-button delete-account-trigger"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteConfirmText("");
                  }}
                >
                  Delete this account
                </button>
              )}

              {showDeleteConfirm && (
                <div className="delete-account-panel">
                  <p className="delete-account-panel-text">
                    Type <strong>{account.name}</strong> below to confirm
                    deletion. This will remove the account and all of its
                    transactions.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="input delete-account-input"
                    placeholder={`Type "${account.name}" to confirm`}
                  />
                  <div className="delete-account-buttons">
                    <button
                      type="button"
                      className="action-button delete-account-confirm"
                      onClick={handleDeleteAccount}
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      className="action-button delete-account-cancel"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions for active account */}
      <h2 className="recent-title">Recent Transactions</h2>

      {[...transactions]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((tx) => (
          <div key={tx.transaction_id} className="transaction-row">
            <div>
              <strong>{tx.description || tx.transaction_type}</strong>
              <p className="tx-date">{tx.created_at.split("T")[0]}</p>
            </div>

            <p
              className={`tx-amount ${
                tx.transaction_type === "withdraw"
                  ? "tx-amount-withdraw"
                  : "tx-amount-deposit"
              }`}
            >
              {tx.transaction_type === "withdraw"
                ? `-${Number(tx.amount).toFixed(2)}`
                : `+${Number(tx.amount).toFixed(2)}`}
            </p>
          </div>
        ))}
    </div>
  );
}
