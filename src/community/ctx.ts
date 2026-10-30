import { createContext, useContext } from "react";
// Shared community context (session, vote/save calls, notices). Lives in its own module so the
// feature files (extras, map) can use it without importing the big Community page.
export const Ctx = createContext<any>(null);
export const useCommunity = () => useContext(Ctx);
