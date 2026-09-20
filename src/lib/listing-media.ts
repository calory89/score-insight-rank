// Editorial media supplied for this exact listing; the database remains the source
// for price, description and the authenticated outbound action.
export function listingVideo(shortcode: string) {
  return shortcode === "Dc4gpg6slIT" ? {
    src: "/videos/umbria-35000.mp4",
    preview: "/videos/umbria-35000-preview.mp4",
    poster: "/finds/umbria-35000-poster.jpg",
  } : undefined;
}
