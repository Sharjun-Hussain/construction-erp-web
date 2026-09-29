"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";
import TranquilEstimationModal from "@/components/TranquilEstimationModal";

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
  const [showTranquilModal, setShowTranquilModal] = useState(false);

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
            subline={`Takeoff`}
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
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
              {x.enquiry_no && <span style={{ color: "#0284c7" }}>Enq: {x.enquiry_no}</span>}
              {x.site && <span>• Site: {x.site.split(" ")[0]}</span>}
              <span>• {x.items?.length || 0} items</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project & Customer",
      render: (x) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>
            {x.project?.name || x.project_type || "General Tender Work"}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1 }}>
            {x.customer_name || x.project?.client_name || x.project?.code || "—"}
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
              fontWeight: 750,
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
        onAdd={() => setShowTranquilModal(true)}
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

      {/* 3. TRANQUIL ERP NEW ESTIMATION SHEET MODAL */}
      <TranquilEstimationModal
        isOpen={showTranquilModal}
        onClose={() => setShowTranquilModal(false)}
        onSuccess={(created) => {
          if (created?.id) {
            router.push(`/estimations/${created.id}`);
          } else {
            load(1, limit, sortBy, sortDir);
          }
        }}
      />
    </div>
  );
}
