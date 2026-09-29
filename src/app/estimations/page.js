"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const fmt = (n, d = 0) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const STATUSES = ["Draft", "Submitted", "Approved", "Rejected"];

export default function EstimationsPage() {
  const router = useRouter();
  const { lang, projectId } = useAppStore();

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
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState(projectId || "");
  const [currentView, setCurrentView] = useState("all");

  const [projects, setProjects] = useState([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [busy, setBusy] = useState(false);

  const initialForm = {
    project_id: projectId || "",
    number: "",
    material_cost: 0,
    labor_cost: 0,
    equipment_cost: 0,
    subcontract_cost: 0,
    overhead_pct: 5,
    contingency_pct: 5,
    escalation_pct: 0,
    margin_pct: 12,
  };
  const [form, setForm] = useState(initialForm);

  // Live calculation for the drawer
  const liveCalc = useMemo(() => {
    const m = Number(form.material_cost || 0);
    const l = Number(form.labor_cost || 0);
    const e = Number(form.equipment_cost || 0);
    const s = Number(form.subcontract_cost || 0);
    const base = m + l + e + s;

    const ohPct = Number(form.overhead_pct || 0);
    const ohAmt = base * (ohPct / 100);
    const direct = base + ohAmt;

    const contPct = Number(form.contingency_pct || 0);
    const contAmt = direct * (contPct / 100);

    const escPct = Number(form.escalation_pct || 0);
    const escAmt = direct * (escPct / 100);

    const totalCost = direct + contAmt + escAmt;
    const marginPct = Number(form.margin_pct || 0);
    const sellTotal = totalCost * (1 + marginPct / 100);
    const grossProfit = sellTotal - totalCost;

    return {
      baseDirect: base,
      overheadAmount: ohAmt,
      directPlusOh: direct,
      contingencyAmount: contAmt,
      escalationAmount: escAmt,
      totalCost,
      sellTotal,
      grossProfit,
      effectiveMargin: sellTotal > 0 ? (grossProfit / sellTotal) * 100 : 0,
    };
  }, [form]);

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (statusFilter) q.push("status=" + statusFilter);
    if (projectFilter) q.push("project_id=" + projectFilter);

    api
      .get("/estimations?" + q.join("&"))
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    api
      .get("/projects?limit=200")
      .then((r) => setProjects(r.data.data || []))
      .catch(() => {});
    load(1, limit, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected([]);
    load(1, limit, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, projectFilter]);

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k);
    setSortDir(nd);
    load(page, limit, k, nd);
  };

  // Quick State Transition from list view
  const quickTransition = async (estId, nextStatus) => {
    setMsg("");
    setOk("");
    try {
      await api.post(`/estimations/${estId}/transition`, { status: nextStatus });
      setOk(`Estimation successfully transitioned to ${nextStatus}`);
      load(page, limit, sortBy, sortDir);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Transition failed");
    }
  };

  // Create new estimation takeoff
  const createEstimation = async (e) => {
    e.preventDefault();
    setMsg("");
    setOk("");
    setBusy(true);

    try {
      const payload = {
        project_id: form.project_id,
        material_cost: Number(form.material_cost || 0),
        labor_cost: Number(form.labor_cost || 0),
        equipment_cost: Number(form.equipment_cost || 0),
        subcontract_cost: Number(form.subcontract_cost || 0),
        overhead_pct: Number(form.overhead_pct || 0),
        contingency_pct: Number(form.contingency_pct || 0),
        escalation_pct: Number(form.escalation_pct || 0),
        margin_pct: Number(form.margin_pct || 0),
      };
      if (form.number && form.number.trim()) {
        payload.number = form.number.trim();
      }

      const res = await api.post("/estimations", payload);
      setShowDrawer(false);
      if (res?.data?.data?.id) {
        router.push(`/estimations/${res.data.data.id}`);
      } else {
        load(1, limit, sortBy, sortDir);
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create estimation");
    } finally {
      setBusy(false);
    }
  };

  // View tabs
  const views = [
    { key: "all", label: "All Estimations", count: total },
    { key: "Draft", label: "Active Drafts" },
    { key: "Submitted", label: "Under Review" },
    { key: "Approved", label: "Approved Baselines" },
    { key: "Rejected", label: "Rejected" },
  ];

  const handleViewChange = (vKey) => {
    setCurrentView(vKey);
    if (vKey === "all") {
      setStatusFilter("");
    } else {
      setStatusFilter(vKey);
    }
  };

  // Top KPI calculations
  const { pipelineVal, approvedVal, avgMargin, totalEstCount } = useMemo(() => {
    const listToCalc = rows || [];
    let pipe = 0;
    let appr = 0;
    let marginSum = 0;

    listToCalc.forEach((item) => {
      const sell = Number(item.sell_total || 0);
      const cost = Number(item.total_cost || 0);
      if (item.status === "Approved") {
        appr += sell;
      } else if (item.status !== "Rejected") {
        pipe += sell;
      }
      if (sell > 0) {
        const m = ((sell - cost) / sell) * 100;
        marginSum += m;
      }
    });

    const avgM = listToCalc.length > 0 ? marginSum / listToCalc.length : 0;
    return {
      pipelineVal: pipe,
      approvedVal: appr,
      avgMargin: avgM.toFixed(1),
      totalEstCount: total,
    };
  }, [rows, total]);

  const columns = [
    {
      key: "number",
      label: "Estimation Takeoff",
      sortable: true,
      render: (x) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar
            name={x.number || "ES"}
            subline={`Takeoff Item`}
            color="#0ba360"
            size={32}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <a
                href={`/estimations/${x.id}`}
                style={{ fontWeight: 650, color: "#0f172a", fontSize: 13.5 }}
                className="hover-underline"
              >
                {x.number}
              </a>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: "#f1f5f9",
                  color: "#475569",
                  padding: "1px 6px",
                  borderRadius: 4,
                  border: "1px solid #e2e8f0",
                }}
              >
                R{x.revision}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              {x.items?.length || 0} line items registered
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project & Client",
      render: (x) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>
            {x.project?.code || "—"}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1 }}>
            {x.project?.name || "General Tender Work"}
          </div>
        </div>
      ),
    },
    {
      key: "total_cost",
      label: "Cost Baseline",
      sortable: true,
      render: (x) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>
            {fmt(x.total_cost)} SAR
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            OH {x.overhead_pct || 0}% • Cont {x.contingency_pct || 0}%
          </div>
        </div>
      ),
    },
    {
      key: "sell_total",
      label: "Commercial Sell Total",
      sortable: true,
      render: (x) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0ba360", fontSize: 13.5 }}>
            {fmt(x.sell_total)} SAR
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Markup +{x.margin_pct || 0}%
          </div>
        </div>
      ),
    },
    {
      key: "margin",
      label: "Profit Margin",
      render: (x) => {
        const sell = Number(x.sell_total || 0);
        const cost = Number(x.total_cost || 0);
        const m = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
        const color = m >= 15 ? "#0ba360" : m >= 8 ? "#d97706" : "#e11d48";
        const bg = m >= 15 ? "#f0fdf4" : m >= 8 ? "#fffbeb" : "#fff1f2";
        const border = m >= 15 ? "#bbf7d0" : m >= 8 ? "#fef3c7" : "#fecdd3";

        return (
          <span
            style={{
              fontWeight: 700,
              fontSize: 11.5,
              color,
              background: bg,
              border: `1px solid ${border}`,
              padding: "2px 8px",
              borderRadius: 6,
              display: "inline-block",
            }}
          >
            {m.toFixed(1)}% Margin
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Stage",
      sortable: true,
      render: (x) => <span className={"badge " + x.status}>{x.status}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (x) => (
        <div
          style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          {x.status === "Draft" && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0284c7", borderColor: "#bae6fd" }}
              onClick={() => quickTransition(x.id, "Submitted")}
              title="Submit estimation for QS review"
            >
              Submit
            </button>
          )}
          {x.status === "Submitted" && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0ba360", borderColor: "#bbf7d0" }}
              onClick={() => quickTransition(x.id, "Approved")}
              title="Approve as contractual baseline"
            >
              Approve
            </button>
          )}
          <button
            type="button"
            className="btn ghost sm"
            style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => router.push(`/estimations/${x.id}`)}
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
            <span className="bigin-kpi-label">Active Takeoff Pipeline</span>
            <span className="bigin-kpi-val">{fmt(pipelineVal)} SAR</span>
            <span className="bigin-kpi-sub">In draft & QS review stages</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Approved Cost Baselines</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(approvedVal)} SAR
            </span>
            <span className="bigin-kpi-sub">Locked contractual benchmarks</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Average Profit Margin</span>
            <span
              className="bigin-kpi-val"
              style={{ color: Number(avgMargin) >= 12 ? "#0ba360" : "#d97706" }}
            >
              {avgMargin}%
            </span>
            <span className="bigin-kpi-sub">Across all priced bids</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Total Estimations</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18 }}>
              {totalEstCount} Takeoffs
            </span>
            <span className="bigin-kpi-sub">Registered across all projects</span>
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
          load(p, limit, sortBy, sortDir);
        }}
        onLimit={(l) => {
          setLimit(l);
          setPage(1);
          load(1, l, sortBy, sortDir);
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        keyOf={(x) => x.id}
        loading={loading}
        title="Cost Estimations & Takeoffs"
        views={views}
        activeView={currentView}
        onViewChange={handleViewChange}
        search={search}
        searchPlaceholder="Search estimations by number, project..."
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
          clearTimeout(window.__est);
          window.__est = setTimeout(() => load(1, limit, sortBy, sortDir), 300);
        }}
        onAdd={() => {
          setForm({ ...initialForm, project_id: projectFilter || "" });
          setShowDrawer(true);
        }}
        addLabel="New Estimation"
        rightActions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Project Filter Pill */}
            <select
              className="bigin-select-pill"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              title="Filter by project"
              style={{ maxWidth: 220 }}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter Pill */}
            <select
              className="bigin-select-pill"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by lifecycle stage"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* 3. PANORAMIC SLIDE-OUT DRAWER FOR NEW ESTIMATION */}
      {showDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="bigin-drawer sheet-wide" onClick={(e) => e.stopPropagation()}>
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Takeoff Setup</span>
                <div>
                  <h3 className="bigin-drawer-title">Create Cost Estimation Takeoff</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Setup direct cost heads, risk contingencies, and commercial profit markups
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="bigin-drawer-close"
                onClick={() => setShowDrawer(false)}
                aria-label="Close drawer"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={createEstimation}
              style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
            >
              <div className="bigin-drawer-body">
                {/* Commercial Calculator Preview Banner */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "16px 20px",
                    marginBottom: 20,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: 16,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", fontWeight: 600 }}>
                      Direct Base
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginTop: 2 }}>
                      {fmt(liveCalc.baseDirect)} SAR
                    </div>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>
                      M + L + E + S
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", fontWeight: 600 }}>
                      Overhead ({form.overhead_pct}%)
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>
                      +{fmt(liveCalc.overheadAmount)} SAR
                    </div>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>
                      Direct + OH: {fmt(liveCalc.directPlusOh)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", fontWeight: 600 }}>
                      Total Cost
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#fbbf24", marginTop: 2 }}>
                      {fmt(liveCalc.totalCost)} SAR
                    </div>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>
                      Cont +{fmt(liveCalc.contingencyAmount)} | Esc +{fmt(liveCalc.escalationAmount)}
                    </div>
                  </div>

                  <div style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 16 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "#86efac", fontWeight: 600 }}>
                      Sell Total (+{form.margin_pct}%)
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80", marginTop: 2 }}>
                      {fmt(liveCalc.sellTotal)} SAR
                    </div>
                    <div style={{ fontSize: 10.5, color: "#86efac", marginTop: 2 }}>
                      Gross Profit: {fmt(liveCalc.grossProfit)} ({liveCalc.effectiveMargin.toFixed(1)}%)
                    </div>
                  </div>
                </div>

                {/* Section 1: Project & Identification */}
                <div className="bigin-form-section">
                  <div className="bigin-form-section-title">
                    <span className="dot" />
                    <span>Project & Takeoff Reference</span>
                  </div>
                  <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="bigin-form-field">
                      <label>
                        Assign to Project <span className="req">*</span>
                      </label>
                      <select
                        className="bigin-input"
                        value={form.project_id}
                        onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                        required
                      >
                        <option value="">— Select Target Project —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bigin-form-field">
                      <label>
                        Estimation Number <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Leave blank for auto-numbering)</span>
                      </label>
                      <input
                        type="text"
                        className="bigin-input"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                        placeholder="e.g. EST-2026-0042 (Auto if blank)"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Direct Cost Heads */}
                <div className="bigin-form-section" style={{ marginTop: 20 }}>
                  <div className="bigin-form-section-title">
                    <span className="dot" />
                    <span>Initial Direct Cost Heads (SAR)</span>
                  </div>
                  <div
                    className="bigin-form-grid"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
                  >
                    <div className="bigin-form-field">
                      <label>Direct Materials (SAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.material_cost}
                        onChange={(e) => setForm({ ...form, material_cost: e.target.value })}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Direct Labour / Workforce (SAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.labor_cost}
                        onChange={(e) => setForm({ ...form, labor_cost: e.target.value })}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Plant & Heavy Equipment (SAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.equipment_cost}
                        onChange={(e) => setForm({ ...form, equipment_cost: e.target.value })}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Subcontract Packages (SAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.subcontract_cost}
                        onChange={(e) => setForm({ ...form, subcontract_cost: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>
                    Note: Detailed takeoff line items can be added inside the estimation workspace after setup.
                  </div>
                </div>

                {/* Section 3: Commercial Multipliers & Percentages */}
                <div className="bigin-form-section" style={{ marginTop: 20 }}>
                  <div className="bigin-form-section-title">
                    <span className="dot" />
                    <span>Commercial Markups & Risk Contingencies (%)</span>
                  </div>
                  <div
                    className="bigin-form-grid"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
                  >
                    <div className="bigin-form-field">
                      <label>General Overhead (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.overhead_pct}
                        onChange={(e) => setForm({ ...form, overhead_pct: e.target.value })}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Risk Contingency (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.contingency_pct}
                        onChange={(e) => setForm({ ...form, contingency_pct: e.target.value })}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Market Escalation (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.escalation_pct}
                        onChange={(e) => setForm({ ...form, escalation_pct: e.target.value })}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Profit Markup Margin (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={form.margin_pct}
                        onChange={(e) => setForm({ ...form, margin_pct: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pinned Bottom Action Footer */}
              <div className="bigin-drawer-foot">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowDrawer(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: "#0ba360",
                    borderColor: "#0ba360",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                  disabled={busy}
                >
                  {busy ? "Creating Takeoff..." : "✓ Create Estimation Takeoff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
