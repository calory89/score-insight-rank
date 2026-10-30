import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ListingVideo from "@/components/realhunt/ListingVideo";

let intersect: IntersectionObserverCallback;
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe() {} disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("loads a muted preview only on screen, pauses offscreen and links to the internal home", () => {
  const { container } = render(<MemoryRouter><ListingVideo shortcode="Dc4gpg6slIT" title="Umbria" compact href="/find/Dc4gpg6slIT" /></MemoryRouter>);
  const video = container.querySelector("video")!;
  expect(video).not.toHaveAttribute("src");
  act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(video).toHaveAttribute("src", "/videos/umbria-35000-preview.mp4");
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  expect(video.playsInline).toBe(true);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/find/Dc4gpg6slIT");
  act(() => intersect([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  fireEvent.error(video);
  expect(screen.getByRole("img", { name: "Umbria" })).toHaveAttribute("src", "/finds/umbria-35000-poster.jpg");
});

it("uses the complete video with user controls in the home details", () => {
  const { container } = render(<ListingVideo shortcode="Dc4gpg6slIT" title="Umbria" />);
  act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  const video = container.querySelector("video")!;
  expect(video).toHaveAttribute("src", "/videos/umbria-35000.mp4");
  expect(video.controls).toBe(true);
  expect(video).not.toHaveAttribute("autoplay");
});
