import { writeFileSync } from "node:fs";

import { expect, test, type Request, type Response } from "@playwright/test";

const execute = process.env.POLICY_QA_UI_EXECUTE === "1";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for hosted policy QA`);
  return value;
}

function exactKeys(value: Record<string, unknown>, keys: string[]): void {
  expect(Object.keys(value).sort()).toEqual([...keys].sort());
}

function multipartTextField(request: Request, name: string): string {
  const contentType = request.headers()["content-type"] ?? "";
  const boundary =
    /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)?.[1] ??
    /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)?.[2];
  const body = request.postData();
  expect(contentType).toContain("multipart/form-data");
  expect(boundary).toBeTruthy();
  expect(body).toBeTruthy();
  const part = body!
    .split(`--${boundary}`)
    .find((candidate) => candidate.includes(`name="${name}"`));
  expect(part, `multipart field ${name}`).toBeTruthy();
  const separator = part!.indexOf("\r\n\r\n");
  expect(separator).toBeGreaterThan(-1);
  return part!
    .slice(separator + 4)
    .replace(/\r\n$/, "")
    .trim();
}

async function assertAggregateExchange(input: {
  response: Response;
  expectedUrl: string;
  categoryId: string;
  categoryName: string;
  expectedTerms: string;
}) {
  const request = input.response.request();
  expect(request.url()).toBe(input.expectedUrl);
  expect(request.method()).toBe("PUT");
  expect(multipartTextField(request, "category_id")).toBe(input.categoryId);
  expect(multipartTextField(request, "category_name")).toBe(input.categoryName);
  expect(multipartTextField(request, "icon_key")).toBe("travel");
  expect(multipartTextField(request, "request_key")).toMatch(
    /^policy-save-[a-zA-Z0-9-]+$/,
  );
  const policy = JSON.parse(multipartTextField(request, "policy")) as {
    terms?: { translations?: Record<string, string> };
  };
  expect(policy.terms?.translations?.en ?? "").toBe(input.expectedTerms);

  expect(input.response.status()).toBe(200);
  const body = (await input.response.json()) as Record<string, any>;
  exactKeys(body, ["request_key", "category", "policy"]);
  expect(body.request_key).toBe(multipartTextField(request, "request_key"));
  expect(body.category).toMatchObject({
    _id: input.categoryId,
    name: input.categoryName,
    icon_key: "travel",
    lifecycle_status: "active",
  });
  expect(body.policy.category_id).toBe(input.categoryId);
  expect(body.policy.terms?.translations?.en ?? "").toBe(input.expectedTerms);
  expect(body.category.revision).toEqual(expect.any(Number));
  return body;
}

test.describe("hosted policy category integrity Admin UI", () => {
  test.skip(
    !execute,
    "Set POLICY_QA_UI_EXECUTE=1 only from the guarded hosted QA script.",
  );

  test("Save/reload and lifecycle mutations use the authenticated same-origin proxy", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const environment = required("POLICY_QA_ENVIRONMENT");
    const adminUrl = required("POLICY_QA_ADMIN_URL");
    const candidateSha = required("POLICY_QA_CANDIDATE_SHA");
    const marker = required("POLICY_QA_MARKER");
    const originalMarker = required("POLICY_QA_ORIGINAL_MARKER");
    const categoryId = required("POLICY_QA_CATEGORY_ID");
    const resultFile = required("POLICY_QA_UI_RESULT_FILE");
    const email = required("POLICY_QA_ADMIN_EMAIL");
    const password = required("POLICY_QA_ADMIN_PASSWORD");

    expect(["dev", "staging"]).toContain(environment);
    expect(adminUrl).toBe(
      environment === "dev"
        ? "https://admin.dev.gogocash.co"
        : "https://admin-staging.gogocash.co",
    );
    expect(candidateSha).toMatch(/^[a-f0-9]{40}$/);
    expect(categoryId).toMatch(/^[a-f0-9]{24}$/);

    const adminOrigin = new URL(adminUrl).origin;
    const proxyUrl = (path: string) => new URL(path, adminOrigin).href;
    const directApiRequests: string[] = [];
    page.on("request", (request) => {
      const hostname = new URL(request.url()).hostname;
      if (
        hostname === "api.dev.gogocash.co" ||
        hostname === "api-staging.gogocash.co"
      ) {
        directApiRequests.push(request.url());
      }
    });

    await page.goto(`${adminUrl}/signin`);
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#admin-signin-password").fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(dashboard|brands)/, { timeout: 60_000 });

    const proofUrl = proxyUrl("/api/backend/offer/deployment-proof");
    const proofResponse = await page.request.get(proofUrl);
    expect(proofResponse.status()).toBe(200);
    expect(await proofResponse.json()).toEqual({
      schema: "gogocash.deployment-revision.v1",
      environment,
      revision: candidateSha,
    });

    const openEditor = async () => {
      await page.goto(`${adminUrl}/brands?tab=policy`);
      const search = page.getByRole("searchbox", {
        name: "Search categories",
      });
      await search.fill(marker);
      const row = page.getByLabel(
        `View or edit policy and banner for ${marker}`,
      );
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.click();
      await expect(page.getByRole("heading", { name: marker })).toBeVisible();
    };

    await openEditor();
    const banner = page.getByRole("img", {
      name: "Default category banner",
    });
    await expect(banner).toBeVisible();
    const persistedBannerSrc = await banner.getAttribute("src");
    expect(persistedBannerSrc).toBeTruthy();

    // Close discards an unsaved draft.
    await page.getByRole("button", { name: "Edit terms & conditions" }).click();
    const terms = page.locator("#policy-content");
    const originalTerms = await terms.inputValue();
    expect(originalTerms).toContain(originalMarker);
    await terms.fill(`UNSAVED CLOSE ${marker}`);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await openEditor();
    await page.getByRole("button", { name: "Edit terms & conditions" }).click();
    await expect(page.locator("#policy-content")).toHaveValue(originalTerms);

    // Cancel is section-scoped and restores the saved snapshot.
    await page.locator("#policy-content").fill(`UNSAVED CANCEL ${marker}`);
    await page
      .getByRole("button", { name: "Cancel terms changes", exact: true })
      .click();
    await page.getByRole("button", { name: "Edit terms & conditions" }).click();
    await expect(page.locator("#policy-content")).toHaveValue(originalTerms);

    const aggregateUrl = proxyUrl("/api/backend/policy/aggregate");

    // Save must traverse the same-origin BFF and survive Close + reload.
    const savedTerms = `SAVED UI ${marker}`;
    await page.locator("#policy-content").fill(savedTerms);
    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === aggregateUrl &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Save changes" }).click();
    const saved = await assertAggregateExchange({
      response: await saveResponsePromise,
      expectedUrl: aggregateUrl,
      categoryId,
      categoryName: marker,
      expectedTerms: savedTerms,
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await openEditor();
    await expect(
      page.getByRole("img", { name: "Default category banner" }),
    ).toHaveAttribute("src", persistedBannerSrc!);
    await page.getByRole("button", { name: "Edit terms & conditions" }).click();
    await expect(page.locator("#policy-content")).toHaveValue(savedTerms);

    // Clear is persisted only through the shared Save boundary.
    await page.getByRole("button", { name: "Clear T&C" }).click();
    const clearResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === aggregateUrl &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Save changes" }).click();
    const cleared = await assertAggregateExchange({
      response: await clearResponsePromise,
      expectedUrl: aggregateUrl,
      categoryId,
      categoryName: marker,
      expectedTerms: "",
    });
    expect(cleared.category.revision).toBeGreaterThan(saved.category.revision);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await openEditor();
    await expect(
      page.getByText("No terms set yet — click Edit to add."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    const search = page.getByRole("searchbox", { name: "Search categories" });
    await search.fill(marker);

    // Cancellation remains zero-write before the real destructive action.
    await page
      .getByRole("button", { name: `Delete policy content for ${marker}` })
      .click();
    await expect(
      page.getByRole("dialog").getByText("Delete policy content?"),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" })
      .click();

    const deleteUrl = proxyUrl(
      `/api/backend/policy/category/${categoryId}/delete-content`,
    );
    await page
      .getByRole("button", { name: `Delete policy content for ${marker}` })
      .click();
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === deleteUrl && response.request().method() === "POST",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete content" })
      .click();
    const deleteResponse = await deleteResponsePromise;
    const deleteRequest = deleteResponse.request();
    expect(deleteRequest.url()).toBe(deleteUrl);
    expect(deleteRequest.method()).toBe("POST");
    const deleteRequestBody = deleteRequest.postDataJSON() as Record<
      string,
      unknown
    >;
    exactKeys(deleteRequestBody, ["request_key", "expected_revision"]);
    expect(deleteRequestBody).toEqual({
      request_key: expect.stringMatching(/^policy-lifecycle-[a-zA-Z0-9-]+$/),
      expected_revision: cleared.category.revision,
    });
    expect(deleteResponse.status()).toBe(201);
    const deleted = (await deleteResponse.json()) as Record<string, any>;
    exactKeys(deleted, [
      "request_key",
      "operation",
      "category",
      "policy_deleted",
      "cleanup_scheduled",
    ]);
    expect(deleted).toMatchObject({
      request_key: deleteRequestBody.request_key,
      operation: "delete-content",
      category: {
        _id: categoryId,
        name: marker,
        icon_key: "travel",
        lifecycle_status: "active",
        revision: cleared.category.revision + 1,
      },
      policy_deleted: true,
    });
    expect(deleted.cleanup_scheduled).toBeGreaterThan(0);

    await expect(
      page.getByRole("dialog", { name: "Delete policy content?" }),
    ).not.toBeVisible();
    const refreshedSearch = page.getByRole("searchbox", {
      name: "Search categories",
    });
    await refreshedSearch.fill(marker);

    await page.getByRole("button", { name: `Retire ${marker}` }).click();
    await expect(
      page.getByRole("dialog").getByText("Retire category?"),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" })
      .click();

    const retireUrl = proxyUrl(
      `/api/backend/policy/category/${categoryId}/retire`,
    );
    await page.getByRole("button", { name: `Retire ${marker}` }).click();
    const retireResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === retireUrl && response.request().method() === "POST",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Retire category" })
      .click();
    const retireResponse = await retireResponsePromise;
    const retireRequest = retireResponse.request();
    expect(retireRequest.url()).toBe(retireUrl);
    expect(retireRequest.method()).toBe("POST");
    const retireRequestBody = retireRequest.postDataJSON() as Record<
      string,
      unknown
    >;
    exactKeys(retireRequestBody, ["request_key", "expected_revision"]);
    expect(retireRequestBody).toEqual({
      request_key: expect.stringMatching(/^policy-lifecycle-[a-zA-Z0-9-]+$/),
      expected_revision: deleted.category.revision,
    });
    expect(retireResponse.status()).toBe(201);
    const retired = (await retireResponse.json()) as Record<string, any>;
    exactKeys(retired, [
      "request_key",
      "operation",
      "category",
      "reference_counts",
    ]);
    expect(retired).toMatchObject({
      request_key: retireRequestBody.request_key,
      operation: "retire",
      category: {
        _id: categoryId,
        name: marker,
        icon_key: "travel",
        lifecycle_status: "retired",
        revision: deleted.category.revision + 1,
      },
      reference_counts: {
        offer_policy_category_id: 0,
        offer_categories_normalized: 0,
        unique_offers: 0,
      },
    });
    expect(retired.category.purge_after).toEqual(expect.any(String));

    expect(directApiRequests).toEqual([]);
    writeFileSync(
      resultFile,
      `${JSON.stringify({
        schema: "gogocash.policy-category-ui.v1",
        environment,
        candidate_sha: candidateSha,
        marker,
        category_id: categoryId,
        aggregate: { saved, cleared },
        delete_content: { request: deleteRequestBody, response: deleted },
        retire: { request: retireRequestBody, response: retired },
      })}\n`,
      { mode: 0o600 },
    );
  });
});
