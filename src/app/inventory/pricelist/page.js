"use client";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

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
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{editRow ? form.name || "Price List" : "Price List"}</h3>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        {msg && <div className="alert err" style={{ margin: "14px 22px 0" }}>{msg}</div>}
        <div className="modal-body">
          <div className="bigin-form-field">
            <label>Price List Name <span className="req">*</span></label>
            <input className="bigin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="bigin-form-field">
            <label>Price List Name Arabic</label>
            <input className="bigin-input" dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          </div>
          <div className="bigin-form-field">
            <label>Description</label>
            <textarea className="bigin-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div className="bigin-form-field" style={{ maxWidth: 150 }}>
              <label>Currency</label>
              <select className="bigin-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}
              </select>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
              <span>Default price list</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
              <span>{t(lang, "activeLbl")}</span>
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>{t(lang, "closeLbl")}</button>
          <button type="button" className="btn" style={{ background: "#0ba360", borderColor: "#0ba360", fontWeight: 700 }} disabled={busy} onClick={save}>
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
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("ASC");
  const [currentView, setCurrentView] = useState("all");
  const [activeOnly, setActiveOnly] = useState("");
  const [drawer, setDrawer] = useState(null); // null | {mode:'create'} | {mode:'edit', row}

  const load = (sb = sortBy, sd = sortDir, act = activeOnly) => {
    setLoading(true);
    const q = [`sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (act === "active") q.push("active=1");
    if (act === "inactive") q.push("active=0");
    api.get("/procurement/pricelists?" + q.join("&")).then((r) => { setRows(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { setSelected([]); load(sortBy, sortDir, activeOnly); /* eslint-disable-next-line */ }, [activeOnly]);

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k); setSortDir(nd); load(k, nd, activeOnly);
  };

  const handleViewChange = (vKey) => {
    setCurrentView(vKey);
    setSelected([]);
    setActiveOnly(vKey === "active" ? "active" : vKey === "inactive" ? "inactive" : "");
  };

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
  const bulkActive = (val) => {
    if (!window.confirm(`${val ? "Activate" : "Deactivate"} ${selected.length} price list(s)?`)) return;
    Promise.all(selected.map((r) => api.put("/procurement/pricelists/" + r.id, { is_active: val })))
      .then(() => { setOk(`${selected.length} updated`); setSelected([]); load(); })
      .catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };

  const views = useMemo(() => ([
    { key: "all", label: "All Price Lists", count: rows.length },
    { key: "active", label: "Active", count: rows.filter((r) => r.is_active).length },
    { key: "inactive", label: "Inactive", count: rows.filter((r) => !r.is_active).length },
  ]), [rows]);

  const def = rows.find((r) => r.is_default);

  const columns = [
    {
      key: "name",
      label: "Price List",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar
            name={r.name}
            subline={`${r.name_ar || "No Arabic name"}${r.description ? " · " + String(r.description).slice(0, 60) : ""}`}
            size={34}
            color="#0ba360"
          />
        </div>
      ),
    },
    {
      key: "currency",
      label: "Currency",
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 650, color: "#0f172a" }}>{r.currency || "SAR"}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{r.is_default ? "System default list" : "Standard list"}</div>
        </div>
      ),
    },
    {
      key: "items_using",
      label: "Items Priced",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{r.items_using ?? "—"}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>item price rows</div>
        </div>
      ),
    },
    {
      key: "is_default",
      label: "Default",
      render: (r) => (r.is_default
        ? <span className="badge Approved">Default</span>
        : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>),
    },
    {
      key: "status",
      label: "Lifecycle Stage",
      render: (r) => (r.is_active
        ? <span className="badge Approved">{t(lang, "activeLbl")}</span>
        : <span className="badge Draft">{t(lang, "inactiveLbl")}</span>),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn ghost sm" style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => setDrawer({ mode: "edit", row: r })}>{t(lang, "openLbl")}</button>
          <button type="button" className="btn ghost sm" style={{ fontSize: 11, padding: "3px 8px" }}
            title={r.is_active ? t(lang, "deactivateLbl") : t(lang, "activateLbl")}
            onClick={() => toggleActive(r)}>{r.is_active ? "⊘" : "✓"}</button>
          <button type="button" className="btn ghost sm" style={{ fontSize: 11, padding: "3px 8px", color: "#dc2626", borderColor: "#fecaca" }}
            onClick={() => remove(r)}>×</button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {msg && <div className="alert err" style={{ margin: "14px 24px 0" }} onClick={() => setMsg("")}>{msg}</div>}
      {ok && <div className="alert ok" style={{ margin: "14px 24px 0" }} onClick={() => setOk("")}>{ok}</div>}

      {/* 2. ZOHO BIGIN DATA TABLE */}
      <DataTable
        columns={columns}
        rows={rows}
        total={rows.length}
        page={1}
        limit={rows.length || 10}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        keyOf={(r) => r.id}
        loading={loading}
        title="Inventory Price Lists"
        views={views}
        activeView={currentView}
        onViewChange={handleViewChange}
        search={search}
        searchPlaceholder="Search by list name..."
        onSearchChange={(v) => {
          setSearch(v);
          clearTimeout(window.__pl);
          window.__pl = setTimeout(() => load(sortBy, sortDir, activeOnly), 300);
        }}
        rightActions={
          <button type="button" className="btn sm" onClick={() => setDrawer({ mode: "create" })} style={{ height: 32, fontSize: 12 }}>
            + New Price List
          </button>
        }
        bulkActions={[
          { key: "a", label: "Activate", icon: "✓", onClick: () => bulkActive(true) },
          { key: "d", label: "Deactivate", icon: "⊘", onClick: () => bulkActive(false) },
        ]}
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
