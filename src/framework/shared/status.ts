import { createContext } from "react";

export interface StatusState {
  statusCode?: number;
  headers?: Record<string, string>;
}

export const StatusContext = createContext<StatusState>({});

if (import.meta.env.DEV) {
  StatusContext.displayName = "StatusContext";
}
