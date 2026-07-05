import { createContext, useContext } from "react";

export const PageInsightContext = createContext({
  insight: {},
  setInsight: () => {},
  clearDetail: () => {},
});

export function usePageInsight() {
  return useContext(PageInsightContext);
}
