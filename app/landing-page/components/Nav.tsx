import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import styles from "../landing.module.css";

export function Nav() {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <header className={styles.navHeader}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <BrandLogo className="h-7 w-7 rounded-md" priority /> Krythiq
          </Link>
          <nav className={styles.navLinks} aria-label="Landing page">
            <Link href="#product">The report</Link>
            <Link href="/documentation">How it works</Link>
          </nav>
          <div className={styles.navActions}>
            <Link href="/documentation" className={styles.navDocs}>Docs</Link>
            <Link href="/scan" className={styles.primaryButton}>Start a review <ArrowUpRight size={14} /></Link>
          </div>
        </div>
      </header>
    </>
  );
}
