// Addresses drawn by src/tools/ToolsPage.tsx (kept apart so the check costs nothing in the chunk that asks).
export const isToolPath = (path: string) => path === "/tools" || path.startsWith("/tools/") || path === "/buying-costs" || path.startsWith("/buying-costs/");
