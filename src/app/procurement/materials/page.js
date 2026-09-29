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
};

// ================= New / Edit Item drawer =================
function ItemDrawer({ editId, onClose, onSaved, onDraftCreated, lookups, vatRates, suppliers, refreshLookups }) {
  const { lang } = useAppStore();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(emptyForm);
  const [prices, setPrices] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [images, setImages] = useState([]);
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPrice, setNewPrice] = useState({ price_list: "Standard", currency: "SAR", unit_price: "", min_qty: 1 });
  const [newSpec, setNewSpec] = useState({ attr_name: "", attr_value: "" });
  const isEdit = !!editId;
  const idx = TABS.indexOf(tab);

  useEffect(() => {
    if (isEdit) {
      api.get("/procurement/items/" + editId).then((r) => {
        const d = r.data.data;
        setDetail(d);
        setForm({ ...emptyForm, ...d, preferred_supplier_id: d.preferred_supplier_id || "" });
        setPrices(d.prices || []);
        setSpecs(d.specs || []);
        setImages(d.images || []);
      }).catch(() => setMsg("Failed to load item"));
    } else {
      setForm(emptyForm); setPrices([]); setSpecs([]); setImages([]); setDetail(null);
    }
    setTab("general"); setMsg("");
  }, [editId]);

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

  const payload = () => {
    const p = { ...form };
    for (const k of ["discount_pct", "tolerance_pct", "conversion_factor", "weight_kg", "length_m", "width_m", "height_m", "max_qty", "reorder_qty", "min_qty", "purchase_price", "sell_price", "lead_time_days", "shelf_life_days"]) p[k] = Number(p[k] || 0);
    if (!p.code) delete p.code;
    if (!p.vat_rate_id) delete p.vat_rate_id;
    if (!p.preferred_supplier_id) delete p.preferred_supplier_id;
    if (!p.purchase_unit) delete p.purchase_unit;
    p.description = stripHtml(p.description) || form.description;
    if (!isEdit) {
      p.prices = prices.filter((x) => Number(x.unit_price) > 0).map((x) => ({ ...x, unit_price: Number(x.unit_price), min_qty: Number(x.min_qty || 1) }));
      p.specs = specs.filter((x) => x.attr_name);
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
        onSaved(id);
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

  const next = () => {
    if (idx < TABS.length - 1) setTab(TABS[idx + 1]);
    else save(false);
  };

  // edit-mode immediate ops
  const addPriceApi = async () => {
    if (!newPrice.unit_price) return;
    try {
      const r = await api.post(`/procurement/items/${editId}/prices`, { ...newPrice, unit_price: Number(newPrice.unit_price), min_qty: Number(newPrice.min_qty || 1) });
      setPrices([...prices, r.data.data]); setNewPrice({ price_list: "Standard", currency: "SAR", unit_price: "", min_qty: 1 });
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

  const L = ({ k, children, span }) => (
    <div style={span ? { gridColumn: "1 / -1" } : undefined}>
      <label className="label">{t(lang, k)}</label>
      {children}
    </div>
  );
  const Plus = ({ onClick }) => (
    <button type="button" onClick={onClick} title="Quick add"
      style={{ background: "#f5820b", color: "#fff", border: "none", borderRadius: 6, width: 34, height: 38, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>+</button>
  );

  return (
    <div className="drawer-ov" onClick={onClose}>
      <div className="drawer sheet-wide item-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-h item-drawer-h">
          <h3>{isEdit ? form.code + " — " + stripHtml(form.description).slice(0, 50) : t(lang, "newItem")}</h3>
          <button className="btn ghost sm" onClick={onClose}>×</button>
        </div>
        {msg && <div className="alert err" style={{ margin: "0 20px 10px" }}>{msg}</div>}

        {/* header: names */}
        <div className="item-names">
          <div><label className="label">{t(lang, "itemName")} *</label>
            <input className="input" value={form.description} placeholder="e.g. Portland Cement Type I (50 KG Bag)"
              onChange={(e) => set({ description: e.target.value })} /></div>
          <div><label className="label">{t(lang, "itemNameAr")}</label>
            <input className="input" dir="rtl" value={form.name_ar} onChange={(e) => set({ name_ar: e.target.value })} /></div>
        </div>

        {/* flags */}
        <div className="item-flags">
          {["is_service|serviceItem", "is_taxable|taxable", "is_sellable|sellable", "is_purchasable|purchasable"].map((s) => {
            const [k, lk] = s.split("|");
            return (
              <label key={k} className="item-flag">
                <input type="checkbox" checked={!!form[k]} onChange={(e) => set({ [k]: e.target.checked })} />
                <span>{t(lang, lk)}</span>
              </label>
            );
          })}
        </div>

        {/* tabs */}
        <div className="tabs item-tabs">
          {TABS.map((tb) => (
            <button key={tb} type="button" className={tab === tb ? "on" : ""} onClick={() => setTab(tb)}>{t(lang, "itemTab_" + tb)}</button>
          ))}
        </div>

        <div className="item-body">
          {tab === "general" && (
            <div className="form-grid item-grid">
              <L k="itemCode"><input className="input" placeholder="Auto (ITM-…)" value={form.code} onChange={(e) => set({ code: e.target.value })} /></L>
              <L k="mfrPartNo"><input className="input" value={form.manufacturer_part_no} onChange={(e) => set({ manufacturer_part_no: e.target.value })} /></L>
              <L k="modelNo"><input className="input" value={form.model_no} onChange={(e) => set({ model_no: e.target.value })} /></L>
              <L k="suffix"><input className="input" value={form.suffix} onChange={(e) => set({ suffix: e.target.value })} /></L>
              <L k="category">
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="select" value={form.category} onChange={(e) => set({ category: e.target.value })}>
                    <option value="">Select an Option</option>
                    {(lookups.item_category || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                  </select><Plus onClick={() => quickAdd("item_category", "category")} />
                </div>
              </L>
              <L k="manufacture">
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="select" value={form.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })}>
                    <option value="">Select an Option</option>
                    {(lookups.manufacturer || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                  </select><Plus onClick={() => quickAdd("manufacturer", "manufacturer")} />
                </div>
              </L>
              <L k="vatRate">
                <select className="select" value={form.vat_rate_id} onChange={(e) => set({ vat_rate_id: e.target.value })}>
                  <option value="">Select an Option</option>
                  {vatRates.map((v) => (<option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>))}
                </select>
              </L>
              <div />
              <L k="itemDesc" span><input className="input" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Full specification-grade description" /></L>
              <L k="itemDescAr" span><RichText value={form.description_ar} onChange={(v) => set({ description_ar: v })} rows={4} /></L>
              <div className="item-accounts" style={{ gridColumn: "1 / -1" }}>
                <L k="invAccount"><select className="select" value={form.inventory_account} onChange={(e) => set({ inventory_account: e.target.value })}>{ACCOUNTS_INV.map((x) => (<option key={x}>{x}</option>))}</select></L>
                <L k="incomeAccount"><select className="select" value={form.income_account} onChange={(e) => set({ income_account: e.target.value })}>{ACCOUNTS_INC.map((x) => (<option key={x}>{x}</option>))}</select></L>
                <L k="expenseAccount"><select className="select" value={form.expense_account} onChange={(e) => set({ expense_account: e.target.value })}>{ACCOUNTS_EXP.map((x) => (<option key={x}>{x}</option>))}</select></L>
              </div>
              <L k="supplier">
                <select className="select" value={form.preferred_supplier_id} onChange={(e) => set({ preferred_supplier_id: e.target.value })}>
                  <option value="">—</option>
                  {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
                </select>
              </L>
              <L k="discountPct"><input className="input" type="number" step="0.01" value={form.discount_pct} onChange={(e) => set({ discount_pct: e.target.value })} /></L>
              <L k="availability">
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="input" type="number" value={form.lead_time_days} onChange={(e) => set({ lead_time_days: e.target.value })} />
                  <select className="select" style={{ maxWidth: 110 }} value={form.lead_time_unit} onChange={(e) => set({ lead_time_unit: e.target.value })}>{["Days", "Weeks", "Months"].map((x) => (<option key={x}>{x}</option>))}</select>
                </div>
              </L>
              <L k="department">
                <select className="select" value={form.department} onChange={(e) => set({ department: e.target.value })}>
                  <option value="">—</option>
                  {(lookups.department || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
                </select>
              </L>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="item-flag">
                  <input type="checkbox" checked={!!form.has_tolerance} onChange={(e) => set({ has_tolerance: e.target.checked })} />
                  <span>{t(lang, "tolerance")}</span>
                  {form.has_tolerance && (
                    <input className="input" style={{ maxWidth: 110, marginInlineStart: 8 }} type="number" step="0.01" value={form.tolerance_pct} onChange={(e) => set({ tolerance_pct: e.target.value })} placeholder="%" />
                  )}
                </label>
              </div>
            </div>
          )}

          {tab === "details" && (
            <div className="form-grid item-grid">
              <L k="unit">
                <select className="select" value={form.unit} onChange={(e) => set({ unit: e.target.value })}>
                  {(lookups.uom || []).map((x) => (<option key={x.id} value={x.code}>{x.code} — {x.name}</option>))}
                </select>
              </L>
              <L k="purchaseUnit"><input className="input" value={form.purchase_unit} onChange={(e) => set({ purchase_unit: e.target.value })} placeholder={form.unit} /></L>
              <L k="convFactor"><input className="input" type="number" step="0.0001" value={form.conversion_factor} onChange={(e) => set({ conversion_factor: e.target.value })} /></L>
              <L k="barcode"><input className="input" value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} /></L>
              <L k="brand"><input className="input" value={form.brand} onChange={(e) => set({ brand: e.target.value })} /></L>
              <L k="origin"><input className="input" value={form.country_of_origin} onChange={(e) => set({ country_of_origin: e.target.value })} /></L>
              <L k="weightKg"><input className="input" type="number" step="0.001" value={form.weight_kg} onChange={(e) => set({ weight_kg: e.target.value })} /></L>
              <L k="dimensions">
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="input" type="number" step="0.001" placeholder="L" value={form.length_m} onChange={(e) => set({ length_m: e.target.value })} />
                  <input className="input" type="number" step="0.001" placeholder="W" value={form.width_m} onChange={(e) => set({ width_m: e.target.value })} />
                  <input className="input" type="number" step="0.001" placeholder="H" value={form.height_m} onChange={(e) => set({ height_m: e.target.value })} />
                </div>
              </L>
              <L k="minQty"><input className="input" type="number" step="0.001" value={form.min_qty} onChange={(e) => set({ min_qty: e.target.value })} /></L>
              <L k="maxQty"><input className="input" type="number" step="0.001" value={form.max_qty} onChange={(e) => set({ max_qty: e.target.value })} /></L>
              <L k="reorderQty"><input className="input" type="number" step="0.001" value={form.reorder_qty} onChange={(e) => set({ reorder_qty: e.target.value })} /></L>
              <L k="shelfLife"><input className="input" type="number" value={form.shelf_life_days} onChange={(e) => set({ shelf_life_days: e.target.value })} /></L>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 18, flexWrap: "wrap" }}>
                {[["batch_tracking", "batchTrack"], ["serial_tracking", "serialTrack"], ["expiry_tracking", "expiryTrack"]].map(([k, lk]) => (
                  <label key={k} className="item-flag"><input type="checkbox" checked={!!form[k]} onChange={(e) => set({ [k]: e.target.checked })} /><span>{t(lang, lk)}</span></label>
                ))}
              </div>
              {detail && (
                <div style={{ gridColumn: "1 / -1" }} className="card">
                  <div className="label">Stock on hand</div>
                  <b style={{ fontSize: 18 }}>{Number(detail.on_hand || 0).toLocaleString()} {form.unit}</b>
                  <span className="muted" style={{ marginInlineStart: 10 }}>Last purchase rate: {Number(detail.last_rate || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {tab === "prices" && (
            <div>
              <div className="form-grid item-grid" style={{ marginBottom: 12 }}>
                <L k="purchasePrice"><input className="input" type="number" step="0.01" value={form.purchase_price} onChange={(e) => set({ purchase_price: e.target.value })} /></L>
                <L k="sellPrice"><input className="input" type="number" step="0.01" value={form.sell_price} onChange={(e) => set({ sell_price: e.target.value })} /></L>
              </div>
              <div className="label" style={{ marginBottom: 6 }}>{t(lang, "priceLists")}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <input className="input" style={{ maxWidth: 150 }} placeholder="Price list" value={newPrice.price_list} onChange={(e) => setNewPrice({ ...newPrice, price_list: e.target.value })} />
                <select className="select" style={{ maxWidth: 100 }} value={newPrice.currency} onChange={(e) => setNewPrice({ ...newPrice, currency: e.target.value })}>{["SAR", "USD", "EUR", "AED"].map((x) => (<option key={x}>{x}</option>))}</select>
                <input className="input" style={{ maxWidth: 130 }} type="number" step="0.01" placeholder="Unit price *" value={newPrice.unit_price} onChange={(e) => setNewPrice({ ...newPrice, unit_price: e.target.value })} />
                <input className="input" style={{ maxWidth: 110 }} type="number" step="0.001" placeholder="Min qty" value={newPrice.min_qty} onChange={(e) => setNewPrice({ ...newPrice, min_qty: e.target.value })} />
                <button type="button" className="btn sm" onClick={() => {
                  if (!newPrice.unit_price) return;
                  if (isEdit) addPriceApi();
                  else setPrices([...prices, { ...newPrice, unit_price: Number(newPrice.unit_price), min_qty: Number(newPrice.min_qty || 1), id: "tmp" + Date.now() }]);
                  setNewPrice({ price_list: "Standard", currency: "SAR", unit_price: "", min_qty: 1 });
                }}>+</button>
              </div>
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th>Price list</th><th>Currency</th><th>Unit price</th><th>Min qty</th><th></th></tr></thead>
                <tbody>{prices.map((p) => (
                  <tr key={p.id}><td>{p.price_list}</td><td>{p.currency}</td><td>{Number(p.unit_price).toLocaleString()}</td><td>{p.min_qty}</td>
                    <td><button type="button" className="btn ghost sm" onClick={() => {
                      if (isEdit && !String(p.id).startsWith("tmp")) delPriceApi(p.id);
                      else setPrices(prices.filter((x) => x.id !== p.id));
                    }}>×</button></td></tr>
                ))}
                {!prices.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 16 }}>—</td></tr>}
                </tbody></table></div>
            </div>
          )}

          {tab === "specs" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <input className="input" style={{ maxWidth: 220 }} placeholder="Attribute (e.g. Compressive Strength)" value={newSpec.attr_name} onChange={(e) => setNewSpec({ ...newSpec, attr_name: e.target.value })} />
                <input className="input" style={{ flex: 1 }} placeholder="Value (e.g. 42.5 MPa)" value={newSpec.attr_value} onChange={(e) => setNewSpec({ ...newSpec, attr_value: e.target.value })} />
                <button type="button" className="btn sm" onClick={() => {
                  if (!newSpec.attr_name) return;
                  if (isEdit) addSpecApi();
                  else { setSpecs([...specs, { ...newSpec, id: "tmp" + Date.now() }]); setNewSpec({ attr_name: "", attr_value: "" }); }
                }}>+</button>
              </div>
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th style={{ width: 240 }}>Attribute</th><th>Value</th><th style={{ width: 60 }}></th></tr></thead>
                <tbody>{specs.map((s) => (
                  <tr key={s.id}><td><b>{s.attr_name}</b></td><td>{s.attr_value || "—"}</td>
                    <td><button type="button" className="btn ghost sm" onClick={() => {
                      if (isEdit && !String(s.id).startsWith("tmp")) delSpecApi(s.id);
                      else setSpecs(specs.filter((x) => x.id !== s.id));
                    }}>×</button></td></tr>
                ))}
                {!specs.length && <tr><td colSpan={3} className="muted" style={{ textAlign: "center", padding: 16 }}>—</td></tr>}
                </tbody></table></div>
            </div>
          )}

          {tab === "images" && (
            <div>
              {!isEdit ? (
                <div className="card" style={{ textAlign: "center", padding: 30 }}>
                  <p className="muted">Save the item first to attach images.</p>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => save(true)}>Save draft first</button>
                </div>
              ) : (
                <div>
                  <label className="btn ghost sm" style={{ display: "inline-block", cursor: "pointer", marginBottom: 12 }}>
                    Upload image<input type="file" accept="image/*" hidden onChange={uploadImage} />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                    {images.map((img) => (
                      <div key={img.id} className="card" style={{ padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 34 }}>🖼️</div>
                        <div style={{ fontSize: 12, wordBreak: "break-all", margin: "6px 0" }}>{img.file_name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{img.size ? Math.round(img.size / 1024) + " KB" : ""}</div>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
                          <a className="btn ghost sm" href={`/api/v1/documents/${img.id}/download`} target="_blank" rel="noreferrer">↓</a>
                          <button type="button" className="btn ghost sm" onClick={() => delImage(img.id)}>×</button>
                        </div>
                      </div>
                    ))}
                    {!images.length && <p className="muted">No images yet.</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="item-footer">
          <span className="muted" style={{ fontSize: 13 }}>📎 {t(lang, "attachments")} ({images.length})</span>
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>{t(lang, "closeLbl")}</button>
          {idx > 0 && <button type="button" className="btn ghost" onClick={() => setTab(TABS[idx - 1])}>←</button>}
          {isEdit
            ? <button type="button" className="btn" disabled={busy} onClick={() => save(false)}>{busy ? "..." : t(lang, "saveChanges")}</button>
            : (idx < TABS.length - 1
              ? <button type="button" className="btn" onClick={next}>{t(lang, "nextLbl")}</button>
              : <button type="button" className="btn" disabled={busy} onClick={() => save(false)}>{busy ? "..." : t(lang, "createItem")}</button>)}
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
    Promise.all(["item_category", "manufacturer", "uom", "department"].map((ty) => api.get("/masters/lookup/" + ty).then((r) => [ty, r.data.data || []]).catch(() => [ty, []])))
      .then((pairs) => setLookups(Object.fromEntries(pairs)));
  };
  useEffect(() => {
    loadCatalog(1, limit, sortBy, sortDir); loadStock(); refreshLookups();
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

      <div className="card" style={{ margin: "0 24px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button type="button" className={tab === "catalog" ? "on" : ""} onClick={() => setTab("catalog")}>{t(lang, "catalogTab")}</button>
          <button type="button" className={tab === "stock" ? "on" : ""} onClick={() => setTab("stock")}>{t(lang, "stockTab")}</button>
        </div>
        <select className="select" style={{ maxWidth: 200 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); loadCatalog(1, limit); }}>
          <option value="">All categories</option>
          {(lookups.item_category || []).map((x) => (<option key={x.id} value={x.name}>{x.name}</option>))}
        </select>
      </div>

      {tab === "catalog" ? (
        <DataTable
          columns={catalogColumns} rows={rows} total={total} page={page} limit={limit}
          onPage={(p) => { setPage(p); loadCatalog(p, limit); }}
          onLimit={(l) => { setLimit(l); setPage(1); loadCatalog(1, l); }}
          sortBy={sortBy} sortDir={sortDir} onSort={onSort}
          loading={loading} title={t(lang, "itemsTitle")}
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
          stats={[{ label: t(lang, "stockTab"), value: stocks.length }]}
        />
      )}

      {drawer && (
        <ItemDrawer
          editId={drawer.mode === "edit" ? drawer.id : null}
          onClose={() => setDrawer(null)}
          onSaved={() => saved()}
          onDraftCreated={(id) => setDrawer({ mode: "edit", id })}
          lookups={lookups} vatRates={vatRates} suppliers={suppliers} refreshLookups={refreshLookups}
        />
      )}
    </div>
  );
}
