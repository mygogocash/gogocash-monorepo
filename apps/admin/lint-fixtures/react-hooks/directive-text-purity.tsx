export function DirectiveTextPurityFixture() {
  const label = `// eslint-disable-next-line @next/next/no-img-element ${Date.now()}`;

  return <output>{label}</output>;
}
