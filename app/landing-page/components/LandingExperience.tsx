import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "../landing.module.css";

const findings = [
  { severity: "High", title: "Missing authorization on an admin endpoint", file: "app/api/admin/route.ts:42" },
  { severity: "Medium", title: "Sequential requests slow down the dashboard", file: "app/dashboard/page.tsx:118" },
];

const steps = [
  { title: "Connect your code", description: "Choose a GitHub repository or upload a source file." },
  { title: "Run a scan", description: "Check security, architecture, and performance." },
  { title: "Know what to fix", description: "Get prioritized findings with evidence from your code." },
];

export function LandingExperience() {
  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.hero} aria-labelledby="hero-heading">
        <p className={styles.eyebrow}>Code analysis for your next release</p>
        <h1 id="hero-heading">Find issues.<br />Ship better software.</h1>
        <p className={styles.heroCopy}>
          Scan your repository for security, architecture, and performance issues.
          Get clear findings linked to the code, so you know what to fix next.
        </p>
        <div className={styles.actions}>
          <Link href="/scan" className={styles.primaryButton}>
            Scan a repository <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/documentation" className={styles.secondaryButton}>Read the docs</Link>
        </div>
      </section>

      <section id="report" className={styles.report} aria-labelledby="report-heading">
        <div className={styles.reportHeader}>
          <div>
            <p className={styles.eyebrow}>Example report</p>
            <h2 id="report-heading">demo-app</h2>
          </div>
          <span className={styles.reportSummary}>2 findings</span>
        </div>
        <ul className={styles.findings}>
          {findings.map((finding) => (
            <li className={styles.finding} key={finding.title}>
              <span className={finding.severity === "High" ? styles.high : styles.medium}>
                {finding.severity}
              </span>
              <div>
                <h3>{finding.title}</h3>
                <code>{finding.file}</code>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.reportNote}>The issue, its severity, and where to find it.</p>
      </section>

      <section id="how-it-works" className={styles.howItWorks} aria-labelledby="steps-heading">
        <h2 id="steps-heading">From repository to next steps.</h2>
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
