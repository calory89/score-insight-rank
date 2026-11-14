// The script of the calculators made to sit inside an <iframe> on another site (/embed/calculator/...). Built on its
// own by seo/tools/index.ts, so those pages load nothing of the app.
import { mount } from "./client";
document.querySelectorAll<HTMLElement>("[data-tool]").forEach((s) => mount(s, { embed: true }));
