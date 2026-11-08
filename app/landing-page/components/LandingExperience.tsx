import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleDot, FileCode2, GitBranch, Layers3, LockKeyhole, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import styles from "../landing.module.css";

const findings = [
  { level: "High", title: "Missing authorization check", path: "app/api/admin/route.ts", line: "42", tone: styles.high },
  { level: "Medium", title: "Sequential requests in dashboard", path: "app/dashboard/page.tsx", line: "118", tone: styles.medium },
  { level: "Info", title: "Dependency update available", path: "package.json", line: "24", tone: styles.info },
];

const features = [
  { icon: ShieldCheck, number: "01", title: "Surface the right issues", description: "Bring security, architecture, and performance findings into one focused report." },
  { icon: GitBranch, number: "02", title: "Follow the evidence", description: "See the source location and context behind each finding before deciding what to fix." },
  { icon: Layers3, number: "03", title: "Work across your codebase", description: "Start with a GitHub repository or upload source files to inspect the code you have." },
];

export function LandingExperience() {
  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.hero} aria-labelledby="hero-heading">
        <Link href="/documentation/quickstart" className={styles.announcement}><span className={styles.announcementDot} /> A clearer way to review code <ChevronRight size={14} aria-hidden="true" /></Link>
        <h1 id="hero-heading">Understand your code.<br /><span>Ship with confidence.</span></h1>
        <p className={styles.heroCopy}>Krythiq turns repository scans into clear, prioritized findings. See what matters, where it lives, and what to review next.</p>
        <div className={styles.heroActions}>
          <Button asChild className={styles.primaryButton}><Link href="/scan">Scan a repository <ArrowRight size={16} aria-hidden="true" /></Link></Button>
          <Button asChild variant="outline" className={styles.secondaryButton}><Link href="/documentation">Read the docs</Link></Button>
        </div>
        <p className={styles.heroNote}><Check size={14} aria-hidden="true" /> Start with a GitHub repository or source file</p>
      </section>

      <section className={styles.productSection} aria-label="Example Krythiq scan report">
        <div className={styles.productHalo} aria-hidden="true" />
        <div className={styles.productWindow}>
          <div className={styles.windowBar}><div className={styles.windowTraffic} aria-hidden="true"><i /><i /><i /></div><span>krythiq / demo-app</span><span className={styles.windowBarRight}><CircleDot size={12} aria-hidden="true" /> Scan complete</span></div>
          <div className={styles.workspace}>
            <aside className={styles.workspaceSidebar} aria-label="Example repository files">
              <div className={styles.sidebarHeading}><Layers3 size={14} aria-hidden="true" /> WORKSPACE</div>
              <div className={styles.repoName}><GitBranch size={14} aria-hidden="true" /> demo-app <ChevronRight size={13} aria-hidden="true" /></div>
              <div className={styles.fileTree} aria-hidden="true">
                <span>▾ &nbsp; app</span><span className={styles.fileIndent}>▾ &nbsp; api</span><span className={styles.fileIndentDeep}><FileCode2 size={13} /> route.ts</span><span className={styles.fileIndent}><FileCode2 size={13} /> page.tsx</span><span><FileCode2 size={13} /> package.json</span>
              </div>
              <div className={styles.sidebarFooter}><LockKeyhole size={13} aria-hidden="true" /> Your code, in context</div>
            </aside>
            <div className={styles.workspaceMain}>
              <div className={styles.reportIntro}><div><p className={styles.kicker}>REPOSITORY OVERVIEW</p><h2>Find the signal in your code.</h2><p>A focused view of issues worth a closer look.</p></div><span className={styles.exampleTag}>EXAMPLE REPORT</span></div>
              <div className={styles.stats}><div><span>Findings</span><strong>03</strong></div><div><span>High priority</span><strong>01</strong></div><div><span>Source linked</span><strong>03</strong></div></div>
              <div className={styles.findingsHeading}><span>FINDINGS</span><span>Sorted by priority</span></div>
              <ul className={styles.findings}>{findings.map((finding) => <li key={finding.title}><span className={`${styles.severity} ${finding.tone}`}>{finding.level}</span><div><strong>{finding.title}</strong><span>{finding.path}<b>:{finding.line}</b></span></div><ArrowRight size={15} aria-hidden="true" /></li>)}</ul>
              <div className={styles.workspaceStatus}><Sparkles size={14} aria-hidden="true" /> Example findings shown for illustration. Results depend on the code scanned.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="why-krythiq" className={styles.featureSection} aria-labelledby="feature-heading">
        <div className={styles.sectionHeading}><p className={styles.kicker}>BUILT FOR A CLEARER VIEW</p><h2 id="feature-heading">From code to context.</h2><p>Go beyond a list of warnings. Understand the issue, inspect its location, and choose a useful next step.</p></div>
        <div className={styles.featureGrid}>{features.map((feature) => <Card className={styles.featureCard} key={feature.number}><span className={styles.featureIcon}><feature.icon size={21} strokeWidth={1.6} aria-hidden="true" /></span><span className={styles.featureNumber}>{feature.number} / 03</span><h3>{feature.title}</h3><p>{feature.description}</p></Card>)}</div>
      </section>

      <section id="how-it-works" className={styles.workflowSection} aria-labelledby="workflow-heading">
        <div><p className={styles.kicker}>A SIMPLE WORKFLOW</p><h2 id="workflow-heading">Start with the repository.<br /><span>Leave with a plan.</span></h2><p>Get from source code to a report your team can act on, without losing the trail back to the code.</p><Button asChild variant="outline" className={styles.secondaryButton}><Link href="/documentation/quickstart">See how it works <ArrowRight size={15} aria-hidden="true" /></Link></Button></div>
        <ol className={styles.workflowList}><li><span>01</span><div><h3>Connect or upload</h3><p>Choose a GitHub repository or add source files.</p></div></li><li><span>02</span><div><h3>Run a scan</h3><p>Review the security, architecture, and performance signals found in your code.</p></div></li><li><span>03</span><div><h3>Review and act</h3><p>Open prioritized findings with their source locations and supporting context.</p></div></li></ol>
      </section>

      <section className={styles.finalCta} aria-labelledby="cta-heading"><div className={styles.finalCtaGlow} aria-hidden="true" /><Terminal size={26} strokeWidth={1.4} aria-hidden="true" /><p className={styles.kicker}>READY WHEN YOU ARE</p><h2 id="cta-heading">See what your code is telling you.</h2><p>Start a scan and get a clearer path forward.</p><Button asChild className={styles.primaryButton}><Link href="/scan">Scan a repository <ArrowRight size={16} aria-hidden="true" /></Link></Button></section>
    </main>
  );
}
