export function setupFaqAccordion(root: HTMLElement): () => void {
  const items = root.querySelectorAll(".faq-item");
  const cleanups: (() => void)[] = [];

  items.forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>(".faq-question");
    if (!btn) return;
    const onClick = () => {
      const isOpen = item.classList.contains("active");
      root.querySelectorAll(".faq-item").forEach((i) => {
        i.classList.remove("active");
        i.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
        const ans = i.querySelector<HTMLElement>(".faq-answer");
        if (ans) ans.style.maxHeight = "0";
      });
      if (!isOpen) {
        item.classList.add("active");
        btn.setAttribute("aria-expanded", "true");
        const ans = item.querySelector<HTMLElement>(".faq-answer");
        if (ans) ans.style.maxHeight = `${ans.scrollHeight}px`;
      }
    };
    btn.addEventListener("click", onClick);
    cleanups.push(() => btn.removeEventListener("click", onClick));
  });

  return () => cleanups.forEach((fn) => fn());
}
