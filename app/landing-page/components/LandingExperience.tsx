"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Check, Code2, Database, GitBranch, Globe, LockKeyhole, ShieldCheck } from "lucide-react";
import { useMotionValue } from "motion/react";
import { Component, useState } from "react";
import styles from "../landing.module.css";

const SystemGraph = dynamic(() => import("./SystemGraph").then((module) => module.SystemGraph), {
  ssr: false,
  loading: () => <div className={styles.graphLoading}>Loading system map…</div>,
});

class GraphBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className={styles.graphLoading}>System map unavailable. Explore the services below.</div>
      : this.props.children;
  }
}

const findings = [
  { severity: "HIGH", title: "Authorization missing on /api/admin", file: "app/api/admin/route.ts:42" },
  { severity: "MEDIUM", title: "Dashboard makes 14 sequential API requests", file: "app/dashboard/page.tsx:118" },
  { severity: "MEDIUM", title: "Navigation overflows on small screens", file: "components/navigation.tsx:76" },
];

export function LandingExperience() {
  return (
    <main id="main-content">
      <section className={styles.heroSection} aria-labelledby="hero-heading">
        <div className={styles.heroGrid}>
          <div className={styles.hero}>
            <p className={styles.eyebrow}><i className={styles.liveDot} /> A second opinion for your code</p>
            <h1 id="hero-heading">Your agent built it.<br /><span>Know what to fix.</span></h1>
            <p className={styles.heroCopy}>Find security risks, architecture issues, and frontend problems in one repository review. Clear evidence. Less guesswork.</p>
            <div className={styles.actions}>
              <Link href="/scan" className={styles.primaryButton}>Scan a repository <ArrowRight size={16} /></Link>
              <Link href="/documentation" className={styles.secondaryButton}>Read the docs</Link>
            </div>
            <p className={styles.heroNote}>Security · Architecture · Frontend · Performance</p>
          </div>
          <SystemPreview />
        </div>
      </section>

      <section id="product" className={styles.productSection} aria-labelledby="report-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>The evidence, in one place</p>
          <h2 id="report-heading">A useful report. A clear next step.</h2>
          <p>Prioritized findings linked to the code that needs your attention.</p>
        </div>
        <div className={styles.reportShell}>
          <div className={styles.reportTopbar}><div><span className={styles.reportLabel}>EXAMPLE REVIEW</span><strong>krythiq / demo-app</strong></div><span className={styles.reportStatus}><i className={styles.liveDot} /> Review complete</span></div>
          <div className={styles.areaGrid}>
            {["Security", "Architecture", "Frontend", "Performance"].map((area) => <div key={area} className={styles.area}><ShieldCheck size={15} /><span>{area}</span><Check size={13} /></div>)}
          </div>
          <div className={styles.findings}>
            {findings.map((finding) => <div className={styles.finding} key={finding.title}><span className={finding.severity === "HIGH" ? styles.high : styles.medium}>{finding.severity}</span><div><strong>{finding.title}</strong><small>{finding.file}</small></div><ArrowRight size={15} /></div>)}
          </div>
        </div>
        <div className={styles.steps}>
          <p><span>01</span>Scan your repository</p>
          <p><span>02</span>Review the evidence</p>
          <p><span>03</span>Edit, review, and rescan</p>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="cta-heading">
        <h2 id="cta-heading">Ship with a second opinion.</h2>
        <Link href="/scan" className={styles.primaryButton}>Start your review <ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}

function SystemPreview() {
  const progress = useMotionValue(0.48);
  const [selected, setSelected] = useState(1);
  const services = [
    { icon: Globe, name: "Frontend", detail: "Routes & components", state: "Reviewed" },
    { icon: Code2, name: "API layer", detail: "/api/admin", state: "Auth missing" },
    { icon: Database, name: "Database", detail: "Queries & policies", state: "Reviewed" },
    { icon: LockKeyhole, name: "Authentication", detail: "Sessions & permissions", state: "Reviewed" },
    { icon: ShieldCheck, name: "Infrastructure", detail: "Deployment & configuration", state: "Reviewed" },
    { icon: GitBranch, name: "External services", detail: "Integrations & dependencies", state: "Reviewed" },
  ];

  return (
    <div className={styles.systemPreview} aria-label="Illustrative repository analysis">
      <div className={styles.previewTop}><span><i className={styles.liveDot} /> SYSTEM REVIEW</span><span>ILLUSTRATION</span></div>
      <div className={styles.graphViewport}>
        <GraphBoundary><SystemGraph progress={progress} selected={selected} onSelect={setSelected} /></GraphBoundary>
        <span className={styles.graphCaption}>SELECT A NODE TO INSPECT</span>
      </div>

      <div className={styles.serviceList}>
        {services.map(({ icon: Icon, name, detail, state }, index) => (
          <button type="button" key={name} aria-pressed={selected === index} onClick={() => setSelected(index)} className={index === 1 ? styles.serviceIssue : styles.serviceRow}>
            <span className={styles.serviceIcon}><Icon size={17} /></span>
            <span className={styles.serviceInfo}><strong>{name}</strong><small>{detail}</small></span>
            <span className={styles.serviceState}>{index === 1 ? <span aria-hidden="true">!</span> : <Check size={12} />}{state}</span>
          </button>
        ))}
      </div>
      <p className={styles.selectionDetail} aria-live="polite">{selected === 1 ? "API layer · Authorization check missing on /api/admin." : `${["Frontend", "API layer", "Database", "Authentication", "Infrastructure", "External services"][selected]} · Connections mapped in this example review.`}</p>
      <div className={styles.previewBottom}><ShieldCheck size={15} /><span>Every finding. Evidence attached.</span><ArrowRight size={15} /></div>
    </div>
  );
}
