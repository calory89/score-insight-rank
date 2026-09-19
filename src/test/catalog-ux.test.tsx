import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IG } from "@/lib/rh";
const state = vi.hoisted(() => ({ user: null as any, rows: [] as any[], otp: vi.fn(), password: vi.fn(), getSession: vi.fn(), updateUser: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock("@/components/realhunt/RHNav", () => ({ default: () => null }));
vi.mock("@/components/realhunt/CaptureInline", () => ({ default: () => null }));
vi.mock("@/components/realhunt/Onboarding", () => ({ default: () => null }));
vi.mock("@/lib/experiments", () => ({ useExperiment: (_: unknown, choices: any) => choices[0] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { signInWithOtp: state.otp, signInWithPassword: state.password, getSession: state.getSession, updateUser: state.updateUser, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  from: () => {
    let code: string | null = null;
    const query: any = {};
    for (const method of ["select", "neq", "lte", "order", "limit", "in", "insert", "delete", "update"]) query[method] = () => query;
    query.eq = (key: string, value: string) => { if (key === "shortcode") code = value; return query; };
    query.maybeSingle = () => query;
    query.then = (cb: any) => Promise.resolve({ data: code ? state.rows.find(f => f.shortcode === code) : state.rows, error: null }).then(cb);
    return query;
  }, rpc: () => Promise.resolve({ data: [] }),
} }));
import { comparisonCodes, filtersFromUrl, filterSearch, EMPTY_FILTERS, matchesHome } from "@/lib/catalog";
import { confirmationUrl, safeReturnPath, readReturn } from "@/lib/auth-return";
import { decisionFacts } from "@/components/realhunt/DecisionSummary";
import PhotoGallery from "@/components/realhunt/PhotoGallery";
import AuthModal from "@/components/realhunt/AuthModal";
import Home from "@/pages/Home";
import CompareHomes from "@/pages/CompareHomes";
import Callback from "@/pages/auth/Callback";
const sample = (code: string, price = 39000): IG => ({ id: code, shortcode: code, source_account: "test", caption: null, image_urls: ["/one.jpg", "/two.jpg", "/three.jpg"], posted_at: null, location_name: code === "sea" ? "Acquappesa" : code, country_guess: "Italy", price_eur: price, price_raw: null, likes: null, is_beach: true, sqm: null, bedrooms: null });
const Where = () => { const route = useLocation(); return <output data-testid="route">{route.pathname + route.search + route.hash}</output>; };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); state.rows = [sample("sea"), sample("two", 20000), sample("three", 30000), sample("four", 50000)];
  state.otp.mockReset().mockResolvedValue({ error: null }); state.password.mockReset().mockResolvedValue({ error: null });
  state.getSession.mockReset().mockResolvedValue({ data: { session: null } }); state.updateUser.mockReset().mockResolvedValue({ error: null });
  window.history.replaceState({}, "", "/");
  window.scrollTo = vi.fn(); Element.prototype.scrollTo = vi.fn(); Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("navigation and data safety", () => {
  it("serializes combined filters without losing referral attribution", () => {
    const f = { country: "Italy", maxP: 50000, beach: true, q: "Lake Como" };
    const query = filterSearch(f, "cheap", "?ref=friend");
    expect(filtersFromUrl(query)).toEqual(f); expect(query).toContain("ref=friend"); expect(query).toContain("sort=cheap");
    expect(matchesHome(sample("sea"), { ...f, q: "Acquappesa" })).toBe(true);
    expect(matchesHome(sample("sea"), { ...f, q: "Acquappesa", maxP: 10000 })).toBe(false);
  });
  it("keeps return destinations across devices and rejects external redirects", () => {
    const target = "/find/sea#original-listing";
    const callback = new URL(confirmationUrl("https://realhunt.co", target));
    expect(readReturn(callback.search)).toBe(target);
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "/auth/callback", "/\nevil.test"]) expect(safeReturnPath(bad)).toBe("/");
  });
  it("caps comparisons at three unique, valid listings", () => {
    expect(comparisonCodes(["sea", "sea", "two", "three", "four", "../bad"])).toEqual(["sea", "two", "three"]);
  });
  it("does not invent condition, ownership or floor area", () => {
    const facts = decisionFacts(sample("sea"));
    expect(facts.missing).toContain("Floor area");
    expect(facts.missing).toContain("Property condition and any work needed");
    expect(facts.highlights.join(" ")).not.toMatch(/renovated|freehold|ready to move/i);
  });
});

describe("photo continuity", () => {
  it("retains the viewed photo after unmount and synchronizes another view", async () => {
    const first = render(<MemoryRouter><PhotoGallery images={["/a.jpg", "/b.jpg"]} title="Home" compact rememberKey="sea" /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText("Next photo")); expect(screen.getByText("2 / 2")).toBeInTheDocument(); first.unmount();
    render(<MemoryRouter><PhotoGallery images={["/a.jpg", "/b.jpg"]} title="Home" rememberKey="sea" /></MemoryRouter>);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enlarge" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Zoom in")); expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close enlarged photo")); await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("clamps a saved photo when the listing has fewer images", () => {
    sessionStorage.setItem("rh_photo:sea", "9");
    render(<MemoryRouter><PhotoGallery images={["/a.jpg"]} title="Home" rememberKey="sea" /></MemoryRouter>);
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });
});

