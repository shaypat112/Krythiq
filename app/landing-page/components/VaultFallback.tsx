import styles from "../landing.module.css";

export function VaultFallback() {
  return (
    <div className={styles.vaultFallback} aria-label="Static repository vault illustration">
      <div className={styles.fallbackBulkhead}>
        <span className={styles.fallbackRing} />
        <span className={styles.fallbackDoor} />
        <span className={styles.fallbackWheel} />
        <span className={styles.fallbackCore} />
      </div>
      <span className={styles.fallbackCaption}>Repository chambers</span>
    </div>
  );
}
