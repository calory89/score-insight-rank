// RealHunt v8 (24-sep-2026): developer projects inside the community feed.
// A listing with a developer shows who builds it, the Verified badge, and a primary "Ask <developer>"
// button. Requests land in the developer's panel as buyers (trigger community_info_to_intro_trg).
import { Link } from "react-router-dom";
import { BadgeCheck, Building2 } from "lucide-react";
import { InfoRequest, type Row } from "./extras";

export function DevBlock({ deal }: { deal: Row }) {
  const dev = (deal as any).developer as { name: string; slug: string; verified?: boolean } | null;
  if (!dev) return null;
  return (
    <div className="hv-devblock">
      <Link to={`/dev/${dev.slug}`} className="hv-devblock-who">
        <span className="hv-devblock-icon"><Building2 size={18} /></span>
        <span><small>New build by</small><strong>{dev.name} {dev.verified && <BadgeCheck size={15} className="hv-devblock-check" aria-label="Verified developer" />}</strong></span>
      </Link>
      {dev.verified && <p className="hv-devblock-ver">Verified developer · signed the RealHunt agreement and checked by us</p>}
      <InfoRequest deal={deal} dev={dev} />
    </div>
  );
}
