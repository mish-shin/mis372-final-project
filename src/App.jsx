// App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useAuthContext } from "@asgardeo/auth-react";
import Dashboard from "./components/Dashboard";
import "./styles.css";
import Transfers from "./components/Transfers";
import Header from "./components/Header";
import Assistant from "./components/Assistant";
import Stocks from "./components/Stocks";

function App() {
  const { state } = useAuthContext();

  return (
    <Router>
      <div className="app-container">
        <Header />
        {/* ------- PAGE CONTENT ------- */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/stocks" element={<Stocks />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
