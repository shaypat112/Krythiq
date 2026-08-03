import updateNotifier from "update-notifier";
import chalk from "chalk";

export function checkUpdate(pkgName: string, pkgVersion: string) {
  if (!process.stdout.isTTY || process.env.CI || process.env.NO_UPDATE_NOTIFIER) {
    return;
  }

  try {
    const notifier = updateNotifier({
      pkg: { name: pkgName, version: pkgVersion },
      updateCheckInterval: 1000 * 60 * 60 * 12,
    });

    if (notifier.update) {
      const latest = notifier.update.latest;
      console.log(
        `\n${chalk.dim("●")} ${chalk.bold(pkgName)} update available ${chalk.dim(
          pkgVersion
        )} → ${chalk.green(latest)}`
      );
      console.log(
        `${chalk.dim("  Run")} ${chalk.cyan(`npm i -g ${pkgName}`)} ${chalk.dim("to update.")}\n`
      );
    }
  } catch {
    // ignore update check errors
  }
}
