"use client";

import React from "react";
import BasicTableOne, { tableData } from "../tables/BasicTableOne";
import SearchTable from "./SearchTable";
import Image from "next/image";
import { TableCell, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";

interface ComponentCardProps {
  title: string;
  children?: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
}

const ComponentCard = ({
  title,
  children,
  className = "",
  desc = "",
}: ComponentCardProps) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        <SearchTable
          onSearchChange={() => {
            /* demo: no-op */
          }}
        />
      </div>
      {/* Card Body */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        <div className="space-y-6">
          <BasicTableOne
            header={["#", "Name", "Email", "Role"]}
            body={
              <>
                {tableData.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="px-5 py-4 text-start sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full">
                          <Image
                            width={40}
                            height={40}
                            src={order.user.image}
                            alt={order.user.name}
                          />
                        </div>
                        <div>
                          <span className="text-theme-sm block font-medium text-gray-800 dark:text-white/90">
                            {order.user.name}
                          </span>
                          <span className="text-theme-xs block text-gray-500 dark:text-gray-400">
                            {order.user.role}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      {order.projectName}
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      <div className="flex -space-x-2">
                        {order.team.images.map((teamImage, index) => (
                          <div
                            key={index}
                            className="h-6 w-6 overflow-hidden rounded-full border-2 border-white dark:border-gray-900"
                          >
                            <Image
                              width={24}
                              height={24}
                              src={teamImage}
                              alt={`Team member ${index + 1}`}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={
                          order.status === "Active"
                            ? "success"
                            : order.status === "Pending"
                              ? "warning"
                              : "error"
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-theme-sm px-4 py-3 text-gray-500 dark:text-gray-400">
                      {order.budget}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            }
          />
          {children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ComponentCard);
