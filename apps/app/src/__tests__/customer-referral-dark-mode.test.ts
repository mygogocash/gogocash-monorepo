import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const referralFile = "src/screens/CustomerReferralScreen.tsx";

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("customer referral dark mode surfaces", () => {
  it("referral shell > given dark theme > then matches other account sub-pages", () => {
    const source = readMobileFile(referralFile);

    expect(source).toMatch(/surface:[\s\S]*backgroundColor: colors\.card/);
    expect(source).toMatch(/surface:[\s\S]*borderColor: colors\.border/);
    expect(source).toMatch(/topBar:[\s\S]*borderBottomColor: colors\.border/);
    expect(source).not.toContain('borderBottomColor: "rgba(16, 53, 34, 0.12)"');
  });

  it("invitation section > given dark theme > then uses readable ink tokens for titles and cells", () => {
    const source = readMobileFile(referralFile);

    expect(source).toMatch(/invitationTitle:[\s\S]*color: colors\.ink/);
    expect(source).not.toMatch(/invitationTitle:[\s\S]*color: "#3A4B61"/);
    expect(source).toMatch(/tableCell:[\s\S]*color: colors\.ink/);
    expect(source).toMatch(/tableHeader:[\s\S]*backgroundColor: colors\.fieldMuted/);
    expect(source).toMatch(/tableHeaderText:[\s\S]*color: colors\.muted/);
    expect(source).toMatch(/tableRow:[\s\S]*borderTopColor: colors\.border/);
  });

  it("referral code label > given dark theme > then uses colors.muted instead of light-only gray", () => {
    const source = readMobileFile(referralFile);

    expect(source).toMatch(/codeLabel:[\s\S]*color: colors\.muted/);
    expect(source).not.toMatch(/codeLabel:[\s\S]*color: "#6F7E91"/);
  });

  it("social share row > given dark theme > then theme-aware X icon fill on dark card", () => {
    const source = readMobileFile(referralFile);

    expect(source).toContain("resolveReferralSocialIconColor");
    expect(source).toMatch(/resolveReferralSocialIconColor[\s\S]*pickThemed\(colors, link\.color, colors\.white\)/);
    expect(source).toMatch(/SocialIconButton[\s\S]*resolveReferralSocialIconColor/);
  });

  it("referral tabs and FAQ > given dark theme > then use themed borders and chevron ink", () => {
    const source = readMobileFile(referralFile);

    expect(source).toMatch(/tabButtonActive:[\s\S]*borderBottomColor: colors\.primary/);
    expect(source).toMatch(/tabTextActive:[\s\S]*color: colors\.primary/);
    expect(source).toMatch(/faqCard:[\s\S]*borderColor: colors\.border/);
    expect(source).not.toContain('borderColor: "#B7E7DB"');
    expect(source).toMatch(/ReferralFaqItem[\s\S]*color=\{colors\.ink\}/);
    expect(source).not.toMatch(/ChevronDownIcon[\s\S]*color="#3B3B3B"/);
  });
});
