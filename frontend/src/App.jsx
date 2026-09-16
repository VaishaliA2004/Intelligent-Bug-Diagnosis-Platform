import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("analyze");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [textInput, setTextInput] = useState("");
  const [inputMode, setInputMode] = useState("file");

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("bugsense_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [knowledgeBugs, setKnowledgeBugs] = useState([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [knowledgeComponent, setKnowledgeComponent] =
  useState("All");
  const [knowledgeLoading, setKnowledgeLoading] =
  useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState([]);

  useEffect(() => {
    localStorage.setItem(
      "bugsense_history",
      JSON.stringify(history)
    );
  }, [history]);

  const getRiskScoreFromResult = (data) => {
    if (!data) return 0;

    let score = 20;

    if (data.triage?.severity === "Critical") {
      score += 35;
    } else if (data.triage?.severity === "Major") {
      score += 25;
    } else {
      score += 10;
    }

    if (data.duplicate_detection?.is_duplicate) {
      score += 20;
    }

    if (data.root_cause?.confidence === "High") {
      score += 15;
    } else if (data.root_cause?.confidence === "Medium") {
      score += 10;
    }

    if (data.remediation?.confidence === "High") {
      score += 10;
    }

    return Math.min(score, 100);
  };

  const riskScore = getRiskScoreFromResult(result);

  const getRiskLabel = (score) => {
    if (score >= 80) return "Critical Risk";
    if (score >= 60) return "High Risk";
    if (score >= 40) return "Moderate Risk";
    return "Low Risk";
  };

  const sampleCases = {
    payment: `Title: Payment Failure During Checkout
Priority: High
Exception: NullPointerException
File: PaymentService.java
Line: 142

Description:
Customer is unable to complete payment during checkout.

Stack Trace:
java.lang.NullPointerException
at com.shop.payment.PaymentService.processPayment(PaymentService.java:142)
at com.shop.checkout.CheckoutService.checkout(CheckoutService.java:87)`,

    login: `Title: Login Authentication Failure
Priority: High
Exception: AuthenticationException
File: AuthService.java
Line: 64

Description:
Users are unable to login even with valid credentials.

Stack Trace:
AuthenticationException: Invalid authentication token
at com.app.auth.AuthService.authenticate(AuthService.java:64)
at com.app.login.LoginController.login(LoginController.java:32)`,

    database: `Title: Database Connection Failure
Priority: Medium
Exception: SQLException
File: DatabaseService.java
Line: 91

Description:
Application cannot establish a connection to the database.

Stack Trace:
java.sql.SQLException: Connection timeout
at com.app.database.DatabaseService.connect(DatabaseService.java:91)
at com.app.service.UserService.loadUsers(UserService.java:45)`,
  };

  const saveToHistory = (data, filename) => {
    const score = getRiskScoreFromResult(data);

    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      filename,
      title: data.bug?.title || "Untitled Bug",
      severity: data.triage?.severity || "Unknown",
      priority: data.triage?.priority || "Unknown",
      component: data.triage?.component || "Unknown",
      exception:
        data.log_analysis?.exception_type || "Unknown",
      failurePoint:
        data.log_analysis?.failure_point || "Unknown",
      duplicate:
        data.duplicate_detection?.is_duplicate || false,
      riskScore: score,
      rootCause:
        data.root_cause?.root_cause || "",
      recommendedFix:
        data.remediation?.recommended_fix || "",
    };

    setHistory((prev) => [
      historyItem,
      ...prev,
    ]);
  };

  const analyzeBug = async () => {
    if (!file) {
      setError(
        "Please upload a TXT or PDF bug report."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze-bug",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Bug analysis failed."
        );
      }

      setResult(data);

      saveToHistory(
        data,
        data.filename || file.name
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTextBug = async () => {
    if (!textInput.trim()) {
      setError("Please enter bug details.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze-text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textInput,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Bug analysis failed."
        );
      }

      setResult(data);

      saveToHistory(
        data,
        "Direct Text Input"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalBugs = history.length;

  const criticalBugs = history.filter(
    (bug) => bug.severity === "Critical"
  ).length;

  const duplicateBugs = history.filter(
    (bug) => bug.duplicate
  ).length;

  const averageRisk =
    history.length > 0
      ? Math.round(
          history.reduce(
            (sum, bug) =>
              sum + Number(bug.riskScore || 0),
            0
          ) / history.length
        )
      : 0;

  const filteredHistory = history.filter(
    (bug) => {
      const title =
        bug.title?.toLowerCase() || "";
      const component =
        bug.component?.toLowerCase() || "";
      const exception =
        bug.exception?.toLowerCase() || "";

      const search =
        searchTerm.toLowerCase();

      const matchesSearch =
        title.includes(search) ||
        component.includes(search) ||
        exception.includes(search);

      const matchesSeverity =
        severityFilter === "All" ||
        bug.severity === severityFilter;

      return (
        matchesSearch &&
        matchesSeverity
      );
    }
  );

  const clearHistory = () => {
    const confirmClear = window.confirm(
      "Clear all saved bug history?"
    );

    if (confirmClear) {
      setHistory([]);
    }
  };

  const loadKnowledgeBase = async () => {
  setKnowledgeLoading(true);

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/knowledge-base"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
          "Unable to load knowledge base."
      );
    }

    setKnowledgeBugs(data.bugs || []);
  } catch (err) {
    setError(err.message);
  } finally {
    setKnowledgeLoading(false);
  }
};

useEffect(() => {
  loadKnowledgeBase();
}, []);

const knowledgeComponents = [
  "All",
  ...new Set(
    knowledgeBugs.map(
      (bug) => bug.component
    )
  ),
];

const filteredKnowledgeBugs =
  knowledgeBugs.filter((bug) => {
    const search =
      knowledgeSearch.toLowerCase();

    const matchesSearch =
      bug.id
        ?.toLowerCase()
        .includes(search) ||
      bug.title
        ?.toLowerCase()
        .includes(search) ||
      bug.exception
        ?.toLowerCase()
        .includes(search) ||
      bug.root_cause
        ?.toLowerCase()
        .includes(search);

    const matchesComponent =
      knowledgeComponent === "All" ||
      bug.component === knowledgeComponent;

    return (
      matchesSearch &&
      matchesComponent
    );
  });

  const askAssistant = () => {
  const question = assistantQuestion.trim();

  if (!question) {
    return;
  }

  let answer =
    "I can help explain the latest bug diagnosis. Please analyze a bug first.";

  if (result) {
    const q = question.toLowerCase();

    if (
      q.includes("root cause") ||
      q.includes("cause") ||
      q.includes("why")
    ) {
      answer =
        result.root_cause?.root_cause ||
        "Root cause information is not available.";
    } else if (
      q.includes("fix") ||
      q.includes("solution") ||
      q.includes("resolve") ||
      q.includes("remediation")
    ) {
      answer =
        result.remediation?.recommended_fix ||
        "A remediation recommendation is not available.";
    } else if (
      q.includes("duplicate") ||
      q.includes("similar")
    ) {
      answer = result.duplicate_detection
        ?.is_duplicate
        ? `Yes. This bug appears to be a duplicate. ${
            result.duplicate_detection?.message || ""
          }`
        : `No strong duplicate was detected. ${
            result.duplicate_detection?.message || ""
          }`;
    } else if (
      q.includes("exception") ||
      q.includes("error")
    ) {
      answer = `Detected exception: ${
        result.log_analysis?.exception_type || "Unknown"
      }.`;
    } else if (
      q.includes("failure") ||
      q.includes("where") ||
      q.includes("line")
    ) {
      answer = `The detected failure point is ${
        result.log_analysis?.failure_point || "Unknown"
      }.`;
    } else if (
      q.includes("severity") ||
      q.includes("priority")
    ) {
      answer = `Severity is ${
        result.triage?.severity || "Unknown"
      } and priority is ${
        result.triage?.priority || "Unknown"
      }.`;
    } else if (
      q.includes("component") ||
      q.includes("module")
    ) {
      answer = `The affected component is ${
        result.triage?.component || "Unknown"
      }.`;
    } else if (
      q.includes("test") ||
      q.includes("testing")
    ) {
      answer =
        result.remediation?.testing_recommendation ||
        "No testing recommendation is available.";
    } else if (
      q.includes("prevent") ||
      q.includes("prevention")
    ) {
      answer =
        result.remediation?.prevention ||
        "No prevention recommendation is available.";
    } else if (
      q.includes("confidence")
    ) {
      answer = `Root-cause confidence: ${
        result.root_cause?.confidence || "Unknown"
      }. Remediation confidence: ${
        result.remediation?.confidence || "Unknown"
      }.`;
    } else if (
      q.includes("summary") ||
      q.includes("explain")
    ) {
      answer = `${result.bug?.title || "This bug"} has severity ${
        result.triage?.severity || "Unknown"
      } and affects ${
        result.triage?.component || "an unknown component"
      }. The detected exception is ${
        result.log_analysis?.exception_type || "Unknown"
      }, with failure point ${
        result.log_analysis?.failure_point || "Unknown"
      }. The likely root cause is ${
        result.root_cause?.root_cause || "not available"
      }. Recommended fix: ${
        result.remediation?.recommended_fix || "not available"
      }.`;
    } else {
      answer = `Latest diagnosis summary:

Root Cause: ${
        result.root_cause?.root_cause || "Unknown"
      }

Recommended Fix: ${
        result.remediation?.recommended_fix || "Unknown"
      }

Failure Point: ${
        result.log_analysis?.failure_point || "Unknown"
      }

You can ask me specifically about root cause, fix, duplicate status, severity, failure point, testing or prevention.`;
    }
  }

  setAssistantMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      role: "user",
      text: question,
    },
    {
      id: Date.now() + 1,
      role: "assistant",
      text: answer,
    },
  ]);

  setAssistantQuestion("");
};

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>BugSense AI</h2>
          <p>Diagnosis Platform</p>
        </div>

        <nav>
          <NavButton
            label="Analyze Bug"
            active={activePage === "analyze"}
            onClick={() =>
              setActivePage("analyze")
            }
          />

          <NavButton
            label="Dashboard"
            active={activePage === "dashboard"}
            onClick={() =>
              setActivePage("dashboard")
            }
          />

          <NavButton
            label="Bug History"
            active={activePage === "history"}
            onClick={() =>
              setActivePage("history")
            }
          />

          <NavButton
            label="Reports"
            active={activePage === "reports"}
            onClick={() =>
              setActivePage("reports")
            }
          />

          <NavButton
            label="Knowledge Base"
            active={activePage === "knowledge"}
            onClick={() =>
              setActivePage("knowledge")
            }
          />

          <NavButton
            label="AI Assistant"
            active={activePage === "assistant"}
            onClick={() =>
              setActivePage("assistant")
            }
          />
        </nav>
      </aside>

      <div className="content-area">
        <header>
          <div>
            <h1>BugSense AI</h1>

            <p>
              Intelligent Bug Diagnosis & Fix
              Recommendation Platform
            </p>
          </div>

          <span className="status">
            ● System Ready
          </span>
        </header>

        <main>
          {activePage === "analyze" && (
            <>
              <section className="upload-card">
                <h2>Analyze Bug Report</h2>

                <p>
                  Upload a TXT/PDF bug report or
                  enter bug details directly to run
                  the multi-agent diagnostic
                  pipeline.
                </p>

                <div className="input-mode-tabs">
                  <button
                    className={
                      inputMode === "file"
                        ? "mode-button active"
                        : "mode-button"
                    }
                    onClick={() => {
                      setInputMode("file");
                      setError("");
                    }}
                  >
                    Upload File
                  </button>

                  <button
                    className={
                      inputMode === "text"
                        ? "mode-button active"
                        : "mode-button"
                    }
                    onClick={() => {
                      setInputMode("text");
                      setError("");
                    }}
                  >
                    Enter Bug Details
                  </button>
                </div>

                {inputMode === "file" && (
                  <>
                    <input
                      type="file"
                      accept=".txt,.pdf"
                      onChange={(e) => {
                        const selectedFile =
                          e.target.files[0];

                        setFile(selectedFile);
                        setError("");
                        setResult(null);
                      }}
                    />

                    {file && (
                      <p className="filename">
                        Selected: {file.name}
                      </p>
                    )}

                    <button
                      onClick={analyzeBug}
                      disabled={loading}
                    >
                      {loading
                        ? "Analyzing Bug..."
                        : "Run Intelligent Analysis"}
                    </button>
                  </>
                )}

                {inputMode === "text" && (
                  <>
                    <textarea
                      className="bug-textarea"
                      rows="12"
                      placeholder="Paste bug title, description, logs or stack trace here..."
                      value={textInput}
                      onChange={(e) =>
                        setTextInput(
                          e.target.value
                        )
                      }
                    />

                    <div className="sample-section">
                      <span>
                        Sample Cases:
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setTextInput(
                            sampleCases.payment
                          );
                          setResult(null);
                          setError("");
                        }}
                      >
                        Payment Bug
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTextInput(
                            sampleCases.login
                          );
                          setResult(null);
                          setError("");
                        }}
                      >
                        Login Bug
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTextInput(
                            sampleCases.database
                          );
                          setResult(null);
                          setError("");
                        }}
                      >
                        Database Bug
                      </button>
                    </div>

                    <div className="text-action-row">
                      <button
                        onClick={analyzeTextBug}
                        disabled={loading}
                      >
                        {loading
                          ? "Analyzing Bug..."
                          : "Run Intelligent Analysis"}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setTextInput("");
                          setResult(null);
                          setError("");
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}

                {error && (
                  <div className="error">
                    {error}
                  </div>
                )}
              </section>

              <section className="pipeline">
                <h2>
                  Multi-Agent Diagnostic Pipeline
                </h2>

                <div className="agent-row">
                  <span>
                    1. Triage Agent
                  </span>

                  <span>
                    2. Log Analysis
                  </span>

                  <span>
                    3. Root Cause
                  </span>

                  <span>
                    4. Duplicate Detection
                  </span>

                  <span>
                    5. Remediation
                  </span>
                </div>
              </section>

              {result && (
                <section className="results">
                  <h2>
                    Analysis Results
                  </h2>

                  <div className="summary">
                    <h3>
                      {result.bug?.title ||
                        "Bug Analysis"}
                    </h3>

                    <div className="badges">
                      <span>
                        Severity:{" "}
                        {result.triage
                          ?.severity ||
                          "Unknown"}
                      </span>

                      <span>
                        Priority:{" "}
                        {result.triage
                          ?.priority ||
                          "Unknown"}
                      </span>

                      <span>
                        Component:{" "}
                        {result.triage
                          ?.component ||
                          "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="creative-grid">
                    <div className="risk-card">
                      <h3>
                        Bug Risk Intelligence
                      </h3>

                      <div className="risk-score">
                        {riskScore}/100
                      </div>

                      <strong>
                        {getRiskLabel(
                          riskScore
                        )}
                      </strong>

                      <div className="risk-bar">
                        <div
                          className="risk-fill"
                          style={{
                            width: `${riskScore}%`,
                          }}
                        />
                      </div>

                      <p>
                        Risk score is calculated
                        using bug severity,
                        root-cause confidence,
                        remediation confidence and
                        historical duplicate
                        information.
                      </p>
                    </div>

                    <div className="action-card">
                      <h3>
                        Developer Action Plan
                      </h3>

                      <label>
                        <input
                          type="checkbox"
                        />
                        Review failure point:{" "}
                        {result.log_analysis
                          ?.failure_point ||
                          "Unknown"}
                      </label>

                      <label>
                        <input
                          type="checkbox"
                        />
                        Apply recommended
                        remediation
                      </label>

                      <label>
                        <input
                          type="checkbox"
                        />
                        Add regression test for
                        this defect
                      </label>

                      <label>
                        <input
                          type="checkbox"
                        />
                        Add preventive validation
                        and error handling
                      </label>

                      {result
                        .duplicate_detection
                        ?.is_duplicate && (
                        <label>
                          <input
                            type="checkbox"
                          />
                          Review historical
                          duplicate resolution
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid">
                    <ResultCard title="Triage Agent">
                      <p>
                        {result.triage
                          ?.reasoning ||
                          "No reasoning available."}
                      </p>
                    </ResultCard>

                    <ResultCard title="Log Analysis Agent">
                      <p>
                        <strong>
                          Exception:
                        </strong>{" "}
                        {result.log_analysis
                          ?.exception_type ||
                          "Unknown"}
                      </p>

                      <p>
                        <strong>
                          Failure Point:
                        </strong>{" "}
                        {result.log_analysis
                          ?.failure_point ||
                          "Unknown"}
                      </p>
                    </ResultCard>

                    <ResultCard title="Root Cause Agent">
                      <p>
                        {result.root_cause
                          ?.root_cause ||
                          "No root cause available."}
                      </p>

                      <p>
                        <strong>
                          Confidence:
                        </strong>{" "}
                        {result.root_cause
                          ?.confidence ||
                          "Unknown"}
                      </p>
                    </ResultCard>

                    <ResultCard title="Duplicate Detection Agent">
                      <p>
                        {result
                          .duplicate_detection
                          ?.message ||
                          "No duplicate information available."}
                      </p>

                      <p>
                        <strong>
                          Duplicate:
                        </strong>{" "}
                        {result
                          .duplicate_detection
                          ?.is_duplicate
                          ? "Yes"
                          : "No"}
                      </p>

                      <p>
                        <strong>
                          Confidence:
                        </strong>{" "}
                        {result
                          .duplicate_detection
                          ?.confidence ||
                          "Unknown"}
                      </p>
                    </ResultCard>

                    <ResultCard title="Remediation Agent">
                      <p>
                        <strong>
                          Recommended Fix:
                        </strong>{" "}
                        {result.remediation
                          ?.recommended_fix ||
                          "Not available"}
                      </p>

                      <p>
                        <strong>
                          Prevention:
                        </strong>{" "}
                        {result.remediation
                          ?.prevention ||
                          "Not available"}
                      </p>

                      <p>
                        <strong>
                          Testing:
                        </strong>{" "}
                        {result.remediation
                          ?.testing_recommendation ||
                          "Not available"}
                      </p>

                      <p>
                        <strong>
                          Confidence:
                        </strong>{" "}
                        {result.remediation
                          ?.confidence ||
                          "Unknown"}
                      </p>
                    </ResultCard>
                  </div>
                </section>
              )}
            </>
          )}

          {activePage === "dashboard" && (
            <Dashboard
              history={history}
              totalBugs={totalBugs}
              criticalBugs={criticalBugs}
              duplicateBugs={duplicateBugs}
              averageRisk={averageRisk}
            />
          )}

          {activePage === "history" && (
            <HistoryPage
              history={filteredHistory}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              severityFilter={severityFilter}
              setSeverityFilter={
                setSeverityFilter
              }
              clearHistory={clearHistory}
            />
          )}

          {activePage === "reports" && (
            <PlaceholderPage
              title="Reports"
              text="Diagnostic summaries and analysis reports will appear here."
            />
          )}

          {activePage === "knowledge" && (
            <KnowledgeBasePage
              bugs={filteredKnowledgeBugs}
              totalBugs={knowledgeBugs.length}
              search={knowledgeSearch}
              setSearch={setKnowledgeSearch}
              component={knowledgeComponent}
              setComponent={setKnowledgeComponent}
              components={knowledgeComponents}
              loading={knowledgeLoading}
            />
          )}

          {activePage === "assistant" && (
            <AssistantPage
              result={result}
              question={assistantQuestion}
              setQuestion={setAssistantQuestion}
              messages={assistantMessages}
              onAsk={askAssistant}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Dashboard({
  history,
  totalBugs,
  criticalBugs,
  duplicateBugs,
  averageRisk,
}) {
  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Dashboard</h2>

          <p>
            Overview of recent bug diagnosis
            activity.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Analyses"
          value={totalBugs}
        />

        <StatCard
          title="Critical Bugs"
          value={criticalBugs}
        />

        <StatCard
          title="Duplicates Found"
          value={duplicateBugs}
        />

        <StatCard
          title="Average Risk"
          value={`${averageRisk}/100`}
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Recent Analyses</h3>

          {history.length === 0 ? (
            <p className="empty-text">
              No bug analyses yet.
            </p>
          ) : (
            history
              .slice(0, 5)
              .map((bug) => (
                <div
                  className="recent-item"
                  key={bug.id}
                >
                  <div>
                    <strong>
                      {bug.title}
                    </strong>

                    <p>
                      {bug.component} ·{" "}
                      {bug.timestamp}
                    </p>
                  </div>

                  <span className="severity-pill">
                    {bug.severity}
                  </span>
                </div>
              ))
          )}
        </div>

        <div className="dashboard-card">
          <h3>Pipeline Status</h3>

          <PipelineStatus
            name="Triage Agent"
          />

          <PipelineStatus
            name="Log Analysis Agent"
          />

          <PipelineStatus
            name="Root Cause Agent"
          />

          <PipelineStatus
            name="Duplicate Detection Agent"
          />

          <PipelineStatus
            name="Remediation Agent"
          />
        </div>
      </div>
    </section>
  );
}

function HistoryPage({
  history,
  searchTerm,
  setSearchTerm,
  severityFilter,
  setSeverityFilter,
  clearHistory,
}) {
  return (
    <section>
      <div className="page-title history-heading">
        <div>
          <h2>Bug History</h2>

          <p>
            Search and review previous bug
            analyses.
          </p>
        </div>

        <button
          className="danger-button"
          onClick={clearHistory}
        >
          Clear History
        </button>
      </div>

      <div className="history-controls">
        <input
          type="text"
          placeholder="Search title, component or exception..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
        />

        <select
          value={severityFilter}
          onChange={(e) =>
            setSeverityFilter(
              e.target.value
            )
          }
        >
          <option value="All">
            All Severities
          </option>

          <option value="Critical">
            Critical
          </option>

          <option value="Major">
            Major
          </option>

          <option value="Minor">
            Minor
          </option>
        </select>
      </div>

      {history.length === 0 ? (
        <div className="page-card">
          <p className="empty-text">
            No matching bug analyses found.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((bug) => (
            <div
              className="history-card"
              key={bug.id}
            >
              <div className="history-top">
                <div>
                  <h3>
                    {bug.title}
                  </h3>

                  <p>
                    {bug.timestamp}
                  </p>
                </div>

                <span className="severity-pill">
                  {bug.severity}
                </span>
              </div>

              <div className="history-details">
                <span>
                  <strong>
                    Component:
                  </strong>{" "}
                  {bug.component}
                </span>

                <span>
                  <strong>
                    Exception:
                  </strong>{" "}
                  {bug.exception}
                </span>

                <span>
                  <strong>
                    Risk:
                  </strong>{" "}
                  {bug.riskScore}/100
                </span>

                <span>
                  <strong>
                    Duplicate:
                  </strong>{" "}
                  {bug.duplicate
                    ? "Yes"
                    : "No"}
                </span>
              </div>

              <div className="history-insight">
                <p>
                  <strong>
                    Root Cause:
                  </strong>{" "}
                  {bug.rootCause}
                </p>

                <p>
                  <strong>
                    Recommended Fix:
                  </strong>{" "}
                  {bug.recommendedFix}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}

function PipelineStatus({ name }) {
  return (
    <div className="pipeline-status">
      <span>{name}</span>
      <strong>Operational</strong>
    </div>
  );
}

function NavButton({
  label,
  active,
  onClick,
}) {
  return (
    <button
      className={`nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function KnowledgeBasePage({
  bugs,
  totalBugs,
  search,
  setSearch,
  component,
  setComponent,
  components,
  loading,
}) {
  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Knowledge Base</h2>

          <p>
            Historical resolved bugs used by the
            diagnosis and retrieval pipeline.
          </p>
        </div>

        <div className="knowledge-count">
          {totalBugs} Resolved Bugs
        </div>
      </div>

      <div className="knowledge-controls">
        <input
          type="text"
          placeholder="Search bug ID, title, exception or root cause..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={component}
          onChange={(e) =>
            setComponent(
              e.target.value
            )
          }
        >
          {components.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item === "All"
                ? "All Components"
                : item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="page-card">
          <p>
            Loading historical bug knowledge...
          </p>
        </div>
      ) : bugs.length === 0 ? (
        <div className="page-card">
          <p className="empty-text">
            No matching historical bugs found.
          </p>
        </div>
      ) : (
        <div className="knowledge-grid">
          {bugs.map((bug) => (
            <div
              className="knowledge-card"
              key={bug.id}
            >
              <div className="knowledge-top">
                <span className="bug-id">
                  {bug.id}
                </span>

                <span className="knowledge-component">
                  {bug.component}
                </span>
              </div>

              <h3>
                {bug.title}
              </h3>

              <p>
                <strong>
                  Exception:
                </strong>{" "}
                {bug.exception}
              </p>

              <p>
                <strong>
                  Description:
                </strong>{" "}
                {bug.description}
              </p>

              <div className="knowledge-insight">
                <p>
                  <strong>
                    Root Cause
                  </strong>
                </p>

                <p>
                  {bug.root_cause}
                </p>
              </div>

              <div className="knowledge-resolution">
                <p>
                  <strong>
                    Resolution
                  </strong>
                </p>

                <p>
                  {bug.resolution}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AssistantPage({
  result,
  question,
  setQuestion,
  messages,
  onAsk,
}) {
  return (
    <section>
      <div className="page-title">
        <div>
          <h2>AI Assistant</h2>

          <p>
            Ask follow-up questions about the latest
            bug diagnosis.
          </p>
        </div>
      </div>

      {!result && (
        <div className="assistant-notice">
          Analyze a bug first so the assistant can
          answer using diagnosis results.
        </div>
      )}

      {result && (
        <div className="assistant-context">
          <strong>Current Bug:</strong>{" "}
          {result.bug?.title || "Bug Analysis"}
        </div>
      )}

      <div className="assistant-suggestions">
        <button
          onClick={() =>
            setQuestion(
              "What is the root cause?"
            )
          }
        >
          Root Cause
        </button>

        <button
          onClick={() =>
            setQuestion(
              "How do I fix this bug?"
            )
          }
        >
          Recommended Fix
        </button>

        <button
          onClick={() =>
            setQuestion(
              "Is this bug a duplicate?"
            )
          }
        >
          Duplicate Check
        </button>

        <button
          onClick={() =>
            setQuestion(
              "What should I test?"
            )
          }
        >
          Testing
        </button>

        <button
          onClick={() =>
            setQuestion(
              "Give me a summary."
            )
          }
        >
          Summary
        </button>
      </div>

      <div className="assistant-chat">
        {messages.length === 0 ? (
          <p className="empty-text">
            No conversation yet.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`assistant-message ${message.role}`}
            >
              <strong>
                {message.role === "user"
                  ? "You"
                  : "BugSense AI"}
              </strong>

              <p>
                {message.text}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="assistant-input-row">
        <input
          type="text"
          value={question}
          placeholder="Ask about root cause, fix, duplicate, testing..."
          onChange={(e) =>
            setQuestion(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAsk();
            }
          }}
        />

        <button
          onClick={onAsk}
        >
          Ask Assistant
        </button>
      </div>
    </section>
  );
}

function PlaceholderPage({
  title,
  text,
}) {
  return (
    <section className="page-card">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function ResultCard({
  title,
  children,
}) {
  return (
    <div className="result-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default App;