import { useAuthContext } from "@asgardeo/auth-react";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const { state, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/"); // Dashboard will show login screen
    }
  };

  return (
    <header className="app-header">
      <h1 className="app-title">Aureality Bank</h1>

      {state.isAuthenticated && (
        <>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/transfers" className="nav-link">Transfers</Link>
            <Link to="/assistant" className="nav-link">Assistant</Link>
            <Link to="/stocks" className="nav-link">Stocks</Link>
          </nav>

          <button
            type="button"
            className="header-signout-button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </>
      )}
    </header>
  );
}
