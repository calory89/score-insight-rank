import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ request: vi.fn(), signals: [] as AbortSignal[] }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/realhunt/RHNav", () => ({ default: () => null }));
vi.mock("@/components/realhunt/AuthModal", () => ({ default: () => null }));
vi.mock("@/components/realhunt/CaptureInline", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    let single = false;
    const query: Record<string, Function> = {};
    for (const name of ["select", "eq", "neq", "order", "limit"]) query[name] = () => query;
    query.maybeSingle = () => { single = true; return query; };
    query.abortSignal = (signal: AbortSignal) => { state.signals.push(signal); return query; };
    query.then = (resolve: Function, reject: Function) => (single ? state.request() : Promise.resolve({ data: [] })).then(resolve, reject);
    return query;
  }, rpc: () => Promise.resolve({ data: [] }),
} }));
import FindDetail from "@/pages/FindDetail";

beforeEach(() => { state.request.mockReset(); state.signals = []; window.scrollTo = vi.fn(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const show = async () => {
  render(<MemoryRouter initialEntries={["/find/Dc26HIXDP28"]}><Routes><Route path="/find/:shortcode" element={<FindDetail />} /></Routes></MemoryRouter>);
  await act(async () => {});
};

it("shows a retryable error rather than claiming a failed query was removed", async () => {
  state.request.mockResolvedValue({ data: null, error: { message: "temporary outage" } });
  await show();
  expect(screen.getByRole("alert")).toHaveTextContent("This home could not load");
  expect(screen.queryByText("This one is gone.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});

it("handles network rejection without leaving an indefinite skeleton", async () => {
  state.request.mockRejectedValue(new TypeError("Failed to fetch"));
  await show();
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("times out a stuck request, retries successfully, and ignores its late response", async () => {
  vi.useFakeTimers();
  let finishOld!: (value: unknown) => void;
  state.request.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  await show();
  expect(screen.getByRole("status", { name: "Loading home" })).toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(15000); });
  expect(state.signals[0].aborted).toBe(true);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  state.request.mockResolvedValue({ data: { id: "fixture", shortcode: "Dc26HIXDP28", source_account: "test", price_eur: 35000, country_guess: "Italy", image_urls: [], caption: "Test listing" }, error: null });
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await act(async () => {});
  expect(screen.getByRole("heading", { name: "€35,000", level: 1 })).toBeInTheDocument();
  await act(async () => { finishOld({ data: null, error: null }); });
  expect(screen.getByRole("heading", { name: "€35,000", level: 1 })).toBeInTheDocument();
});

it("only shows unavailable when a successful query returns no listing", async () => {
  state.request.mockResolvedValue({ data: null, error: null });
  await show();
  expect(screen.getByText("This one is gone.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
