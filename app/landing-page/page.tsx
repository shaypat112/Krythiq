import type { Metadata } from "next";
import { Nav } from "./components/Nav";
import { LandingExperience } from "./components/LandingExperience";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Krythiq — Find issues. Ship better software.",
  description:
    "Scan your repository for security, architecture, and performance issues. Get prioritized findings linked to your code.",
};

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <LandingExperience />
    </div>
  );
}
