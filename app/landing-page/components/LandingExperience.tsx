"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowRight, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "../landing.module.css";

const SystemGraph = dynamic(
  () => import("./SystemGraph").then((module) => module.SystemGraph),
  { ssr: false, loading: () => <GraphFallback /> },
);

const findings = [
  { severity: "High", title: "Missing authorization on an admin endpoint", file: "app/api/admin/route.ts:42" },
  { severity: "Medium", title: "Sequential requests slow down the dashboard", file: "app/dashboard/page.tsx:118" },
];

const steps = [
  { number: "01", title: "Connect a repository", description: "Choose a GitHub repository or upload a source file." },
  { number: "02", title: "Map the system", description: "Krythiq checks code patterns and traces connections across your project." },
  { number: "03", title: "Move with clarity", description: "Review prioritized findings with evidence linked to the code." },
];

function GraphFallback() {
  return (
    <svg className={styles.graphFallback} viewBox="0 0 520 360" role="img" aria-label="A repository map connecting frontend, API, authentication, database, and external services">
      <g className={styles.graphLines}>
        <path d="M86 112 207 158 331 80M207 158 336 248M207 158 390 158M336 248 440 272M331 80 390 158M390 158 440 272" />
      </g>
      {[[86,112,"Frontend"],[207,158,"API"],[331,80,"Auth"],[336,248,"Database"],[390,158,"Infrastructure"],[440,272,"Services"]].map(([x,y,label]) => (
        <g key={label as string} transform={`translate(${x} ${y})`}>
          <circle r="10" className={styles.graphDot} />
          <text x="16" y="4">{label}</text>
        </g>
      ))}
    </svg>
  );
}

export function LandingExperience() {
  const mapRef = useRef<HTMLElement>(null);
  const [sceneEnabled, setSceneEnabled] = useState(false);
  const { scrollYProgress } = useScroll({ target: mapRef, offset: ["start end", "end start"] });
  const prefersReducedMotion = Boolean(useReducedMotion());
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.7, skipInitialAnimation: prefersReducedMotion });

  useEffect(() => {
    const element = mapRef.current;
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
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroText}>
          <p className={styles.eyebrow}><span className={styles.eyebrowMark} /> CODE INTELLIGENCE FOR TEAMS</p>
          <h1 id="hero-heading">See how your code <span>connects.</span></h1>
          <p className={styles.heroCopy}>Find security, architecture, and performance issues across your repository—with clear evidence and a path to what needs attention.</p>
          <div className={styles.actions}>
            <Link href="/scan" className={styles.primaryButton}>Scan a repository <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/documentation" className={styles.secondaryButton}>Explore the docs</Link>
          </div>
          <p className={styles.heroFootnote}><ShieldCheck size={15} aria-hidden="true" /> Start with a scan. No setup guide required.</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.visualTopline}><span><span className={styles.liveDot} /> REPOSITORY MAP</span><span>demo-app · 6 systems</span></div>
          <GraphFallback />
          <div className={styles.visualCaption}><GitBranch size={14} /> Relationships surfaced from your codebase</div>
          <div className={styles.visualGlow} />
        </div>
        <a className={styles.scrollCue} href="#repository-map"><span>See the system behind the code</span><ArrowDown size={14} aria-hidden="true" /></a>
      </section>

      <section ref={mapRef} id="repository-map" className={styles.mapSection} aria-labelledby="map-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>A clearer picture of your code</p>
          <h2 id="map-heading">Issues don’t live in isolation.</h2>
          <p>Follow the relationships between your frontend, APIs, data, and services. As the map opens up, the paths between each layer come into view.</p>
        </div>
        <div className={styles.mapStage}>
          <div className={styles.mapLabels} aria-hidden="true"><span>APP LAYERS</span><span>CONNECTED SYSTEMS</span></div>
          <div className={styles.sceneWrap}>
            {sceneEnabled ? <SystemGraph progress={progress} /> : <GraphFallback />}
            <div className={styles.sceneLegend}><span><i className={styles.legendBlue} /> Connected component</span><span><i className={styles.legendRed} /> Finding to review</span></div>
          </div>
        </div>
        <ul className={styles.systemList} aria-label="Mapped parts of a repository">
          {["Frontend", "API", "Authentication", "Database", "Infrastructure", "External services"].map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}
        </ul>
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
