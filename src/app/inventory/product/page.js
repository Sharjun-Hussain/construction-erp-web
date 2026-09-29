"use client";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const TABS = ["general", "details", "prices", "specs", "images"];
const ACCOUNTS_INV = ["Inventory Asset", "Inventory In Transit", "Consumables Stock"];
const ACCOUNTS_INC = ["Sales of Product Income", "Sales of Service Income", "Other Income"];
const ACCOUNTS_EXP = ["Cost Of Sales", "Cost Of Service", "Project Expenses"];

// ---------- mini rich text (bold/italic/underline/lists) ----------
function RichText({ value, onChange, rows }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || ""; }, []);
  const cmd = (c, v) => { ref.current?.focus(); document.execCommand(c, false, v); onChange(ref.current.innerHTML); };
  const B = ({ c, label, style }) => (
    <button type="button" title={label} onMouseDown={(e) => { e.preventDefault(); cmd(c); }}
      style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, padding: "3px 7px", fontWeight: style?.bold ? 800 : 400, fontStyle: style?.italic ? "italic" : "normal", textDecoration: style?.underline ? "underline" : "none" }}>{label}</button>
  );
  return (
    <div style={{ border: "1px solid #d4dcea", borderRadius: 9, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #e8edf5", padding: "4px 6px", background: "#f8fafc" }}>
        <B c="bold" label="B" style={{ bold: true }} /><B c="italic" label="I" style={{ italic: true }} /><B c="underline" label="U" style={{ underline: true }} />
        <B c="insertUnorderedList" label="☰" /><B c="insertOrderedList" label="1." />
        <B c="removeFormat" label="⌫" />
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={() => onChange(ref.current.innerHTML)}
        style={{ minHeight: rows ? rows * 22 : 110, padding: "10px 12px", fontSize: 13.5, outline: "none" }} />
    </div>
  );
}

const stripHtml = (h) => (h || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const emptyForm = {
  code: "", description: "", name_ar: "",
  is_service: false, is_taxable: true, is_sellable: true, is_purchasable: true,
  category: "", manufacturer: "", manufacturer_part_no: "", model_no: "", suffix: "",
  description_ar: "", vat_rate_id: "", inventory_account: "Inventory Asset",
  income_account: "Sales of Product Income", expense_account: "Cost Of Sales",
  preferred_supplier_id: "", discount_pct: 0, lead_time_days: 0, lead_time_unit: "Days",
  department: "", has_tolerance: false, tolerance_pct: 0,
  unit: "NOS", purchase_unit: "", conversion_factor: 1, barcode: "", brand: "",
  country_of_origin: "", weight_kg: 0, length_m: 0, width_m: 0, height_m: 0,
  min_qty: 0, max_qty: 0, reorder_qty: 0,
  batch_tracking: false, serial_tracking: false, expiry_tracking: false, shelf_life_days: 0,
  purchase_price: 0, sell_price: 0, is_active: true,
  limit_price_as_cost: false, default_warehouse: "", default_locator: "",
  min_purchase_qty: 0, purchase_qty_uom: "", min_stock_uom: "", max_stock_uom: "",
  opening_date: "",
};

// image thumbnail with authenticated blob preview
function ImgThumb({ img, onDelete }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true; let obj = null;
    api.get("/documents/" + img.id + "/download", { responseType: "blob" })
      .then((r) => { obj = URL.createObjectURL(r.data); if (alive) setUrl(obj); })
      .catch(() => {});
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
  }, [img.id]);
  return (
    <div className="card" style={{ padding: 10, textAlign: "center" }}>
      {url
        ? <img src={url} alt={img.file_name} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
        : <div style={{ fontSize: 34 }}>🖼️</div>}
      <div style={{ fontSize: 12, wordBreak: "break-all", margin: "6px 0" }}>{img.file_name}</div>
      <div className="muted" style={{ fontSize: 11 }}>{img.size ? Math.round(img.size / 1024) + " KB" : ""}</div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
        <a className="btn ghost sm" href={`/api/v1/documents/${img.id}/download`} target="_blank" rel="noreferrer">↓</a>
        <button type="button" className="btn ghost sm" style={{ color: "#e11d48" }} onClick={onDelete}>×</button>
      </div>
    </div>
  );
}

const IMG_PLACEHOLDER = (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <rect x="8" y="8" width="104" height="104" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
    <line x1="60" y1="8" x2="34" y2="34" stroke="#94a3b8" strokeWidth="2" />
    <line x1="60" y1="8" x2="86" y2="34" stroke="#94a3b8" strokeWidth="2" />
    <circle cx="60" cy="8" r="4" fill="#94a3b8" />
    <rect x="30" y="38" width="60" height="48" rx="2" fill="#fff" stroke="#475569" strokeWidth="2.5" />
    <circle cx="42" cy="52" r="6" fill="#fbbf24" />
    <path d="M30 78l14-18 10 12 8-9 12 15H30z" fill="#34d399" />
    <path d="M30 78l14-18 10 12 4-4.5V78H30z" fill="#0ea5e9" opacity="0.55" />
  </svg>
);

