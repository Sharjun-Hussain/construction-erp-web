"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const fmt = (n, c = "SAR") => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function DeadlineChip({ d }) {
  if (!d) return <span style={{ color: "#94a3b8" }}>—</span>;
  if (d.overdue) return <span className="tl-chip over">Overdue {Math.abs(d.days_remaining)}d</span>;
  if (d.urgent) return <span className="tl-chip hot">{d.days_remaining}d left</span>;
  return <span className="tl-chip">{d.days_remaining}d left</span>;
}

const CONTRACT_TYPES = ["LumpSum", "UnitRate", "CostPlus", "GMP"];
const TENDER_TYPES = ["Open", "Selective", "Limited", "Negotiated"];
const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];
const BOND_STATUSES = ["None", "Pending", "Issued", "Released", "Forfeited"];

export default function TendersPage() {
  const router = useRouter();
  const { lang, projectId } = useAppStore();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortBy, setSortBy] = useState("submission_deadline");
  const [sortDir, setSortDir] = useState("ASC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [contractType, setContractType] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [pid, setPid] = useState(projectId || "");
  const [currentView, setCurrentView] = useState("all");

  // Metadata
  const [projects, setProjects] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [stats, setStats] = useState(null);

  // New Tender Drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState("sec-general");
  const [busy, setBusy] = useState(false);

  const initialForm = {
    number: "",
    reference: "",
    title: "",
    project_id: pid || "",
    estimation_id: "",
    client_name: "",
    consultant_name: "",
    contract_type: "LumpSum",
    tender_type: "Open",
    currency: "SAR",
    bid_amount: 0,
    cost_amount: 0,
    contingency_pct: 5,
    escalation_pct: 0,
    probability: 60,
    issue_date: new Date().toISOString().slice(0, 10),
    submission_deadline: "",
    validity_date: "",
    bond_type: "Bank Guarantee",
    bond_amount: 0,
    bond_expiry: "",
    bond_status: "None",
    scope: "",
    notes: "",
  };
  const [form, setForm] = useState(initialForm);

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (statusFilter) q.push("status=" + statusFilter);
    if (contractType) q.push("contract_type=" + contractType);
    if (deadlineFilter) q.push("deadline=" + deadlineFilter);
    if (pid) q.push("project_id=" + pid);

    api
      .get("/tenders?" + q.join("&"))
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadStats = () => {
    api
      .get("/tenders/analytics")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    api.get("/estimations?limit=100").then((r) => setEstimations(r.data.data || [])).catch(() => {});
    load(1, limit, sortBy, sortDir);
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected([]);
    load(1, limit, sortBy, sortDir);
  }, [statusFilter, contractType, deadlineFilter, pid]);

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k);
    setSortDir(nd);
    load(page, limit, k, nd);
  };

  // Auto-generate Tender Number
  const autoGenerateNumber = () => {
    const yr = new Date().getFullYear();
    const rnd = String(Math.floor(100 + Math.random() * 900));
    setForm((prev) => ({ ...prev, number: `TND-${yr}-${rnd}` }));
  };

  // When project changes in drawer, autofill client, consultant, title
  const handleProjectSelect = (projectId) => {
    const p = projects.find((proj) => proj.id === projectId);
    setForm((prev) => ({
      ...prev,
      project_id: projectId,
      client_name: p?.client_name || prev.client_name,
      consultant_name: p?.consultant_name || prev.consultant_name,
      title: p?.name ? `Tender Bid - ${p.name}` : prev.title,
    }));
  };

  // When estimation changes, autofill cost amount
  const handleEstimationSelect = (estId) => {
    const est = estimations.find((e) => e.id === estId);
    setForm((prev) => ({
      ...prev,
      estimation_id: estId,
      cost_amount: est ? Number(est.total_cost || 0) : prev.cost_amount,
      bid_amount: est && !prev.bid_amount ? Number(est.selling_price || est.total_cost || 0) : prev.bid_amount,
    }));
  };

  // Submit Tender create
  const create = async (e) => {
    e.preventDefault();
    if (!form.number) return;
    setBusy(true);
    setMsg("");
    setOk("");
    try {
      const payload = { ...form };
      for (const k of ["bid_amount", "cost_amount", "contingency_pct", "escalation_pct", "bond_amount", "probability"]) {
        payload[k] = Number(payload[k] || 0);
      }
      for (const k of [
        "estimation_id",
        "project_id",
        "issue_date",
        "submission_deadline",
        "validity_date",
        "bond_expiry",
        "bond_type",
        "consultant_name",
        "reference",
        "scope",
        "notes",
      ]) {
        if (!payload[k]) delete payload[k];
      }

      const r = await api.post("/tenders", payload);
      setShowDrawer(false);
      setForm(initialForm);
      router.push(`/tenders/${r.data.data.id}`);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create tender");
    } finally {
      setBusy(false);
    }
  };

  // Fast decision action
  const decision = async (id, st, reason) => {
    setMsg("");
    setOk("");
    try {
      await api.post(`/tenders/${id}/decision`, { status: st, reason_lost: reason });
      setOk(`Tender marked as ${st}`);
      load();
      loadStats();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Operation failed");
    }
  };

  // Bulk decision
  const bulkDecision = (st) => {
    if (!window.confirm(`Mark ${selected.length} tender(s) as ${st}?`)) return;
    Promise.all(
      selected.map((t) =>
        api.post(`/tenders/${t.id}/decision`, {
          status: st,
          reason_lost: st === "Lost" ? "Bulk loss update" : undefined,
        })
      )
    )
      .then(() => {
        setOk(`${selected.length} tender(s) marked ${st}`);
        setSelected([]);
        load();
        loadStats();
      })
      .catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };

  // Filter Views definition for DataTable
  const views = useMemo(() => {
    const tot = stats?.totals;
    return [
      { key: "all", label: "All Tenders", count: total },
      { key: "pipeline", label: "Active Pipeline", count: tot?.open || 0 },
      { key: "submitted", label: "Submitted Bids" },
      { key: "won", label: "Won / Awarded", count: tot?.won || 0 },
      { key: "closing", label: "Closing Soon (≤14d)" },
      { key: "draft", label: "Draft Takeoffs" },
      { key: "lost", label: "Lost / Closed" },
    ];
  }, [total, stats]);

  const handleViewChange = (vKey) => {
    setCurrentView(vKey);
    setPage(1);
    if (vKey === "all") {
      setStatusFilter("");
      setDeadlineFilter("");
    } else if (vKey === "pipeline") {
      setStatusFilter(""); // We can fetch both or filter
      setDeadlineFilter("");
    } else if (vKey === "submitted") {
      setStatusFilter("Submitted");
      setDeadlineFilter("");
    } else if (vKey === "won") {
      setStatusFilter("Won");
      setDeadlineFilter("");
    } else if (vKey === "closing") {
      setStatusFilter("");
      setDeadlineFilter("14");
    } else if (vKey === "draft") {
      setStatusFilter("Draft");
      setDeadlineFilter("");
    } else if (vKey === "lost") {
      setStatusFilter("Lost");
      setDeadlineFilter("");
    }
  };

  // DataTable columns
  const columns = [
    {
      key: "number",
      label: "Tender Ref & Number",
      sortable: true,
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar
            name={t.number}
            subline={`${t.title || "Untitled Bidding Project"}${t.reference ? " · Ref: " + t.reference : ""}`}
            size={34}
            color="#0284c7"
          />
        </div>
      ),
    },
    {
      key: "client_name",
      label: "Client & Project",
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 650, color: "#0f172a" }}>{t.client_name || t.client?.name || "Private Client"}</div>
          <div style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            {t.project ? (
              <span style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                {t.project.code}
              </span>
            ) : null}
            <span>{t.project?.name || "Unlinked Project"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "contract_type",
      label: "Contract & Method",
      sortable: true,
      render: (t) => (
        <div>
          <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>{t.contract_type}</span>
          <div style={{ fontSize: 11, color: "#64748b" }}>{t.tender_type || "Open"} Bidding</div>
        </div>
      ),
    },
    {
      key: "bid_amount",
      label: "Commercial Bid Value",
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
            {fmt(t.bid_amount)} <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{t.currency || "SAR"}</span>
          </div>
          {Number(t.cost_amount) > 0 && (
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Cost Basis: {fmt(t.cost_amount)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "margin_pct",
      label: "Margin %",
      sortable: true,
      render: (t) => {
        const m = Number(t.computed_margin_pct ?? t.margin_pct ?? 0);
        const color = m >= 10 ? "#0ba360" : m >= 5 ? "#d97706" : "#dc2626";
        const bg = m >= 10 ? "#f0fdf4" : m >= 5 ? "#fffbeb" : "#fef2f2";
        return (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 11.5,
              color,
              background: bg,
              border: `1px solid ${color}33`,
            }}
          >
            {m.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: "submission_deadline",
      label: "Submission Deadline",
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 550, color: "#1e293b" }}>{dstr(t.submission_deadline)}</div>
          <div style={{ marginTop: 2 }}>
            <DeadlineChip d={t.deadline} />
          </div>
        </div>
      ),
    },
    {
      key: "bond_amount",
      label: "Bid Bond Security",
      render: (t) =>
        t.bond_amount ? (
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 12 }}>
              {fmt(t.bond_amount)} {t.currency || "SAR"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {t.bond_type} · <span style={{ fontWeight: 600, color: t.bond_status === "Issued" ? "#0ba360" : "#64748b" }}>{t.bond_status}</span>
            </div>
          </div>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
        ),
    },
    {
      key: "status",
      label: "Lifecycle Stage",
      sortable: true,
      render: (t) => <span className={"badge " + t.status}>{t.status}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (t) => (
        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          {t.status === "Draft" && (
            <button
              type="button"
              className="btn ghost sm"
              title="Submit Tender & Freeze Cost Baseline"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0ba360", borderColor: "#bbf7d0" }}
              onClick={() => decision(t.id, "Submitted")}
            >
              Submit
            </button>
          )}
          {t.status === "Submitted" && (
            <>
              <button
                type="button"
                className="btn ghost sm"
                style={{ fontSize: 11, padding: "3px 8px", color: "#0ba360", borderColor: "#bbf7d0" }}
                onClick={() => decision(t.id, "Won")}
              >
                Win
              </button>
              <button
                type="button"
                className="btn ghost sm"
                style={{ fontSize: 11, padding: "3px 8px", color: "#dc2626", borderColor: "#fecaca" }}
                onClick={() => {
                  const r = window.prompt("Reason for lost tender (pricing, technical, competitor, etc.):");
                  if (r) decision(t.id, "Lost", r);
                }}
              >
                Lose
              </button>
            </>
          )}
          <button
            type="button"
            className="btn ghost sm"
            style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => router.push(`/tenders/${t.id}`)}
          >
            Workspace →
          </button>
        </div>
      ),
    },
  ];

  const tot = stats?.totals;

  // Live margin calculation for drawer
  const drawerBidNum = Number(form.bid_amount || 0);
  const drawerCostNum = Number(form.cost_amount || 0);
  const drawerContVal = drawerBidNum * (Number(form.contingency_pct || 0) / 100);
  const drawerEscVal = drawerBidNum * (Number(form.escalation_pct || 0) / 100);
  const drawerTotalCost = drawerCostNum + drawerContVal + drawerEscVal;
  const drawerMarginVal = drawerBidNum - drawerTotalCost;
  const drawerMarginPct = drawerBidNum > 0 ? ((drawerMarginVal / drawerBidNum) * 100).toFixed(1) : 0;

  return (
    <div className="projects-page">
      {/* 1. TOP COMMERCIAL KPI RIBBON */}
      {tot && (
        <div style={{ padding: "16px 24px 0" }}>
          <div className="bigin-kpi-banner">
            <div className="bigin-kpi-item primary">
              <span className="bigin-kpi-label">Active Bidding Pipeline</span>
              <span className="bigin-kpi-val">{fmt(tot.pipeline_value)} SAR</span>
              <span className="bigin-kpi-sub">{tot.open} active tender bids</span>
            </div>
            <div className="bigin-kpi-item">
              <span className="bigin-kpi-label">Won Contracts Awarded</span>
              <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
                {fmt(tot.won_value)} SAR
              </span>
              <span className="bigin-kpi-sub">{tot.won} commercial awards</span>
            </div>
            <div className="bigin-kpi-item">
              <span className="bigin-kpi-label">Competitive Win Rate</span>
              <span className="bigin-kpi-val" style={{ color: tot.win_rate_pct >= 50 ? "#0ba360" : "#d97706" }}>
                {tot.win_rate_pct}%
              </span>
              <span className="bigin-kpi-sub">{tot.won_value_weighted_pct}% value-weighted</span>
            </div>
            <div className="bigin-kpi-item">
              <span className="bigin-kpi-label">Average Bid Ticket</span>
              <span className="bigin-kpi-val">{fmt(tot.avg_bid)} SAR</span>
              <span className="bigin-kpi-sub">Won avg: {fmt(tot.avg_won_bid)} SAR</span>
            </div>
            <div className="bigin-kpi-item">
              <span className="bigin-kpi-label">Portfolio Gross Margin</span>
              <span
                className="bigin-kpi-val"
                style={{ color: tot.portfolio_margin_pct >= 10 ? "#0ba360" : "#dc2626" }}
              >
                {tot.portfolio_margin_pct}%
              </span>
              <span className="bigin-kpi-sub">on awarded contracts</span>
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div className="alert err" style={{ margin: "14px 24px 0" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}
      {ok && (
        <div className="alert ok" style={{ margin: "14px 24px 0" }} onClick={() => setOk("")}>
          {ok}
        </div>
      )}

      {/* 2. ZOHO BIGIN DATA TABLE */}
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        onPage={(p) => {
          setPage(p);
          load(p, limit);
        }}
        onLimit={(l) => {
          setLimit(l);
          setPage(1);
          load(1, l);
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        keyOf={(t) => t.id}
        loading={loading}
        title="Tender Bidding & Estimation Registry"
        views={views}
        activeView={currentView}
        onViewChange={handleViewChange}
        search={search}
        searchPlaceholder="Search by tender no, title, client or ref..."
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
          clearTimeout(window.__td);
          window.__td = setTimeout(() => load(1, limit), 300);
        }}
        rightActions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Quick Project Filter */}
            <select
              className="select"
              style={{ minWidth: 160, maxWidth: 210, height: 32, fontSize: 12 }}
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            >
              <option value="">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            {/* Quick Contract Type Filter */}
            <select
              className="select"
              style={{ minWidth: 120, height: 32, fontSize: 12 }}
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
            >
              <option value="">All Types</option>
              {CONTRACT_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>

            {/* Analytics button */}
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => router.push("/tenders/analytics")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, fontSize: 12 }}
            >
              Tender Analytics
            </button>

            {/* Create New Tender Drawer Trigger */}
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setForm(initialForm);
                setShowDrawer(true);
              }}
              style={{ height: 32, fontSize: 12 }}
            >
              + New Tender
            </button>
          </div>
        }
        bulkActions={[
          { key: "w", label: "Mark Won", icon: "✓", onClick: () => bulkDecision("Won") },
          { key: "l", label: "Mark Lost", icon: "✕", onClick: () => bulkDecision("Lost") },
        ]}
      />

      {/* 3. PANORAMIC SLIDE-OUT DRAWER FOR NEW TENDER BID */}
      {showDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="bigin-drawer sheet-wide" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Tranquil Bid Master</span>
                <div>
                  <h3 className="bigin-drawer-title">New Commercial Tender Bid</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Tender Takeoff, Cost Baselining, Bank Guarantees & Submission Tracking
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="bigin-drawer-close"
                  onClick={() => setShowDrawer(false)}
                  title="Close drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Section Quick Jump Tabs */}
            <div className="bigin-sheet-tabs">
              {[
                { id: "sec-general", label: "1. Classification & Scope" },
                { id: "sec-stakeholders", label: "2. Project & Stakeholders" },
                { id: "sec-pricing", label: "3. Commercial Pricing & Margin" },
                { id: "sec-dates", label: "4. Milestones & Timeline" },
                { id: "sec-bond", label: "5. Bid Bond Guarantee" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={"bigin-tab-pill" + (drawerTab === tab.id ? " active" : "")}
                  onClick={() => {
                    setDrawerTab(tab.id);
                    document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body Form */}
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                {/* Live Commercial KPI Banner */}
                {drawerBidNum > 0 && (
                  <div className="bigin-kpi-banner" style={{ marginBottom: 16 }}>
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Commercial Bid Value</span>
                      <span className="bigin-kpi-val">{fmt(drawerBidNum)} {form.currency}</span>
                      <span className="bigin-kpi-sub">{form.contract_type} contracting basis</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Total Cost Baseline</span>
                      <span className="bigin-kpi-val" style={{ color: "#d97706" }}>
                        {fmt(drawerTotalCost)} {form.currency}
                      </span>
                      <span className="bigin-kpi-sub">
                        Base: {fmt(drawerCostNum)} + Allowances: {fmt(drawerContVal + drawerEscVal)}
                      </span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Projected Gross Margin</span>
                      <span
                        className="bigin-kpi-val"
                        style={{ color: Number(drawerMarginPct) >= 10 ? "#0ba360" : "#dc2626" }}
                      >
                        {fmt(drawerMarginVal)} {form.currency} ({drawerMarginPct}%)
                      </span>
                      <span className="bigin-kpi-sub">Target profitability</span>
                    </div>
                  </div>
                )}

                {/* Section 1: General & Classification */}
                <div id="sec-general" className="bigin-section-card">
                  <div className="bigin-section-head">
                    <span className="badge Draft">01</span>
                    <span className="bigin-section-title">General Classification & Bidding Setup</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="label">Tender Number *</label>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ padding: "1px 6px", fontSize: 10, height: 18 }}
                          onClick={autoGenerateNumber}
                        >
                          ⚡ Auto
                        </button>
                      </div>
                      <input
                        className="input"
                        placeholder="e.g. TND-2026-001"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Client Tender Reference</label>
                      <input
                        className="input"
                        placeholder="RFP-2026/88-HQ"
                        value={form.reference}
                        onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="label">Tender Title / Package Name *</label>
                      <input
                        className="input"
                        placeholder="e.g. Construction & Fit-Out of Commercial Tower Package 3"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Contract Type</label>
                      <select
                        className="select"
                        value={form.contract_type}
                        onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                      >
                        {CONTRACT_TYPES.map((ct) => (
                          <option key={ct} value={ct}>
                            {ct}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tender Procurement Type</label>
                      <select
                        className="select"
                        value={form.tender_type}
                        onChange={(e) => setForm({ ...form, tender_type: e.target.value })}
                      >
                        {TENDER_TYPES.map((tt) => (
                          <option key={tt} value={tt}>
                            {tt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Currency</label>
                      <select
                        className="select"
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Win Probability %</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={form.probability}
                        onChange={(e) => setForm({ ...form, probability: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Project & Stakeholders */}
                <div id="sec-stakeholders" className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">02</span>
                    <span className="bigin-section-title">Project Linkage & Stakeholders</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Linked Project Master *</label>
                      <select
                        className="select"
                        value={form.project_id}
                        onChange={(e) => handleProjectSelect(e.target.value)}
                        required
                      >
                        <option value="">— Select Project Master —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Linked Takeoff Estimation (Optional)</label>
                      <select
                        className="select"
                        value={form.estimation_id}
                        onChange={(e) => handleEstimationSelect(e.target.value)}
                      >
                        <option value="">— Pull Cost Baseline from Estimation —</option>
                        {estimations.map((est) => (
                          <option key={est.id} value={est.id}>
                            {est.number || est.id.slice(0, 8)} — {est.title || "Estimation"} ({fmt(est.total_cost)} SAR)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Client Organization</label>
                      <input
                        className="input"
                        placeholder="Client / Employer Name"
                        value={form.client_name}
                        onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Supervising Consultant</label>
                      <input
                        className="input"
                        placeholder="Engineering Consultant"
                        value={form.consultant_name}
                        onChange={(e) => setForm({ ...form, consultant_name: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="label">Scope Summary</label>
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Outline the tender scope of works, structural, MEP, finishes..."
                        value={form.scope}
                        onChange={(e) => setForm({ ...form, scope: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Commercial Pricing & Margin */}
                <div id="sec-pricing" className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">03</span>
                    <span className="bigin-section-title">Commercial Pricing, Contingencies & Cost Basis</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Target Bid Amount ({form.currency}) *</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.bid_amount}
                        onChange={(e) => setForm({ ...form, bid_amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Direct Cost Estimate ({form.currency})</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.cost_amount}
                        onChange={(e) => setForm({ ...form, cost_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Contingency Allowance %</label>
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        value={form.contingency_pct}
                        onChange={(e) => setForm({ ...form, contingency_pct: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Escalation / Inflation %</label>
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        value={form.escalation_pct}
                        onChange={(e) => setForm({ ...form, escalation_pct: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Key Milestone Dates */}
                <div id="sec-dates" className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">04</span>
                    <span className="bigin-section-title">Bidding Timeline & Deadlines</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Tender Issue Date</label>
                      <input
                        className="input"
                        type="date"
                        value={form.issue_date}
                        onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Submission Deadline *</label>
                      <input
                        className="input"
                        type="date"
                        value={form.submission_deadline}
                        onChange={(e) => setForm({ ...form, submission_deadline: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Offer Validity Deadline</label>
                      <input
                        className="input"
                        type="date"
                        value={form.validity_date}
                        onChange={(e) => setForm({ ...form, validity_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Bid Bond Guarantee */}
                <div id="sec-bond" className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">05</span>
                    <span className="bigin-section-title">Bid Bond Security (Bank Guarantee)</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Bond Guarantee Type</label>
                      <input
                        className="input"
                        placeholder="e.g. Bank Guarantee / Cash Deposit"
                        value={form.bond_type}
                        onChange={(e) => setForm({ ...form, bond_type: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Value ({form.currency})</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={form.bond_amount}
                        onChange={(e) => setForm({ ...form, bond_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Expiry Date</label>
                      <input
                        className="input"
                        type="date"
                        value={form.bond_expiry}
                        onChange={(e) => setForm({ ...form, bond_expiry: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Issuance Status</label>
                      <select
                        className="select"
                        value={form.bond_status}
                        onChange={(e) => setForm({ ...form, bond_status: e.target.value })}
                      >
                        {BOND_STATUSES.map((bs) => (
                          <option key={bs} value={bs}>
                            {bs}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="bigin-drawer-foot">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setShowDrawer(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn sm" disabled={busy}>
                  {busy ? "Creating Tender..." : "Create Tender Workspace →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
