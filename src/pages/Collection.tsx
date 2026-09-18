import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, FLAG, norm, srcSet, track } from "@/lib/rh";

const Collection = () => {
  const { username } = useParams();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { document.title = `${username}'s picks · RealHunt`; track("collection_view", { meta: { username } }); db.rpc("public_saved", { uname: username }).then(({ data }: any) => setItems(data || [])); }, [username]);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8">
        <h1 className="font-display text-[clamp(28px,5vw,44px)] tracking-tight">{username}'s picks</h1>
        <p className="text-ink-muted mt-1 text-[15px]">Homes under €60,000 saved on RealHunt. <Link to="/" className="underline text-ink">Make your own list</Link></p>
        {items && items.length === 0 && <p className="mt-6 text-ink-muted">This list is empty or private.</p>}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {(items || []).map((f) => { const c = norm(f.country_guess); return (
            <Link key={f.shortcode} to={`/find/${f.shortcode}`} className="relative block rounded-2xl overflow-hidden bg-hairline/30 aspect-[4/5] shadow-sm">
              <img src={f.image_urls?.[0]} srcSet={srcSet(f.image_urls?.[0] || "")} sizes="(min-width:1024px) 300px, 50vw" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-white/90 text-ink text-[11px] font-medium shadow">{FLAG[c] || "🌍"} {c}</span>
              {f.price_eur && <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-white text-ink text-[12px] font-semibold tabular-nums shadow">{eur(f.price_eur)}</span>}
              <div className="absolute inset-x-0 bottom-0 p-3 text-white"><p className="text-[12px] line-clamp-2">{f.hook || f.location_name || c}</p></div>
            </Link>); })}
        </div>
      </div>
    </div>
  );
};
export default Collection;
