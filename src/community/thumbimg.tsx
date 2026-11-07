// <img> for a home photo shown small (cards, lists, podiums): loads the 480 px thumbnail and falls back to the
// original photo if the thumbnail is not there yet. See src/lib/thumbs.ts.
import type { ImgHTMLAttributes } from "react";
import { thumb, onThumbError } from "@/lib/thumbs";

export function ThumbImg({ src, onError, decoding = "async", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} decoding={decoding} src={thumb(src)} onError={(e) => { if (!onThumbError(e.currentTarget, src)) onError?.(e); }} />;
}
