#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "src/components/CustomerLocaleRegionControl.tsx",
  "src/components/CustomerProfileNav.tsx",
  "src/components/ShopRedirectOverlay.tsx",
  "src/security/PrivacyScreenGuard.tsx",
  "src/components/CustomerProfileBar.tsx",
  "src/components/CustomerSignInNavGraphic.tsx",
  "src/components/CustomerCookieConsentBanner.tsx",
  "src/components/IntroAfterLoginModal.tsx",
  "src/screens/CustomerPrivacyPolicyScreen.tsx",
  "src/components/LogoutConfirmCard.tsx",
  "src/components/ProfileHeroCard.tsx",
  "src/screens/CustomerLinkCashbackScreen.tsx",
  "src/components/CustomerProfileMenu.tsx",
  "src/screens/CustomerWithdrawMethodScreen.tsx",
  "src/screens/CustomerUtilityScreen.tsx",
  "src/screens/CustomerProfileOffersScreen.tsx",
  "src/screens/CustomerAccountSettingsScreen.tsx",
  "src/screens/CustomerPrivacyCenterScreen.tsx",
  "src/screens/CustomerAgeVerificationScreen.tsx",
  "src/components/CustomerRouteState.tsx",
  "src/screens/CustomerAccountSetupScreen.tsx",
  "src/screens/CustomerProfileDetailScreen.tsx",
  "src/screens/CustomerReferralScreen.tsx",
  "src/screens/CustomerGoLinkScreen.tsx",
  "src/screens/CustomerFavoriteBrandsScreen.tsx",
  "src/screens/CustomerMyCashbackSignInScreen.tsx",
  "src/screens/CustomerProfilePhoneScreen.tsx",
  "src/screens/CustomerSubscriptionScreen.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/CustomerMembershipScreen.tsx",
  "src/screens/CustomerCreditScoreScreen.tsx",
  "src/components/ProfileInfoPanel.tsx",
  "src/screens/CustomerShopDetailScreen.tsx",
  "src/screens/CustomerMissingOrdersScreen.tsx",
  "src/screens/CustomerQuestScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/screens/CustomerDiscoveryScreen.tsx",
];

function toStylesName(relPath) {
  const base = path.basename(relPath, ".tsx").replace(/^Customer/, "");
  return `create${base}Styles`;
}

function findFunctionBodyStart(content, fnIndex) {
  let parenDepth = 0;
  let started = false;
  for (let i = fnIndex; i < content.length; i++) {
    const ch = content[i];
    if (ch === "(") {
      parenDepth++;
      started = true;
    } else if (ch === ")") {
      parenDepth--;
      if (started && parenDepth === 0) {
        for (let j = i + 1; j < content.length; j++) {
          if (content[j] === "{") return j + 1;
        }
        return -1;
      }
    }
  }
  return -1;
}

function listFunctions(content) {
  const fns = [];
  const re = /^(export )?function (\w+)\(/gm;
  let match;
  while ((match = re.exec(content))) {
    const name = match[2];
    const bodyStart = findFunctionBodyStart(content, match.index);
    if (bodyStart === -1) continue;
    const nextFn = content.slice(bodyStart).search(/^function \w+\(/m);
    const bodyEnd = nextFn === -1 ? content.length : bodyStart + nextFn;
    fns.push({ name, bodyStart, body: content.slice(bodyStart, bodyEnd) });
  }
  return fns;
}

function migrateFile(relPath) {
  const filePath = path.join(ROOT, relPath);
  let content = fs.readFileSync(filePath, "utf8");

  if (!/import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*"@mobile\/theme\/tokens"/.test(content)) {
    return "skip-no-colors";
  }
  if (content.includes("useThemedStyles(")) {
    return "skip-done";
  }
  if (!content.includes("const styles = StyleSheet.create({")) {
    return "skip-no-styles";
  }

  const stylesName = toStylesName(relPath);
  const base = path.basename(relPath, ".tsx");

  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*"@mobile\/theme\/tokens";/,
    (_, imp) => {
      const parts = imp
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== "colors");
      return `import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { ${parts.join(", ")} } from "@mobile/theme/tokens";`;
    }
  );

  content = content.replace(
    "const styles = StyleSheet.create({",
    `function ${stylesName}(colors: ThemeColors) {\n  return StyleSheet.create({`
  );

  const marker = `function ${stylesName}`;
  const idx = content.lastIndexOf(marker);
  const tail = content.slice(idx);
  const lastClose = tail.lastIndexOf("});");
  content = content.slice(0, idx + lastClose + 3) + "\n}\n" + content.slice(idx + lastClose + 3);

  if (relPath.includes("CustomerRouteState")) {
    content = content.replace(
      "function renderStateIcon(variant: Exclude<CustomerRouteStateVariant, \"loading\">) {",
      "function renderStateIcon(variant: Exclude<CustomerRouteStateVariant, \"loading\">, colors: ThemeColors) {"
    );
    content = content.replace("renderStateIcon(variant)", "renderStateIcon(variant, colors)");
    content = content.replace('backgroundColor: "#FFE8E8"', "backgroundColor: colors.warningSoft");
    content = content.replace('backgroundColor: "#EAF7F3"', "backgroundColor: colors.primarySoft");
  }

  const fns = listFunctions(content);
  for (let i = fns.length - 1; i >= 0; i--) {
    const fn = fns[i];
    if (fn.name.startsWith("create") || fn.name === stylesName.replace("create", "").replace("Styles", "")) {
      continue;
    }
    const usesStyles = fn.body.includes("styles.");
    const usesColors = /\bcolors\./.test(fn.body) && !fn.body.includes("colors: ThemeColors");
    if (!usesStyles && !usesColors) continue;
    if (fn.body.includes("useThemedStyles(")) {
      if (!usesColors || fn.body.includes("useTheme()")) continue;
    }

    let insert = "";
    if (usesStyles && !fn.body.includes("useThemedStyles(")) {
      insert += `\n  const styles = useThemedStyles(${stylesName});`;
    }
    if (usesColors && !fn.body.includes("useTheme()")) {
      insert += `\n  const { colors } = useTheme();`;
    }
    if (!insert) continue;
    content = content.slice(0, fn.bodyStart) + insert + content.slice(fn.bodyStart);
  }

  fs.writeFileSync(filePath, content);
  return "ok";
}

for (const rel of FILES) {
  console.log(rel, migrateFile(rel));
}
