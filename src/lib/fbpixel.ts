// Meta Pixel helpers. Base pixel is initialized in index.html.
// All calls are guarded so they never throw if the pixel script is blocked.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const fbTrack = (event: string, params?: Record<string, unknown>) => {
  try {
    if (typeof window !== "undefined" && window.fbq) {
      if (params) window.fbq("track", event, params);
      else window.fbq("track", event);
    }
  } catch {
    /* swallow */
  }
};

export const fbLead = (params?: Record<string, unknown>) => fbTrack("Lead", params);
export const fbPageView = () => fbTrack("PageView");
