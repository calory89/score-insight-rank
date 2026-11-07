import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const rows = [
  { id: "1", slug: "a", title: "Sea house", country: "Spain", location_name: "Nerja, Málaga", category: "beach", price_eur: 150000, bedrooms: 3, approved_at: "2026-11-06T00:00:00Z", image_urls: [] },
  { id: "2", slug: "b", title: "Village house", country: "Italy", location_name: "Castellina, Tuscany", category: "village", price_eur: 90000, bedrooms: 2, approved_at: "2026-10-01T00:00:00Z", image_urls: [] },
  { id: "3", slug: "c", title: "Stone house", country: "Italy", location_name: "Radda, Tuscany", category: "village", price_eur: 80000, bedrooms: 2, approved_at: "2026-10-01T00:00:00Z", image_urls: [] },
];
vi.mock("@/community/extras", () => ({
  feed: vi.fn(async () => ({ rows, total: rows.length })),
  feedAll: vi.fn(async () => ({ rows, total: rows.length })),
}));
vi.mock("@/community/v6", () => ({ VIBES: [{ k: "lake", label: "Lake life", q: "lake" }] }));

import { FindSearch, FindBar, SavedSearches } from "@/community/findui";

function Where() { const l = useLocation(); return <output data-testid="url">{l.pathname + l.search}</output>; }
const renderAt = (url: string, ui: JSX.Element) => render(<MemoryRouter initialEntries={[url]}><Routes><Route path="*" element={<>{ui}<Where /></>} /></Routes></MemoryRouter>);

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("FindSearch", () => {
  it("turns a sentence into filters and shows removable chips", async () => {
    renderAt("/", <FindSearch value="" />);
    const box = screen.getByRole("combobox", { name: "Search homes" });
    await waitFor(() => expect(true).toBe(true));
    fireEvent.change(box, { target: { value: "3 bedroom house near the sea under 200k in Spain" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("url").textContent).toContain("country=Spain"));
    const url = screen.getByTestId("url").textContent!;
    expect(url).toContain("price=200000"); expect(url).toContain("beds=3"); expect(url).toContain("type=beach");
    const chip = await screen.findByRole("button", { name: "Remove under €200,000" });
    fireEvent.click(chip);
    await waitFor(() => expect(screen.getByTestId("url").textContent).not.toContain("price="));
  });
  it("suggests places with typos and picks one with the keyboard", async () => {
    renderAt("/", <FindSearch value="" />);
    const box = screen.getByRole("combobox", { name: "Search homes" });
    fireEvent.focus(box);
    await new Promise((r) => setTimeout(r, 20));
    fireEvent.change(box, { target: { value: "Tuscnay" } });
    const opt = await screen.findByRole("option", { name: /Tuscany, Italy/ });
    expect(opt).toHaveTextContent("2 homes");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    const active = box.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("url").textContent).toContain("q=Tuscany"));
    fireEvent.change(box, { target: { value: "Ital" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveAttribute("aria-expanded", "false");
  });
});

describe("FindBar and saved searches", () => {
  it("toggles a lifestyle chip and saves the search", async () => {
    renderAt("/?country=Italy", <><FindBar /><SavedSearches /></>);
    fireEvent.click(await screen.findByRole("button", { name: /Countryside/ }));
    await waitFor(() => expect(screen.getByTestId("url").textContent).toContain("type=village"));
    fireEvent.click(screen.getByRole("button", { name: "Save this search" }));
    expect(screen.getByRole("button", { name: "Search saved" })).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem("rh.savedSearches.v1")!);
    expect(saved[0].qs).toBe("country=Italy&type=village");
    expect(await screen.findByText("Italy · countryside and villages")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email alerts" })).toHaveAttribute("href", "/alerts?country=Italy");
  });
  it("shows how many homes are new since the search was last opened", async () => {
    localStorage.setItem("rh.savedSearches.v1", JSON.stringify([{ id: "x", qs: "country=Spain", label: "Spain", created: "2026-10-01T00:00:00Z", opened: "2026-11-01T00:00:00Z" }]));
    renderAt("/hunt/saved", <SavedSearches />);
    expect(await screen.findByText("1 new home since your last visit")).toBeInTheDocument();
  });
});
