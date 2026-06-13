import { TopBrandsSquareDemo } from "@/components/demo/top-brands-square-demo";

export const metadata = {
  title: "Demo — Top Brands (1:1 logos)",
};

export default function DemoTopBrandsSquarePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <TopBrandsSquareDemo />
    </main>
  );
}
