import { useCallback, useRef, useState } from "react";

import type {
  GoGoTrackActivationRequest,
  GoGoTrackActivationResponse,
  GoGoTrackDetectionRequest,
  GoGoTrackDetectionResponse,
} from "./api";
import type { GoGoTrackDetector } from "./detector";
import {
  createGoGoTrackSession,
  type GoGoTrackSession,
  type GoGoTrackSessionState,
} from "./session";

export type GoGoTrackHookApi = {
  detect(request: GoGoTrackDetectionRequest): Promise<GoGoTrackDetectionResponse>;
  activate?(
    request: GoGoTrackActivationRequest,
  ): Promise<GoGoTrackActivationResponse>;
};

export type UseGoGoTrackOptions = {
  detector: GoGoTrackDetector;
  api: GoGoTrackHookApi;
  appVersion?: string;
};

/**
 * Thin React wrapper over `createGoGoTrackSession`: owns the session for the
 * component's lifetime and re-renders on every session state change. The
 * detector + api are injected (the screen passes the live `gototrackDetector`
 * and the authed GoGoTrack api), which also keeps this hook free of any native
 * import so it mounts cleanly under the react-native-web render harness.
 */
export function useGoGoTrack(options: UseGoGoTrackOptions) {
  const sessionRef = useRef<GoGoTrackSession | null>(null);
  const onChangeRef = useRef<() => void>(() => {});

  if (sessionRef.current === null) {
    sessionRef.current = createGoGoTrackSession({
      detector: options.detector,
      api: options.api,
      appVersion: options.appVersion,
      onChange: () => onChangeRef.current(),
    });
  }
  const session = sessionRef.current;

  const [state, setState] = useState<GoGoTrackSessionState>(() => session.getState());
  onChangeRef.current = () => setState(session.getState());

  const requestPermission = useCallback(() => session.requestPermission(), [session]);
  const refreshPermission = useCallback(() => session.refreshPermission(), [session]);
  const start = useCallback(() => session.start(), [session]);
  const stop = useCallback(() => session.stop(), [session]);
  const poll = useCallback(() => session.poll(), [session]);
  const activate = useCallback(() => session.activate(), [session]);

  return {
    state,
    requestPermission,
    refreshPermission,
    start,
    stop,
    poll,
    activate,
  };
}
