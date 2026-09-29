"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Proposals() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [tenders, setTenders] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [form, setForm] = useState({ tender_id: "", estimation_id: "", title: "", client_name: "", currency: "SAR", amount: 0, validity_days: 90, payment_terms: "Net 30", delivery_terms: "", exclusions: "", cover_letter: "" });

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (status) q.push("status=" + status);
    api.get("/prebid/proposals?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/tenders?limit=200").then((r) => setTenders(r.data.data || [])).catch(() => {});
    api.get("/estimations?limit=200").then((r) => setEstimations(r.data.data || [])).catch(() => {});
    load(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit); }, [status]);

  const create = async (e) => {
    e.preventDefault(); setMsg("");
    try {
      const payload = { ...form, amount: Number(form.amount || 0), validity_days: Number(form.validity_days || 0) };
      if (!payload.tender_id) delete payload.tender_id;
      if (!payload.estimation_id) delete payload.estimation_id;
      const r = await api.post("/prebid/proposals", payload);
      window.location.href = "/proposals/" + r.data.data.id;
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };

  const columns = [
    { key: "number", label: "Proposal No", render: (x) => <a href={"/proposals/" + x.id}><b style={{ fontWeight: 500 }}>{x.number} <span className="muted">R{x.revision}</span></b></a> },
    { key: "title", label: "Title / Client", render: (x) => (<div>{x.title}<div className="muted" style={{ fontSize: 11 }}>{x.client_name || ""} {x.tender ? "· " + x.tender.number : ""}</div></div>) },
    { key: "amount", label: "Amount", render: (x) => <div>{fmt(x.amount)} <span className="muted">{x.currency}</span></div> },
    { key: "valid_until", label: "Valid Until", render: (x) => (x.valid_until ? new Date(x.valid_until).toLocaleDateString("en-GB") : "—") },
    { key: "status", label: "Status", render: (x) => <span className={"badge " + x.status}>{x.status}</span> },
    { key: "actions", label: "", render: (x) => <a className="btn ghost sm" href={"/proposals/" + x.id}>Open</a> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "proposals")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "proposals")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
            <div style={{ gridColumn: "span 2" }}><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><label className="label">From tender</label><select className="select" value={form.tender_id} onChange={(e) => setForm({ ...form, tender_id: e.target.value })}><option value="">—</option>{tenders.map((x) => (<option key={x.id} value={x.id}>{x.number} — {x.title}</option>))}</select></div>
            <div><label className="label">From estimation</label><select className="select" value={form.estimation_id} onChange={(e) => setForm({ ...form, estimation_id: e.target.value })}><option value="">—</option>{estimations.map((x) => (<option key={x.id} value={x.id}>{x.number} — R{x.revision}</option>))}</select></div>
            <div><label className="label">Client</label><input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><label className="label">Amount</label><input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="label">Currency</label><select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}</select></div>
            <div><label className="label">Validity (days)</label><input className="input" type="number" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} /></div>
            <div><label className="label">Payment terms</label><input className="input" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label className="label">Cover letter</label><textarea className="input" rows={2} value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <select className="select" style={{ maxWidth: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Draft", "Sent", "Accepted", "Rejected", "Expired"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
        </select>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        selected={selected} onSelect={setSelected} keyOf={(x) => x.id}
        loading={loading} title={t(lang, "proposals")}
        search={search} searchPlaceholder={t(lang, "search")}
        onSearchChange={(v) => { setSearch(v); setPage(1); clearTimeout(window.__pr); window.__pr = setTimeout(() => load(1, limit), 320); }}
        stats={[{ label: "Total", value: total }]}
      />
    </div>
  );
}
