/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest";
import {
  findVerticalScrollContainer,
  scrollElementIntoNearestScrollParent,
} from "./scrollIntoScrollParent";

describe("findVerticalScrollContainer", () => {
  it("returns the first ancestor with overflow-y auto", () => {
    document.body.innerHTML = "";
    const scroll = document.createElement("div");
    scroll.style.height = "200px";
    scroll.style.overflowY = "auto";
    const inner = document.createElement("div");
    const target = document.createElement("div");
    inner.appendChild(target);
    scroll.appendChild(inner);
    document.body.appendChild(scroll);

    expect(findVerticalScrollContainer(target)).toBe(scroll);
  });

  it("returns null when no scrollable ancestor exists", () => {
    document.body.innerHTML = "";
    const plain = document.createElement("div");
    const target = document.createElement("div");
    plain.appendChild(target);
    document.body.appendChild(plain);

    expect(findVerticalScrollContainer(target)).toBeNull();
  });
});

describe("scrollElementIntoNearestScrollParent", () => {
  it("calls scrollTo on the nearest scroll parent", () => {
    document.body.innerHTML = "";
    const scroll = document.createElement("div");
    scroll.style.height = "100px";
    scroll.style.overflowY = "auto";
    const tall = document.createElement("div");
    tall.style.height = "500px";
    const target = document.createElement("div");
    target.id = "target";
    tall.appendChild(target);
    scroll.appendChild(tall);
    document.body.appendChild(scroll);

    const scrollToSpy = vi.spyOn(scroll, "scrollTo").mockImplementation(() => {});
    scrollElementIntoNearestScrollParent(target, { behavior: "auto", topPadding: 0 });

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: "auto",
        top: expect.any(Number),
      })
    );
    scrollToSpy.mockRestore();
  });
});
