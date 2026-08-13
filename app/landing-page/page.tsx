import type { Metadata } from "next";
import { Nav } from "./components/Nav";
import { LandingExperience } from "./components/LandingExperience";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Krythiq — A second opinion for AI-built software",
  description:
    "Review AI-built applications across security, architecture, frontend quality, performance, and production readiness.",
};

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <LandingExperience />
    </div>
  );
}
