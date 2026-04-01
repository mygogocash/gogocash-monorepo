import { scrollElementIntoNearestScrollParent } from "@/lib/dom/scrollIntoScrollParent";

/**
 * Same-document hash links inside long membership content would otherwise scroll the window,
 * missing the profile SubPage scroll column. Intercept and scroll the correct container.
 */
export function setupHashNavigation(root: HTMLElement): () => void {
  const onClick = (e: MouseEvent) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const anchor = t.closest("a");
    if (!anchor || !root.contains(anchor)) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("#") || href === "#") return;
    const id = href.slice(1);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return;
    const el = document.getElementById(id);
    if (!el || !root.contains(el)) return;
    e.preventDefault();
    scrollElementIntoNearestScrollParent(el, { behavior: "smooth" });
    try {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    } catch {
      /* ignore */
    }
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
