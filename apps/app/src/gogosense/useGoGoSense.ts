import { useCallback, useRef, useState } from "react";

import type {
  GoGoSenseDetectionRequest,
  GoGoSenseDetectionResponse,
} from "./api";
import type { GoGoSenseDetector } from "./detector";
import {
  createGoGoSenseSession,
  type GoGoSenseSession,
  type GoGoSenseSessionState,
} from "./session";

type GoGoSenseHookApi = {
  detect(request: GoGoSenseDetectionRequest): Promise<GoGoSenseDetectionResponse>;
};

export type UseGoGoSenseOptions = {
  detector: GoGoSenseDetector;
  api: GoGoSenseHookApi;
  appVersion?: string;
};

/**
 * Thin React wrapper over `createGoGoSenseSession`: owns the session for the
 * component's lifetime and re-renders on every session state change. The
 * detector + api are injected (the screen passes the live `gogosenseDetector`
 * and the authed GoGoSense api), which also keeps this hook free of any native
 * import so it mounts cleanly under the react-native-web render harness.
 */
export function useGoGoSense(options: UseGoGoSenseOptions) {
  const sessionRef = useRef<GoGoSenseSession | null>(null);
  const onChangeRef = useRef<() => void>(() => {});

  if (sessionRef.current === null) {
    sessionRef.current = createGoGoSenseSession({
      detector: options.detector,
      api: options.api,
      appVersion: options.appVersion,
      onChange: () => onChangeRef.current(),
    });
  }
  const session = sessionRef.current;

  const [state, setState] = useState<GoGoSenseSessionState>(() => session.getState());
  onChangeRef.current = () => setState(session.getState());

  const requestPermission = useCallback(() => session.requestPermission(), [session]);
  const refreshPermission = useCallback(() => session.refreshPermission(), [session]);
  const start = useCallback(() => session.start(), [session]);
  const stop = useCallback(() => session.stop(), [session]);
  const poll = useCallback(() => session.poll(), [session]);

  return {
    state,
    requestPermission,
    refreshPermission,
    start,
    stop,
    poll,
  };
}
