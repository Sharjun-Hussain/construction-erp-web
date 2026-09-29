"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Subcontract() {
  const { lang, projectId } = useAppStore();
  const [tab, setTab] = useState("orders");
  const [scs, setScs] = useState([]);
  const [wos, setWos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [showSC, setShowSC] = useState(false);
  const [showWO, setShowWO] = useState(false);
  const [scForm, setScForm] = useState({ code: "", name: "", trade: "", vat_number: "", cr_number: "", phone: "" });
  const [woForm, setWoForm] = useState({ project_id: "", subcontractor_id: "", number: "", scope: "", amount: 0, retention_pct: 10, advance_paid: 0 });
  const [cert, setCert] = useState({ number: "", gross: 0, advance_recovery: 0, back_charge: 0, period_from: "", period_to: "" });

  const load = () => {
    api.get("/subcontract/subcontractors?limit=200").then((r) => setScs(r.data.data || [])).catch(() => {});
    api.get("/subcontract/work-orders?" + (pid ? `project_id=${pid}` : "")).then((r) => setWos(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [pid]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try {
      const r = await fn(); if (okMsg) setOk(okMsg);
      const fresh = await api.get("/subcontract/work-orders?" + (pid ? `project_id=${pid}` : ""));
      setWos(fresh.data.data || []);
      if (drawer) {
        const hit = (fresh.data.data || []).find((w) => w.id === drawer.id);
        if (hit) setDrawer(hit);
      }
      return r;
    }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const openWO = (id) => {
    const hit = wos.find((w) => w.id === id);
    if (hit) { setDrawer(hit); setCert({ number: "", gross: 0, advance_recovery: 0, back_charge: 0, period_from: "", period_to: "" }); }
  };

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "subcontract")}</h2></div><span className="spacer" />
        {tab === "orders" && <button className="btn" onClick={() => setShowWO(!showWO)}>+ Work order</button>}
        {tab === "subs" && <button className="btn" onClick={() => setShowSC(!showSC)}>+ Subcontractor</button>}
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <select className="select" style={{ maxWidth: 260 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")} (all)</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
      </div>

      <div className="tabs" style={{ maxWidth: 440, marginBottom: 14 }}>
        {[["orders", "Work orders"], ["subs", "Subcontractors"]].map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "subs" && (
        <div>
          {showSC && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={(e) => { e.preventDefault(); act(() => api.post("/subcontract/subcontractors", scForm), "Subcontractor added").then(() => { setShowSC(false); setScForm({ code: "", name: "", trade: "", vat_number: "", cr_number: "", phone: "" }); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                <div><label className="label">Code *</label><input className="input" value={scForm.code} onChange={(e) => setScForm({ ...scForm, code: e.target.value })} required /></div>
                <div><label className="label">Name *</label><input className="input" value={scForm.name} onChange={(e) => setScForm({ ...scForm, name: e.target.value })} required /></div>
                <div><label className="label">Trade</label><input className="input" value={scForm.trade} onChange={(e) => setScForm({ ...scForm, trade: e.target.value })} /></div>
                <div><label className="label">VAT no</label><input className="input" value={scForm.vat_number} onChange={(e) => setScForm({ ...scForm, vat_number: e.target.value })} /></div>
                <div><label className="label">CR no</label><input className="input" value={scForm.cr_number} onChange={(e) => setScForm({ ...scForm, cr_number: e.target.value })} /></div>
                <div><label className="label">Phone</label><input className="input" value={scForm.phone} onChange={(e) => setScForm({ ...scForm, phone: e.target.value })} /></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Code</th><th>Name</th><th>Trade</th><th>VAT</th><th>Phone</th><th>Active WOs</th></tr></thead>
            <tbody>{scs.map((s) => (
              <tr key={s.id}><td>{s.code}</td><td>{s.name}</td><td>{s.trade || "—"}</td><td>{s.vat_number || "—"}</td><td>{s.phone || "—"}</td>
                <td>{wos.filter((w) => w.subcontractor_id === s.id && w.status !== "Closed").length}</td></tr>
            ))}
            {!scs.length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 20 }}>No subcontractors</td></tr>}
          </tbody></table></div>
        </div>
      )}

      {tab === "orders" && (
        <div>
          {showWO && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={(e) => { e.preventDefault(); act(() => api.post("/subcontract/work-orders", { ...woForm, amount: Number(woForm.amount || 0), retention_pct: Number(woForm.retention_pct || 0), advance_paid: Number(woForm.advance_paid || 0) }), "Work order created").then(() => { setShowWO(false); setWoForm({ project_id: "", subcontractor_id: "", number: "", scope: "", amount: 0, retention_pct: 10, advance_paid: 0 }); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                <div><label className="label">Project *</label><select className="select" value={woForm.project_id} onChange={(e) => setWoForm({ ...woForm, project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
                <div><label className="label">Subcontractor *</label><select className="select" value={woForm.subcontractor_id} onChange={(e) => setWoForm({ ...woForm, subcontractor_id: e.target.value })} required><option value="">—</option>{scs.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}</select></div>
                <div><label className="label">WO No *</label><input className="input" value={woForm.number} onChange={(e) => setWoForm({ ...woForm, number: e.target.value })} required /></div>
                <div style={{ gridColumn: "span 2" }}><label className="label">Scope *</label><input className="input" value={woForm.scope} onChange={(e) => setWoForm({ ...woForm, scope: e.target.value })} required /></div>
                <div><label className="label">Amount</label><input className="input" type="number" step="0.01" value={woForm.amount} onChange={(e) => setWoForm({ ...woForm, amount: e.target.value })} /></div>
                <div><label className="label">Retention %</label><input className="input" type="number" step="0.01" value={woForm.retention_pct} onChange={(e) => setWoForm({ ...woForm, retention_pct: e.target.value })} /></div>
                <div><label className="label">Advance paid</label><input className="input" type="number" step="0.01" value={woForm.advance_paid} onChange={(e) => setWoForm({ ...woForm, advance_paid: e.target.value })} /></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>WO No</th><th>Scope</th><th>Amount</th><th>Certified</th><th>Balance</th><th>Status</th><th></th></tr></thead>
            <tbody>{wos.map((w) => {
              const bal = Number(w.amount || 0) - Number(w.certified_total || 0);
              return (
                <tr key={w.id}><td>{w.number}</td><td style={{ maxWidth: 300 }}>{w.scope}</td>
                  <td>{fmt(w.amount)}</td><td>{fmt(w.certified_total)}</td>
                  <td style={{ color: bal < 0 ? "var(--danger)" : "inherit" }}>{fmt(bal)}</td>
                  <td><span className={"badge " + w.status}>{w.status}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {w.status === "Draft" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/subcontract/work-orders/${w.id}/approve`), "Work order approved")}>Approve</button>}
                    <button className="btn ghost sm" onClick={() => openWO(w.id)}>Certify</button>
                  </td></tr>
              );
            })}
            {!wos.length && <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 20 }}>No work orders</td></tr>}
            </tbody></table></div>
        </div>
      )}

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.number} <span className={"badge " + drawer.status}>{drawer.status}</span></h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <p className="muted">{drawer.scope}</p>
            <div className="grid stats" style={{ margin: "12px 0" }}>
              <div className="stat"><div className="k">WO value</div><div className="v" style={{ fontSize: 17 }}>{fmt(drawer.amount)}</div></div>
              <div className="stat"><div className="k">Certified</div><div className="v" style={{ fontSize: 17 }}>{fmt(drawer.certified_total)}</div></div>
              <div className="stat"><div className="k">Balance</div><div className="v" style={{ fontSize: 17 }}>{fmt(Number(drawer.amount || 0) - Number(drawer.certified_total || 0))}</div></div>
            </div>
            <h3 style={{ marginBottom: 8 }}>Certificates</h3>
            <div className="table-wrap" style={{ marginBottom: 12 }}><table className="tbl">
              <thead><tr><th>No</th><th>Gross</th><th>Ret.</th><th>Adv rec.</th><th>Back-ch.</th><th>Net</th><th>Status</th><th></th></tr></thead>
              <tbody>{(drawer.certificates || []).map((c) => (
                <tr key={c.id}><td>{c.number}</td><td>{fmt(c.gross)}</td><td>{fmt(c.retention)}</td><td>{fmt(c.advance_recovery)}</td><td>{fmt(c.back_charge)}</td><td><b>{fmt(c.net)}</b></td>
                  <td><span className={"badge " + c.status}>{c.status}</span></td>
                  <td>{c.status === "Draft" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/subcontract/certificates/${c.id}/approve`), "Certificate approved")}>Approve</button>}</td></tr>
              ))}
              {!(drawer.certificates || []).length && <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 16 }}>No certificates yet</td></tr>}
            </tbody></table></div>
            {drawer.status === "Approved" && (
              <div className="card">
                <h3 style={{ marginBottom: 8 }}>New certificate</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
                  <div><label className="label">Cert No *</label><input className="input" value={cert.number} onChange={(e) => setCert({ ...cert, number: e.target.value })} /></div>
                  <div><label className="label">Gross *</label><input className="input" type="number" step="0.01" value={cert.gross} onChange={(e) => setCert({ ...cert, gross: e.target.value })} /></div>
                  <div><label className="label">Adv. recovery</label><input className="input" type="number" step="0.01" value={cert.advance_recovery} onChange={(e) => setCert({ ...cert, advance_recovery: e.target.value })} /></div>
                  <div><label className="label">Back-charge</label><input className="input" type="number" step="0.01" value={cert.back_charge} onChange={(e) => setCert({ ...cert, back_charge: e.target.value })} /></div>
                  <div><label className="label">From</label><input className="input" type="date" value={cert.period_from} onChange={(e) => setCert({ ...cert, period_from: e.target.value })} /></div>
                  <div><label className="label">To</label><input className="input" type="date" value={cert.period_to} onChange={(e) => setCert({ ...cert, period_to: e.target.value })} /></div>
                </div>
                <button className="btn sm" style={{ marginTop: 10 }} onClick={() => act(() => api.post("/subcontract/certificates", { ...cert, sc_work_order_id: drawer.id, gross: Number(cert.gross || 0), advance_recovery: Number(cert.advance_recovery || 0), back_charge: Number(cert.back_charge || 0) }), "Certificate created").then(() => setCert({ number: "", gross: 0, advance_recovery: 0, back_charge: 0, period_from: "", period_to: "" }))}>Create certificate</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
