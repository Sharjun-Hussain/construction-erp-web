"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const empty = { code: "", name: "", name_ar: "", vat_number: "", cr_number: "", phone: "", email: "", address: "", city: "Riyadh", payment_terms: "", credit_limit: 0 };

export default function Customers() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("ASC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(empty);
  const [stmt, setStmt] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir, sq = search) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (sq) q.push("search=" + encodeURIComponent(sq));
    api.get("/customers?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(1, 10, "name", "ASC", ""); }, []);

  const openCreate = () => { setForm(empty); setStmt(null); setDrawer({ mode: "create" }); };
  const openDetail = (c) => {
    api.get("/customers/" + c.id).then((r) => {
      const d = r.data.data;
      setForm({ code: d.code || "", name: d.name || "", name_ar: d.name_ar || "", vat_number: d.vat_number || "", cr_number: d.cr_number || "", phone: d.phone || "", email: d.email || "", address: d.address || "", city: d.city || "Riyadh", payment_terms: d.payment_terms || "", credit_limit: d.credit_limit || 0 });
      setDrawer({ mode: "edit", row: d });
    }).catch(() => {});
    api.get("/customers/" + c.id + "/statement").then((r) => setStmt(r.data.data)).catch(() => {});
  };
  const fs = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const body = { ...form, credit_limit: Number(form.credit_limit || 0) };
      if (drawer.mode === "create") await api.post("/customers", body);
      else await api.put("/customers/" + drawer.row.id, body);
      setDrawer(null); setSelected([]); load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(t(lang, "confirmDelete"))) return;
    try { await api.delete("/customers/" + drawer.row.id); setDrawer(null); load(); }
    catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k); setSortDir(nd); load(page, limit, k, nd);
  };

  const columns = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: t(lang, "memberName"), sortable: true, render: (c) => <BiginAvatar name={c.name} color="#1d5bd8" /> },
    { key: "vat_number", label: "VAT", render: (c) => c.vat_number || "-" },
    { key: "phone", label: t(lang, "phone"), render: (c) => c.phone || "-" },
    { key: "city", label: "City", sortable: true, render: (c) => c.city || "-" },
    { key: "actions", label: "", render: (c) => <button className="btn ghost sm" onClick={() => openDetail(c)}>{t(lang, "viewDetails")}</button> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head"><div><h2>{t(lang, "customers")}</h2></div><span className="spacer" /></div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit, sortBy, sortDir); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l, sortBy, sortDir); }}
        sortBy={sortBy} sortDir={sortDir} onSort={onSort}
        selected={selected} onSelect={setSelected} keyOf={(c) => c.id}
        loading={loading}
        title={t(lang, "customers")}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); clearTimeout(window.__cq); window.__cq = setTimeout(() => load(1, limit, sortBy, sortDir, val), 300); }}
        onAdd={openCreate}
        addLabel={"+ " + t(lang, "newCustomer")}
        stats={[{ label: t(lang, "customers"), value: total }]}
      />

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.mode === "create" ? t(lang, "newCustomer") : drawer.row.name}</h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div><label className="label">Code *</label><input className="input" value={form.code} onChange={fs("code")} required /></div>
                <div><label className="label">{t(lang, "memberName")} *</label><input className="input" value={form.name} onChange={fs("name")} required /></div>
                <div><label className="label">Name (AR)</label><input className="input" value={form.name_ar} onChange={fs("name_ar")} /></div>
                <div><label className="label">City</label><input className="input" value={form.city} onChange={fs("city")} /></div>
                <div><label className="label">VAT</label><input className="input" dir="ltr" value={form.vat_number} onChange={fs("vat_number")} /></div>
                <div><label className="label">CR</label><input className="input" dir="ltr" value={form.cr_number} onChange={fs("cr_number")} /></div>
                <div><label className="label">{t(lang, "phone")}</label><input className="input" dir="ltr" value={form.phone} onChange={fs("phone")} /></div>
                <div><label className="label">{t(lang, "email")}</label><input className="input" dir="ltr" value={form.email} onChange={fs("email")} /></div>
                <div><label className="label">{t(lang, "paymentTerms")}</label><input className="input" value={form.payment_terms} onChange={fs("payment_terms")} /></div>
                <div><label className="label">Credit limit</label><input className="input" type="number" value={form.credit_limit} onChange={fs("credit_limit")} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label className="label">{t(lang, "address")}</label><input className="input" value={form.address} onChange={fs("address")} /></div>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button className="btn" type="submit" disabled={busy}>{busy ? "..." : t(lang, "save")}</button>
                {drawer.mode === "edit" && <button className="btn danger sm" type="button" onClick={del}>{t(lang, "deleteLbl")}</button>}
              </div>
            </form>
            {stmt && drawer.mode === "edit" && (
              <div className="card" style={{ marginTop: 14 }}>
                <h3>{t(lang, "statementLbl")}</h3>
                <div className="grid stats">
                  <div className="stat"><div className="k">{t(lang, "contractValue")}</div><div className="v" style={{ fontSize: 17 }}>{Number(stmt.contract_total || 0).toLocaleString()}</div></div>
                  <div className="stat"><div className="k">{t(lang, "billed")}</div><div className="v" style={{ fontSize: 17 }}>{Number(stmt.billed_paid || 0).toLocaleString()}</div></div>
                  <div className="stat"><div className="k">{t(lang, "outstandingLbl")}</div><div className="v" style={{ fontSize: 17 }}>{Number(stmt.outstanding || 0).toLocaleString()}</div></div>
                  <div className="stat"><div className="k">{t(lang, "balance")}</div><div className="v" style={{ fontSize: 17 }}>{Number(stmt.advances_balance || 0).toLocaleString()}</div></div>
                </div>
                <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>{t(lang, "projects")}: {(stmt.projects || []).map((p) => p.code).join(", ") || "-"}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
