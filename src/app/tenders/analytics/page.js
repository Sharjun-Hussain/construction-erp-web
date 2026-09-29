"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtDec = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function TenderAnalyticsPage() {
  const router = useRouter();
  const { lang } = useAppStore();
  const [a, setA] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api
      .get("/tenders/analytics")
      .then((r) => setA(r.data.data))
      .catch((err) => setMsg(err?.response?.data?.message || "Failed to load analytics"));
  }, []);

  if (!a) {
    return (
      <div className="projects-page" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading Tender Analytics...</div>
      </div>
    );
  }

  const tot = a.totals;
  const maxV = Math.max(1, ...a.monthly.map((m) => Number(m.value || 0)));

  return (
    <div className="projects-page">
      {/* 1. TOP HEADER WORKSPACE BAR */}
      <div
        style={{
          padding: "16px 24px",
          background: "#ffffff",
          borderBottom: "1px solid #edf2f7",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => router.push("/tenders")}
            style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            ← All Tenders
          </button>
          <div style={{ width: 1, height: 22, background: "#e2e8f0" }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              Tender & Bidding Analytics Intelligence
            </h2>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
              Win rates, commercial margin variances, monthly award trends, and active bid bonds
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn sm"
          onClick={() => router.push("/tenders")}
        >
          + New Tender Bid
        </button>
      </div>

      {msg && (
        <div className="alert err" style={{ margin: "0 24px 14px" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}

      {/* 2. ZOHO BIGIN COMMERCIAL KPI RIBBON */}
      <div style={{ padding: "0 24px 16px" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Active Bidding Pipeline</span>
            <span className="bigin-kpi-val">{fmt(tot.pipeline_value)} SAR</span>
            <span className="bigin-kpi-sub">{tot.open} open bidding opportunities</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Won Contracts Awarded</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(tot.won_value)} SAR
            </span>
            <span className="bigin-kpi-sub">{tot.won} awarded contracts</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Competitive Win Rate</span>
            <span
              className="bigin-kpi-val"
              style={{ color: tot.win_rate_pct >= 50 ? "#0ba360" : "#d97706" }}
            >
              {tot.win_rate_pct}%
            </span>
            <span className="bigin-kpi-sub">{tot.won_value_weighted_pct}% value-weighted</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Average Bid Ticket</span>
            <span className="bigin-kpi-val">{fmt(tot.avg_bid)} SAR</span>
            <span className="bigin-kpi-sub">Won average: {fmt(tot.avg_won_bid)} SAR</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Portfolio Gross Margin</span>
            <span
              className="bigin-kpi-val"
              style={{ color: tot.portfolio_margin_pct >= 10 ? "#0ba360" : "#dc2626" }}
            >
              {tot.portfolio_margin_pct}%
            </span>
            <span className="bigin-kpi-sub">on awarded contracts</span>
          </div>
        </div>
      </div>

      {/* 3. ANALYTICS GRID */}
      <div style={{ padding: "0 24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: 16 }}>
          {/* Card 1: Pipeline Closing Soonest */}
          <div className="bigin-section-card">
            <div className="bigin-section-head">
              <span className="badge Draft">01</span>
              <span className="bigin-section-title">Active Pipeline — Closing Soonest</span>
            </div>
            {a.pipeline.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 13, padding: "20px 0" }}>
                No open tender submissions pending deadline.
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              {a.pipeline.map((p) => (
                <div
                  key={p.id}
                  className="tl-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/tenders/${p.id}`)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <b style={{ fontWeight: 650, color: "#0f172a" }}>{p.number}</b>
                      <span style={{ fontSize: 13, color: "#334155" }}>{p.title || "—"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {p.project ? `${p.project} · ` : ""}
                      <span className={"badge " + p.status} style={{ fontSize: 10, padding: "1px 6px" }}>
                        {p.status}
                      </span>{" "}
                      · Win Probability: {p.probability || 0}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                      {fmt(p.bid_amount)} SAR
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <span
                        className={
                          "tl-chip" + (p.days_remaining < 0 ? " over" : p.days_remaining <= 5 ? " hot" : "")
                        }
                      >
                        {p.days_remaining < 0 ? `Overdue ${Math.abs(p.days_remaining)}d` : `${p.days_remaining}d left`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Bid Margin vs Actual Cost Variance */}
          <div className="bigin-section-card">
            <div className="bigin-section-head">
              <span className="badge Draft">02</span>
              <span className="bigin-section-title">Bid Margin vs. Actual Cost Variance (Won Tenders)</span>
            </div>
            {a.variances.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 13, padding: "20px 0" }}>
                No awarded projects with execution costs recorded yet.
              </div>
            )}
            {a.variances.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Tender / Project</th>
                      <th style={{ textAlign: "right" }}>Bid Cost Basis</th>
                      <th style={{ textAlign: "right" }}>Actual Site Cost</th>
                      <th style={{ textAlign: "right" }}>Bid M%</th>
                      <th style={{ textAlign: "right" }}>Actual M%</th>
                      <th style={{ textAlign: "right" }}>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.variances.map((v) => (
                      <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/tenders/${v.id}`)}>
                        <td>
                          <div style={{ fontWeight: 650, color: "#0284c7" }}>{v.number}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{v.project}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>{fmt(v.bid_cost)}</td>
                        <td style={{ textAlign: "right", color: v.has_actuals ? "#0f172a" : "#94a3b8" }}>
                          {v.has_actuals ? fmt(v.actual_cost) : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{v.bid_margin_pct}%</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          {v.actual_margin_pct === null ? "—" : `${v.actual_margin_pct}%`}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color:
                              v.variance === null
                                ? "#64748b"
                                : v.variance >= 0
                                ? "#0ba360"
                                : "#dc2626",
                          }}
                        >
                          {v.variance === null ? "—" : (v.variance > 0 ? "+" : "") + v.variance + "%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 3: Hit-Rate by Client */}
          <div className="bigin-section-card">
            <div className="bigin-section-head">
              <span className="badge Draft">03</span>
              <span className="bigin-section-title">Commercial Hit-Rate by Client</span>
            </div>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Client Organization</th>
                    <th style={{ textAlign: "center" }}>Won - Lost - Open</th>
                    <th style={{ textAlign: "right" }}>Total Bid SAR</th>
                    <th style={{ textAlign: "right" }}>Won Value SAR</th>
                    <th style={{ textAlign: "right" }}>Award Hit %</th>
                  </tr>
                </thead>
                <tbody>
                  {a.by_client.map((c) => (
                    <tr key={c.client}>
                      <td style={{ fontWeight: 600 }}>{c.client}</td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>
                        <span style={{ color: "#0ba360", fontWeight: 700 }}>{c.won}W</span> -{" "}
                        <span style={{ color: "#dc2626", fontWeight: 650 }}>{c.lost}L</span> -{" "}
                        <span style={{ color: "#0284c7" }}>{c.open}O</span>
                      </td>
                      <td style={{ textAlign: "right" }}>{fmt(c.bid_value)}</td>
                      <td style={{ textAlign: "right", fontWeight: 650, color: "#0ba360" }}>
                        {fmt(c.won_value)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {c.won + c.lost ? Math.round((c.won / (c.won + c.lost)) * 100) + "%" : "—"}
                      </td>
                    </tr>
                  ))}
                  {!a.by_client.length && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 16, color: "#64748b" }}>
                        No client records available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 4: Breakdown by Contract Type */}
          <div className="bigin-section-card">
            <div className="bigin-section-head">
              <span className="badge Draft">04</span>
              <span className="bigin-section-title">Breakdown by Contract Type</span>
            </div>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Contract Type</th>
                    <th style={{ textAlign: "center" }}>Total Tenders</th>
                    <th style={{ textAlign: "center" }}>Won Awards</th>
                    <th style={{ textAlign: "right" }}>Total Pipeline Value</th>
                  </tr>
                </thead>
                <tbody>
                  {a.by_contract_type.map((c) => (
                    <tr key={c.contract_type}>
                      <td style={{ fontWeight: 600 }}>{c.contract_type}</td>
                      <td style={{ textAlign: "center" }}>{c.total}</td>
                      <td style={{ textAlign: "center", fontWeight: 650, color: "#0ba360" }}>{c.won}</td>
                      <td style={{ textAlign: "right", fontWeight: 650 }}>{fmt(c.value)} SAR</td>
                    </tr>
                  ))}
                  {!a.by_contract_type.length && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "#64748b" }}>
                        No contract records available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 5: Monthly Submission & Award Trend */}
          <div className="bigin-section-card" style={{ gridColumn: "1 / -1" }}>
            <div className="bigin-section-head">
              <span className="badge Draft">05</span>
              <span className="bigin-section-title">Monthly Bidding Volume & Award Velocity</span>
            </div>
            {a.monthly.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 13, padding: "20px 0" }}>
                No submission timeline logged.
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 16,
                height: 190,
                padding: "16px 12px 0",
              }}
            >
              {a.monthly.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                    {fmt(m.value)} SAR
                  </div>
                  <div
                    style={{
                      height: 120,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      background: "#f8fafc",
                      borderRadius: "6px 6px 0 0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: `${(m.won_value / maxV) * 100}%`,
                        background: "#0ba360",
                        transition: "height 0.2s ease",
                      }}
                      title={`Won: ${fmt(m.won_value)} SAR`}
                    />
                    <div
                      style={{
                        height: `${((m.value - m.won_value) / maxV) * 100}%`,
                        background: "#bfdbfe",
                        transition: "height 0.2s ease",
                      }}
                      title={`Open/Not Won: ${fmt(m.value - m.won_value)} SAR`}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, fontWeight: 600 }}>
                    {m.month}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 6: Active Bid Bonds */}
          {a.bonds && a.bonds.length > 0 && (
            <div className="bigin-section-card" style={{ gridColumn: "1 / -1" }}>
              <div className="bigin-section-head">
                <span className="badge Draft">06</span>
                <span className="bigin-section-title">Active Bid Bonds & Bank Guarantees</span>
              </div>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Tender Number</th>
                      <th>Guarantee Type</th>
                      <th style={{ textAlign: "right" }}>Bond Amount</th>
                      <th>Expiry Date</th>
                      <th>Issuance Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.bonds.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 650, color: "#0284c7" }}>{b.number}</td>
                        <td style={{ fontSize: 12 }}>{b.bond_type}</td>
                        <td style={{ textAlign: "right", fontWeight: 650 }}>{fmt(b.bond_amount)} SAR</td>
                        <td style={{ fontSize: 12 }}>{b.bond_expiry || "—"}</td>
                        <td>
                          <span className={"badge " + (b.bond_status === "Issued" ? "Approved" : "Draft")}>
                            {b.bond_status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                            onClick={() => router.push(`/tenders/${b.id}`)}
                          >
                            Open →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
