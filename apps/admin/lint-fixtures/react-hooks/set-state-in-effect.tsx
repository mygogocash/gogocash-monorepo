import { useEffect, useState } from "react";

export function SetStateInEffectFixture() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return <output>{ready ? "ready" : "waiting"}</output>;
}
