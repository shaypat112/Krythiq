"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, GitBranch, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import MacbookScrollDemo from "@/components/macbook-scroll-demo";
import SlideTextButton from "@/components/kokonutui/slide-text-button";
import { RepositoryScene } from "./RepositoryScene";
import { ScanTerminal } from "./ScanTerminal";
import styles from "../landing.module.css";

const SystemGraph = dynamic(
  () => import("./SystemGraph").then((module) => module.SystemGraph),
  { ssr: false, loading: () => <div className={styles.graphFallback} aria-hidden="true" /> },
);

const story = [
  {
    kicker: "01 / Map",
    title: "Understand the system",
    body: "See how the frontend, API, data layer, authentication, infrastructure, and external services actually connect.",
  },
  {
    kicker: "02 / Diagnose",
    title: "Find what is actually wrong",
    body: "Krythiq traces high-impact failures to the relationship, route, and code context that caused them.",
  },
  {
    kicker: "03 / Resolve",
    title: "Turn findings into fixes",
    body: "Every issue becomes a precise, context-rich instruction your coding agent can act on without guessing.",
  },
  {
    kicker: "04 / Verify",
    title: "Ship with confidence",
    body: "Run the review again and get a clear, evidence-backed view of production readiness before release.",
  },
];

const reviewAreas = [
  { name: "Security", items: ["Authorization", "Secrets", "Exposed endpoints", "Dependencies"] },
  { name: "Architecture", items: ["Data flow", "API structure", "Database design", "Scalability"] },
  { name: "Frontend", items: ["Responsive UI", "Accessibility", "Component quality", "User experience"] },
  { name: "Production", items: ["Performance", "Error handling", "Maintainability", "Deployment risks"] },
];

const findings = [
  { severity: "HIGH", area: "Security", title: "Authorization missing on /api/admin", file: "app/api/admin/route.ts:42" },
  { severity: "MEDIUM", area: "Architecture", title: "Dashboard triggers 14 sequential API requests", file: "app/dashboard/page.tsx:118" },
  { severity: "MEDIUM", area: "Frontend", title: "Navigation breaks below 390px viewport width", file: "components/navigation.tsx:76" },
];

