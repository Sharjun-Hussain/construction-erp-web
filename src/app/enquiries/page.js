"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function Enquiries() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ title: "", client_name: "", consultant_name: "", source: "Client", received_date: "", due_date: "", est_value: 0, currency: "SAR", assigned_to: "", probability: 50, notes: "" });

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (status) q.push("status=" + status);
    if (source) q.push("source=" + source);
    api.get("/prebid/enquiries?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/customers?limit=200").then((r) => setCustomers(r.data.data || [])).catch(() => {});
    load(1, limit, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit, sortBy, sortDir); }, [status, source]);

  const onSort = (k) => { const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC"; setSortBy(k); setSortDir(nd); load(page, limit, k, nd); };
  const create = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      const payload = { ...form, est_value: Number(form.est_value || 0), probability: Number(form.probability || 0) };
      for (const k of ["received_date", "due_date", "consultant_name", "assigned_to", "notes"]) if (!payload[k]) delete payload[k];
      const r = await api.post("/prebid/enquiries", payload);
      window.location.href = "/enquiries/" + r.data.data.id;
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const quickTransition = (id, st) => {
    setMsg(""); setOk("");
    api.post(`/prebid/enquiries/${id}/transition`, { status: st }).then(() => { setOk("Enquiry " + st); load(); }).catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };

  const columns = [
    { key: "number", label: "Enquiry No", sortable: true, render: (x) => <a href={"/enquiries/" + x.id}><b style={{ fontWeight: 500 }}>{x.number}</b></a> },
    { key: "title", label: "Title / Client", sortable: true, render: (x) => (<div>{x.title}<div className="muted" style={{ fontSize: 11 }}>{x.client_name || ""} {x.consultant_name ? "· " + x.consultant_name : ""}</div></div>) },
    { key: "est_value", label: "Est. Value", sortable: true, render: (x) => <div>{fmt(x.est_value)} <span className="muted">{x.currency}</span></div> },
    { key: "due_date", label: "Due", sortable: true, render: (x) => dstr(x.due_date) },
    { key: "assigned_to", label: "Estimator", render: (x) => x.assigned_to || "—" },
    { key: "status", label: "Status", sortable: true, render: (x) => <span className={"badge " + x.status}>{x.status}</span> },
    { key: "actions", label: "", render: (x) => (
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
        {x.status === "New" && <button className="btn ghost sm" onClick={() => quickTransition(x.id, "UnderReview")}>Review</button>}
        {x.status === "UnderReview" && <button className="btn ghost sm" onClick={() => quickTransition(x.id, "Estimated")}>Estimated</button>}
        <a className="btn ghost sm" href={"/enquiries/" + x.id}>Open</a>
      </div>
    ) },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "enquiries")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "enquiries")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginBottom: 10 }}>Register enquiry</h3>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
            <div style={{ gridColumn: "span 2" }}><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><label className="label">Client</label><input className="input" list="enq-clients" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              <datalist id="enq-clients">{customers.map((c) => (<option key={c.id} value={c.name} />))}</datalist></div>
            <div><label className="label">Consultant</label><input className="input" value={form.consultant_name} onChange={(e) => setForm({ ...form, consultant_name: e.target.value })} /></div>
            <div><label className="label">Source</label><select className="select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{["Client", "Consultant", "Portal", "Referral", "Repeat", "Other"].map((x) => (<option key={x}>{x}</option>))}</select></div>
            <div><label className="label">Currency</label><select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}</select></div>
            <div><label className="label">Est. value</label><input className="input" type="number" step="0.01" value={form.est_value} onChange={(e) => setForm({ ...form, est_value: e.target.value })} /></div>
            <div><label className="label">Received</label><input className="input" type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
            <div><label className="label">Due date</label><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><label className="label">Estimator</label><input className="input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
            <div><label className="label">Win probability %</label><input className="input" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit" disabled={busy}>{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "New", "UnderReview", "Inspected", "Estimated", "Quoted", "Won", "Lost", "Dropped"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 150 }} value={source} onChange={(e) => setSource(e.target.value)}>
          {["", "Client", "Consultant", "Portal", "Referral", "Repeat", "Other"].map((s) => (<option key={s} value={s}>{s || "All sources"}</option>))}
        </select>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        sortBy={sortBy} sortDir={sortDir} onSort={onSort}
        selected={selected} onSelect={setSelected} keyOf={(x) => x.id}
        loading={loading} title={t(lang, "enquiries")}
        search={search} searchPlaceholder={t(lang, "search")}
        onSearchChange={(v) => { setSearch(v); setPage(1); clearTimeout(window.__enq); window.__enq = setTimeout(() => load(1, limit), 320); }}
        stats={[{ label: "Total", value: total }, { label: "Pipeline", value: fmt(rows.filter((r) => !["Won", "Lost", "Dropped"].includes(r.status)).reduce((s, r) => s + Number(r.est_value || 0), 0)) }]}
      />
    </div>
  );
}
