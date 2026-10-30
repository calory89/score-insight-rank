import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PhotoGallery from "@/components/realhunt/PhotoGallery";
import OfflineBanner from "@/components/OfflineBanner";

vi.mock("@/lib/rh", () => ({ srcSet: () => undefined, EBC: {}, HOME_MAX_PRICE: 60000 }));
let intersect: IntersectionObserverCallback;
beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe() {} disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("gallery bandwidth without losing navigation", () => {
  const photos = ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg"];
  it("does not download offscreen cards, then loads the current and next photo", () => {
    const { container } = render(<MemoryRouter><PhotoGallery images={photos} title="Home" compact /></MemoryRouter>);
    expect(container.querySelectorAll("img[src]")).toHaveLength(0);
    expect(container.querySelectorAll('[aria-roledescription="slide"]')).toHaveLength(5);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect([...container.querySelectorAll("img[src]")].map(img => img.getAttribute("src"))).toEqual(photos.slice(0, 2));
    fireEvent.click(screen.getByLabelText("Next photo"));
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(container.querySelector('img[src="/3.jpg"]')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Previous photo"));
    fireEvent.click(screen.getByLabelText("Previous photo"));
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(container.querySelector('img[src="/5.jpg"]')).toBeInTheDocument();
  });
  it.each([320, 390, 768, 1440])("restores the viewed photo at %i px and keeps zoom available", width => {
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(width);
    sessionStorage.setItem("rh_photo:test", "3");
    render(<MemoryRouter><PhotoGallery images={photos} title="Home" rememberKey="test" eager /></MemoryRouter>);
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: width * 3 }));
    fireEvent.click(screen.getByLabelText("Show photo 5"));
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Enlarge$/ }));
    expect(screen.getByRole("dialog").querySelector('img[src="/5.jpg"]')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
  });
  it("still loads photos when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<MemoryRouter><PhotoGallery images={photos} title="Home" compact /></MemoryRouter>);
    expect(container.querySelectorAll("img[src]")).toHaveLength(2);
  });
});

it("keeps offline/reconnected notices, including rapid connectivity changes", () => {
  vi.useFakeTimers();
  render(<OfflineBanner />);
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.getByText("Back online")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText(/You're offline/)).toBeNull();
  act(() => { window.dispatchEvent(new Event("offline")); vi.advanceTimersByTime(100); });
  act(() => window.dispatchEvent(new Event("online")));
  act(() => vi.advanceTimersByTime(3000));
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText("Back online")).toBeNull();
});
