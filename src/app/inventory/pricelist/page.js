"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const emptyForm = { name: "", name_ar: "", description: "", currency: "SAR", is_default: false, is_active: true };

function PriceListDrawer({ editRow, onClose, onSaved }) {
  const { lang } = useAppStore();
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editRow) setForm({ name: editRow.name || "", name_ar: editRow.name_ar || "", description: editRow.description || "", currency: editRow.currency || "SAR", is_default: !!editRow.is_default, is_active: editRow.is_active !== false });
    else setForm(emptyForm);
    setMsg("");
  }, [editRow]);

  const save = async () => {
    if (!form.name.trim()) { setMsg("Price list name required"); return; }
    setBusy(true); setMsg("");
    try {
      if (editRow) await api.put("/procurement/pricelists/" + editRow.id, form);
      else await api.post("/procurement/pricelists", form);
      onSaved();
    } catch (e) { setMsg(e?.response?.data?.message || "Failed to save"); }
    finally { setBusy(false); }
  };

  return (
    <div className="bigin-drawer-overlay" onClick={onClose}>
      <div className="bigin-drawer" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="bigin-drawer-head">
          <div className="bigin-drawer-title-wrap">
            <span className="badge InProgress">Price List</span>
            <div>
              <h3 className="bigin-drawer-title">{editRow ? form.name : "New Price List"}</h3>
              <span style={{ fontSize: 11.5, color: "#64748b" }}>Name, Arabic name & description</span>
            </div>
          </div>
          <button type="button" className="bigin-drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {msg && <div className="alert err" style={{ margin: "12px 20px 0" }}>{msg}</div>}
        <div className="bigin-drawer-body">
          <div className="bigin-form-section">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="bigin-form-field">
                <label>Price List Name <span className="req">*</span></label>
                <input className="bigin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Contractor" />
              </div>
              <div className="bigin-form-field">
                <label>Price List Name Arabic</label>
                <input className="bigin-input" dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </div>
              <div className="bigin-form-field">
                <label>Description</label>
                <textarea className="bigin-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="bigin-form-field">
                <label>Currency</label>
                <select className="bigin-input" style={{ maxWidth: 160 }} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}
                </select>
              </div>
              <div className="bigin-form-field">
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
                  <span>Default price list</span>
                </label>
              </div>
              <div className="bigin-form-field">
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
                  <span>{t(lang, "activeLbl")}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="bigin-drawer-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={onClose}>{t(lang, "closeLbl")}</button>
          <button type="button" className="btn" style={{ background: "#0ba360", borderColor: "#0ba360", fontWeight: 600 }} disabled={busy} onClick={save}>
            {busy ? "..." : t(lang, "saveLbl").toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PriceListsPage() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null); // null | {mode:'create'} | {mode:'edit', row}

  const load = () => {
    setLoading(true);
    const q = search ? "?search=" + encodeURIComponent(search) : "";
    api.get("/procurement/pricelists" + q).then((r) => { setRows(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { clearTimeout(window.__pl); window.__pl = setTimeout(load, 320); /* eslint-disable-next-line */ }, [search]);

  const remove = async (r) => {
    if (!window.confirm(t(lang, "confirmDelete") + " — " + r.name)) return;
    setMsg(""); setOk("");
    try { await api.delete("/procurement/pricelists/" + r.id); setOk("Deleted"); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const toggleActive = async (r) => {
    try { await api.put("/procurement/pricelists/" + r.id, { is_active: !r.is_active }); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };

  const columns = [
    {
      key: "name", label: t(lang, "nameLbl"),
      render: (r) => (<div><span style={{ fontWeight: 700 }}>{r.name}</span>
        {r.is_default && <span className="badge Approved sm" style={{ marginInlineStart: 8 }}>default</span>}
        {r.name_ar && <div className="muted" style={{ fontSize: 11 }} dir="rtl">{r.name_ar}</div>}</div>),
    },
    { key: "description", label: t(lang, "descLbl"), render: (r) => (<span className="muted">{r.description || "—"}</span>) },
    { key: "currency", label: "Currency", render: (r) => r.currency || "SAR" },
    { key: "items_using", label: t(lang, "itemsUsing"), render: (r) => (<b>{r.items_using ?? "—"}</b>) },
    { key: "status", label: t(lang, "statusLbl"), render: (r) => (r.is_active ? <span className="badge Approved sm">{t(lang, "activeLbl")}</span> : <span className="badge Draft sm">{t(lang, "inactiveLbl")}</span>) },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          <button className="btn ghost sm" onClick={() => setDrawer({ mode: "edit", row: r })}>{t(lang, "openLbl")}</button>
          <button className="btn ghost sm" onClick={() => toggleActive(r)}>{r.is_active ? "⊘" : "✓"}</button>
          <button className="btn ghost sm" onClick={() => remove(r)}>×</button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {msg && <div className="alert err" style={{ margin: "10px 24px" }} onClick={() => setMsg("")}>{msg}</div>}
      {ok && <div className="alert ok" style={{ margin: "10px 24px" }} onClick={() => setOk("")}>{ok}</div>}
      <DataTable
        columns={columns} rows={rows} total={rows.length} page={1} limit={rows.length || 10}
        loading={loading} title={t(lang, "priceLists")}
        searchPlaceholder={t(lang, "search")} searchValue={search} onSearchChange={setSearch}
        primaryAction={{ label: "+ " + t(lang, "priceLists"), onClick: () => setDrawer({ mode: "create" }) }}
        onAdd={() => setDrawer({ mode: "create" })} addLabel={t(lang, "priceLists")}
        stats={[{ label: t(lang, "priceLists"), value: rows.length }]}
      />
      {drawer && (
        <PriceListDrawer
          editRow={drawer.mode === "edit" ? drawer.row : null}
          onClose={() => setDrawer(null)}
          onSaved={() => { setDrawer(null); setOk("Saved"); load(); }}
        />
      )}
    </div>
  );
}
