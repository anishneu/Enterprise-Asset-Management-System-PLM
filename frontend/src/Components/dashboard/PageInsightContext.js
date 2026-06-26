import { createContext, useContext } from "react";

export const PageInsightContext = createContext({
  insight: {},
  setInsight: () => {},
});

export function usePageInsight() {
  return useContext(PageInsightContext);
}
