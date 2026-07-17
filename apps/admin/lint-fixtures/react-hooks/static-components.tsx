export function StaticComponentsFixture() {
  function NestedComponent() {
    return <span>nested</span>;
  }

  return <NestedComponent />;
}
