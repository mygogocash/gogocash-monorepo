"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_DEEPLINKS } from "@/data/mockDeeplinks";

export default function DeeplinkTable() {
  const [deeplinks] = useState(MOCK_DEEPLINKS);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery.trim()
    ? deeplinks.filter(
        (d) =>
          d.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.sourceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.offerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.deeplink.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : deeplinks;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-gray-800 dark:text-white/90">
            Tracking link records
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {filtered.length}
            {searchQuery.trim() ? ` (filtered from ${deeplinks.length})` : ""}
          </p>
        </div>
        <div className="min-w-0 sm:max-w-xs">
          <input
            type="search"
            placeholder="Search by User ID, Email, Source, Offer, or tracking link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto border-t border-gray-100 dark:border-gray-700 dark:bg-white/[0.02]">
        <Table className="min-w-[820px]">
          <TableHeader className="border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">USER ID</TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">EMAIL</TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                Source
              </TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Offer / shop / brand</TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tracking link</TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Click</TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Create Date</TableCell>
              <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Update Date</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((d, idx) => (
              <TableRow key={idx}>
                <TableCell className="whitespace-nowrap py-3 text-center font-mono text-theme-sm text-gray-800 dark:text-white/90">
                  <span className="inline-block max-w-full truncate px-1 sm:max-w-[180px]" title={d.userId}>{d.userId}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">
                  <span className="inline-block max-w-full truncate px-1 sm:max-w-none" title={d.email}>{d.email}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {d.sourceType}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">{d.offerName}</TableCell>
                <TableCell className="py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">
                  <a href={d.deeplink} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full truncate px-1 text-brand-600 hover:underline sm:max-w-[220px] dark:text-brand-400" title={d.deeplink}>
                    {d.deeplink}
                  </a>
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                  {d.clicks}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">{d.createDate}</TableCell>
                <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">{d.updateDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No tracking links match your search.
        </div>
      )}
    </div>
  );
}
