import { expect, test } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";

import { openAdminPage } from "../helpers/admin-auth";
import { getWithdrawCheck } from "../helpers/api-client";
import { loadE2eSeed } from "../helpers/seed-data";

function cleanupMongoUri(apiUrl: string): string {
  const configured = process.env.MONGO_URI?.trim();
  if (configured) return configured;

  const hostname = new URL(apiUrl).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "mongodb://localhost:27017/gogocash-e2e?replicaSet=rs0";
  }
  throw new Error(
    "MONGO_URI is required before remote E2E-08 can create a claim, because exact cleanup must be available.",
  );
}

test.describe("E2E-08 customer missing conversion ↔ Admin workflow", () => {
  test("one approved customer claim is durable without posting money and is always cleaned", async ({
    browser,
    request,
  }) => {
    const seed = loadE2eSeed();
    const marker = `E2E-MISSING-${process.pid}-${Date.now()}`;
    const orderId = marker;
    const customerHeaders = {
      Authorization: `Bearer ${seed.customerToken}`,
    };
    const adminHeaders = { Authorization: `Bearer ${seed.adminToken}` };
    const mongo = new MongoClient(cleanupMongoUri(seed.apiUrl));
    await mongo.connect();
    const claims = mongo.db().collection("missionorders");
    const exactMarkerFilter = {
      user_id: new ObjectId(seed.userId),
      order_id: marker,
    };
    let claimId: string | null = null;
    let submissionSucceeded = false;

    try {
      const walletBefore = await getWithdrawCheck(
        request,
        seed.customerToken,
        seed.apiUrl,
      );

      const submitResponse = await request.post(
        `${seed.apiUrl}/offer/saveMissingOrder`,
        {
          headers: customerHeaders,
          multipart: {
            offer_id: seed.brandId,
            orderId,
            purchaseDate: new Date().toISOString().slice(0, 10),
            note: `E2E canonical missing conversion ${marker}`,
            amount: "1200.50",
          },
        },
      );
      expect(submitResponse.ok(), await submitResponse.text()).toBeTruthy();
      submissionSucceeded = true;
      const submitted = (await submitResponse.json()) as { id: string };
      claimId = String(submitted.id);
      expect(ObjectId.isValid(claimId)).toBe(true);

      const customerListResponse = await request.post(
        `${seed.apiUrl}/offer/missing-order`,
        {
          headers: customerHeaders,
          data: { page: 1, limit: 10, search: orderId },
        },
      );
      expect(
        customerListResponse.ok(),
        await customerListResponse.text(),
      ).toBeTruthy();
      const customerList = (await customerListResponse.json()) as {
        data: Array<{ id: string; orderId: string; status: string }>;
      };
      expect(customerList.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: claimId,
            orderId,
            status: "pending",
          }),
        ]),
      );

      const adminListResponse = await request.get(
        `${seed.apiUrl}/admin/missing-orders`,
        {
          headers: adminHeaders,
          params: { page: 1, limit: 10, search: orderId },
        },
      );
      expect(
        adminListResponse.ok(),
        await adminListResponse.text(),
      ).toBeTruthy();
      const adminList = (await adminListResponse.json()) as {
        data: Array<{
          id: string;
          merchantId: string;
          orderId: string;
          schemaVersion: number;
        }>;
      };
      expect(adminList.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: claimId,
            merchantId: seed.brandId,
            orderId,
            schemaVersion: 2,
          }),
        ]),
      );

      const adminPage = await openAdminPage(browser, seed.adminUrl);
      await adminPage.goto(`${seed.adminUrl}/missing-orders`);
      await expect(adminPage.getByText(orderId).first()).toBeVisible({
        timeout: 30_000,
      });
      await adminPage.close();

      const noteResponse = await request.post(
        `${seed.apiUrl}/admin/missing-orders/${claimId}/notes`,
        {
          headers: adminHeaders,
          data: { text: "Requested provider confirmation" },
        },
      );
      expect(noteResponse.ok(), await noteResponse.text()).toBeTruthy();
      await expect(noteResponse.json()).resolves.toMatchObject({
        id: claimId,
        notes: [
          expect.objectContaining({ note: "Requested provider confirmation" }),
        ],
      });

      const assignResponse = await request.put(
        `${seed.apiUrl}/admin/missing-orders/${claimId}/assign`,
        { headers: adminHeaders, data: {} },
      );
      expect(assignResponse.ok(), await assignResponse.text()).toBeTruthy();
      await expect(assignResponse.json()).resolves.toMatchObject({
        id: claimId,
        status: "under_review",
      });

      const approvalNote = "Provider confirmed the conversion for workflow QA";
      const approveResponse = await request.put(
        `${seed.apiUrl}/admin/missing-orders/${claimId}/approve`,
        { headers: adminHeaders, data: { note: approvalNote } },
      );
      expect(approveResponse.ok(), await approveResponse.text()).toBeTruthy();
      await expect(approveResponse.json()).resolves.toMatchObject({
        id: claimId,
        status: "approved",
        resolutionNote: approvalNote,
      });

      const statsResponse = await request.get(
        `${seed.apiUrl}/admin/missing-orders/stats`,
        { headers: adminHeaders },
      );
      expect(statsResponse.ok(), await statsResponse.text()).toBeTruthy();
      await expect(statsResponse.json()).resolves.toEqual(
        expect.objectContaining({
          byStatus: expect.objectContaining({ approved: expect.any(Number) }),
        }),
      );

      const walletAfter = await getWithdrawCheck(
        request,
        seed.customerToken,
        seed.apiUrl,
      );
      expect(walletAfter.netAmountTHB).toBe(walletBefore.netAmountTHB);
      expect(walletAfter.netAmount).toBe(walletBefore.netAmount);
    } finally {
      const exactClaimFilter =
        claimId && ObjectId.isValid(claimId)
          ? { ...exactMarkerFilter, _id: new ObjectId(claimId) }
          : exactMarkerFilter;
      const cleanup = await claims.deleteMany(exactClaimFilter);
      const remaining = await claims.countDocuments(exactMarkerFilter);
      await mongo.close();

      if (remaining !== 0) {
        throw new Error(`E2E-08 exact cleanup left ${remaining} claim rows`);
      }
      if (submissionSucceeded && cleanup.deletedCount !== 1) {
        throw new Error(
          `E2E-08 expected to clean exactly one claim, deleted ${cleanup.deletedCount}`,
        );
      }
    }
  });
});
