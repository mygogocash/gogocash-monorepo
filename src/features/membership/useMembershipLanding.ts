"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

const QUEST_END = new Date("2026-04-30T23:59:59+07:00");

function subscribePrefersDark(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getPrefersDarkSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Server snapshot must be stable; client may differ until after paint — root uses suppressHydrationWarning. */
function getServerPrefersDarkSnapshot() {
  return false;
}

function countUp(el: HTMLElement | null, target: number, duration = 1200, isDecimal = false) {
  if (!el) return;
  const suffix = el.dataset.suffix || "";
  const start = performance.now();
  const tick = (time: number) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = eased * target;
    el.textContent = (isDecimal ? val.toFixed(1) : Math.round(val).toLocaleString("en")) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Imperative behaviors for the membership landing (theme, calculators, observers).
 * Scoped to `rootRef` so we do not touch `document.documentElement` or global DOM.
 */
export type MembershipLandingI18n = {
  streakZero: string;
  streakFmt: (done: number, ptsTotal: number) => string;
  questFmt: (done: number, ptsTotal: number) => string;
};

export function useMembershipLanding(
  rootRef: RefObject<HTMLElement | null>,
  i18n?: MembershipLandingI18n
) {
  const systemPrefersDark = useSyncExternalStore(
    subscribePrefersDark,
    getPrefersDarkSnapshot,
    getServerPrefersDarkSnapshot
  );
  const theme = systemPrefersDark ? "dark" : "light";
  const [countdownText, setCountdownText] = useState("");
  const questCompletedRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tick = () => {
      const diff = QUEST_END.getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText("Ended");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const t1 = window.setTimeout(() => countUp(root.querySelector("#hero-pts-free"), 5300), 400);
    const t2 = window.setTimeout(() => countUp(root.querySelector("#hero-pts-plus"), 10600), 550);
    const t3 = window.setTimeout(() => countUp(root.querySelector("#hero-pts-pro"), 15900), 700);
    const t4 = window.setTimeout(() => {
      root.querySelector("#hero-pro-bonus")?.classList.add("show");
    }, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootEl = root;

    const spendInput = rootEl.querySelector<HTMLInputElement>("#spend-input");
    const spendSlider = rootEl.querySelector<HTMLInputElement>("#spend-slider");
    const tiers = [
      { id: "free", mult: 1.0 },
      { id: "starter", mult: 1.5 },
      { id: "plus", mult: 2.0 },
      { id: "pro", mult: 3.0 },
    ];

    function updateCalc(spend: number, fromSlider: boolean) {
      spend = Math.max(0, spend);
      if (fromSlider) {
        spend = Math.max(500, Math.min(50000, spend));
      }
      tiers.forEach((t) => {
        const pts = Math.round(spend * t.mult);
        const base = Math.round(spend * 1);
        const extra = pts - base;
        const ptsEl = rootEl.querySelector(`#pts-${t.id}`);
        const extraEl = rootEl.querySelector(`#extra-${t.id}`);
        if (ptsEl) ptsEl.textContent = `${pts.toLocaleString("en")} pts`;
        if (extraEl) extraEl.textContent = extra > 0 ? `+${extra.toLocaleString("en")} extra` : "";
      });
      const leaving = rootEl.querySelector("#leaving-behind");
      if (leaving)
        leaving.textContent = Math.round((spend * 3 - spend) * 0.01).toLocaleString("en");
      if (spendInput) spendInput.value = Math.round(spend).toLocaleString("en");
      if (spendSlider) {
        const stepped = Math.max(500, Math.min(50000, Math.round(spend / 500) * 500));
        spendSlider.value = String(fromSlider ? spend : stepped);
      }
    }

    const onInput = (e: Event) => {
      const raw = (e.target as HTMLInputElement).value.replace(/,/g, "");
      const n = parseFloat(raw) || 0;
      updateCalc(n, false);
    };
    const onSlider = (e: Event) => {
      updateCalc(parseFloat((e.target as HTMLInputElement).value), true);
    };

    spendInput?.addEventListener("input", onInput);
    spendSlider?.addEventListener("input", onSlider);
    updateCalc(3000, false);
    return () => {
      spendInput?.removeEventListener("input", onInput);
      spendSlider?.removeEventListener("input", onSlider);
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootEl = root;

    const prices = { starter: { m: 69, a: 57 }, plus: { m: 149, a: 124 }, pro: { m: 299, a: 249 } };
    let isAnnual = false;
    const billingToggle = rootEl.querySelector("#billing-toggle");
    const billMonthly = root.querySelector("#bill-monthly");
    const billAnnual = root.querySelector("#bill-annual");

    function applyBilling() {
      billingToggle?.setAttribute("data-annual", isAnnual ? "true" : "false");
      billMonthly?.classList.toggle("active", !isAnnual);
      billAnnual?.classList.toggle("active", !isAnnual);
      (Object.keys(prices) as (keyof typeof prices)[]).forEach((tier) => {
        const p = prices[tier];
        const el = rootEl.querySelector(`#price-${tier}`);
        const orig = rootEl.querySelector(`#price-orig-${tier}`) as HTMLElement | null;
        if (el) el.textContent = `฿${isAnnual ? p.a : p.m}/mo`;
        if (orig) orig.style.display = isAnnual ? "inline" : "none";
      });
    }

    const onMonthly = () => {
      isAnnual = false;
      applyBilling();
    };
    const onAnnual = () => {
      isAnnual = true;
      applyBilling();
    };
    billMonthly?.addEventListener("click", onMonthly);
    billAnnual?.addEventListener("click", onAnnual);
    applyBilling();
    return () => {
      billMonthly?.removeEventListener("click", onMonthly);
      billAnnual?.removeEventListener("click", onAnnual);
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    root.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

    const statObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const isDecimal = String(el.dataset.countTo || "").includes(".");
            const target = parseFloat(el.dataset.countTo || "0");
            countUp(el, target, 1200, isDecimal);
            statObs.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    root.querySelectorAll("[data-count-to]").forEach((el) => statObs.observe(el));

    return () => {
      revealObs.disconnect();
      statObs.disconnect();
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

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
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootEl = root;

    const grid = rootEl.querySelector<HTMLElement>("#streak-grid");
    const planToggle = rootEl.querySelector<HTMLSelectElement>("#streak-plan");
    const resetBtn = rootEl.querySelector("#streak-reset");
    if (!grid || !planToggle) return;
    const gridEl = grid;
    const planToggleEl = planToggle;

    function render() {
      const days = planToggleEl.value === "pro" ? 14 : 7;
      const ptsPerDay = planToggleEl.value === "pro" ? 100 : 50;
      gridEl.className = days === 14 ? "sg14" : "sg7";
      gridEl.innerHTML = "";
      for (let i = 1; i <= days; i++) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "streak-day";
        tile.textContent = String(i);
        tile.addEventListener("click", function onTileClick() {
          tile.classList.toggle("completed");
          if (tile.classList.contains("completed")) {
            tile.style.animation = "none";
            void tile.offsetHeight;
            tile.style.animation = "day-pop .3s var(--ease-bounce)";
          }
          const done = gridEl.querySelectorAll(".completed").length;
          const totalEl = rootEl.querySelector("#streak-total");
          const ptsTotal = done * ptsPerDay;
          if (totalEl)
            totalEl.textContent = i18n
              ? i18n.streakFmt(done, ptsTotal)
              : `Day ${done} streak: +${ptsTotal.toLocaleString("en")} bonus pts so far`;
        });
        gridEl.appendChild(tile);
      }
      const totalEl = rootEl.querySelector("#streak-total");
      if (totalEl) totalEl.textContent = i18n?.streakZero ?? "Day 0 streak: +0 bonus pts so far";
    }

    const onChange = () => render();
    const onReset = (e: Event) => {
      e.preventDefault();
      render();
    };
    planToggleEl.addEventListener("change", onChange);
    resetBtn?.addEventListener("click", onReset);
    render();
    return () => {
      planToggleEl.removeEventListener("change", onChange);
      resetBtn?.removeEventListener("click", onReset);
    };
  }, [rootRef, i18n]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

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
  }, [rootRef, i18n]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const buttons = root.querySelectorAll<HTMLElement>(".btn-ripple");
    const cleanups: (() => void)[] = [];

    buttons.forEach((btn) => {
      const onClick = (e: MouseEvent) => {
        const circle = document.createElement("span");
        const d = Math.max(btn.clientWidth, btn.clientHeight);
        const rect = btn.getBoundingClientRect();
        circle.className = "ripple";
        circle.style.width = circle.style.height = `${d}px`;
        circle.style.left = `${e.clientX - rect.left - d / 2}px`;
        circle.style.top = `${e.clientY - rect.top - d / 2}px`;
        btn.querySelector(".ripple")?.remove();
        btn.appendChild(circle);
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cta = root.querySelector("#cta-confetti");
    if (!cta) return;

    const colors = ["#00aa80", "#00cc99", "#c9a000", "#ffffff", "#d8f8ef"];
    const onClick = () => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors });
      window.setTimeout(() => {
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors });
      }, 150);
      window.setTimeout(() => {
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors });
      }, 300);
      window.setTimeout(() => {
        root.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
      }, 600);
    };
    cta.addEventListener("click", onClick);
    return () => cta.removeEventListener("click", onClick);
  }, [rootRef]);

  return {
    theme,
    countdownText,
  };
}
