import { describe, expect, it } from "vitest";

import {
  mapQuestTaskCatalog,
  questTaskCatalogEndpoint,
} from "@mobile/quest/questTaskCatalogMapper";

const catalogPayload = {
  contract_version: 1,
  quest_id: "quest-july",
  config_revision: 4,
  catalog_source: "legacy_compatibility",
  tasks: [
    {
      task_key: "legacy-system",
      task_kind: "points_threshold_bonus",
      points: 50,
      sort_order: 20,
      wording_en: "Earn 300 quest points",
      wording_th: "รับคะแนนภารกิจ 300 คะแนน",
      target: { kind: "quest_points_threshold", threshold_points: 300 },
    },
    {
      task_key: "klook",
      task_kind: "brand_purchase",
      points: 50,
      sort_order: 10,
      wording_en: "Shop with Klook",
      wording_th: "ช้อปกับ Klook",
      offer: {
        id: "offer-klook",
        name: "Klook Travel",
        logo_uri: "https://cdn.example/klook.png",
        href: "/shop/offer-klook",
      },
    },
  ],
};

describe("mapQuestTaskCatalog", () => {
  it("uses the server-owned public catalog endpoint", () => {
    expect(questTaskCatalogEndpoint).toBe("/point/quest-task-catalog");
  });

  it("maps and sorts sanitized definitions with stable quest/task identity", () => {
    const catalog = mapQuestTaskCatalog(catalogPayload);

    expect(catalog).toMatchObject({
      catalogSource: "legacy_compatibility",
      configRevision: 4,
      questId: "quest-july",
    });
    expect(catalog?.rows).toEqual([
      {
        current: 0,
        href: "/shop/offer-klook",
        icon: "go",
        key: "quest-july:klook",
        logoUri: "https://cdn.example/klook.png",
        points: "+50 Points",
        progressLabel: "",
        questId: "quest-july",
        state: "not_started",
        stateLabel: "",
        target: 1,
        taskKey: "klook",
        taskType: "brand_purchase",
        title: "Shop with Klook",
        unit: "purchase",
      },
      {
        current: 0,
        icon: "go",
        key: "quest-july:legacy-system",
        points: "+50 Points",
        progressLabel: "",
        questId: "quest-july",
        state: "not_started",
        stateLabel: "",
        target: 300,
        taskKey: "legacy-system",
        taskType: "points_threshold_bonus",
        title: "Earn 300 quest points",
        unit: "quest_points",
      },
    ]);
  });

  it("prefers Thai wording while retaining the English fallback", () => {
    expect(mapQuestTaskCatalog(catalogPayload, "th")?.rows[0].title).toBe(
      "ช้อปกับ Klook",
    );
    expect(
      mapQuestTaskCatalog(
        {
          ...catalogPayload,
          tasks: [
            {
              ...catalogPayload.tasks[0],
              wording_en: "English fallback",
              wording_th: "",
            },
          ],
        },
        "th",
      )?.rows[0].title,
    ).toBe("English fallback");
  });

  it("rejects external destinations and derives a safe shop path from offer id", () => {
    const catalog = mapQuestTaskCatalog({
      ...catalogPayload,
      tasks: [
        {
          ...catalogPayload.tasks[1],
          offer: {
            id: "offer-safe",
            name: "Safe",
            href: "https://malicious.example/phish",
          },
        },
      ],
    });

    expect(catalog?.rows[0].href).toBe("/shop/offer-safe");
  });

  it("accepts an explicit no-active-quest response", () => {
    expect(
      mapQuestTaskCatalog({
        contract_version: 1,
        quest_id: null,
        config_revision: null,
        catalog_source: "none",
        tasks: [],
      }),
    ).toEqual({
      catalogSource: "none",
      configRevision: null,
      questId: null,
      rows: [],
    });
  });

  it("accepts an active task-v2 quest with an intentionally empty catalog", () => {
    expect(
      mapQuestTaskCatalog({
        contract_version: 1,
        quest_id: "quest-empty-task-v2",
        config_revision: 3,
        catalog_source: "none",
        tasks: [],
      }),
    ).toEqual({
      catalogSource: "none",
      configRevision: 3,
      questId: "quest-empty-task-v2",
      rows: [],
    });
  });

  it("fails the complete contract instead of silently dropping malformed rows", () => {
    expect(mapQuestTaskCatalog(null)).toBeNull();
    expect(mapQuestTaskCatalog({ data: catalogPayload })).toBeNull();
    expect(
      mapQuestTaskCatalog({
        ...catalogPayload,
        tasks: [{ task_key: "missing-required-fields" }],
      }),
    ).toBeNull();
  });
});
