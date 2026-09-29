"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function DueDateChip({ due }) {
  if (!due) return <span style={{ color: "#94a3b8" }}>—</span>;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(due);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays < 0) {
    return <span className="tl-chip over">Overdue {Math.abs(diffDays)}d</span>;
  }
  if (diffDays <= 5) {
    return <span className="tl-chip hot">{diffDays}d left</span>;
  }
  return <span className="tl-chip">{diffDays}d left</span>;
}

const SOURCES = ["Client", "Consultant", "Portal", "Referral", "Repeat", "Other"];
const STATUSES = ["New", "UnderReview", "Inspected", "Estimated", "Quoted", "Won", "Lost", "Dropped"];
const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];

export default function EnquiriesPage() {
  const router = useRouter();
  const { lang } = useAppStore();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [currentView, setCurrentView] = useState("all");

  // Metadata
  const [customers, setCustomers] = useState([]);

  // New Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [busy, setBusy] = useState(false);

  const initialForm = {
    number: "",
    title: "",
    client_name: "",
    client_id: "",
    consultant_name: "",
    source: "Client",
    received_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    est_value: 0,
    currency: "SAR",
    assigned_to: "",
    probability: 60,
    notes: "",
  };
  const [form, setForm] = useState(initialForm);

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (statusFilter) q.push("status=" + statusFilter);
    if (sourceFilter) q.push("source=" + sourceFilter);

    api
      .get("/prebid/enquiries?" + q.join("&"))
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/customers?limit=200").then((r) => setCustomers(r.data.data || [])).catch(() => {});
    load(1, limit, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected([]);
    load(1, limit, sortBy, sortDir);
  }, [statusFilter, sourceFilter]);

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k);
    setSortDir(nd);
    load(page, limit, k, nd);
  };

  // Auto-generate Enquiry Number
  const autoGenerateNumber = () => {
    const yr = new Date().getFullYear();
    const rnd = String(Math.floor(100 + Math.random() * 900));
    setForm((prev) => ({ ...prev, number: `ENQ-${yr}-${rnd}` }));
  };

  // Submit Create
  const create = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setBusy(true);
    setMsg("");
    setOk("");
    try {
      const payload = {
        ...form,
        est_value: Number(form.est_value || 0),
        probability: Number(form.probability || 0),
      };
      for (const k of ["received_date", "due_date", "consultant_name", "assigned_to", "notes", "client_id"]) {
        if (!payload[k]) delete payload[k];
      }

      const r = await api.post("/prebid/enquiries", payload);
      setShowDrawer(false);
      setForm(initialForm);
      router.push(`/enquiries/${r.data.data.id}`);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to register enquiry");
    } finally {
      setBusy(false);
    }
  };

  // Fast Transition
  const quickTransition = (id, st) => {
    setMsg("");
    setOk("");
    api
      .post(`/prebid/enquiries/${id}/transition`, { status: st })
      .then(() => {
        setOk(`Enquiry marked as ${st}`);
        load();
      })
      .catch((e) => setMsg(e?.response?.data?.message || "Operation failed"));
  };

  // Views definition for DataTable
  const views = useMemo(() => {
    return [
      { key: "all", label: "All Enquiries", count: total },
      { key: "pipeline", label: "Active Pipeline" },
      { key: "new", label: "New Leads" },
      { key: "review", label: "Under Review" },
      { key: "estimated", label: "Estimated / Quoted" },
      { key: "won", label: "Awarded / Won" },
      { key: "closed", label: "Dropped / Lost" },
    ];
  }, [total]);

  const handleViewChange = (vKey) => {
    setCurrentView(vKey);
    setPage(1);
    if (vKey === "all") setStatusFilter("");
    else if (vKey === "pipeline") setStatusFilter("");
    else if (vKey === "new") setStatusFilter("New");
    else if (vKey === "review") setStatusFilter("UnderReview");
    else if (vKey === "estimated") setStatusFilter("Estimated");
    else if (vKey === "won") setStatusFilter("Won");
    else if (vKey === "closed") setStatusFilter("Dropped");
  };

  // Pipeline summary totals
  const pipelineRows = rows.filter((r) => !["Won", "Lost", "Dropped"].includes(r.status));
  const pipelineVal = pipelineRows.reduce((acc, r) => acc + Number(r.est_value || 0), 0);
  const wonRows = rows.filter((r) => r.status === "Won");
  const wonVal = wonRows.reduce((acc, r) => acc + Number(r.est_value || 0), 0);

  // DataTable columns
  const columns = [
    {
      key: "number",
      label: "Enquiry Ref & Title",
      sortable: true,
      render: (x) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar
            name={x.number}
            subline={`${x.title || "Untitled Package"}${x.source ? " · " + x.source : ""}`}
            size={34}
            color="#0284c7"
          />
        </div>
      ),
    },
    {
      key: "client_name",
      label: "Client & Consultant",
      sortable: true,
      render: (x) => (
        <div>
          <div style={{ fontWeight: 650, color: "#0f172a" }}>{x.client_name || "Private Client"}</div>
          {x.consultant_name && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              Consultant: {x.consultant_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "source",
      label: "Lead Source",
      sortable: true,
      render: (x) => (
        <span
          style={{
            background: "#f1f5f9",
            color: "#475569",
            fontWeight: 650,
            fontSize: 11.5,
            padding: "2px 8px",
            borderRadius: 5,
            border: "1px solid #e2e8f0",
          }}
        >
          {x.source || "Direct"}
        </span>
      ),
    },
    {
      key: "est_value",
      label: "Estimated Opportunity",
      sortable: true,
      render: (x) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
            {fmt(x.est_value)} <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{x.currency || "SAR"}</span>
          </div>
          {x.probability > 0 && (
            <div style={{ fontSize: 11, color: "#0284c7", fontWeight: 600 }}>
              Win Prob: {x.probability}%
            </div>
          )}
        </div>
      ),
    },
    {
      key: "due_date",
      label: "Submission Due Date",
      sortable: true,
      render: (x) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 550, color: "#1e293b" }}>{dstr(x.due_date)}</div>
          <div style={{ marginTop: 2 }}>
            <DueDateChip due={x.due_date} />
          </div>
        </div>
      ),
    },
    {
      key: "assigned_to",
      label: "Assigned Estimator",
      render: (x) => (
        <span style={{ fontSize: 12, fontWeight: 550, color: x.assigned_to ? "#0f172a" : "#94a3b8" }}>
          {x.assigned_to || "Unassigned"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Lifecycle Stage",
      sortable: true,
      render: (x) => <span className={"badge " + x.status}>{x.status}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (x) => (
        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          {x.status === "New" && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0ba360", borderColor: "#bbf7d0" }}
              onClick={() => quickTransition(x.id, "UnderReview")}
            >
              Start Review
            </button>
          )}
          {x.status === "UnderReview" && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0284c7", borderColor: "#bae6fd" }}
              onClick={() => quickTransition(x.id, "Estimated")}
            >
              Mark Estimated
            </button>
          )}
          <button
            type="button"
            className="btn ghost sm"
            style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => router.push(`/enquiries/${x.id}`)}
          >
            Workspace →
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {/* 1. TOP COMMERCIAL KPI RIBBON */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Active Pre-Bid Pipeline</span>
            <span className="bigin-kpi-val">{fmt(pipelineVal)} SAR</span>
            <span className="bigin-kpi-sub">{pipelineRows.length} opportunities in progress</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Won Contracts Value</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(wonVal)} SAR
            </span>
            <span className="bigin-kpi-sub">{wonRows.length} successfully awarded</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Total Registered Leads</span>
            <span className="bigin-kpi-val">{total}</span>
            <span className="bigin-kpi-sub">Across all lead sources</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Top Lead Source</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18, color: "#6366f1" }}>
              Client Inquiries
            </span>
            <span className="bigin-kpi-sub">Direct developer relationships</span>
          </div>
        </div>
      </div>

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
        keyOf={(x) => x.id}
        loading={loading}
        title="Client RFP & Bidding Enquiries"
        views={views}
        activeView={currentView}
        onViewChange={handleViewChange}
        search={search}
        searchPlaceholder="Search enquiries by number, title, client..."
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
          clearTimeout(window.__enq);
          window.__enq = setTimeout(() => load(1, limit), 300);
        }}
        onAdd={() => {
          setForm(initialForm);
          setShowDrawer(true);
        }}
        addLabel="Register Enquiry"
        rightActions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Status Filter */}
            <select
              className="select"
              style={{ minWidth: 130, height: 32, fontSize: 12 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              className="select"
              style={{ minWidth: 120, height: 32, fontSize: 12 }}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All Sources</option>
              {SOURCES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* 3. PANORAMIC SLIDE-OUT DRAWER FOR NEW ENQUIRY */}
      {showDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="bigin-drawer sheet-wide" onClick={(e) => e.stopPropagation()}>
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Pre-Bid Setup</span>
                <div>
                  <h3 className="bigin-drawer-title">Register Client RFP / Enquiry</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Record tender opportunity, developer details, submission dates & estimator assignment
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="bigin-drawer-close"
                  onClick={() => setShowDrawer(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                {/* Live Preview Banner */}
                {Number(form.est_value) > 0 && (
                  <div className="bigin-kpi-banner" style={{ marginBottom: 16 }}>
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Estimated Contract Value</span>
                      <span className="bigin-kpi-val">{fmt(form.est_value)} {form.currency}</span>
                      <span className="bigin-kpi-sub">Preliminary opportunity scale</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Estimated Win Probability</span>
                      <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
                        {form.probability}%
                      </span>
                      <span className="bigin-kpi-sub">Commercial feasibility</span>
                    </div>
                  </div>
                )}

                <div className="bigin-section-card">
                  <div className="bigin-section-head">
                    <span className="badge Draft">01</span>
                    <span className="bigin-section-title">General Lead & Project Classification</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="label">Enquiry Number</label>
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
                        placeholder="e.g. ENQ-2026-001"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="label">Project Title / Package Name *</label>
                      <input
                        className="input"
                        placeholder="e.g. Mixed-Use Commercial Complex Construction"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Client / Employer</label>
                      <input
                        className="input"
                        placeholder="Select or enter client name"
                        list="enq-clients-list"
                        value={form.client_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = customers.find((c) => c.name === val);
                          setForm({ ...form, client_name: val, client_id: found?.id || "" });
                        }}
                      />
                      <datalist id="enq-clients-list">
                        {customers.map((c) => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="label">Supervising Consultant</label>
                      <input
                        className="input"
                        placeholder="Architect / Engineering Consultant"
                        value={form.consultant_name}
                        onChange={(e) => setForm({ ...form, consultant_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Lead Source</label>
                      <select
                        className="select"
                        value={form.source}
                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                      >
                        {SOURCES.map((x) => (
                          <option key={x} value={x}>
                            {x}
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
                  </div>
                </div>

                <div className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">02</span>
                    <span className="bigin-section-title">Opportunity Commercials & Timelines</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Estimated Value ({form.currency})</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.est_value}
                        onChange={(e) => setForm({ ...form, est_value: e.target.value })}
                      />
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
                    <div>
                      <label className="label">RFP Received Date</label>
                      <input
                        className="input"
                        type="date"
                        value={form.received_date}
                        onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Submission Due Date</label>
                      <input
                        className="input"
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Assigned Lead Estimator</label>
                      <input
                        className="input"
                        placeholder="Name of QS / Estimator"
                        value={form.assigned_to}
                        onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="label">Commercial Notes & Requirements</label>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Notes on scope, tender bond requirements, project timeline..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bigin-drawer-foot">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setShowDrawer(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn sm" disabled={busy}>
                  {busy ? "Registering..." : "Register Enquiry Workspace →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