// ================= New / Edit Item drawer =================
function ItemDrawer({ editId, onClose, onSaved, onDraftCreated, lookups, vatRates, suppliers, pricelists, refreshLookups, refreshPricelists }) {
  const { lang } = useAppStore();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(emptyForm);
  const [prices, setPrices] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [images, setImages] = useState([]);
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPrice, setNewPrice] = useState({ price_list: "Standard", currency: "SAR", unit_price: "", min_qty: 1, markup_pct: 0, effective_from: "" });
  const [newSpec, setNewSpec] = useState({ attr_name: "", attr_value: "" });
  const [newUom, setNewUom] = useState({ uom: "", is_base: false, conversion_to_base: 1, markup_pct: 0, purchase_price: "", cost_price: "", sales_price: "", limit_price: "", is_default_sales: false, is_default_purchase: false });
  const [newStock, setNewStock] = useState({ warehouse: "", locator: "", qty: "", uom: "" });
  const isEdit = !!editId;

  useEffect(() => {
    if (isEdit) {
      api.get("/procurement/items/" + editId).then((r) => {
        const d = r.data.data;
        setDetail(d);
        setForm({ ...emptyForm, ...d, preferred_supplier_id: d.preferred_supplier_id || "" });
        setPrices(d.prices || []);
        setSpecs(d.specs || []);
        setUoms(d.uoms || []);
        setStocks(d.stocks || []);
        setImages(d.images || []);
      }).catch(() => setMsg("Failed to load item"));
    } else {
      setForm(emptyForm); setPrices([]); setSpecs([]); setUoms([]); setStocks([]); setImages([]); setDetail(null);
      setTab("general");
    }
    setMsg("");
  }, [editId]);

  useEffect(() => {
    if ((pricelists || []).length && !pricelists.some((x) => x.name === newPrice.price_list)) {
      const def = pricelists.find((x) => x.is_default) || pricelists[0];
      setNewPrice((p) => ({ ...p, price_list: def.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricelists]);

  const set = (k, v) => setForm({ ...form, [k]: v });
  const quickAdd = async (type, label) => {
    const name = window.prompt("New " + label + " name:");
    if (!name) return;
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 20) || ("X" + Date.now().toString().slice(-4));
    try {
      await api.post("/masters/lookup/" + type, { code, name });
      refreshLookups();
    } catch (e) { setMsg(e?.response?.data?.message || "Failed"); }
  };
  const quickAddPriceList = async () => {
    const name = window.prompt("New price list name:");
    if (!name?.trim()) return;
    try {
      await api.post("/procurement/pricelists", { name: name.trim() });
      await refreshPricelists();
      setNewPrice((p) => ({ ...p, price_list: name.trim() }));
    } catch (e) { setMsg(e?.response?.data?.message || "Failed"); }
  };
  const payload = () => {
    const p = { ...form };
    for (const k of ["discount_pct", "tolerance_pct", "conversion_factor", "weight_kg", "length_m", "width_m", "height_m", "max_qty", "reorder_qty", "min_qty", "purchase_price", "sell_price", "lead_time_days", "shelf_life_days", "min_purchase_qty"]) p[k] = Number(p[k] || 0);
    if (!p.code) delete p.code;
    if (!p.vat_rate_id) delete p.vat_rate_id;
    if (!p.preferred_supplier_id) delete p.preferred_supplier_id;
    if (!p.purchase_unit) delete p.purchase_unit;
    for (const k of ["default_warehouse", "default_locator", "purchase_qty_uom", "min_stock_uom", "max_stock_uom", "opening_date"]) if (!p[k]) delete p[k];
    p.description = stripHtml(p.description) || form.description;
    if (!isEdit) {
      p.prices = prices.filter((x) => Number(x.unit_price) > 0).map((x) => ({ ...x, unit_price: Number(x.unit_price), min_qty: Number(x.min_qty || 1), markup_pct: Number(x.markup_pct || 0), id: undefined }));
      p.specs = specs.filter((x) => x.attr_name).map((x) => ({ attr_name: x.attr_name, attr_value: x.attr_value }));
      p.uoms = uoms.filter((x) => x.uom).map((x) => ({ ...x, id: undefined }));
      p.stocks = stocks.filter((x) => x.warehouse && Number(x.qty) > 0).map((x) => ({ ...x, id: undefined }));
    }
    return p;
  };

  const save = async (stayOpen) => {
    if (!stripHtml(form.description)) { setMsg("Item name required"); setTab("general"); return null; }
    setBusy(true); setMsg("");
    try {
      let id = editId;
      if (isEdit) {
        await api.put("/procurement/items/" + editId, payload());
        if (!stayOpen) onSaved(id);
      } else {
        const r = await api.post("/procurement/items", payload());
        id = r.data.data.id;
        if (stayOpen && onDraftCreated) onDraftCreated(id);
        else onSaved(id);
      }
      return id;
    } catch (e) { setMsg(e?.response?.data?.message || "Failed to save"); return null; }
    finally { setBusy(false); }
  };

  const saveAndNext = async () => {
    const id = await save(true);
    if (id && TABS.indexOf(tab) < TABS.length - 1) setTab(TABS[TABS.indexOf(tab) + 1]);
  };
  const addPriceApi = async () => {
    if (!newPrice.unit_price) return;
    try {
      const r = await api.post(`/procurement/items/${editId}/prices`, { ...newPrice, unit_price: Number(newPrice.unit_price), min_qty: Number(newPrice.min_qty || 1), markup_pct: Number(newPrice.markup_pct || 0) });
      setPrices([...prices, r.data.data]); setNewPrice({ price_list: "Standard", currency: "SAR", unit_price: "", min_qty: 1, markup_pct: 0, effective_from: "" });
    } catch (e) { setMsg(e?.response?.data?.message || "Failed"); }
  };
  const delPriceApi = async (pid) => {
    await api.delete(`/procurement/items/prices/${pid}`);
    setPrices(prices.filter((x) => x.id !== pid));
  };
  const addSpecApi = async () => {
    if (!newSpec.attr_name) return;
    const r = await api.post(`/procurement/items/${editId}/specs`, newSpec);
    setSpecs([...specs, r.data.data]); setNewSpec({ attr_name: "", attr_value: "" });
  };
  const delSpecApi = async (sid) => {
    await api.delete(`/procurement/items/specs/${sid}`);
    setSpecs(specs.filter((x) => x.id !== sid));
  };
  const numUom = (u) => ({
    ...u,
    conversion_to_base: Number(u.conversion_to_base || 1), markup_pct: Number(u.markup_pct || 0),
    purchase_price: Number(u.purchase_price || 0), cost_price: Number(u.cost_price || 0),
    sales_price: Number(u.sales_price || 0), limit_price: Number(u.limit_price || 0),
  });
  const pushUom = (row) => {
    // single base / single defaults, like the server
    let rows = [...uoms];
    if (row.is_base) rows = rows.map((x) => ({ ...x, is_base: false }));
    if (row.is_default_sales) rows = rows.map((x) => ({ ...x, is_default_sales: false }));
    if (row.is_default_purchase) rows = rows.map((x) => ({ ...x, is_default_purchase: false }));
    if (form.limit_price_as_cost && row.cost_price !== undefined) row.limit_price = row.cost_price;
    return [...rows, row];
  };
  const addUomRow = async () => {
    if (!newUom.uom) { setMsg("Select a UOM first"); return; }
    setMsg("");
    const row = numUom({ ...newUom });
    if (isEdit) {
      try {
        await api.post(`/procurement/items/${editId}/uoms`, row);
        const d = await api.get("/procurement/items/" + editId);
        setUoms(d.data.data.uoms || []);
      } catch (e) { setMsg(e?.response?.data?.message || "Failed"); }
    } else {
      setUoms(pushUom({ ...row, id: "tmp" + Date.now() }));
    }
    setNewUom({ uom: "", is_base: uoms.length === 0, conversion_to_base: 1, markup_pct: 0, purchase_price: "", cost_price: "", sales_price: "", limit_price: "", is_default_sales: false, is_default_purchase: false });
  };
  const delUomRow = async (u) => {
    if (isEdit && !String(u.id).startsWith("tmp")) {
      try { await api.delete(`/procurement/items/uoms/${u.id}`); } catch (e) { setMsg(e?.response?.data?.message || "Failed"); return; }
    }
    setUoms(uoms.filter((x) => x.id !== u.id));
    if (isEdit) api.get("/procurement/items/" + editId).then((r) => setUoms(r.data.data.uoms || [])).catch(() => {});
  };
  const addStockRow = async () => {
    if (!newStock.warehouse || !(Number(newStock.qty) > 0)) { setMsg("Warehouse and quantity required"); return; }
    setMsg("");
    const row = { warehouse: newStock.warehouse, locator: newStock.locator || null, qty: Number(newStock.qty), uom: newStock.uom || form.unit };
    if (isEdit) {
      try {
        const r = await api.post(`/procurement/items/${editId}/stocks`, row);
        setStocks([...stocks, r.data.data]);
      } catch (e) { setMsg(e?.response?.data?.message || "Failed"); return; }
    } else {
      setStocks([...stocks, { ...row, id: "tmp" + Date.now() }]);
    }
    setNewStock({ warehouse: "", locator: "", qty: "", uom: "" });
  };
  const delStockRow = async (s) => {
    if (isEdit && !String(s.id).startsWith("tmp")) {
      try { await api.delete(`/procurement/items/stocks/${s.id}`); } catch (e) { setMsg(e?.response?.data?.message || "Failed"); return; }
    }
    setStocks(stocks.filter((x) => x.id !== s.id));
  };
  const uploadImage = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f); fd.append("entity_type", "item"); fd.append("entity_id", editId);
    try {
      await api.post("/documents/upload", fd);
      const d = await api.get("/procurement/items/" + editId);
      setImages(d.data.data.images || []);
    } catch (err) { setMsg(err?.response?.data?.message || "Upload failed"); }
    e.target.value = "";
  };
  const delImage = async (imgId) => {
    try {
      await api.delete("/documents/" + imgId);
      setImages(images.filter((x) => x.id !== imgId));
    } catch (err) { setMsg(err?.response?.data?.message || "Failed"); }
  };

  const F = ({ k, children, span, hint }) => (
    <div className="bigin-form-field" style={span ? { gridColumn: "1 / -1" } : undefined}>
      <label>{t(lang, k)}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{hint}</span>}
    </div>
  );
  const Plus = ({ onClick }) => (
    <button type="button" onClick={onClick} title="Quick add"
      style={{ background: "#0ba360", color: "#fff", border: "none", borderRadius: 6, width: 36, height: 38, fontSize: 18, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+</button>
  );
  const Sec = ({ children }) => (
    <div className="bigin-form-section" style={{ marginBottom: 16 }}>
      {children}
    </div>
  );

  const baseUom = (uoms.find((u) => u.is_base)?.uom) || form.unit || "";

  return (
    <div className="bigin-drawer-overlay" onClick={onClose}>
      <div className="bigin-drawer sheet-wide item-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bigin-drawer-head" style={{ padding: "10px 20px" }}>
          <div className="bigin-drawer-title-wrap" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={"badge " + (isEdit ? (form.is_active ? "Approved" : "Draft") : "InProgress")}>
              {isEdit ? form.code : "New Item"}
            </span>
            <h3 className="bigin-drawer-title" style={{ margin: 0, fontSize: 16 }}>
              {isEdit ? (stripHtml(form.description).slice(0, 60) || form.code) : t(lang, "newItem")}
            </h3>
          </div>
          <button type="button" className="bigin-drawer-close" onClick={onClose} aria-label="Close drawer">×</button>
        </div>
        {msg && <div className="alert err" style={{ margin: "12px 20px 0" }} onClick={() => setMsg("")}>{msg}</div>}

        <div className="bigin-drawer-body">
          {/* Item identity */}
          <Sec title="Item Identity (EN / AR)">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="bigin-form-field">
                <label>{t(lang, "itemName")} <span className="req">*</span></label>
                <input className="bigin-input" value={form.description} placeholder="e.g. Portland Cement Type I (50 KG Bag)"
                  onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div className="bigin-form-field">
                <label>{t(lang, "itemNameAr")}</label>
                <input className="bigin-input" dir="rtl" value={form.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {[["is_service", "serviceItem"], ["is_taxable", "taxable"], ["is_sellable", "sellable"], ["is_purchasable", "purchasable"]].map(([k, lk]) => (
                <label key={k} style={{
                  display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700,
                  padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                  background: form[k] ? "#f0fdf4" : "#f8fafc",
                  border: form[k] ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  color: form[k] ? "#166534" : "#64748b",
                }}>
                  <input type="checkbox" checked={!!form[k]} onChange={(e) => set({ [k]: e.target.checked })} style={{ accentColor: "#0ba360" }} />
                  <span>{t(lang, lk)}</span>
                </label>
              ))}
            </div>
          </Sec>

          {/* Sheet tabs */}
          <div className="bigin-sheet-tabs underline-tabs" style={{ marginTop: 18 }}>
            {TABS.map((tb) => (
              <button key={tb} type="button" className={`bigin-tab-pill ${tab === tb ? "active" : ""}`} onClick={() => setTab(tb)}>
                {t(lang, "itemTab_" + tb)}
                {tb === "prices" && prices.length > 0 ? ` (${prices.length})` : ""}
                {tb === "specs" && specs.length > 0 ? ` (${specs.length})` : ""}
                {tb === "images" && images.length > 0 ? ` (${images.length})` : ""}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
          {tab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Sec title="Coding & Classification">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <F k="itemCode"><input className="bigin-input" placeholder="Auto (ITM-…)" value={form.code} onChange={(e) => set({ code: e.target.value })} /></F>
              <F k="mfrPartNo"><input className="bigin-input" value={form.manufacturer_part_no} onChange={(e) => set({ manufacturer_part_no: e.target.value })} /></F>
              <F k="modelNo"><input className="bigin-input" value={form.model_no} onChange={(e) => set({ model_no: e.target.value })} /></F>
              <F k="suffix"><input className="bigin-input" value={form.suffix} onChange={(e) => set({ suffix: e.target.value })} /></F>
            </div>
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 12 }}>
              <F k="category">
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="bigin-input" value={form.category} onChange={(e) => set({ category: e.target.value })}>
                    <option value="">Select an Option</option>
                    {(lookups.item_category || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                  </select><Plus onClick={() => quickAdd("item_category", "category")} />
                </div>
              </F>
              <F k="manufacture">
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="bigin-input" value={form.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })}>
                    <option value="">Select an Option</option>
                    {(lookups.manufacturer || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                  </select><Plus onClick={() => quickAdd("manufacturer", "manufacturer")} />
                </div>
              </F>
              <F k="vatRate">
                <select className="bigin-input" value={form.vat_rate_id} onChange={(e) => set({ vat_rate_id: e.target.value })}>
                  <option value="">Select an Option</option>
                  {vatRates.map((v) => (<option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>))}
                </select>
              </F>
            </div>
            </Sec>
            <Sec title="Specification-Grade Descriptions">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <F k="itemDesc"><input className="bigin-input" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Full specification-grade description" /></F>
              <F k="itemDescAr"><RichText value={form.description_ar} onChange={(v) => set({ description_ar: v })} rows={4} /></F>
            </div>
            </Sec>
            <Sec title="GL Posting Accounts">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 12 }}>
                <F k="invAccount"><select className="bigin-input" value={form.inventory_account} onChange={(e) => set({ inventory_account: e.target.value })}>{ACCOUNTS_INV.map((x) => (<option key={x}>{x}</option>))}</select></F>
                <F k="incomeAccount"><select className="bigin-input" value={form.income_account} onChange={(e) => set({ income_account: e.target.value })}>{ACCOUNTS_INC.map((x) => (<option key={x}>{x}</option>))}</select></F>
                <F k="expenseAccount"><select className="bigin-input" value={form.expense_account} onChange={(e) => set({ expense_account: e.target.value })}>{ACCOUNTS_EXP.map((x) => (<option key={x}>{x}</option>))}</select></F>
            </div>
            </Sec>
            <Sec title="Commercial Terms">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <F k="supplier">
                <select className="bigin-input" value={form.preferred_supplier_id} onChange={(e) => set({ preferred_supplier_id: e.target.value })}>
                  <option value="">—</option>
                  {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
                </select>
              </F>
              <F k="discountPct"><input className="bigin-input" type="number" step="0.01" value={form.discount_pct} onChange={(e) => set({ discount_pct: e.target.value })} /></F>
              <F k="availability">
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="bigin-input" type="number" value={form.lead_time_days} onChange={(e) => set({ lead_time_days: e.target.value })} />
                  <select className="bigin-input" style={{ maxWidth: 110 }} value={form.lead_time_unit} onChange={(e) => set({ lead_time_unit: e.target.value })}>{["Days", "Weeks", "Months"].map((x) => (<option key={x}>{x}</option>))}</select>
                </div>
              </F>
              <F k="department">
                <select className="bigin-input" value={form.department} onChange={(e) => set({ department: e.target.value })}>
                  <option value="">—</option>
                  {(lookups.department || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                </select>
              </F>
              <div className="bigin-form-field" style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.has_tolerance} onChange={(e) => set({ has_tolerance: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
                  <span>{t(lang, "tolerance")}</span>
                  {form.has_tolerance && (
                    <input className="bigin-input" style={{ maxWidth: 110 }} type="number" step="0.01" value={form.tolerance_pct} onChange={(e) => set({ tolerance_pct: e.target.value })} placeholder="%" />
                  )}
                </label>
              </div>
            </div>
            </Sec>
            </div>
          )}

          {tab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Sec title="Pricing Control">
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.limit_price_as_cost} onChange={(e) => set({ limit_price_as_cost: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
                <span>{t(lang, "limitPriceCost")}</span>
              </label>
            </Sec>
            <Sec title={t(lang, "uomConversions")}>
              <div className="table-wrap"><table className="tbl tbl-classic">
                <colgroup>
                  <col style={{ minWidth: 190 }} />
                  <col style={{ width: 62 }} />
                  <col style={{ width: 88 }} />
                  <col style={{ width: 78 }} />
                  <col span={4} style={{ width: 88 }} />
                  <col style={{ width: 68 }} />
                  <col style={{ width: 68 }} />
                  <col style={{ width: 44 }} />
                </colgroup>
                <thead><tr>
                  <th>UOM</th><th style={{ textAlign: "center" }}>Base UOM</th><th style={{ textAlign: "right" }}>Base<br />Conversion</th>
                  <th style={{ textAlign: "right" }}>Markup %</th><th style={{ textAlign: "right" }}>Purchase Price</th>
                  <th style={{ textAlign: "right" }}>Cost Price</th><th style={{ textAlign: "right" }}>Sales Price</th>
                  <th style={{ textAlign: "right" }}>Limit Price</th><th style={{ textAlign: "center" }}>Default Sales</th>
                  <th style={{ textAlign: "center" }}>Default Purchase</th><th style={{ width: 44 }}></th>
                </tr></thead>
                <tbody>
                  {uoms.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.uom}</td>
                      <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!u.is_base} disabled style={{ accentColor: "#0ba360" }} /></td>
                      <td style={{ textAlign: "right" }}>{Number(u.conversion_to_base || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                      <td style={{ textAlign: "right" }}>{Number(u.markup_pct || 0).toLocaleString()}%</td>
                      <td style={{ textAlign: "right" }}>{Number(u.purchase_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "right" }}>{Number(u.cost_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#0ba360" }}>{Number(u.sales_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "right" }}>{Number(u.limit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!u.is_default_sales} disabled style={{ accentColor: "#0ba360" }} /></td>
                      <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!u.is_default_purchase} disabled style={{ accentColor: "#0ba360" }} /></td>
                      <td style={{ textAlign: "center" }}><button type="button" className="btn ghost sm" style={{ padding: "2px 6px", fontSize: 11, color: "#e11d48" }} onClick={() => delUomRow(u)}>×</button></td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc" }}>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select className="bigin-input" value={newUom.uom} onChange={(e) => setNewUom({ ...newUom, uom: e.target.value })}>
                          <option value="">Select UoM</option>
                          {(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code} — {x.name}</option>))}
                        </select>
                        <button type="button" onClick={addUomRow} title="Add row"
                          style={{ background: "#0ba360", color: "#fff", border: "none", borderRadius: 999, width: 26, height: 26, fontSize: 15, fontWeight: 700, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}>+</button>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!newUom.is_base} onChange={(e) => setNewUom({ ...newUom, is_base: e.target.checked })} style={{ accentColor: "#0ba360" }} /></td>
                    <td><input className="bigin-input" type="number" step="0.0001" value={newUom.conversion_to_base} onChange={(e) => setNewUom({ ...newUom, conversion_to_base: e.target.value })} /></td>
                    <td><input className="bigin-input" type="number" step="0.01" value={newUom.markup_pct} onChange={(e) => setNewUom({ ...newUom, markup_pct: e.target.value })} /></td>
                    <td><input className="bigin-input" type="number" step="0.01" value={newUom.purchase_price} onChange={(e) => setNewUom({ ...newUom, purchase_price: e.target.value })} /></td>
                    <td><input className="bigin-input" type="number" step="0.01" value={newUom.cost_price} onChange={(e) => setNewUom({ ...newUom, cost_price: e.target.value })} /></td>
                    <td><input className="bigin-input" type="number" step="0.01" value={newUom.sales_price} onChange={(e) => setNewUom({ ...newUom, sales_price: e.target.value })} /></td>
                    <td><input className="bigin-input" type="number" step="0.01" value={form.limit_price_as_cost ? (newUom.cost_price || 0) : newUom.limit_price} disabled={form.limit_price_as_cost} onChange={(e) => setNewUom({ ...newUom, limit_price: e.target.value })} /></td>
                    <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!newUom.is_default_sales} onChange={(e) => setNewUom({ ...newUom, is_default_sales: e.target.checked })} style={{ accentColor: "#0ba360" }} /></td>
                    <td style={{ textAlign: "center" }}><input type="checkbox" checked={!!newUom.is_default_purchase} onChange={(e) => setNewUom({ ...newUom, is_default_purchase: e.target.checked })} style={{ accentColor: "#0ba360" }} /></td>
                    <td></td>
                  </tr>
                </tbody></table></div>
            </Sec>
            <Sec title="Warehousing & Stock Levels">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <F k="defaultWarehouse">
                <select className="bigin-input" value={form.default_warehouse} onChange={(e) => set({ default_warehouse: e.target.value })}>
                  <option value="">Select an Option</option>
                  {(lookups.warehouse || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                </select>
              </F>
              <F k="defaultLocator"><input className="bigin-input" value={form.default_locator} onChange={(e) => set({ default_locator: e.target.value })} placeholder="Select an Option" /></F>
              <div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, fontSize: 12, fontWeight: 650, color: "#3b4a63" }}>{t(lang, "minPurchQty")}</label>
                  <label style={{ width: 130, fontSize: 12, fontWeight: 650, color: "#3b4a63" }}>{t(lang, "uomQty")}</label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                  <input className="bigin-input" type="number" step="0.001" value={form.min_purchase_qty} onChange={(e) => set({ min_purchase_qty: e.target.value })} />
                  <select className="bigin-input" style={{ width: 130 }} value={form.purchase_qty_uom} onChange={(e) => set({ purchase_qty_uom: e.target.value })}><option value="">Select UoM</option>{(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code}</option>))}</select>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, fontSize: 12, fontWeight: 650, color: "#3b4a63" }}>{t(lang, "minStockQty")}</label>
                  <label style={{ width: 130, fontSize: 12, fontWeight: 650, color: "#3b4a63" }}>{t(lang, "uomQty")}</label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                  <input className="bigin-input" type="number" step="0.001" value={form.min_qty} onChange={(e) => set({ min_qty: e.target.value })} />
                  <select className="bigin-input" style={{ width: 130 }} value={form.min_stock_uom} onChange={(e) => set({ min_stock_uom: e.target.value })}><option value="">Select UoM</option>{(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code}</option>))}</select>
                </div>
              </div>
              <F k="openingDate"><input className="bigin-input" type="date" value={form.opening_date || ""} onChange={(e) => set({ opening_date: e.target.value })} /></F>
              <div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, fontSize: 12, fontWeight: 650, color: "#3b4a63" }}>{t(lang, "maxStockQty")}</label>
                  <label style={{ width: 130, fontSize: 12, fontWeight: 650, color: "#3b4a63" }}>{t(lang, "uomQty")}</label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                  <input className="bigin-input" type="number" step="0.001" value={form.max_qty} onChange={(e) => set({ max_qty: e.target.value })} />
                  <select className="bigin-input" style={{ width: 130 }} value={form.max_stock_uom} onChange={(e) => set({ max_stock_uom: e.target.value })}><option value="">Select UoM</option>{(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code}</option>))}</select>
                </div>
              </div>
            </div>
            </Sec>
            <Sec title={t(lang, "whStocks")}>
              <div className="table-wrap"><table className="tbl tbl-classic">
                <thead><tr><th>Warehouse</th><th>Locator</th><th style={{ textAlign: "right" }}>Quantity</th><th>UOM</th><th style={{ width: 44 }}></th></tr></thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.warehouse}</td><td>{s.locator || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{Number(s.qty || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      <td>{s.uom || form.unit}</td>
                      <td style={{ textAlign: "center" }}><button type="button" className="btn ghost sm" style={{ padding: "2px 6px", fontSize: 11, color: "#e11d48" }} onClick={() => delStockRow(s)}>×</button></td></tr>
                  ))}
                  <tr style={{ background: "#f8fafc" }}>
                    <td>
                      <select className="bigin-input" value={newStock.warehouse} onChange={(e) => setNewStock({ ...newStock, warehouse: e.target.value })}>
                        <option value="">Select an Option</option>
                        {(lookups.warehouse || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                      </select>
                    </td>
                    <td><input className="bigin-input" value={newStock.locator} onChange={(e) => setNewStock({ ...newStock, locator: e.target.value })} placeholder="Select an Option" /></td>
                    <td><input className="bigin-input" type="number" step="0.001" value={newStock.qty} onChange={(e) => setNewStock({ ...newStock, qty: e.target.value })} /></td>
                    <td>
                      <select className="bigin-input" value={newStock.uom} onChange={(e) => setNewStock({ ...newStock, uom: e.target.value })}>
                        <option value="">Select UoM</option>
                        {(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code}</option>))}
                      </select>
                    </td>
                    <td style={{ textAlign: "center" }}><button type="button" className="btn sm" style={{ background: "#0ba360", borderColor: "#0ba360" }} onClick={addStockRow}>+</button></td>
                  </tr>
                </tbody></table></div>
            </Sec>
            <Sec title="Units & Barcode">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <F k="unit">
                <select className="bigin-input" value={form.unit} onChange={(e) => set({ unit: e.target.value })}>
                  {(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code} — {x.name}</option>))}
                </select>
              </F>
              <F k="purchaseUnit"><input className="bigin-input" value={form.purchase_unit} onChange={(e) => set({ purchase_unit: e.target.value })} placeholder={form.unit} /></F>
              <F k="convFactor"><input className="bigin-input" type="number" step="0.0001" value={form.conversion_factor} onChange={(e) => set({ conversion_factor: e.target.value })} /></F>
              <F k="barcode"><input className="bigin-input" value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} /></F>
              <F k="brand"><input className="bigin-input" value={form.brand} onChange={(e) => set({ brand: e.target.value })} /></F>
              <F k="origin"><input className="bigin-input" value={form.country_of_origin} onChange={(e) => set({ country_of_origin: e.target.value })} /></F>
            </div>
            </Sec>
            <Sec title="Physical Attributes">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <F k="weightKg"><input className="bigin-input" type="number" step="0.001" value={form.weight_kg} onChange={(e) => set({ weight_kg: e.target.value })} /></F>
              <F k="dimensions">
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="bigin-input" type="number" step="0.001" placeholder="L" value={form.length_m} onChange={(e) => set({ length_m: e.target.value })} />
                  <input className="bigin-input" type="number" step="0.001" placeholder="W" value={form.width_m} onChange={(e) => set({ width_m: e.target.value })} />
                  <input className="bigin-input" type="number" step="0.001" placeholder="H" value={form.height_m} onChange={(e) => set({ height_m: e.target.value })} />
                </div>
              </F>
            </div>
            </Sec>
            <Sec title="Stock Controls & Tracking">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <F k="minQty"><input className="bigin-input" type="number" step="0.001" value={form.min_qty} onChange={(e) => set({ min_qty: e.target.value })} /></F>
              <F k="maxQty"><input className="bigin-input" type="number" step="0.001" value={form.max_qty} onChange={(e) => set({ max_qty: e.target.value })} /></F>
              <F k="reorderQty"><input className="bigin-input" type="number" step="0.001" value={form.reorder_qty} onChange={(e) => set({ reorder_qty: e.target.value })} /></F>
              <F k="shelfLife"><input className="bigin-input" type="number" value={form.shelf_life_days} onChange={(e) => set({ shelf_life_days: e.target.value })} /></F>
              <div className="bigin-form-field" style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {[["batch_tracking", "batchTrack"], ["serial_tracking", "serialTrack"], ["expiry_tracking", "expiryTrack"]].map(([k, lk]) => (
                  <label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form[k]} onChange={(e) => set({ [k]: e.target.checked })} style={{ accentColor: "#0ba360", width: 15, height: 15 }} />
                    <span>{t(lang, lk)}</span>
                  </label>
                ))}
                </div>
              </div>
              {detail && (
                <div className="bigin-form-field" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>STOCK ON HAND</div>
                    <b style={{ fontSize: 18 }}>{Number(detail.on_hand || 0).toLocaleString()} {form.unit}</b></div>
                    <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>LAST PURCHASE RATE</div>
                    <b style={{ fontSize: 15 }}>{Number(detail.last_rate || 0).toLocaleString()} SAR</b></div>
                  </div>
                </div>
              )}
            </div>
            </Sec>
            </div>
          )}

          {tab === "prices" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Sec title="Base Rates">
            <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <F k="purchasePrice"><input className="bigin-input" type="number" step="0.01" value={form.purchase_price} onChange={(e) => set({ purchase_price: e.target.value })} /></F>
                <F k="sellPrice"><input className="bigin-input" type="number" step="0.01" value={form.sell_price} onChange={(e) => set({ sell_price: e.target.value })} /></F>
            </div>
            </Sec>
            <Sec title={t(lang, "priceLists")}>
              <div style={{ fontSize: 12, color: "#c2570b", fontWeight: 700, marginBottom: 8 }}>
                {baseUom ? `${baseUom} (Base UoM)` : `${form.unit || ""} (Base UoM)`}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 6, maxWidth: 220, flex: 1, minWidth: 170 }}>
                  <select className="bigin-input" value={newPrice.price_list} onChange={(e) => setNewPrice({ ...newPrice, price_list: e.target.value })}>
                    {(pricelists || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                  </select>
                  <button type="button" onClick={quickAddPriceList} title="New price list"
                    style={{ background: "#0ba360", color: "#fff", border: "none", borderRadius: 999, width: 26, height: 26, alignSelf: "center", fontSize: 15, fontWeight: 700, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}>+</button>
                </div>
                <input className="bigin-input" style={{ maxWidth: 100 }} type="number" step="0.01" placeholder="%" value={newPrice.markup_pct} onChange={(e) => setNewPrice({ ...newPrice, markup_pct: e.target.value })} />
                <select className="bigin-input" style={{ maxWidth: 100 }} value={newPrice.currency} onChange={(e) => setNewPrice({ ...newPrice, currency: e.target.value })}>{["SAR", "USD", "EUR", "AED"].map((x) => (<option key={x}>{x}</option>))}</select>
                <input className="bigin-input" style={{ maxWidth: 130 }} type="number" step="0.01" placeholder="Unit price *" value={newPrice.unit_price} onChange={(e) => setNewPrice({ ...newPrice, unit_price: e.target.value })} />
                <input className="bigin-input" style={{ maxWidth: 110 }} type="number" step="0.001" placeholder="Min qty" value={newPrice.min_qty} onChange={(e) => setNewPrice({ ...newPrice, min_qty: e.target.value })} />
                <input className="bigin-input" style={{ maxWidth: 150 }} type="date" value={newPrice.effective_from} onChange={(e) => setNewPrice({ ...newPrice, effective_from: e.target.value })} />
                <button type="button" className="btn sm" style={{ background: "#0ba360", borderColor: "#0ba360" }} onClick={() => {
                  if (!newPrice.unit_price) return;
                  if (isEdit) addPriceApi();
                  else setPrices([...prices, { ...newPrice, unit_price: Number(newPrice.unit_price), min_qty: Number(newPrice.min_qty || 1), markup_pct: Number(newPrice.markup_pct || 0), id: "tmp" + Date.now() }]);
                  setNewPrice({ price_list: "Standard", currency: "SAR", unit_price: "", min_qty: 1, markup_pct: 0, effective_from: "" });
                }}>+</button>
              </div>
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th></th><th style={{ textAlign: "right" }}>Percentage</th><th></th><th></th><th>Date</th><th></th></tr></thead>
                <tbody>{prices.map((p) => (
                  <tr key={p.id}><td style={{ fontWeight: 600 }}>{p.price_list}</td>
                    <td style={{ textAlign: "right" }}>{Number(p.markup_pct || 0).toLocaleString()}%</td>
                    <td>{p.currency}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{Number(p.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{p.effective_from ? new Date(p.effective_from).toLocaleDateString("en-GB") : "—"}</td>
                    <td style={{ textAlign: "center" }}><button type="button" className="btn ghost sm" style={{ padding: "2px 6px", fontSize: 11, color: "#e11d48" }} onClick={() => {
                      if (isEdit && !String(p.id).startsWith("tmp")) delPriceApi(p.id);
                      else setPrices(prices.filter((x) => x.id !== p.id));
                    }}>×</button></td></tr>
                ))}
                {!prices.length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 16 }}>—</td></tr>}
                </tbody></table></div>
            </Sec>
            </div>
          )}

          {tab === "specs" && (
            <Sec title="Technical Attributes">
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <input className="bigin-input" style={{ maxWidth: 220 }} placeholder="Attribute (e.g. Compressive Strength)" value={newSpec.attr_name} onChange={(e) => setNewSpec({ ...newSpec, attr_name: e.target.value })} />
                <input className="bigin-input" style={{ flex: 1 }} placeholder="Value (e.g. 42.5 MPa)" value={newSpec.attr_value} onChange={(e) => setNewSpec({ ...newSpec, attr_value: e.target.value })} />
                <button type="button" className="btn sm" style={{ background: "#0ba360", borderColor: "#0ba360" }} onClick={() => {
                  if (!newSpec.attr_name) return;
                  if (isEdit) addSpecApi();
                  else { setSpecs([...specs, { ...newSpec, id: "tmp" + Date.now() }]); setNewSpec({ attr_name: "", attr_value: "" }); }
                }}>+</button>
              </div>
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th style={{ width: 240 }}>Attribute</th><th>Value</th><th style={{ width: 60 }}></th></tr></thead>
                <tbody>{specs.map((s) => (
                  <tr key={s.id}><td style={{ fontWeight: 600, color: "#0f172a" }}>{s.attr_name}</td><td>{s.attr_value || "—"}</td>
                    <td style={{ textAlign: "center" }}><button type="button" className="btn ghost sm" style={{ padding: "2px 6px", fontSize: 11, color: "#e11d48" }} onClick={() => {
                      if (isEdit && !String(s.id).startsWith("tmp")) delSpecApi(s.id);
                      else setSpecs(specs.filter((x) => x.id !== s.id));
                    }}>×</button></td></tr>
                ))}
                {!specs.length && <tr><td colSpan={3} style={{ textAlign: "center", padding: 16, color: "#e11d48", background: "#f0f9ff", fontSize: 13 }}>{t(lang, "noRecords")}</td></tr>}
                </tbody></table></div>
              <button type="button" className="btn sm" style={{ background: "#0ba360", borderColor: "#0ba360", marginTop: 10 }} onClick={() => {
                const name = window.prompt("Specification attribute:");
                if (!name) return;
                const val = window.prompt("Value for " + name + ":") || "";
                if (isEdit) {
                  api.post(`/procurement/items/${editId}/specs`, { attr_name: name, attr_value: val })
                    .then((r) => setSpecs([...specs, r.data.data]))
                    .catch((e) => setMsg(e?.response?.data?.message || "Failed"));
                } else setSpecs([...specs, { attr_name: name, attr_value: val, id: "tmp" + Date.now() }]);
              }}>+ {t(lang, "addNewLbl")}</button>
            </Sec>
          )}

          {tab === "images" && (
            <Sec title={`Item Images${images.length > 0 ? ` (${images.length})` : ""}`}>
              {!isEdit ? (
                <div style={{ textAlign: "center", padding: 30, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8 }}>
                  <p className="muted">Save the item first to attach images.</p>
                  <button type="button" className="btn sm" style={{ background: "#0ba360", borderColor: "#0ba360" }} disabled={busy} onClick={() => save(true)}>Save draft first</button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                    {images.map((img) => (
                      <ImgThumb key={img.id} img={img} onDelete={() => delImage(img.id)} />
                    ))}
                    <label style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 10px", border: "1px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
                      {IMG_PLACEHOLDER}
                      <span style={{ fontSize: 12.5, color: "#1d5bd8", fontWeight: 600 }}>{t(lang, "browsePicture")}</span>
                      <input type="file" accept="image/*" hidden onChange={uploadImage} />
                    </label>
                    {!images.length && <p className="muted">No images yet.</p>}
                  </div>
                </div>
              )}
            </Sec>
          )}
        </div>
        </div>

        {/* pinned footer */}
        <div className="bigin-drawer-foot">
          <span className="muted" style={{ fontSize: 12.5 }}>📎 {t(lang, "attachments")} ({images.length})</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={onClose}>{t(lang, "closeLbl")}</button>
          <button type="button" className="btn" style={{ background: "#0284c7", borderColor: "#0284c7", fontWeight: 600 }} disabled={busy} onClick={() => save(false)}>{busy ? "..." : t(lang, "saveLbl")}</button>
          <button type="button" className="btn" style={{ background: "#0ba360", borderColor: "#0ba360", fontWeight: 600 }} disabled={busy} onClick={saveAndNext}>{busy ? "..." : t(lang, "saveNext")}</button>
        </div>
      </div>
    </div>
  );
}