describe("catalogue interactions", () => {
  it("previews filters before applying them and offers real budget alternatives", async () => {
    const { container } = render(<MemoryRouter><Home /><Where /></MemoryRouter>);
    await screen.findByLabelText("Quick view Acquappesa");
    const initial = container.querySelectorAll("article").length;
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Acquappesa" } });
    fireEvent.click(screen.getByRole("button", { name: "< €25k" }));
    expect(container.querySelectorAll("article")).toHaveLength(initial);
    fireEvent.click(screen.getByRole("button", { name: "Show 0 homes" }));
    await screen.findByText("No homes match these filters yet.");
    expect(screen.getByTestId("route")).toHaveTextContent("max=25000");
    const suggestion = screen.getByRole("button", { name: /Budget up to €50,000/ });
    expect(suggestion).toHaveTextContent("1 home"); fireEvent.click(suggestion);
    await screen.findByLabelText("Quick view Acquappesa");
    expect(screen.getByRole("searchbox")).toHaveValue("Acquappesa");
  });
  it("opens adjacent homes in quick view and keeps the catalogue mounted", async () => {
    const { container } = render(<MemoryRouter><Home /></MemoryRouter>);
    fireEvent.click(await screen.findByLabelText("Quick view Acquappesa"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Acquappesa" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText("Next home"));
    expect(within(dialog).queryByRole("heading", { name: "Acquappesa" })).toBeNull();
    fireEvent.click(within(dialog).getByLabelText("Close quick view"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(container.querySelectorAll("article").length).toBeGreaterThan(1);
  });
  it("selects three homes, disables a fourth and compares without login", async () => {
    render(<MemoryRouter><Routes><Route path="/" element={<Home />} /><Route path="/compare-homes" element={<CompareHomes />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByLabelText("Compare Acquappesa"));
    fireEvent.click(screen.getByLabelText("Compare two")); fireEvent.click(screen.getByLabelText("Compare three"));
    expect(screen.getByLabelText("Compare four")).toBeDisabled();
    fireEvent.click(screen.getByRole("link", { name: "Compare homes" }));
    await screen.findByRole("table");
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("link", { name: "Back to results" }));
    await screen.findByLabelText("Compare Acquappesa");
    expect(screen.getByLabelText("Compare Acquappesa")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("registration intent", () => {
  it("sends the original home in the callback link and offers email correction", async () => {
    render(<MemoryRouter><AuthModal open onClose={vi.fn()} redirect="/find/sea#original-listing" initialMode="up" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send confirmation link" }));
    await screen.findByText("Check test@example.com");
    expect(state.otp.mock.calls[0][0].options.emailRedirectTo).toContain("next=%2Ffind%2Fsea%23original-listing");
    expect(screen.getByRole("button", { name: /Resend in/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Correct email address" }));
    expect(screen.getByLabelText("Email address")).toHaveValue("test@example.com");
  });
  it("recovers from network errors without claiming success", async () => {
    state.otp.mockRejectedValueOnce(new Error("network"));
    render(<MemoryRouter><AuthModal open onClose={vi.fn()} initialMode="up" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send confirmation link" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Send confirmation link" })).toBeEnabled();
    expect(screen.queryByText("Check test@example.com")).toBeNull();
  });
});


describe("complete return journeys", () => {
  it("restores filtered results, scroll position, loaded count and photo after visiting a detail", async () => {
    const url = "/?country=Italy&max=50000&q=Acquappesa";
    sessionStorage.setItem(`rh_catalog_position:${url}`, JSON.stringify({ y: 1250, limit: 80, at: Date.now() }));
    sessionStorage.setItem("rh_photo:sea", "1");
    const { container } = render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/" element={<Home />} /><Route path="/find/:id" element={<Link to={url}>Return to catalogue</Link>} /></Routes></MemoryRouter>);
    await screen.findByLabelText("Quick view Acquappesa");
    expect(screen.getByRole("searchbox")).toHaveValue("Acquappesa");
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 1250, behavior: "instant" }));
    const card = container.querySelector('article[data-home-code="sea"]')!;
    expect(card).toHaveTextContent("2 / 3");
    fireEvent.click(card.querySelector('a[tabindex="0"]')!);
    fireEvent.click(await screen.findByRole("link", { name: "Return to catalogue" }));
    await screen.findByLabelText("Quick view Acquappesa");
    expect(screen.getByRole("searchbox")).toHaveValue("Acquappesa");
    expect(container.querySelector('article[data-home-code="sea"]')).toHaveTextContent("2 / 3");
    expect(JSON.parse(sessionStorage.getItem(`rh_catalog_position:${url}`)!).limit).toBe(80);
  });
  it("returns an existing user to the property from a confirmation URL without local storage", async () => {
    window.history.replaceState({}, "", "/auth/callback?next=%2Ffind%2Fsea%23original-listing");
    state.getSession.mockResolvedValue({ data: { session: { user: { user_metadata: { has_password: true } } } } });
    render(<MemoryRouter initialEntries={["/auth/callback"]}><Routes><Route path="/auth/callback" element={<Callback />} /><Route path="/find/:id" element={<Where />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("route")).toHaveTextContent("/find/sea#original-listing"));
  });
  it("offers a new link on expiration while preserving the destination", async () => {
    window.history.replaceState({}, "", "/auth/callback?next=%2Ffind%2Fsea#error=access_denied&error_code=otp_expired");
    render(<MemoryRouter><Callback /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "This link could not sign you in." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the home" })).toHaveAttribute("href", "/find/sea");
    fireEvent.click(screen.getByRole("button", { name: "Request a new link" }));
    expect(screen.getByRole("button", { name: "Send confirmation link" })).toBeInTheDocument();
  });
});
