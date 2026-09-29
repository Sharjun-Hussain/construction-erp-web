"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function ProposalDetail() {
  const { id } = useParams();
  const { lang } = useAppStore();
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  const load = () => api.get("/prebid/proposals/" + id).then((r) => setP(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { const r = await fn(); if (okMsg) setOk(okMsg); load(); return r; }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const doExport = async () => {
    try {
      const r = await api.get(`/prebid/proposals/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href = url; a.download = `Proposal-${p.number}-R${p.revision}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { setMsg("Export failed"); }
  };

  if (!p) return <div className="card">...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{p.number} <span className="muted" style={{ fontSize: 15 }}>Rev {p.revision}</span></h2>
          <p className="sub">{p.title} · {p.client_name || "—"} · {fmt(p.amount)} {p.currency}</p>
        </div>
        <span className="spacer" />
        <span className={"badge " + p.status}>{p.status}</span>
        <button className="btn ghost sm" onClick={doExport}>{t(lang, "exportLbl")}</button>
      </div>
      {msg && <div className="alert err">{msg}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(p.allowed_transitions || []).map((s) => (
          <button key={s} className={s === "Accepted" ? "btn sm" : "btn ghost sm"} onClick={() => act(() => api.post(`/prebid/proposals/${id}/transition`, { status: s }), "Proposal " + s)}>{s}</button>
        ))}
        {["Sent", "Accepted", "Rejected", "Expired"].includes(p.status) && (
          <button className="btn ghost sm" onClick={() => act(() => api.post(`/prebid/proposals/${id}/revise`, {}), "Revision created").then((r) => { if (r?.data?.data?.id) window.location.href = "/proposals/" + r.data.data.id; })}>Revise</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
          {[["Tender", p.tender ? p.tender.number : "—"], ["Estimation", p.estimation ? `${p.estimation.number} R${p.estimation.revision}` : "—"],
            ["Valid until", dstr(p.valid_until)], ["Payment terms", p.payment_terms],
            ["Sent", p.sent_at ? new Date(p.sent_at).toLocaleString() : "—"],
          ].map(([k, v]) => (<div key={k}><div className="label">{k}</div><div>{v || "—"}</div></div>))}
          {p.cover_letter && <div style={{ gridColumn: "1 / -1" }}><div className="label">Cover letter</div><div style={{ whiteSpace: "pre-wrap" }}>{p.cover_letter}</div></div>}
          {p.delivery_terms && <div style={{ gridColumn: "1 / -1" }}><div className="label">Delivery</div><div style={{ whiteSpace: "pre-wrap" }}>{p.delivery_terms}</div></div>}
          {p.exclusions && <div style={{ gridColumn: "1 / -1" }}><div className="label">Exclusions</div><div style={{ whiteSpace: "pre-wrap" }}>{p.exclusions}</div></div>}
        </div>
      </div>

      {(p.lines || []).length > 0 && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>{t(lang, "descriptionF")}</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>{p.lines.map((l, i) => (
              <tr key={l.id || i}><td>{l.description}</td><td>{l.unit}</td><td>{fmt(l.quantity)}</td><td>{fmt(l.unit_sell ?? l.unit_rate)}</td><td>{fmt(l.total_sell ?? l.amount)}</td></tr>
            ))}
            <tr><td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>TOTAL</td><td style={{ fontWeight: 700 }}>{fmt(p.amount)} {p.currency}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
