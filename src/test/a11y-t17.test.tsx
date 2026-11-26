// Accessibility checks (26-nov-2026, list of 1,000, batch 17: 801-850).
// Components: keyboard, names, live announcements, dialogs. Static: design-system CSS, viewport, translations.
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signInWithOtp: vi.fn(), signInWithOAuth: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/lib/rh", async (orig) => ({ ...(await orig<typeof import("@/lib/rh")>()), track: vi.fn() }));

import PhotoGallery, { photoOf } from "@/components/realhunt/PhotoGallery";
import AuthModal from "@/components/realhunt/AuthModal";
import Pagination from "@/components/realhunt/Pagination";
import ScoreBadge from "@/components/realhunt/ScoreBadge";
import ScoreRing from "@/components/realhunt/ScoreRing";
import { syncMainLandmark } from "@/components/realhunt/RouteA11y";
import { focusMainHeading, scoreLabel, spokenEur } from "@/lib/a11y";

if (!Element.prototype.scrollTo) Element.prototype.scrollTo = function () {} as typeof Element.prototype.scrollTo;
afterEach(() => { cleanup(); sessionStorage.clear(); document.body.innerHTML = ""; });

/** 837: every button and link has a name a screen reader can say. */
function unnamed(root: HTMLElement): string[] {
  const bad: string[] = [];
  root.querySelectorAll<HTMLElement>("button, a[href], [role=button]").forEach(el => {
    const name = (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim()
      || [...el.querySelectorAll("img[alt]")].map(i => i.getAttribute("alt")).join("").trim();
    if (!name) bad.push(el.outerHTML.slice(0, 120));
  });
  return bad;
}

describe("photo gallery (802, 828, 830, 823)", () => {
  const photos = ["/a.jpg", "/b.jpg", "/c.jpg"];
  it("moves with arrows, Home and End and announces 'Photo n of total'", () => {
    const { container } = render(<MemoryRouter><PhotoGallery images={photos} title="Casa" /></MemoryRouter>);
    const rail = screen.getByLabelText("Photo gallery. Swipe or use arrow keys.");
    const live = container.querySelector<HTMLElement>(".sr-only[aria-live]")!;
    expect(live).toHaveTextContent("Photo 1 of 3");
    fireEvent.keyDown(rail, { key: "ArrowRight" }); expect(live).toHaveTextContent("Photo 2 of 3");
    fireEvent.keyDown(rail, { key: "End" }); expect(live).toHaveTextContent("Photo 3 of 3");
    fireEvent.keyDown(rail, { key: "Home" }); expect(live).toHaveTextContent("Photo 1 of 3");
    fireEvent.keyDown(rail, { key: "ArrowLeft" }); expect(live).toHaveTextContent("Photo 3 of 3");
    // the visible "3 / 3" counter is hidden from screen readers so it is not read twice
    expect(screen.getByText("3 / 3")).toHaveAttribute("aria-hidden", "true");
    expect(unnamed(container)).toEqual([]);
    container.querySelectorAll("svg").forEach(svg => expect(svg.getAttribute("aria-hidden")).toBe("true"));
    // every photo has alt text with its number; thumbnails are decorative inside named buttons
    const slides = container.querySelectorAll('[aria-roledescription="slide"] img');
    slides.forEach((img, i) => expect(img.getAttribute("alt")).toBe(`Casa, photo ${i + 1} of 3`));
    expect(screen.getByLabelText("Show photo 3")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Show photo 1")).not.toHaveAttribute("aria-current");
  });
  it("card galleries keep previous/next buttons in the keyboard order", () => {
    const { container } = render(<MemoryRouter><PhotoGallery images={photos} title="Casa" compact href="/deal/x" /></MemoryRouter>);
    const nav = container.querySelectorAll(".rh-gal-nav");
    expect(nav).toHaveLength(2);
    expect(container.querySelector(".rh-gal")).not.toBeNull();
  });
  it("the enlarged view is a named dialog, announces the photo and closes with Escape", async () => {
    render(<MemoryRouter><PhotoGallery images={photos} title="Casa" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Enlarge" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Casa · 1 \/ 3/)).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByAltText("Casa, photo 2 of 3")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Zoom in")).toHaveAttribute("aria-pressed", "false");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("photoOf is the string the Spanish dictionary translates", () => {
    expect(photoOf(3, 8)).toBe("Photo 3 of 8");
    const es = JSON.parse(readFileSync("public/i18n/es-core.json", "utf8"));
    expect(es["Photo {0} of {1}"]).toBe("Foto {0} de {1}");
    expect(es["{0}, photo {1} of {2}"]).toBe("{0}, foto {1} de {2}");
  });
});

describe("sign-in dialog (806, 811, 834)", () => {
  it("has a title, visible labels and errors tied to the fields", async () => {
    render(<MemoryRouter><AuthModal open onClose={() => {}} initialMode="up" /></MemoryRouter>);
    const dialog = screen.getByRole("dialog", { name: "Sign in to see the original listing" });
    // the label is visible text, not only a placeholder
    const email = within(dialog).getByRole("textbox", { name: "Email address" });
    expect(within(dialog).getByText("Email address")).not.toHaveClass("sr-only");
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.submit(email.closest("form")!);
    const alert = await within(dialog).findByRole("alert");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email.getAttribute("aria-describedby")).toBe(alert.id);
    expect(unnamed(dialog)).toEqual([]);
    fireEvent.keyDown(dialog, { key: "Escape" });
  });
});

describe("pagination (815)", () => {
  it("names the current page and the direction of each button", () => {
    render(<Pagination page={1} total={120} onChange={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "Results pages" });
    expect(within(nav).getByText("Page 2 of 3")).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeEnabled();
  });
});

describe("scores and prices (804, 838)", () => {
  it("score badges are read as text, not only colour", () => {
    render(<><ScoreBadge score={8.6} /><ScoreRing score={7.2} /></>);
    expect(screen.getByRole("img", { name: "Score 8.6 out of 10" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Score 7 out of 10" })).toBeInTheDocument();
    expect(scoreLabel(94)).toBe("RealHunt score 94 out of 100");
    const es = JSON.parse(readFileSync("public/i18n/es-core.json", "utf8"));
    expect(es["RealHunt score {0} out of 100"]).toBe("Nota RealHunt {0} sobre 100");
  });
  it("prices are spoken with the currency in words", () => {
    expect(spokenEur(38000)).toBe("38,000 euros");
    expect(spokenEur(38000, "es")).toMatch(/^38\.?000 euros$/);
    expect(spokenEur(NaN)).toBe("");
  });
});

describe("route changes and landmarks (840, one main)", () => {
  it("keeps exactly one main landmark", () => {
    document.body.innerHTML = '<div id="main-content"><header></header><div class="hunt-main"><main class="rh-static"><h1>Hi</h1></main></div><footer></footer></div>';
    syncMainLandmark();
    expect(document.querySelectorAll('main, [role="main"]')).toHaveLength(1);
    // an app page: the page body is the main landmark, header and footer stay outside it
    document.body.innerHTML = '<div id="main-content"><header></header><div class="hunt-main"><h1>App page</h1></div><footer></footer></div>';
    syncMainLandmark();
    expect(document.querySelector(".hunt-main")).toHaveAttribute("role", "main");
    expect(document.getElementById("main-content")).not.toHaveAttribute("role");
    // another layout without .hunt-main: the wrapper itself
    document.body.innerHTML = '<div id="main-content"><section><h1>Other</h1></section></div>';
    syncMainLandmark();
    expect(document.getElementById("main-content")).toHaveAttribute("role", "main");
  });
  it("moves focus to the new page's H1, but not away from a field being typed in", () => {
    document.body.innerHTML = '<input id="q"><div id="main-content"><h1>Homes in Spain</h1></div>';
    expect(focusMainHeading()).toBe(true);
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.querySelector("h1")).toHaveAttribute("tabindex", "-1");
    (document.getElementById("q") as HTMLInputElement).focus();
    expect(focusMainHeading()).toBe(false);
    expect(document.activeElement?.id).toBe("q");
  });
});

describe("static rules (803, 805, 809, 812, 816, 845, 849)", () => {
  const css = readFileSync("src/community/ds.css", "utf8");
  const pass = css.slice(css.indexOf("Accessibility pass"));
  it("the design system has a focus ring, reduced motion, underlined text links and a 12 px floor", () => {
    expect(pass).toMatch(/:focus-visible\s*\{\s*outline: 3px solid/);
    expect(pass).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*animation-duration: \.01ms/);
    expect(pass).toMatch(/text-decoration: underline/);
    expect(pass).toMatch(/a\[href="#main-content"\]:focus/);
    // nothing in the accessibility pass sets text under 12 px
    for (const m of pass.matchAll(/font-size:\s*([\d.]+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
  it("secondary text tokens reach 4.5:1 on their backgrounds", () => {
    const lum = (hex: string) => { const c = hex.match(/\w\w/g)!.map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const token = (scope: string, name: string) => new RegExp(`${scope.replace(".", "\\.")}\\s*\\{[^}]*--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)![1];
    expect(ratio(token(".hunt", "c-ink-3"), "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(".hunt", "c-ink-3"), token(".hunt", "c-surface-2"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(".hunt", "c-accent-ink"), "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(".hunt.is-dark", "c-ink-3"), token(".hunt.is-dark", "c-bg"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(".hunt.is-dark", "c-ink-3"), token(".hunt.is-dark", "c-surface"))).toBeGreaterThanOrEqual(4.5);
  });
  it("no page blocks pinch zoom (849)", () => {
    const html = readFileSync("index.html", "utf8");
    const vp = /<meta name="viewport" content="([^"]+)"/.exec(html)![1];
    expect(vp).not.toMatch(/maximum-scale|user-scalable\s*=\s*(no|0)/);
    for (const f of ["seo/dealShell.ts", "seo/prerender.ts"]) expect(readFileSync(f, "utf8")).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(?![\d.])/);
  });
});
