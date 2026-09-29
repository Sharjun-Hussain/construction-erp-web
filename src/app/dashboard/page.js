"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const get = (url) => api.get(url).then((r) => r.data.data || []).catch(() => []);
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const sum = (rows, f) => rows.reduce((s, r) => s + Number(r[f] || 0), 0);

export default function Dashboard() {
  const { lang, projectId } = useAppStore();
  const [ov, setOv] = useState(null);
  const [projects, setProjects] = useState([]);
  const [prog, setProg] = useState({});
  const [tenders, setTenders] = useState([]);
  const [indents, setIndents] = useState([]);
  const [pos, setPos] = useState([]);
  const [grns, setGrns] = useState([]);
  const [dprs, setDprs] = useState([]);
  const [vos, setVos] = useState([]);
  const [ipcs, setIpcs] = useState([]);
  const [boqs, setBoqs] = useState([]);
  const [ests, setEsts] = useState([]);

  useEffect(() => {
    api.get("/dashboard/overview").then((r) => setOv(r.data.data)).catch(() => {});
    get("/projects").then(setProjects);
    get("/tenders").then(setTenders);
    get("/procurement/indents").then(setIndents);
    get("/procurement/pos").then(setPos);
    get("/procurement/grns").then(setGrns);
    get("/site/dpr").then(setDprs);
    get("/site/variations").then(setVos);
    get("/ipc").then(setIpcs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectId) return;
    get("/boqs?project_id=" + projectId).then(setBoqs);
    get("/estimations?project_id=" + projectId).then(setEsts);
  }, [projectId]);

  useEffect(() => {
    projects.slice(0, 6).forEach((p) => {
      api.get("/dashboard/project/" + p.id).then((r) => setProg((m) => ({ ...m, [p.id]: r.data.data }))).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  const h = new Date().getHours();
  const greet = h < 12 ? t(lang, "gm") : h < 17 ? t(lang, "ga") : t(lang, "ge");
  const today = new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const tWon = tenders.filter((x) => x.status === "Won");
  const tSub = tenders.filter((x) => x.status === "Submitted");
  const tLost = tenders.filter((x) => x.status === "Lost");
  const billed = sum(ipcs, "net_amount");
  const contract = ov?.contract_total || 0;
  const collectPct = contract ? Math.min(100, Math.round((billed / contract) * 100)) : 0;

  const approvals = [
    { label: t(lang, "tenders"), n: tSub.length, href: "/tenders" },
    { label: "PO", n: pos.filter((x) => x.status === "Draft").length, href: "/procurement" },
    { label: "GRN", n: grns.filter((x) => x.status === "Draft").length, href: "/procurement" },
    { label: "DPR", n: dprs.filter((x) => x.status !== "Approved").length, href: "/site" },
    { label: t(lang, "variationShort"), n: vos.filter((x) => x.status === "Submitted").length, href: "/site" },
    { label: "IPC", n: ipcs.filter((x) => x.status === "Draft").length, href: "/ipc" },
  ];
  const pendingTotal = approvals.reduce((s, a) => s + a.n, 0);

  const steps = [
    { done: projects.length > 0, label: t(lang, "csProject") },
    { done: boqs.length > 0, label: t(lang, "csBoq") },
    { done: ests.length > 0, label: t(lang, "csEst") },
    { done: pos.length > 0, label: t(lang, "csPo") },
    { done: grns.some((x) => x.status === "Posted"), label: t(lang, "csGrn") },
    { done: dprs.some((x) => x.status === "Approved"), label: t(lang, "csDpr") },
    { done: ipcs.length > 0, label: t(lang, "csIpc") },
  ];
  const doneSteps = steps.filter((s) => s.done).length;

  const feed = [
    ...projects.map((x) => ({ at: x.created_at, color: "#2f7cf6", txt: x.code + " - " + x.name, tag: t(lang, "projects") })),
    ...tenders.map((x) => ({ at: x.created_at, color: "#7c3aed", txt: x.number + " · " + fmt(x.bid_amount), tag: t(lang, "tenders") })),
    ...pos.map((x) => ({ at: x.created_at, color: "#ea580c", txt: x.number + " · " + fmt(x.total), tag: "PO" })),
    ...grns.map((x) => ({ at: x.created_at, color: "#0d9488", txt: x.number + " · " + fmt(x.total), tag: "GRN" })),
    ...dprs.map((x) => ({ at: x.created_at || x.date, color: "#16a34a", txt: (x.date || "") + " · " + (x.manpower || 0), tag: "DPR" })),
    ...ipcs.map((x) => ({ at: x.created_at, color: "#db2777", txt: x.number + " · " + fmt(x.net_amount), tag: "IPC" })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

  const fdate = (d) => { try { return new Date(d).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "short" }); } catch { return ""; } };

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h2>{greet}</h2>
          <p>{today}</p>
        </div>
        <span className="spacer" />
        <a href="/projects" className="btn ghost sm">+ {t(lang, "projects")}</a>
        <a href="/ipc" className="btn sm">+ IPC</a>
      </div>

      <div className="grid stats kpis">
        <div className="card stat kpi"><span className="kpi-ico" style={{ background: "#e9f0fd", color: "#1d5bd8" }}>◈</span><div><div className="k">{t(lang, "contractValue")} (SAR)</div><div className="v">{ov ? fmt(contract) : "-"}</div></div></div>
        <div className="card stat kpi"><span className="kpi-ico" style={{ background: "#e2f5ea", color: "#178a54" }}>◉</span><div><div className="k">{t(lang, "billed")} (SAR)</div><div className="v">{ov ? fmt(ov.ipc_billed) : "-"}</div></div></div>
        <div className="card stat kpi"><span className="kpi-ico" style={{ background: "#fdf1dc", color: "#a86a12" }}>⬣</span><div><div className="k">{t(lang, "committed")} (SAR)</div><div className="v">{ov ? fmt(ov.po_committed) : "-"}</div></div></div>
        <div className="card stat kpi"><span className="kpi-ico" style={{ background: "#f1eafe", color: "#7c3aed" }}>⬢</span><div><div className="k">{t(lang, "activeProjects")}</div><div className="v">{ov?.projects_active ?? "-"}</div></div></div>
        <div className="card stat kpi"><span className="kpi-ico" style={{ background: "#fdecec", color: "#cf3d3d" }}>⬔</span><div><div className="k">{t(lang, "pendingApprovals")}</div><div className="v">{pendingTotal}</div></div></div>
      </div>

      <div className="dash-cols">
        <div className="dash-main">
          <div className="card">
            <div className="card-h"><h3>{t(lang, "tenderPipeline")}</h3><a href="/tenders">{t(lang, "viewAll")}</a></div>
            <div className="pipe">
              {[
                { l: t(lang, "stSubmitted"), rows: tSub, k: "bid_amount" },
                { l: t(lang, "stWon"), rows: tWon, k: "bid_amount" },
                { l: t(lang, "stLost"), rows: tLost, k: "bid_amount" },
              ].map((s) => (
                <div key={s.l} className="pipe-col">
                  <div className="pipe-h"><span className="badge Submitted">{s.rows.length}</span><b>{s.l}</b></div>
                  <div className="pipe-val">{fmt(sum(s.rows, s.k))}</div>
                  <div className="progress"><div style={{ width: Math.min(100, tenders.length ? (s.rows.length / tenders.length) * 100 : 0) + "%" }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>{t(lang, "projectProgress")}</h3><a href="/projects">{t(lang, "viewAll")}</a></div>
            <div className="plist">
              {projects.slice(0, 5).map((p) => (
                <div key={p.id} className="prow">
                  <div className="prow-top"><b>{p.code} — {p.name}</b><span className={"badge " + p.status}>{p.status}</span></div>
                  <div className="prow-bar"><div className="progress" style={{ flex: 1 }}><div style={{ width: (prog[p.id]?.progress_pct || 0) + "%" }} /></div><span>{prog[p.id]?.progress_pct ?? 0}%</span></div>
                  <div className="prow-meta"><span>{t(lang, "billed")}: {fmt(prog[p.id]?.ipc_billed)}</span><span>PO: {fmt(prog[p.id]?.po_committed)}</span></div>
                </div>
              ))}
              {!projects.length && <p className="muted">{t(lang, "noProjects")}</p>}
            </div>
          </div>
        </div>

        <div className="dash-side">
          <div className="card">
            <div className="card-h"><h3>{t(lang, "billingMix")}</h3></div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: `conic-gradient(#1d5bd8 0 ${collectPct}%, #e7ecf5 ${collectPct}% 100%)` }}>
                <div className="donut-c"><b>{collectPct}%</b><span>{t(lang, "billed")}</span></div>
              </div>
              <div className="donut-legend">
                <div><span className="lg" style={{ background: "#1d5bd8" }} />{t(lang, "billed")}: {fmt(billed)}</div>
                <div><span className="lg" style={{ background: "#e7ecf5" }} />{t(lang, "remaining")}: {fmt(Math.max(0, contract - billed))}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>{t(lang, "pendingApprovals")} ({pendingTotal})</h3></div>
            <div className="appr">
              {approvals.map((a) => (
                <a key={a.label} href={a.href} className="appr-row">
                  <span>{a.label}</span>
                  <span className={"badge " + (a.n ? "Submitted" : "Draft")}>{a.n}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>{t(lang, "gettingStarted")}</h3><span className="muted">{doneSteps}/{steps.length}</span></div>
            <div className="progress" style={{ marginBottom: 10 }}><div style={{ width: (doneSteps / steps.length) * 100 + "%" }} /></div>
            <div className="steps">
              {steps.map((s, i) => (
                <div key={i} className={"step" + (s.done ? " done" : "")}>
                  <span className="step-box">{s.done ? "✓" : ""}</span><span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>{t(lang, "recentActivity")}</h3></div>
        <div className="feed">
          {feed.map((f, i) => (
            <div key={i} className="feed-row">
              <span className="feed-dot" style={{ background: f.color }} />
              <span className="feed-tag">{f.tag}</span>
              <span className="feed-txt">{f.txt}</span>
              <span className="feed-date">{fdate(f.at)}</span>
            </div>
          ))}
          {!feed.length && <p className="muted">{t(lang, "noResults")}</p>}
        </div>
      </div>
    </div>
  );
}
