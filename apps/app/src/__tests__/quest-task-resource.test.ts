import { describe, expect, it } from "vitest";

import { mapBackendQuestTasks, questTaskEndpoint } from "@mobile/quest/questTaskMapper";

describe("quest task resource", () => {
  it("maps admin-managed extra point offers to customer quest rows with shop links", () => {
    const rows = mapBackendQuestTasks([
      {
        _id: "offer-mongo-id",
        offer_id: 900101,
        offer_name: "Klook Local Demo - CPS",
        offer_name_display: "Klook",
        extra_point: 50,
        logo_circle: "https://cdn.example/klook-circle.png",
        quest_task_sort_order: 0,
        quest_task_wording: "Make an order on Klook Travel",
      },
      {
        _id: "traveloka-id",
        offer_id: 900102,
        offer_name: "Traveloka Local Demo - CPS",
        extra_point: "40",
        logo: "https://cdn.example/traveloka.png",
        quest_task_sort_order: 1,
      },
    ]);

    expect(rows).toEqual([
      {
        href: "/shop/offer-mongo-id",
        icon: "go",
        key: "offer-mongo-id",
        logoUri: "https://cdn.example/klook-circle.png",
        points: "+50 Points",
        title: "Make an order on Klook Travel",
      },
      {
        href: "/shop/traveloka-id",
        icon: "go",
        key: "traveloka-id",
        logoUri: "https://cdn.example/traveloka.png",
        points: "+40 Points",
        title: "Traveloka Local Demo - CPS",
      },
    ]);
  });

  it("uses the public extra point endpoint as the customer quest source", () => {
    expect(questTaskEndpoint).toBe("/offer/extra-point");
  });

  it("returns an empty task list when the backend has no enabled quest tasks", () => {
    expect(mapBackendQuestTasks([])).toEqual([]);
  });

  it("returns an empty task list for invalid backend payloads instead of demo tasks", () => {
    expect(mapBackendQuestTasks({ data: [] })).toEqual([]);
  });

  it("mapBackendQuestTasks > given Thai locale > then prefers Thai quest wording", () => {
    const rows = mapBackendQuestTasks(
      [
        {
          _id: "offer-mongo-id",
          offer_id: 900101,
          offer_name: "Klook Local Demo - CPS",
          offer_name_display: "Klook",
          extra_point: 50,
          quest_task_sort_order: 0,
          quest_task_wording_en: "Make an order on Klook Travel",
          quest_task_wording_th: "สั่งซื้อที่ Klook Travel",
        },
      ],
      [],
      "th",
    );

    expect(rows[0]?.title).toBe("สั่งซื้อที่ Klook Travel");
  });
});
