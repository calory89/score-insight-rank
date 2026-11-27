// Ronda 27: a page opened by a full load must not get the scroll of another page opened the same way.
import { afterEach, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ScrollKeeper from "@/components/realhunt/ScrollKeeper";

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

it("a full load of a home page does not take the scroll the list page had", () => {
  sessionStorage.setItem("rh-scroll", JSON.stringify({ "default:/homes/spain": 900 }));
  const to = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  render(<MemoryRouter initialEntries={["/deal/x"]}><ScrollKeeper /></MemoryRouter>);
  expect(to.mock.calls.some((c: any[]) => c[0]?.top === 900)).toBe(false);
});

it("a reload of the same page gets its own scroll back", () => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type: "reload" }] as any);
  sessionStorage.setItem("rh-scroll", JSON.stringify({ "default:/homes/spain": 900 }));
  const to = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  render(<MemoryRouter initialEntries={["/homes/spain"]}><ScrollKeeper /></MemoryRouter>);
  expect(to.mock.calls.some((c: any[]) => c[0]?.top === 900)).toBe(true);
});

it("the same page opened from a link starts at the top", () => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type: "navigate" }] as any);
  sessionStorage.setItem("rh-scroll", JSON.stringify({ "default:/homes/spain": 900 }));
  const to = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  render(<MemoryRouter initialEntries={["/homes/spain"]}><ScrollKeeper /></MemoryRouter>);
  expect(to.mock.calls.some((c: any[]) => c[0]?.top === 900)).toBe(false);
});
