"use client";

import List from "@/features/category/component/List";
import { useParams } from "next/navigation";

export default function PageClient() {
  const params = useParams();
  const categorySegment = String(params?.name ?? "");

  return (
    <div className="gc-home-page">
      <List key={categorySegment} />
    </div>
  );
}
