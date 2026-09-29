"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const FLOW = { New: ["UnderReview", "Dropped"], UnderReview: ["Inspected", "Estimated", "Dropped"], Inspected: ["Estimated", "Dropped"], Estimated: ["Quoted", "Dropped"], Quoted: ["Won", "Lost"], Won: [], Lost: [], Dropped: [] };

export default function EnquiryDetail() {
  const { id } = useParams();
  const { lang } = useAppStore();
  const [eq, setEq] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("overview");
  const [insp, setInsp] = useState({ visit_date: new Date().toISOString().slice(0, 10), inspector: "", location: "", site_condition: "", access_notes: "", utilities_notes: "", risks: "", findings: "" });

  const load = () => api.get("/prebid/enquiries/" + id).then((r) => setEq(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { await fn(); if (okMsg) setOk(okMsg); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const scheduleInspection = (e) => {
    e.preventDefault();
    act(() => api.post("/prebid/inspections", { ...insp, enquiry_id: id }), "Inspection scheduled")
      .then(() => setInsp({ visit_date: new Date().toISOString().slice(0, 10), inspector: "", location: "", site_condition: "", access_notes: "", utilities_notes: "", risks: "", findings: "" }));
  };

  if (!eq) return <div className="card">...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{eq.number}</h2>
          <p className="sub">{eq.title} · {eq.client_name || "—"} · {fmt(eq.est_value)} {eq.currency}</p>
        </div>
        <span className="spacer" />
        <span className={"badge " + eq.status}>{eq.status}</span>
      </div>
      {msg && <div className="alert err">{msg}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(FLOW[eq.status] || []).filter((s) => s !== "Lost" || true).map((s) => {
          if (s === "Lost") return <button key={s} className="btn ghost sm" onClick={() => { const r = window.prompt("Reason lost"); if (r) act(() => api.post(`/prebid/enquiries/${id}/transition`, { status: "Lost", reason_lost: r }), "Enquiry lost"); }}>Mark Lost</button>;
          return <button key={s} className="btn ghost sm" onClick={() => act(() => api.post(`/prebid/enquiries/${id}/transition`, { status: s }), "Enquiry " + s)}>{s}</button>;
        })}
        {!eq.tender_id && !["Won", "Lost", "Dropped"].includes(eq.status) && (
          <button className="btn sm" onClick={() => act(() => api.post(`/prebid/enquiries/${id}/convert`, {}), "Converted — project + tender created")}>Convert to Tender</button>
        )}
        {eq.tender_id && <a className="btn ghost sm" href={"/tenders/" + eq.tender_id}>Open tender {eq.tender?.number || ""}</a>}
      </div>

      <div className="tabs" style={{ maxWidth: 560, marginBottom: 14 }}>
        {["overview", "inspections", "documents"].map((x) => (
          <button key={x} type="button" className={sec === x ? "on" : ""} onClick={() => setSec(x)}>{x[0].toUpperCase() + x.slice(1)} {x === "inspections" ? `(${(eq.inspections || []).length})` : ""}</button>
        ))}
      </div>

      {sec === "overview" && (
        <div className="card">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
            {[["Client", eq.client_name], ["Consultant", eq.consultant_name], ["Source", eq.source],
              ["Received", dstr(eq.received_date)], ["Due", dstr(eq.due_date)], ["Est. value", fmt(eq.est_value) + " " + eq.currency],
              ["Estimator", eq.assigned_to], ["Win probability", (eq.probability || 0) + "%"],
              ...(eq.reason_lost ? [["Reason lost", eq.reason_lost]] : []),
            ].map(([k, v]) => (<div key={k}><div className="label">{k}</div><div>{v || "—"}</div></div>))}
            {eq.notes && <div style={{ gridColumn: "1 / -1" }}><div className="label">Notes</div><div style={{ whiteSpace: "pre-wrap" }}>{eq.notes}</div></div>}
          </div>
        </div>
      )}

      {sec === "inspections" && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Schedule site inspection</h3>
            <form onSubmit={scheduleInspection} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 8 }}>
              <div><label className="label">Visit date *</label><input className="input" type="date" value={insp.visit_date} onChange={(e) => setInsp({ ...insp, visit_date: e.target.value })} required /></div>
              <div><label className="label">Inspector</label><input className="input" value={insp.inspector} onChange={(e) => setInsp({ ...insp, inspector: e.target.value })} /></div>
              <div><label className="label">Location</label><input className="input" value={insp.location} onChange={(e) => setInsp({ ...insp, location: e.target.value })} /></div>
              <div><label className="label">Site condition</label><input className="input" value={insp.site_condition} onChange={(e) => setInsp({ ...insp, site_condition: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label className="label">Access / utilities / risks</label><input className="input" value={insp.risks} onChange={(e) => setInsp({ ...insp, risks: e.target.value })} placeholder="Access, utilities, risks…" /></div>
              <div style={{ display: "flex", alignItems: "end" }}><button className="btn sm" type="submit">Schedule</button></div>
            </form>
          </div>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>No</th><th>Visit</th><th>Inspector</th><th>Findings</th><th>Recommendation</th><th>Status</th></tr></thead>
            <tbody>{(eq.inspections || []).map((i) => (
              <tr key={i.id}><td><a href={"/inspections?open=" + i.id}>{i.number}</a></td><td>{dstr(i.visit_date)}</td><td>{i.inspector || "—"}</td>
                <td style={{ maxWidth: 300 }}>{i.findings || "—"}</td>
                <td><span className={"badge " + (i.recommendation === "Go" ? "Approved" : i.recommendation === "NoGo" ? "Cancelled" : "Draft")}>{i.recommendation}</span></td>
                <td>{i.status}</td></tr>
            ))}
            {!(eq.inspections || []).length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 20 }}>No inspections yet</td></tr>}
          </tbody></table></div>
        </div>
      )}

      {sec === "documents" && (
        <div className="card">
          <label className="btn ghost sm" style={{ display: "inline-block", cursor: "pointer" }}>
            Upload<input type="file" hidden onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fd = new FormData(); fd.append("file", f); fd.append("entity_type", "enquiry"); fd.append("entity_id", id);
              try { await api.post("/documents/upload", fd); setOk("Uploaded"); load(); }
              catch (err) { setMsg(err?.response?.data?.message || "Upload failed"); }
              e.target.value = "";
            }} />
          </label>
          {(eq.documents || []).length > 0 ? (
            <div className="table-wrap" style={{ marginTop: 12 }}><table className="tbl">
              <thead><tr><th>File</th><th>Size</th><th>Uploaded</th></tr></thead>
              <tbody>{eq.documents.map((d) => (<tr key={d.id}><td>{d.file_name}</td><td>{d.size ? Math.round(d.size / 1024) + " KB" : "—"}</td><td>{dstr(d.created_at)}</td></tr>))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ marginTop: 12 }}>No documents — upload the RFP pack, drawings or correspondence.</p>}
        </div>
      )}
    </div>
  );
}
