"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBoostRule,
  deleteFeaturedTerm,
  deleteSearchBlacklist,
  getBoostRules,
  getFeaturedTerms,
  getSearchBlacklist,
  postBoostRule,
  postFeaturedTerm,
  postSearchBlacklist,
  postSearchBlacklistImport,
  putFeaturedTermsReorder,
} from "@/lib/api/adminModulesApi";
import type { BlacklistKeyword, BoostRule, FeaturedSearchTerm } from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

export default function SearchConfigManagement() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"featured" | "boost" | "blacklist">("featured");
  const [kw, setKw] = useState("");
  const [importText, setImportText] = useState("");

  const ftQ = useQuery({ queryKey: ["admin", "search", "ft"], queryFn: getFeaturedTerms });
  const brQ = useQuery({ queryKey: ["admin", "search", "br"], queryFn: getBoostRules });
  const blQ = useQuery({ queryKey: ["admin", "search", "bl"], queryFn: getSearchBlacklist });

  const addFt = useMutation({
    mutationFn: () =>
      postFeaturedTerm({
        keyword: kw || "keyword",
        targetType: "merchant",
        targetId: "m1",
        targetName: "Merchant",
        displayOrder: (ftQ.data?.length ?? 0) + 1,
        isActive: true,
      }),
    onSuccess: () => {
      toast.success("Added");
      setKw("");
      void qc.invalidateQueries({ queryKey: ["admin", "search", "ft"] });
    },
  });

  const delFt = useMutation({
    mutationFn: deleteFeaturedTerm,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "search", "ft"] }),
  });

  const reorderFt = useMutation({
    mutationFn: (order: string[]) => putFeaturedTermsReorder(order),
    onSuccess: () => {
      toast.success("Reordered");
      void qc.invalidateQueries({ queryKey: ["admin", "search", "ft"] });
    },
  });

  const addBr = useMutation({
    mutationFn: () =>
      postBoostRule({
        targetType: "offer",
        targetId: "o1",
        targetName: "Offer",
        boostScore: 5,
        isActive: true,
        expiryDate: "2026-12-31",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "search", "br"] }),
  });

  const delBr = useMutation({
    mutationFn: deleteBoostRule,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "search", "br"] }),
  });

  const addBl = useMutation({
    mutationFn: () => postSearchBlacklist({ keyword: kw, addedBy: "a1", addedDate: "", notes: "" }),
    onSuccess: () => {
      toast.success("Blacklisted");
      setKw("");
      void qc.invalidateQueries({ queryKey: ["admin", "search", "bl"] });
    },
  });

  const delBl = useMutation({
    mutationFn: deleteSearchBlacklist,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "search", "bl"] }),
  });

  const importBl = useMutation({
    mutationFn: (keywords: string[]) => postSearchBlacklistImport(keywords),
    onSuccess: () => {
      toast.success("Imported");
      setImportText("");
      void qc.invalidateQueries({ queryKey: ["admin", "search", "bl"] });
    },
  });

  if (ftQ.isLoading || brQ.isLoading || blQ.isLoading) return <AdminTableSkeleton />;

  if (ftQ.isError || brQ.isError || blQ.isError) {
    return (
      <AdminQueryError
        title="Could not load search configuration"
        onRetry={() => {
          void ftQ.refetch();
          void brQ.refetch();
          void blQ.refetch();
        }}
      />
    );
  }

  const terms = ftQ.data ?? [];
  const rules = brQ.data ?? [];
  const blocked = blQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["featured", "Featured terms"],
            ["boost", "Boost rules"],
            ["blacklist", "Blacklist"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === k ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "featured" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Keyword" />
            <Button size="sm" onClick={() => void addFt.mutateAsync()}>
              Add
            </Button>
          </div>
          <ul className="space-y-2">
            {terms.map((t: FeaturedSearchTerm, idx: number) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {t.keyword} → {t.targetName}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (idx === 0) return;
                      const order = [...terms.map((x) => x.id)];
                      const tmp = order[idx - 1];
                      order[idx - 1] = order[idx];
                      order[idx] = tmp;
                      void reorderFt.mutateAsync(order);
                    }}
                  >
                    Up
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (idx >= terms.length - 1) return;
                      const order = [...terms.map((x) => x.id)];
                      const tmp = order[idx + 1];
                      order[idx + 1] = order[idx];
                      order[idx] = tmp;
                      void reorderFt.mutateAsync(order);
                    }}
                  >
                    Down
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void delFt.mutateAsync(t.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "boost" && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => void addBr.mutateAsync()}>
            Add sample boost rule
          </Button>
          <ul className="space-y-2">
            {rules.map((r: BoostRule) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
              >
                <span>
                  {r.targetName} (+{r.boostScore})
                </span>
                <Button size="sm" variant="outline" onClick={() => void delBr.mutateAsync(r.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "blacklist" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Keyword" />
            <Button size="sm" onClick={() => void addBl.mutateAsync()}>
              Block
            </Button>
          </div>
          <div>
            <label className="text-xs text-gray-500">Bulk import (one keyword per line)</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => {
                const kws = importText
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean);
                void importBl.mutateAsync(kws);
              }}
            >
              Import CSV lines
            </Button>
          </div>
          <ul className="space-y-2">
            {blocked.map((b: BlacklistKeyword) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
              >
                <span>{b.keyword}</span>
                <Button size="sm" variant="outline" onClick={() => void delBl.mutateAsync(b.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
