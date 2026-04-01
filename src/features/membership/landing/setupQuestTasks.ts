import type { MembershipLandingI18n } from "./types";

export function setupQuestTasks(
  root: HTMLElement,
  i18n: MembershipLandingI18n | undefined,
  questCompletedRef: { current: number }
): () => void {
  questCompletedRef.current = 0;
  const tasks = root.querySelectorAll<HTMLButtonElement>(".quest-task");
  const cleanups: (() => void)[] = [];

  tasks.forEach((task) => {
    const onClick = () => {
      const was = task.classList.contains("completed");
      task.classList.toggle("completed");
      questCompletedRef.current += was ? -1 : 1;
      if (!was) {
        task.style.animation = "none";
        void task.offsetHeight;
        task.style.animation = "day-pop .3s var(--ease-bounce)";
      }
      const totalEl = root.querySelector("#quest-total");
      const n = questCompletedRef.current;
      const pts = n * 50;
      if (totalEl)
        totalEl.textContent = i18n
          ? i18n.questFmt(n, pts)
          : `${n}/12 tasks · +${pts.toLocaleString("en")} pts earned`;
    };
    task.addEventListener("click", onClick);
    cleanups.push(() => task.removeEventListener("click", onClick));
  });

  return () => cleanups.forEach((fn) => fn());
}