const workflow = [
  { icon: Sparkles, text: "AI agent writes code" },
  { icon: ScanSearch, text: "Krythiq reviews the application" },
  { icon: ShieldCheck, text: "High-impact issue is identified" },
  { icon: GitBranch, text: "Context-rich fix instructions are created" },
  { icon: Sparkles, text: "Agent applies the fix" },
  { icon: Check, text: "Krythiq verifies again" },
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function LandingExperience() {
  const cinematicRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: cinematicRef,
    offset: ["start start", "end end"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12, 0.2], [1, 1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -80]);
  const heroVisibility = useTransform(scrollYProgress, (latest) => latest >= 0.2 ? "hidden" : "visible");

  return (
    <main>
      <section ref={cinematicRef} className={styles.cinematic} aria-label="How Krythiq reviews a software system">
        <div className={styles.cinematicSticky}>
          <div className={styles.sceneWrap} aria-hidden="true">
            <SystemGraph progress={scrollYProgress} />
          </div>
          <div className={styles.sceneShade} />
          <motion.div className={styles.hero} style={{ opacity: heroOpacity, y: heroY, visibility: heroVisibility }}>
            <p className={styles.eyebrow}>Production readiness, independently verified</p>
            <h1>Your agent built it.<br /><span>Is it ready to ship?</span></h1>
            <p className={styles.heroCopy}>
              Krythiq reviews AI built software across security, architecture, performance, frontend quality, and production readiness.
            </p>
            <div className={styles.actions}>
              <Link href="/scan" className={styles.primaryButton}>Scan a repository <ArrowRight size={16} /></Link>
              <Link href="#story" className={styles.secondaryButton}>See how it works <ArrowDown size={15} /></Link>
            </div>
          </motion.div>
          <div className={styles.graphLegend}>
            <span><i className={styles.liveDot} /> System analysis</span>
            <span>6 services · 8 relationships</span>
          </div>
        </div>

        <div id="story" className={styles.storyTrack}>
          {story.map((item, index) => (
            <StoryStep key={item.title} item={item} index={index} progress={scrollYProgress} />
          ))}
        </div>
      </section>

      <section id="product" className={styles.productSection}>
        <Reveal className={styles.sectionHeading}>
          <p className={styles.eyebrow}>One review. The whole system.</p>
          <h2>A report built for shipping decisions.</h2>
          <p>Not a list of vague warnings. Krythiq connects every finding to evidence, impact, and the part of the system it affects.</p>
        </Reveal>

        <Reveal className={styles.reportShell}>
          <div className={styles.reportTopbar}>
            <div>
              <span className={styles.reportLabel}>REPOSITORY REVIEW</span>
              <strong>krythiq / launch-console</strong>
            </div>
            <div className={styles.reportStatus}><i /> Review complete</div>
          </div>
          <div className={styles.reportSummary}>
            <div className={styles.score}>
              <span>Production readiness</span>
              <strong>92<small>/100</small></strong>
              <p>Ready with 1 blocking issue</p>
            </div>
            <div className={styles.areaGrid}>
              {reviewAreas.map((area, index) => (
                <div className={styles.area} key={area.name}>
                  <div><span>{area.name}</span><strong>{[88, 94, 90, 93][index]}</strong></div>
                  <ul>{area.items.map((item) => <li key={item}><Check size={12} />{item}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.findingsHeader}><span>Prioritized findings</span><span>3 requiring attention</span></div>
          <div className={styles.findings}>
            {findings.map((finding) => (
              <div className={styles.finding} key={finding.title}>
                <span className={finding.severity === "HIGH" ? styles.high : styles.medium}>{finding.severity}</span>
                <div><strong>{finding.title}</strong><small>{finding.area} · {finding.file}</small></div>
                <ArrowRight size={16} />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="workflow" className={styles.workflowSection}>
        <Reveal className={styles.workflowIntro}>
          <p className={styles.eyebrow}>Fits your existing development workflow</p>
          <h2>Krythiq doesn’t write the code.<br />It checks the work.</h2>
          <p>An independent review loop turns fast agent output into software your team can trust.</p>
        </Reveal>
        <Reveal className={styles.workflow}>
          {workflow.map(({ icon: Icon, text }, index) => (
            <motion.div
              className={styles.workflowStep}
              key={text}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
            >
              <span><Icon size={16} /></span><strong>{text}</strong>
              {index < workflow.length - 1 ? <ArrowRight className={styles.flowArrow} size={15} /> : null}
            </motion.div>
          ))}
        </Reveal>
      </section>

      <ProductDemoSequence />

      <section className={styles.finalCta}>
        <Reveal>
          <h2>Your AI wrote the code.<br />Get a second opinion before you ship it.</h2>
          <p>Review security, architecture, frontend quality, and production readiness in one place.</p>
          <div className={styles.finalActions}>
            <Link href="/scan" className={styles.primaryButton}>Scan your repository <ArrowRight size={16} /></Link>
            <SlideTextButton href="/documentation" text="View Documentation" hoverText="Explore the docs" variant="ghost" className={styles.documentationButton} />
          </div>
        </Reveal>
      </section>
    </main>
  );
}

function ProductDemoSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const laptopY = useTransform(scrollYProgress, [0, 0.26, 0.55], [140, 0, -35]);
  const laptopScale = useTransform(scrollYProgress, [0, 0.28], [0.86, 1]);
  const laptopRotate = useTransform(scrollYProgress, [0, 0.3], [7, 0]);
  const laptopOpacity = useTransform(scrollYProgress, [0, 0.14], [0, 1]);
  const reduced = useReducedMotion();
  const [screen, setScreen] = useState<"report" | "terminal">("report");

  useEffect(() => {
    if (screen !== "report") return;

    const transitionTimer = window.setTimeout(() => {
      setScreen("terminal");
    }, 2000);

    return () => window.clearTimeout(transitionTimer);
  }, [screen]);

  return (
    <section ref={sectionRef} className={styles.demoSection} aria-labelledby="demo-heading">
      <Reveal className={styles.demoHeading}>
        <p className={styles.eyebrow}>See the evidence. Take the next step.</p>
        <h2 id="demo-heading">From system review<br />to a fix you can run.</h2>
        <p>Inspect the production report in Krythiq, then carry exact repository context into your existing development workflow.</p>
      </Reveal>
      <motion.div className={styles.laptopStage} style={reduced ? undefined : { opacity: laptopOpacity, y: laptopY, scale: laptopScale, rotateX: laptopRotate }}>
        <MacbookScrollDemo>
          <div className={styles.demoScreen}>
            <AnimatePresence mode="wait" initial={false}>
              {screen === "report" ? (
                <motion.div key="report" className={styles.screenPanel} initial={{ opacity: 0, scale: 0.995 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }} transition={{ duration: reduced ? 0 : 0.35 }}>
                  <RepositoryScene />
                </motion.div>
              ) : (
                <motion.div key="terminal" className={`${styles.screenPanel} ${styles.screenTerminal}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}>
                  <ScanTerminal onReset={() => setScreen("report")} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MacbookScrollDemo>
      </motion.div>
    </section>
  );
}

function StoryStep({ item, index, progress }: { item: (typeof story)[number]; index: number; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const centers = [0.32, 0.51, 0.7, 0.89];
  const center = centers[index];
  const opacity = useTransform(progress, [center - 0.1, center - 0.035, center + 0.045, center + 0.1], [0, 1, 1, 0]);
  const y = useTransform(progress, [center - 0.1, center, center + 0.1], [48, 0, -48]);
  return (
    <div className={styles.storyStep}>
      <motion.div className={styles.storyCard} style={{ opacity, y }}>
        <p>{item.kicker}</p><h2>{item.title}</h2><span>{item.body}</span>
      </motion.div>
    </div>
  );
}
