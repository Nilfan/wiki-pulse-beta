"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** The server cannot know the viewer's zone; show placeholders until hydration. */
export function useLocalTimeReady() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
