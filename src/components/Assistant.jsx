import React, { useState } from "react";
import "../styles.css";
import { AIProjectClient } from "@azure/ai-projects";
import { useAuthContext } from "@asgardeo/auth-react";



export default function Assistant() {
  const { state } = useAuthContext();
  const userId = state?.sub || "";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const askAssistant = async (msg = question) => {
    if (!msg.trim()) return;

    setQuestion(msg);
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const endpoint = import.meta.env.VITE_PROJECT_ENDPOINT;
      const apiKey = import.meta.env.VITE_AZURE_API_KEY;
      const deployment =
        import.meta.env.VITE_MODEL_DEPLOYMENT_NAME ?? "bankapp-AI";

      const credential = {
        getToken: async () => ({
          token: apiKey,
          expiresOnTimestamp: Date.now() + 3600000
        })
      };

      const project = new AIProjectClient(endpoint, credential);
      const client = await project.getAzureOpenAIClient({
        apiVersion: "2024-12-01-preview"
      });

      const accountsRes = await fetch(
        `http://localhost:5001/api/accounts?user_id=${userId}`
      );

      const accounts = await accountsRes.json();
      if (!Array.isArray(accounts)) throw new Error("Failed to load accounts");

      for (const acc of accounts) {
        const detailRes = await fetch(
          `http://localhost:5001/api/accounts/${acc.account_id}`
        );
        const details = await detailRes.json();
        acc.balance = details.balance;
        acc.transactions = details.transactions;
      }

      const completion = await client.chat.completions.create({
        model: deployment,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful banking assistant. Always give clean, structured answers with bullet points or sections."
          },
          {
            role: "user",
            content: `User question: ${msg}\n\nHere is their account data:\n${JSON.stringify(
              accounts,
              null,
              2
            )}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      const responseText =
        completion.choices[0]?.message?.content?.trim() ?? "";

      setAnswer(responseText);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="container">
    <h1 className="title">AI Banking Assistant</h1>
    <p className="subtitle">
      Ask about balances, transactions, or account details.
    </p>

    {/* MAIN TWO-COLUMN LAYOUT */}
    <div className="assistant-layout">
      
      {/* LEFT SIDE */}
      <div className="assistant-left">

        <input
          className="input assistant-input"
          placeholder="Ask something like: What is happening with my accounts?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button
          className="action-button assistant-ask-button"
          onClick={() => askAssistant(question)}
          disabled={loading}
        >
          {loading ? "Thinking…" : "Ask"}
        </button>

        <h2 className="recent-title">Try asking:</h2>

        <div className="assistant-quick-grid">
          <button className="assistant-quick-button" onClick={() => askAssistant("What is my total balance?")}>
            What is my total balance?
          </button>
          <button className="assistant-quick-button" onClick={() => askAssistant("Summarize all my accounts.")}>
            Summarize all my accounts.
          </button>
          <button className="assistant-quick-button" onClick={() => askAssistant("Show only my deposits.")}>
            Show only my deposits.
          </button>
          <button className="assistant-quick-button" onClick={() => askAssistant("Show only withdrawals.")}>
            Show only withdrawals.
          </button>
          <button className="assistant-quick-button" onClick={() => askAssistant("What are my recent transactions?")}>
            What are my recent transactions?
          </button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="assistant-right">
        <div className="assistant-info-card">
          <h3 className="recent-title">How this assistant works</h3>
          <ul className="assistant-info-list">
            <li>Uses ONLY real data from your Aureality Bank accounts.</li>
            <li>Never guesses or fabricates information.</li>
            <li>Understands natural language questions.</li>
            <li>Summaries include balances, activity, and patterns.</li>
          </ul>
        </div>
      </div>
    </div>

    {/* RESPONSE PANEL */}
    <div className="assistant-section-divider"></div>

   <h2 className="assistant-response-title">Assistant Response</h2>

<div className="assistant-response-box">
  {error && <p className="assistant-error-text">{error}</p>}

  {!error && !answer && (
    <p className="assistant-placeholder">
      Your assistant’s answer will appear here…
    </p>
  )}
{answer && (
  <div
    className="assistant-answer"
    dangerouslySetInnerHTML={{
      __html: answer
        .replace(/\*\*(.*?)\*\*/g, "<span class='ai-bold'>$1</span>")
        .replace(/### (.*?)(\n|$)/g, "<div class='ai-heading'>$1</div>")
        .replace(/---/g, "<div class='ai-divider'></div>")
        .replace(/^- (.*)$/gm, "<div class='ai-bullet'>• $1</div>")
        .replace(/\n/g, "<br/>")
    }}
  />
)}

</div>
  </div>
);
}
