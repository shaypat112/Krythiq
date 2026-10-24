"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "../landing.module.css";
import { VaultFallback } from "./VaultFallback";

const VaultScene = dynamic(
  () => import("./RepositoryVault").then((module) => module.RepositoryVault),
  { ssr: false, loading: () => <VaultFallback /> },
);

const chambers = [
  { title: "Frontend", description: "Review client code for security, architecture, and performance concerns." },
  { title: "API routes", description: "Inspect route handlers and see where authorization logic belongs." },
  { title: "Authentication", description: "Keep session and access checks in view as you review the code." },
  { title: "Data layer", description: "Follow application code around database calls and stored data." },
  { title: "Runtime & config", description: "Read dependency and configuration signals alongside source." },
  { title: "External services", description: "See integrations in the context of the code that calls them." },
];

const findings = [
  { severity: "High", title: "Missing authorization on an admin endpoint", file: "app/api/admin/route.ts:42" },
  { severity: "Medium", title: "Sequential requests slow down the dashboard", file: "app/dashboard/page.tsx:118" },
];

const steps = [
  { number: "01", title: "Connect a repository", description: "Choose a GitHub repository or upload a source file." },
  { number: "02", title: "Run a scan", description: "Review security, architecture, and performance signals in your code." },
  { number: "03", title: "Choose what to fix", description: "Open prioritized findings with evidence linked to the source." },
];

export function LandingExperience() {
  const chaptersRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLElement>(null);
  const [sceneEnabled, setSceneEnabled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: chaptersRef, offset: ["start end", "end start"] });
  const prefersReducedMotion = Boolean(useReducedMotion());
  const progress = useSpring(scrollYProgress, { stiffness: 82, damping: 25, mass: 0.8, skipInitialAnimation: prefersReducedMotion });

  useEffect(() => progress.on("change", (value) => {
    const next = Math.max(0, Math.min(chambers.length - 1, Math.round(value * (chambers.length - 1))));
    setActiveIndex((current) => current === next ? current : next);
  }), [progress]);

  useEffect(() => {
    const element = vaultRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setSceneEnabled(true);
      observer.disconnect();
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <main id="main-content" className={styles.main}>
      <section id="repository-map" className={styles.vaultExperience} aria-label="Explore a repository as a series of connected vault chambers">
        <div className={styles.experienceGrid}>
          <div className={styles.storyColumn}>
            <header className={styles.heroText}>
              <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> REPOSITORY INTELLIGENCE</p>
              <h1 id="hero-heading">Enter your <span>codebase.</span></h1>
              <p className={styles.heroCopy}>A repository has more than files. Krythiq brings security, architecture, and performance findings into one clear view.</p>
              <div className={styles.actions}>
                <Link href="/scan" className={styles.primaryButton}>Scan a repository <ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href="/documentation" className={styles.secondaryButton}>Explore the docs</Link>
              </div>
              <p className={styles.heroFootnote}><ShieldCheck size={15} aria-hidden="true" /> Start with a scan. No setup guide required.</p>
              <a className={styles.scrollCue} href="#vault-chambers"><span>Scroll to open the vault</span><ArrowDown size={14} aria-hidden="true" /></a>
            </header>

            <div ref={chaptersRef} id="vault-chambers" className={styles.chapters}>
              {chambers.map((chamber, index) => (
                <article className={`${styles.chapter} ${activeIndex === index ? styles.chapterActive : ""}`} key={chamber.title} aria-labelledby={`chamber-${index}`}>
                  <p className={styles.chapterIndex}>CHAMBER {String(index + 1).padStart(2, "0")} <span>/ 06</span></p>
                  <h2 id={`chamber-${index}`}>{chamber.title}</h2>
                  <p>{chamber.description}</p>
                  <span className={styles.chapterRule} aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>

          <aside ref={vaultRef} className={styles.vaultSticky} aria-label="Three-dimensional repository vault">
            <div className={styles.vaultFrame}>
              <div className={styles.vaultTopline}><span><i /> REPOSITORY VAULT</span><span>DEMO APP · 06 CHAMBERS</span></div>
              <div className={styles.vaultCanvas}>{sceneEnabled ? <VaultScene progress={progress} /> : <VaultFallback />}</div>
              <div className={styles.vaultReadout} aria-live="polite" aria-atomic="true">
                <span>CHAMBER {String(activeIndex + 1).padStart(2, "0")} <i>/ 06</i></span>
                <h2>{chambers[activeIndex].title}</h2>
                <p>{chambers[activeIndex].description}</p>
              </div>
              <div className={styles.vaultDepth} aria-hidden="true"><span /> STRUCTURE REVEALED BY SCROLL</div>
            </div>
            <p className={styles.vaultCaption}>A conceptual view of common repository layers. Scan results vary by codebase.</p>
          </aside>
        </div>
      </section>

      <section id="report" className={styles.reportSection} aria-labelledby="report-heading">
        <div className={styles.reportCopy}>
          <p className={styles.eyebrow}>From scan to next step</p>
          <h2 id="report-heading">Clear findings. Useful context.</h2>
          <p>Review what was found, how severe it is, and where it lives in your code. Keep the signal close to the source.</p>
          <Link href="/documentation/quickstart" className={styles.textLink}>See how scans work <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className={styles.report}>
          <div className={styles.reportHeader}><div><span className={styles.reportLabel}>SCAN REPORT</span><h3>demo-app</h3></div><span className={styles.reportSummary}><span className={styles.reportStatus} /> 2 findings</span></div>
          <ul className={styles.findings}>
            {findings.map((finding) => <li className={styles.finding} key={finding.title}><span className={finding.severity === "High" ? styles.high : styles.medium}>{finding.severity}</span><div><h4>{finding.title}</h4><code>{finding.file}</code></div><ArrowRight className={styles.findingArrow} size={16} aria-hidden="true" /></li>)}
          </ul>
          <p className={styles.reportNote}><Sparkles size={14} aria-hidden="true" /> Example report · Your findings depend on the repository scanned.</p>
        </div>
      </section>

      <section id="how-it-works" className={styles.howItWorks} aria-labelledby="steps-heading">
        <div className={styles.stepsHeading}><p className={styles.eyebrow}>A focused workflow</p><h2 id="steps-heading">From repository to next steps.</h2></div>
        <ol className={styles.steps}>{steps.map((step) => <li key={step.number}><span className={styles.stepNumber}>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
      </section>

      <section className={styles.finalCta} aria-labelledby="cta-heading"><div><p className={styles.eyebrow}>Start with what you have</p><h2 id="cta-heading">Make your next scan count.</h2></div><Link href="/scan" className={styles.primaryButton}>Scan a repository <ArrowRight size={16} aria-hidden="true" /></Link></section>
    </main>
  );
}
