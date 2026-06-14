"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDiscoverItem,
  getDiscoverSections,
  postDiscoverItem,
  putDiscoverReorder,
} from "@/lib/api/adminModulesApi";
import type { DiscoverItem, DiscoverSectionType } from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

const TABS: DiscoverSectionType[] = ["hero_banner", "featured_merchant", "featured_category", "trending_offer"];

export default function DiscoverManagement() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<DiscoverSectionType>("hero_banner");
  const [title, setTitle] = useState("");

  const secQ = useQuery({ queryKey: ["admin", "discover", "sections"], queryFn: getDiscoverSections });

  const reorder = useMutation({
    mutationFn: ({ type, order }: { type: DiscoverSectionType; order: string[] }) =>
      putDiscoverReorder(type, order),
    onSuccess: () => {
      toast.success("Order saved");
      void qc.invalidateQueries({ queryKey: ["admin", "discover", "sections"] });
    },
  });

  const addItem = useMutation({
    mutationFn: () => postDiscoverItem(tab, { title: title || "New item", referenceId: "ref_new" }),
    onSuccess: () => {
      toast.success("Added");
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["admin", "discover", "sections"] });
    },
  });

  const del = useMutation({
    mutationFn: ({ type, id }: { type: DiscoverSectionType; id: string }) => deleteDiscoverItem(type, id),
    onSuccess: () => {
      toast.success("Removed");
      void qc.invalidateQueries({ queryKey: ["admin", "discover", "sections"] });
    },
  });

  if (secQ.isLoading) return <AdminTableSkeleton />;

  if (secQ.isError) {
    return (
      <AdminQueryError
        title="Could not load discover sections"
        onRetry={() => void secQ.refetch()}
      />
    );
  }

  const section = secQ.data?.find((s) => s.type === tab);
  const items: DiscoverItem[] = section?.items ?? [];

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    void reorder.mutateAsync({ type: tab, order: next.map((i) => i.id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input placeholder="New item title" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
        <Button size="sm" onClick={() => void addItem.mutateAsync()}>
          Add item
        </Button>
      </div>

      {!items.length ? (
        <p className="text-sm text-gray-500">No items in this section.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{it.title}</p>
                <p className="text-xs text-gray-500">{it.referenceId}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => move(idx, -1)}>
                  Up
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(idx, 1)}>
                  Down
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("Delete item?")) void del.mutateAsync({ type: tab, id: it.id });
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
