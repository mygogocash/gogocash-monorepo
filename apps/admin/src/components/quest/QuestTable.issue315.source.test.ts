import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./QuestTable.tsx", import.meta.url),
  "utf8",
);

describe("QuestTable issue #315 contract", () => {
  it("uses a read-only derived status and one combined save action", () => {
    expect(source).not.toContain("QUEST_STATUS_VALUES");
    expect(source).not.toContain("Save campaign");
    expect(source).not.toContain("Save tasks");
    expect(source).not.toContain("Save rewards");
    expect(source).toContain("Save and create quest");
    expect(source).toContain("deriveQuestStatus");
  });

  it("has an explicit list-only view with a dedicated create route", () => {
    expect(source).toContain('view === "list"');
    expect(source).toContain('href="/quest/create"');
  });

  it("pins a generated quest id without leaving create mode before every setting is saved", () => {
    expect(source).toContain(
      "const questIdForSave = selectedQuest?._id ?? selectedQuestId;",
    );
    expect(source).toContain(
      'if (questIdForSave) fd.append("_id", questIdForSave);',
    );

    const mutationStart = source.indexOf("const saveAllMutation = useMutation");
    const successStart = source.indexOf("onSuccess:", mutationStart);
    const mutationBody = source.slice(mutationStart, successStart);
    expect(mutationBody).not.toContain("setCreatingNew(false)");
  });
});