// ================= Page =================
export default function MaterialsPage() {
  const { lang, projectId } = useAppStore();
  const [tab, setTab] = useState("catalog");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState("ASC");
  const [stocks, setStocks] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [drawer, setDrawer] = useState(null); // null | {mode:'create'} | {mode:'edit', id}
  const [lookups, setLookups] = useState({});
  const [vatRates, setVatRates] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pricelists, setPricelists] = useState([]);

  const loadCatalog = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (category) q.push("category=" + encodeURIComponent(category));
    api.get("/procurement/items?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  const loadStock = () => {
    api.get(`/procurement/stock${projectId ? "?project_id=" + projectId : ""}`).then((r) => setStocks(r.data.data || [])).catch(() => {});
    api.get("/procurement/reorder").then((r) => setReorders(r.data.data || [])).catch(() => {});
  };
  const refreshLookups = () => {
    Promise.all(["item_category", "manufacturer", "uom", "department", "warehouse"].map((ty) => api.get("/masters/lookup/" + ty).then((r) => [ty, r.data.data || []]).catch(() => [ty, []])))
      .then((pairs) => setLookups(Object.fromEntries(pairs)));
  };
  const refreshPricelists = () => api.get("/procurement/pricelists?active=1").then((r) => setPricelists(r.data.data || [])).catch(() => {});
  useEffect(() => {
    loadCatalog(1, limit, sortBy, sortDir); loadStock(); refreshLookups(); refreshPricelists();
    api.get("/masters/vat-rates").then((r) => setVatRates((r.data.data || []).filter((v) => v.is_active))).catch(() => {});
    api.get("/procurement/suppliers").then((r) => setSuppliers(r.data.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onSort = (k) => { const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC"; setSortBy(k); setSortDir(nd); loadCatalog(page, limit, k, nd); };
  const saved = () => { setDrawer(null); loadCatalog(); };
  const toggleActive = async (r) => {
    setMsg("");
    try {
      if (r.is_active) await api.put("/procurement/items/" + r.id, { is_active: false });
      else await api.put("/procurement/items/" + r.id, { is_active: true });
      loadCatalog();
    } catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const remove = async (r) => {
    if (!window.confirm(t(lang, "confirmDelete") + " — " + r.code)) return;
    setMsg("");
    try { await api.delete("/procurement/items/" + r.id); loadCatalog(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const duplicate = async (r) => {
    setMsg("");
    try {
      const res = await api.post(`/procurement/items/${r.id}/duplicate`, {});
      loadCatalog(); setDrawer({ mode: "edit", id: res.data.data.id });
    } catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };

  const catalogColumns = [
    { key: "code", label: t(lang, "itemCode"), sortable: true, render: (r) => (<span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>{r.code}</span>) },
    {
      key: "description", label: t(lang, "itemName"), sortable: true,
      render: (r) => (<div><div style={{ fontWeight: 500 }}>{r.description}</div>
        <div className="muted" style={{ fontSize: 11 }}>{[r.brand, r.model_no].filter(Boolean).join(" · ")}</div></div>),
    },
    { key: "category", label: t(lang, "category"), render: (r) => (r.category ? <span className="badge Submitted sm">{r.category}</span> : <span className="muted">—</span>) },
    {
      key: "flags", label: "S / T / S / P",
      render: (r) => (<span className="muted" style={{ fontSize: 12 }}>{[r.is_service ? "S" : "·", r.is_taxable ? "T" : "·", r.is_sellable ? "S" : "·", r.is_purchasable ? "P" : "·"].join(" ")}</span>),
    },
    { key: "unit", label: t(lang, "unit"), render: (r) => <span className="badge Draft sm">{r.unit}</span> },
    {
      key: "sell_price", label: t(lang, "sellPrice"), sortable: true,
      render: (r) => (<div style={{ fontWeight: 700 }}>{Number(r.sell_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}<span style={{ fontSize: 11, color: "var(--muted)", marginInlineStart: 4 }}>SAR</span></div>),
    },
    { key: "status", label: t(lang, "statusLbl"), render: (r) => (r.is_active ? <span className="badge Approved sm">{t(lang, "activeLbl")}</span> : <span className="badge Draft sm">{t(lang, "inactiveLbl")}</span>) },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          <button className="btn ghost sm" onClick={() => setDrawer({ mode: "edit", id: r.id })}>{t(lang, "openLbl")}</button>
          <button className="btn ghost sm" title={t(lang, "duplicateLbl")} onClick={() => duplicate(r)}>⧉</button>
          <button className="btn ghost sm" title={r.is_active ? t(lang, "deactivateLbl") : t(lang, "activateLbl")} onClick={() => toggleActive(r)}>{r.is_active ? "⊘" : "✓"}</button>
          <button className="btn ghost sm" onClick={() => remove(r)}>×</button>
        </div>
      ),
    },
  ];

  const stockColumns = [
    { key: "material_code", label: t(lang, "itemCode"), sortable: true, render: (r) => (<span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>{r.material_code}</span>) },
    { key: "description", label: t(lang, "itemName"), render: (r) => r.description || "—" },
    { key: "unit", label: t(lang, "unit"), render: (r) => r.unit || "NOS" },
    {
      key: "qty", label: t(lang, "onHand"),
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: Number(r.qty || 0) > 0 ? "var(--success)" : "var(--danger)" }}>{Number(r.qty || 0).toLocaleString()}</span>
          <span className="badge Active sm">In Stock</span>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {reorders.length > 0 && (
        <div style={{ margin: "10px 24px 14px", padding: "10px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <b style={{ color: "var(--danger)" }}>Low Stock Alert ({reorders.length})</b>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {reorders.map((x) => `${x.material_code} (-${x.shortage} ${x.unit})`).join(", ")}
              </div>
            </div>
          </div>
          <a href="/procurement/indents" className="btn sm" style={{ textDecoration: "none" }}>+ Raise Indent</a>
        </div>
      )}
      {msg && <div className="alert err" style={{ margin: "10px 24px" }} onClick={() => setMsg("")}>{msg}</div>}

      {tab === "catalog" && (
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "0 24px 10px" }}>
          <select className="bigin-input" style={{ maxWidth: 200 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); loadCatalog(1, limit); }}>
            <option value="">All categories</option>
            {(lookups.item_category || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
          </select>
        </div>
      )}

      {tab === "catalog" ? (
        <DataTable
          columns={catalogColumns} rows={rows} total={total} page={page} limit={limit}
          onPage={(p) => { setPage(p); loadCatalog(p, limit); }}
          onLimit={(l) => { setLimit(l); setPage(1); loadCatalog(1, l); }}
          sortBy={sortBy} sortDir={sortDir} onSort={onSort}
          loading={loading} title={t(lang, "itemsTitle")}
          activeFilter={t(lang, "catalogTab")}
          filterOptions={[{ label: t(lang, "catalogTab"), value: "catalog" }, { label: t(lang, "stockTab"), value: "stock" }]}
          onFilterSelect={(v) => setTab(v)}
          searchPlaceholder={t(lang, "search")} searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); clearTimeout(window.__itm); window.__itm = setTimeout(() => loadCatalog(1, limit), 320); }}
          primaryAction={{ label: t(lang, "newItem"), onClick: () => setDrawer({ mode: "create" }) }}
          onAdd={() => setDrawer({ mode: "create" })} addLabel={t(lang, "newItem")}
          stats={[{ label: t(lang, "itemsTitle"), value: total }]}
        />
      ) : (
        <DataTable
          columns={stockColumns} rows={stocks} total={stocks.length} page={1} limit={stocks.length || 10}
          loading={loading} title={t(lang, "stockTab")}
          activeFilter={t(lang, "stockTab")}
          filterOptions={[{ label: t(lang, "catalogTab"), value: "catalog" }, { label: t(lang, "stockTab"), value: "stock" }]}
          onFilterSelect={(v) => setTab(v)}
          stats={[{ label: t(lang, "stockTab"), value: stocks.length }]}
        />
      )}

      {drawer && (
        <ItemDrawer
          editId={drawer.mode === "edit" ? drawer.id : null}
          onClose={() => setDrawer(null)}
          onSaved={() => saved()}
          onDraftCreated={(id) => setDrawer({ mode: "edit", id })}
          lookups={lookups} vatRates={vatRates} suppliers={suppliers} pricelists={pricelists} refreshLookups={refreshLookups} refreshPricelists={refreshPricelists}
        />
      )}
    </div>
  );
}
