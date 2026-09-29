"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const fmt = (n, c = "SAR") => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function DeadlineChip({ d }) {
  if (!d) return <span className="muted">—</span>;
  if (d.overdue) return <span className="tl-chip over">Overdue {Math.abs(d.days_remaining)}d</span>;
  if (d.urgent) return <span className="tl-chip hot">{d.days_remaining}d left</span>;
  return <span className="tl-chip">{d.days_remaining}d</span>;
}

export default function Tenders() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("submission_deadline");
  const [sortDir, setSortDir] = useState("ASC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [contractType, setContractType] = useState("");
  const [within, setWithin] = useState("");
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    number: "", project_id: "", estimation_id: "", reference: "", title: "",
    client_name: "", consultant_name: "", contract_type: "LumpSum", tender_type: "Open", currency: "SAR",
    issue_date: "", submission_deadline: "", validity_date: "", bid_amount: 0,
    contingency_pct: 5, escalation_pct: 0, bond_type: "", bond_amount: 0, bond_expiry: "", bond_status: "None", probability: 50,
  });

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (status) q.push("status=" + status);
    if (contractType) q.push("contract_type=" + contractType);
    if (within) q.push("deadline=" + within);
    if (pid) q.push("project_id=" + pid);
    api.get("/tenders?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  const loadStats = () => api.get("/tenders/analytics").then((r) => setStats(r.data.data)).catch(() => {});
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load(1, limit, sortBy, sortDir); loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit, sortBy, sortDir); }, [status, contractType, within, pid]);

  const onSort = (k) => { const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC"; setSortBy(k); setSortDir(nd); load(page, limit, k, nd); };

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(""); setOk("");
    try {
      const payload = { ...form };
      for (const k of ["bid_amount", "contingency_pct", "escalation_pct", "bond_amount", "probability"]) payload[k] = Number(payload[k] || 0);
      for (const k of ["estimation_id", "project_id", "issue_date", "submission_deadline", "validity_date", "bond_expiry", "bond_type", "consultant_name", "reference"]) if (!payload[k]) delete payload[k];
      const r = await api.post("/tenders", payload);
      setShowNew(false);
      window.location.href = "/tenders/" + r.data.data.id;
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const decision = async (id, st, reason) => {
    setMsg(""); setOk("");
    try {
      await api.post(`/tenders/${id}/decision`, { status: st, reason_lost: reason });
      setOk(`Tender marked ${st}`); load(); loadStats();
    } catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const bulkDecision = (st) => {
    if (!window.confirm(`Mark ${selected.length} tender(s) as ${st}?`)) return;
    Promise.all(selected.map((t) => api.post(`/tenders/${t.id}/decision`, { status: st, reason_lost: st === "Lost" ? "Bulk action" : undefined })))
      .then(() => { setOk(`${selected.length} tender(s) marked ${st}`); setSelected([]); load(); loadStats(); })
      .catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };

  const columns = [
    { key: "number", label: "Tender No", sortable: true, render: (t) => (<div><a href={"/tenders/" + t.id}><b style={{ fontWeight: 500 }}>{t.number}</b></a>{t.reference && <div className="muted" style={{ fontSize: 11 }}>{t.reference}</div>}</div>) },
    { key: "title", label: "Title / Client", sortable: true, render: (t) => (<div>{t.title || "—"}<div className="muted" style={{ fontSize: 11 }}>{t.client_name || t.project?.name || ""}</div></div>) },
    { key: "bid_amount", label: "Bid Value", sortable: true, render: (t) => (<div>{fmt(t.bid_amount)} <span className="muted">{t.currency}</span><div className="muted" style={{ fontSize: 11 }}>{t.contract_type}</div></div>) },
    { key: "margin_pct", label: "Margin", sortable: true, render: (t) => (<span style={{ color: Number(t.computed_margin_pct) < 10 ? "var(--danger)" : "var(--ok,#0ba360)", fontWeight: 600 }}>{Number(t.computed_margin_pct).toFixed(1)}%</span>) },
    { key: "submission_deadline", label: "Deadline", sortable: true, render: (t) => (<div>{dstr(t.submission_deadline)}<div><DeadlineChip d={t.deadline} /></div></div>) },
    { key: "bond_amount", label: "Bond", render: (t) => (t.bond_amount ? (<div>{fmt(t.bond_amount)}<div className="muted" style={{ fontSize: 11 }}>{t.bond_type} · {t.bond_status}</div></div>) : <span className="muted">—</span>) },
    { key: "status", label: "Status", sortable: true, render: (t) => <span className={"badge " + t.status}>{t.status}</span> },
    { key: "actions", label: "", render: (t) => (
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
        {t.status === "Draft" && <button className="btn ghost sm" title="Submit" onClick={() => decision(t.id, "Submitted")}>Submit</button>}
        {t.status === "Submitted" && <><button className="btn ghost sm" onClick={() => decision(t.id, "Won")}>Win</button><button className="btn ghost sm" onClick={() => { const r = window.prompt("Reason for loss"); if (r) decision(t.id, "Lost", r); }}>Lose</button></>}
        <a className="btn ghost sm" href={"/tenders/" + t.id}>Open</a>
      </div>
    ) },
  ];

  const tot = stats?.totals;
  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "tenders")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "tenders")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {tot && (
        <div className="grid stats" style={{ marginBottom: 14 }}>
          <div className="stat"><div className="k">Open pipeline</div><div className="v">{fmt(tot.pipeline_value)}</div><div className="muted" style={{ fontSize: 11 }}>{tot.open} tenders</div></div>
          <div className="stat"><div className="k">Won value</div><div className="v">{fmt(tot.won_value)}</div><div className="muted" style={{ fontSize: 11 }}>{tot.won} awards</div></div>
          <div className="stat"><div className="k">Win rate</div><div className="v">{tot.win_rate_pct}%</div><div className="muted" style={{ fontSize: 11 }}>{tot.won_value_weighted_pct}% by value</div></div>
          <div className="stat"><div className="k">Avg bid</div><div className="v">{fmt(tot.avg_bid)}</div><div className="muted" style={{ fontSize: 11 }}>won {fmt(tot.avg_won_bid)}</div></div>
          <div className="stat"><div className="k">Portfolio margin</div><div className="v" style={{ color: tot.portfolio_margin_pct < 10 ? "var(--danger)" : "inherit" }}>{tot.portfolio_margin_pct}%</div><div className="muted" style={{ fontSize: 11 }}>on won tenders</div></div>
        </div>
      )}

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginBottom: 10 }}>New tender</h3>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
            <div><label className="label">Tender No *</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required /></div>
            <div><label className="label">Client ref</label><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div style={{ gridColumn: "span 2" }}><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="label">Project *</label>
              <select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required>
                <option value="">—</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
              </select></div>
            <div><label className="label">Client</label><input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><label className="label">Consultant</label><input className="input" value={form.consultant_name} onChange={(e) => setForm({ ...form, consultant_name: e.target.value })} /></div>
            <div><label className="label">Contract type</label>
              <select className="select" value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                {["LumpSum", "UnitRate", "CostPlus", "GMP"].map((x) => (<option key={x}>{x}</option>))}
              </select></div>
            <div><label className="label">Tender type</label>
              <select className="select" value={form.tender_type} onChange={(e) => setForm({ ...form, tender_type: e.target.value })}>
                {["Open", "Selective", "Limited", "Negotiated"].map((x) => (<option key={x}>{x}</option>))}
              </select></div>
            <div><label className="label">Currency</label>
              <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}
              </select></div>
            <div><label className="label">Bid value</label><input className="input" type="number" step="0.01" value={form.bid_amount} onChange={(e) => setForm({ ...form, bid_amount: e.target.value })} /></div>
            <div><label className="label">Issue date</label><input className="input" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
            <div><label className="label">Submission deadline</label><input className="input" type="date" value={form.submission_deadline} onChange={(e) => setForm({ ...form, submission_deadline: e.target.value })} /></div>
            <div><label className="label">Validity to</label><input className="input" type="date" value={form.validity_date} onChange={(e) => setForm({ ...form, validity_date: e.target.value })} /></div>
            <div><label className="label">Contingency %</label><input className="input" type="number" step="0.01" value={form.contingency_pct} onChange={(e) => setForm({ ...form, contingency_pct: e.target.value })} /></div>
            <div><label className="label">Escalation %</label><input className="input" type="number" step="0.01" value={form.escalation_pct} onChange={(e) => setForm({ ...form, escalation_pct: e.target.value })} /></div>
            <div><label className="label">Bond type</label><input className="input" placeholder="Bank Guarantee" value={form.bond_type} onChange={(e) => setForm({ ...form, bond_type: e.target.value })} /></div>
            <div><label className="label">Bond amount</label><input className="input" type="number" step="0.01" value={form.bond_amount} onChange={(e) => setForm({ ...form, bond_amount: e.target.value })} /></div>
            <div><label className="label">Bond expiry</label><input className="input" type="date" value={form.bond_expiry} onChange={(e) => setForm({ ...form, bond_expiry: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit" disabled={busy}>{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 230 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")}</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Draft", "Submitted", "Won", "Lost", "Cancelled"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 150 }} value={contractType} onChange={(e) => setContractType(e.target.value)}>
          {["", "LumpSum", "UnitRate", "CostPlus", "GMP"].map((s) => (<option key={s} value={s}>{s || "All types"}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 160 }} value={within} onChange={(e) => setWithin(e.target.value)}>
          <option value="">Any deadline</option>
          <option value="7">Closing in 7 days</option>
          <option value="14">Closing in 14 days</option>
          <option value="30">Closing in 30 days</option>
        </select>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        sortBy={sortBy} sortDir={sortDir} onSort={onSort}
        selected={selected} onSelect={setSelected} keyOf={(t) => t.id}
        loading={loading} title={t(lang, "tenders")}
        search={search} searchPlaceholder={t(lang, "search")}
        onSearchChange={(v) => { setSearch(v); setPage(1); clearTimeout(window.__td); window.__td = setTimeout(() => load(1, limit), 320); }}
        bulkActions={[
          { key: "w", label: "Mark Won", icon: "✓", onClick: () => bulkDecision("Won") },
          { key: "l", label: "Mark Lost", icon: "✕", onClick: () => bulkDecision("Lost") },
        ]}
        stats={[{ label: "Total", value: total }]}
      />
    </div>
  );
}
