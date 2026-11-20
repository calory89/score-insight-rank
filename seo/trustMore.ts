// Trust pages, second set (20-nov-2026, ideas 55, 56, 91, 92, 95 and 100 of the list of 100), in English and Spanish:
//   /how-we-check-homes        how we know a home is still for sale: the nightly check, the hand check, the notice
//   /what-we-reject            which homes we turn down and why: the rules a home must meet to go up
//   /what-we-never-do          the things RealHunt never does (urgency, reviews, returns, paid ranks, phone numbers)
//   /how-we-make-money         short and plain
//   /corrections               corrections and changes to what we published, with their dates
//   /research/removed-homes    the log of homes taken off or no longer for sale, month by month (+ .json, .csv)
// What the pages say about the check is what the code does: supabase/functions/realhunt-listing-check (the readings),
// supabase/migrations/20261024100000_listing_probes.sql (when a reading changes a home) and src/community/n9/status.ts
// (isGone, isUnconfirmed). Every figure is computed from the snapshot at build time. Nothing is counted that we do
// not hold: there is no count of the homes we turned down.
import { isGone, isUnconfirmed, UNCONFIRMED_DAYS } from "../src/community/n9/status";
import { LICENSE, ORG, PRESS_EMAIL, SITE, crumbLd, esc, frame, kit, table, type Kit, type Lang } from "./assetsKit";
import { registerEsPage, METHOD_VERSION } from "./assetsTrust";
import type { AssetCtx } from "./assets";
import type { Home } from "./assetsStats";
import { removedLog, type RemovedEvent } from "./reach/removed";
import { writeRemovedFiles } from "./reach/more";
import { TRUST_PAGES } from "./trustPages";


type Row = Home & { src_last?: string | null; src_ok_at?: string | null; verified_at?: string | null; source_url?: string | null; sold_reports?: number | null; available_reports?: number | null; publish_at?: string | null; approved_at?: string | null };
const SOCIAL = /instagram|facebook|tiktok|youtube|whatsapp|wa\.me/i;

/** The figures of /how-we-check-homes, from the snapshot. */
export function checkStats(rows: Row[], now: number) {
  const by = { ok: 0, gone: 0, blocked: 0, error: 0, none: 0 };
  let social = 0, recent = 0, person = 0;
  for (const r of rows) {
    const v = String(r.src_last || "");
    if (v === "ok" || v === "gone" || v === "blocked" || v === "error") by[v]++; else by.none++;
    if (SOCIAL.test(String(r.source_domain || ""))) social++;
    const ok = r.src_ok_at ? Date.parse(r.src_ok_at) : NaN;
    if (Number.isFinite(ok) && now - ok < UNCONFIRMED_DAYS * 864e5) recent++;
    if (r.verified_at && Number.isFinite(Date.parse(r.verified_at))) person++;
  }
  return { n: rows.length, ok: by.ok, removedReading: by.gone, blocked: by.blocked, error: by.error, none: by.none, social, recent, person,
    gone: rows.filter((r) => isGone(r as any)).length, unconfirmed: rows.filter((r) => isUnconfirmed(r as any, now)).length };
}

const monthName = (k: Kit, m: string) => { const s = k.date(`${m}-01`); return k.es ? s.replace(/^1 de /, "") : s.replace(/^1 /, ""); };

export function writeTrustMore(c: AssetCtx, rowsIn: Home[]): { pages: number; events: number } {
  const rows = rowsIn as Row[];
  const now = Date.parse(c.today + "T12:00:00Z");
  const st = checkStats(rows, now);
  const events = removedLog(rows as any, c.today);
  writeRemovedFiles(c.root, events, c.today);
  const onSite = new Set(rows.map((r) => r.slug));
  let pages = 0;

  for (const lang of ["en", "es"] as Lang[]) {
    const k = kit(lang); const { t, es } = k;
    const mail = `<a href="mailto:${PRESS_EMAIL}">${PRESS_EMAIL}</a>`;
    const updated = `<p class="rhx-meta">${t("Updated", "Actualizado el")} <time datetime="${c.today}">${esc(k.date(c.today))}</time></p>`;
    const ul = (xs: string[]) => `<ul>${xs.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    const see = (here: string) => `<h2>${esc(t("More on how RealHunt works", "Más sobre cómo trabaja RealHunt"))}</h2>` + ul([
      ...TRUST_PAGES.filter(([p]) => p !== here).map(([p, en, sp]) => `<a href="${p}">${esc(t(en, sp))}</a>`),
      `<a href="/method">${esc(t("How the score works", "Cómo funciona la nota"))}</a>`, `<a href="/editorial-policy">${esc(t("Editorial policy", "Política editorial"))}</a>`]);
    const put = (p: string, title: string, desc: string, o: { eyebrow: string; h1: string; body: string; ld?: object[]; crumbs?: [string, string][]; lastmod?: string }) => {
      const crumbs: [string, string][] = o.crumbs || [["RealHunt", "/"], [o.h1, p]];
      c.page(k.url(p), `${title} · RealHunt`, desc, c.image, frame(k, { crumbs, eyebrow: o.eyebrow, h1: o.h1, body: o.body + see(p) }),
        [crumbLd(k, crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: o.h1, url: k.url(p), inLanguage: lang, dateModified: c.today, publisher: ORG, ...(p.startsWith("/research") ? { license: LICENSE } : {}) }, ...(o.ld || [])],
        { group: es ? "es" : "pages", lastmod: o.lastmod || c.today, lang: es ? "es" : undefined, alt: { en: SITE + p, es: `${SITE}/es${p}` } });
      if (es) registerEsPage(`es${p}/index.html`);
      pages++;
    };
    const eyebrow = t("How RealHunt works", "Cómo trabaja RealHunt");

    // ---------------------------------------------------------------- /how-we-check-homes (55)
    {
      const h1 = t("How we know a home is still for sale", "Cómo sabemos que una casa sigue a la venta");
      const answer = t(`Every night a program opens the original advert of each home and writes down what it finds. A home is marked as no longer for sale only when the advert is found removed on two different days, or when a visitor reports it. When the program cannot read an advert, a person checks it by hand, and a home that nobody could confirm for ${UNCONFIRMED_DAYS} days shows a notice on its page.`,
        `Cada noche un programa abre el anuncio original de cada casa y anota lo que encuentra. Una casa se marca como que ya no está a la venta solo cuando el anuncio aparece retirado dos días distintos, o cuando un visitante avisa. Cuando el programa no puede leer un anuncio, lo revisa una persona a mano, y una casa que nadie ha podido confirmar en ${UNCONFIRMED_DAYS} días lleva un aviso en su página.`);
      const fig: [string, number][] = [
        [t("Homes on RealHunt today", "Casas en RealHunt hoy"), st.n],
        [t(`Advert confirmed online in the last ${UNCONFIRMED_DAYS} days`, `Anuncio confirmado en los últimos ${UNCONFIRMED_DAYS} días`), st.recent],
        [t("Last reading: advert online", "Última lectura: anuncio publicado"), st.ok],
        [t("Last reading: advert removed", "Última lectura: anuncio retirado"), st.removedReading],
        [t("Last reading: the portal blocked the program", "Última lectura: el portal bloqueó el programa"), st.blocked],
        [t("Last reading: no answer", "Última lectura: sin respuesta"), st.error],
        [t("Not read by the program yet, or not readable (social posts)", "Aún sin leer por el programa, o ilegibles (publicaciones en redes)"), st.none],
        [t("Marked as no longer for sale", "Marcadas como que ya no están a la venta"), st.gone],
        [t(`With the notice "we could not confirm this home is still for sale"`, `Con el aviso «no hemos podido confirmar que siga a la venta»`), st.unconfirmed],
        [t("With a dated check by a person on their page", "Con una revisión fechada por una persona en su página"), st.person],
      ];
      const steps: [string, string][] = [
        [t("1. The nightly check reads every advert", "1. La revisión nocturna lee cada anuncio"),
          t(`Every night between midnight and 6 am (UTC), in small batches, a program opens the original advert of every home on the site that has one, at most once every 20 hours per home. It writes down one of four results: <strong>online</strong> (and the price, when the page publishes it in a machine-readable form), <strong>removed</strong> (the portal answers "not found", sends the visitor to a search or to its front page, or the advert says it is no longer available), <strong>blocked</strong> (the portal refuses programs: an "are you a robot?" page or a refusal) or <strong>no answer</strong>. Posts on social networks are not read: they need an account.`,
            `Cada noche, entre las 0 y las 6 (hora UTC) y por tandas pequeñas, un programa abre el anuncio original de cada casa de la web que lo tiene, como mucho una vez cada 20 horas por casa. Anota uno de cuatro resultados: <strong>publicado</strong> (y el precio, cuando la página lo publica de forma que una máquina lo pueda leer), <strong>retirado</strong> (el portal responde «no encontrado», manda al visitante a una búsqueda o a su portada, o el anuncio dice que ya no está disponible), <strong>bloqueado</strong> (el portal no deja entrar a programas: una página de «¿eres un robot?» o un rechazo) o <strong>sin respuesta</strong>. Las publicaciones en redes sociales no se leen: piden una cuenta.`)],
        [t("2. One reading changes nothing", "2. Una sola lectura no cambia nada"),
          t(`Every morning the last two readings of each home, taken on different days, are compared. Two "removed" readings mark the home as no longer for sale. Two "online" readings after that take the mark off again. When two readings on different days show the same new price in euros, between 1% and 50% away from ours, the price on RealHunt is updated and the change is kept in the home's price history. A reading that says "blocked" or "no answer" never changes a home.`,
            `Cada mañana se comparan las dos últimas lecturas de cada casa hechas en días distintos. Dos lecturas de «retirado» marcan la casa como que ya no está a la venta. Dos lecturas de «publicado» después le quitan la marca. Cuando dos lecturas de días distintos dan el mismo precio nuevo en euros, a entre un 1 % y un 50 % del nuestro, el precio de RealHunt se actualiza y el cambio queda en el historial de precios de la casa. Una lectura de «bloqueado» o «sin respuesta» no cambia nunca una casa.`)],
        [t("3. Visitors can tell us", "3. Los visitantes pueden avisarnos"),
          t("Each home's page lets a visitor report that it is sold or that it is still available. A home counts as no longer for sale when there is at least one such report and more of them than reports that it is still available. The nightly check files its reports in the same way.",
            "La página de cada casa permite a un visitante avisar de que está vendida o de que sigue disponible. Una casa cuenta como que ya no está a la venta cuando hay al menos un aviso así y hay más que avisos de que sigue disponible. La revisión nocturna deja sus avisos de la misma manera.")],
        [t("4. A person checks what the program cannot read", "4. Una persona revisa lo que el programa no puede leer"),
          t(`Some portals block programs, and some homes come from posts on social networks. For those, a person opens the advert by hand. When a person has checked a home, its page says so with the date: "Checked by a person on …".`,
            `Algunos portales bloquean a los programas, y algunas casas vienen de publicaciones en redes sociales. En esos casos, una persona abre el anuncio a mano. Cuando una persona ha revisado una casa, su página lo dice con la fecha: «Comprobada por una persona el …».`)],
        [t(`5. A notice after ${UNCONFIRMED_DAYS} days without confirmation`, `5. Un aviso tras ${UNCONFIRMED_DAYS} días sin confirmar`),
          t(`A home whose advert has not been confirmed online in the last ${UNCONFIRMED_DAYS} days, and whose last reading was not "online", shows the notice "We could not confirm this home is still for sale", with the last day it was seen online, and goes after the other homes in the lists. Homes on RealHunt for less than 4 days are not marked: they may not have been read yet.`,
            `Una casa cuyo anuncio no se ha confirmado publicado en los últimos ${UNCONFIRMED_DAYS} días, y cuya última lectura no fue «publicado», muestra el aviso «No hemos podido confirmar que siga a la venta», con el último día en que se vio publicado, y pasa detrás de las demás casas en las listas. Las casas que llevan menos de 4 días en RealHunt no se marcan: puede que aún no se hayan leído.`)],
        [t("6. What the page of a home no longer for sale says", "6. Qué dice la página de una casa que ya no está a la venta"),
          t(`We never write "sold" as a fact: we write that the original advert is no longer online, which is what was seen. The page stays, so the price and the area can still be compared, with similar homes below it. Its structured data stops saying "in stock", and the home leaves the email alerts. Every change is in the <a href="/research/removed-homes">log of homes taken off the site</a>.`,
            `Nunca escribimos «vendida» como un hecho: escribimos que el anuncio original ya no está publicado, que es lo que se vio. La página se queda, para que se pueda seguir comparando el precio y la zona, con casas parecidas debajo. Sus datos estructurados dejan de decir «disponible» y la casa sale de las alertas por correo. Cada cambio queda en el <a href="/research/removed-homes">registro de casas retiradas de la web</a>.`)],
      ];
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>` + updated
        + `<h2>${esc(t("Today's figures", "Las cifras de hoy"))}</h2>` + table([{ h: t("What", "Qué"), cls: "w" }, { h: t("Homes", "Casas"), cls: "n" }], fig.map(([a, b]) => [esc(a), k.num(b)]), t("Today's figures", "Las cifras de hoy"), true)
        + `<p class="rhx-note">${esc(t(`Computed from the homes on the site on ${k.date(c.today)}. "Last reading" is the result of the last time the program opened the advert.`, `Calculado con las casas de la web a ${k.date(c.today)}. «Última lectura» es el resultado de la última vez que el programa abrió el anuncio.`))}</p>`
        + steps.map(([h, p]) => `<h2>${esc(h)}</h2><p>${p}</p>`).join("")
        + `<h2>${esc(t("What you should still do", "Lo que conviene hacer igualmente"))}</h2><p>${esc(t("Adverts change every day and a check made last night can be out of date this morning. Ask the agent or the seller before you plan a visit or send money.", "Los anuncios cambian cada día y una revisión de anoche puede estar desfasada esta mañana. Pregunta a la agencia o al vendedor antes de organizar una visita o de enviar dinero."))}</p>`
        + `<p>${t(`Seen a home that is sold? Use the button on its page, or write to ${mail}.`, `¿Has visto una casa vendida? Usa el botón de su página o escribe a ${mail}.`)}</p>`;
      put("/how-we-check-homes", h1, t(`How RealHunt checks every night that its ${k.num(st.n)} homes are still for sale: the reading of each advert, the two-day rule, the hand check and the notice after ${UNCONFIRMED_DAYS} days.`, `Cómo comprueba RealHunt cada noche que sus ${k.num(st.n)} casas siguen a la venta: la lectura de cada anuncio, la regla de los dos días, la revisión a mano y el aviso a los ${UNCONFIRMED_DAYS} días.`),
        { eyebrow, h1, body });
    }

    // ---------------------------------------------------------------- /what-we-reject (56)
    {
      const h1 = t("Which homes we reject and why", "Qué casas rechazamos y por qué");
      const answer = t("A person looks at every home before it goes up. A home is turned down when it is not a whole home for sale, when its price is not good for its area, when it needs more than light work, when its photos are poor, when it sits next to noise or industry, when the advert leaves out the basic facts, or when its running costs are too high for the price. All the rules below must hold.",
        "Una persona mira cada casa antes de publicarla. Una casa se rechaza cuando no es una vivienda entera en venta, cuando su precio no es bueno para la zona, cuando necesita más que una reforma ligera, cuando sus fotos son malas, cuando está junto a ruido o industria, cuando el anuncio no da los datos básicos o cuando sus gastos fijos son demasiado altos para el precio. Tienen que cumplirse todas las reglas de abajo.");
      const rules: [string, string[]][] = [
        [t("A whole home, for sale, at a stated price", "Una vivienda entera, en venta, con precio"), [
          t("Turned down: homes for rent, auctions, shared ownership, plots of land, ruins, single rooms, timeshare, leaseholds with few years left and adverts with \"price on request\".", "Se rechazan: casas en alquiler, subastas, propiedad compartida, solares, ruinas, habitaciones sueltas, multipropiedad, arrendamientos de larga duración a los que les quedan pocos años y anuncios con «precio a consultar»."),
          t(`Resale homes only. Projects sold off plan are not in the main list; new builds have their own <a href="/top">Top 100 rankings</a>.`, `Solo casas de segunda mano. Las promociones sobre plano no entran en la lista principal; la obra nueva tiene sus propias <a href="/top">clasificaciones Top 100</a>.`)]],
        [t("A price that is good for the area", "Un precio bueno para la zona"), [
          t("The price must make a foreign buyer stop: clearly good value for that place. As a guide, most homes cost between €30,000 and €200,000; up to about €350,000 only where that is cheap for the place, such as large cities in the United States or the Netherlands, Switzerland, or a sea view in Cyprus.", "El precio tiene que hacer que un comprador extranjero se pare: claramente bueno para ese lugar. Como orientación, la mayoría de las casas cuestan entre 30.000 y 200.000 €; hasta unos 350.000 € solo donde eso es barato para el lugar, como las grandes ciudades de Estados Unidos o de los Países Bajos, Suiza o una casa con vistas al mar en Chipre."),
          t("Prices in another currency are converted to euros, and the original price is given in the description.", "Los precios en otra moneda se pasan a euros, y el precio original se indica en la descripción.")]],
        [t("Ready to live in, or with light work", "Lista para vivir, o con una reforma ligera"), [
          t("Turned down: homes that need structural work or a new roof, homes with damp, cracks or fire damage, homes with squatters or tenants who cannot be moved, homes with legal problems, and adverts that say \"investors only\", \"cash only\" or \"as is\".", "Se rechazan: casas que necesitan obra estructural o un tejado nuevo, casas con humedades, grietas o daños de incendio, casas ocupadas o con inquilinos a los que no se puede sacar, casas con problemas legales y anuncios que dicen «solo inversores», «solo al contado» o «tal cual».")]],
        [t("Real photos, inside and out", "Fotos reales, por dentro y por fuera"), [
          t("At least 6 real, sharp, well-lit photos that show the outside and the inside, with the kitchen or a bathroom.", "Al menos 6 fotos reales, nítidas y con buena luz que muestren el exterior y el interior, con la cocina o un baño."),
          t("Turned down: renders, images made or heavily retouched by a computer, photos with large watermarks, and adverts with a single photo.", "Se rechazan: imágenes generadas por ordenador, fotos hechas o muy retocadas con un programa, fotos con marcas de agua grandes y anuncios con una sola foto.")]],
        [t("No noise, no industry", "Sin ruido ni industria"), [
          t("Turned down: homes next to a motorway, a railway, an industrial plant or an airport runway, and homes in a flood plain when the advert says so. Sea, lakes, mountains, historic centres and pleasant villages with services are preferred.", "Se rechazan: casas junto a una autopista, una vía de tren, una fábrica o la pista de un aeropuerto, y casas en zona inundable cuando el anuncio lo dice. Se prefieren el mar, los lagos, la montaña, los cascos históricos y los pueblos agradables con servicios."),
          t(`After a home goes up, its flood and noise indicators are shown on its page with their sources (<a href="/research/flood-indicator">flood indicator by country</a>).`, `Cuando una casa ya está publicada, sus indicadores de inundación y de ruido aparecen en su página con sus fuentes (<a href="/research/flood-indicator">indicador de inundación por país</a>).`)]],
        [t("The basic facts in the advert", "Los datos básicos en el anuncio"), [
          t("The advert must state the size, the number of bedrooms, the exact town and the price. A home whose advert leaves one of them out is not published.", "El anuncio tiene que indicar la superficie, el número de dormitorios, la localidad exacta y el precio. No se publica una casa cuyo anuncio omite alguno de ellos.")]],
        [t("Running costs that fit the price", "Gastos fijos acordes con el precio"), [
          t("When the advert states community or owners' association fees, ground rent or the yearly tax, they are written at the end of the description. Homes with very high fees for their price are turned down, and so are communities restricted by age (55 and over).", "Cuando el anuncio indica las cuotas de comunidad, el alquiler del suelo o el impuesto anual, se escriben al final de la descripción. Se rechazan las casas con cuotas muy altas para su precio, y también las urbanizaciones reservadas por edad (mayores de 55 años).")]],
        [t("An advert we can keep checking", "Un anuncio que podamos seguir revisando"), [
          t(`Since 19 November 2026, a new home must come from a portal that our nightly check can read, so we can keep confirming that it is still for sale (<a href="/how-we-check-homes">how we check</a>).`, `Desde el 19 de noviembre de 2026, una casa nueva tiene que venir de un portal que nuestra revisión nocturna pueda leer, para poder seguir confirmando que sigue a la venta (<a href="/how-we-check-homes">cómo lo comprobamos</a>).`)]],
        [t("Variety", "Variedad"), [
          t("Each round of new homes takes at most 2 homes from the same town, and mixes towns and types of home.", "Cada tanda de casas nuevas incluye como mucho 2 casas de la misma localidad, y mezcla lugares y tipos de vivienda.")]],
      ];
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>` + updated
        + rules.map(([h, ps]) => `<h2>${esc(h)}</h2>` + ul(ps)).join("")
        + `<h2>${esc(t("How the description is written", "Cómo se escribe la descripción"))}</h2>` + ul([
          t("In our own words, never copied from the advert, and only with facts stated in the advert or visible in the photos.", "Con palabras propias, nunca copiadas del anuncio, y solo con datos que dice el anuncio o que se ven en las fotos."),
          t("No promises about rent or returns, no \"guaranteed\", no distances we did not measure, no phone numbers.", "Sin promesas de alquiler ni de rentabilidad, sin «garantizado», sin distancias que no hayamos medido y sin teléfonos."),
          t("No words like \"bargain\", \"investment\" or \"must see\" in the title.", "Sin palabras como «chollo», «inversión» u «oportunidad única» en el título.")].map(esc))
        + `<h2>${esc(t("What we do not publish", "Lo que no publicamos"))}</h2><p>${esc(t("We do not keep a count of the homes we turn down, so we give none. What we do publish is what happens to a home after it goes up: the homes taken off the site and the homes whose advert went offline, day by day.", "No llevamos la cuenta de las casas que rechazamos, así que no damos ninguna cifra. Lo que sí publicamos es lo que pasa con una casa después de publicarla: las casas retiradas de la web y las casas cuyo anuncio dejó de estar publicado, día a día."))} <a href="/research/removed-homes">${esc(t("Homes taken off the site", "Casas retiradas de la web"))}</a>.</p>`;
      put("/what-we-reject", h1, t("The rules a home must meet before a person puts it on RealHunt: a whole home for sale, a good price for the area, light work at most, real photos, no noise, the basic facts and fair running costs.", "Las reglas que debe cumplir una casa antes de que una persona la publique en RealHunt: vivienda entera en venta, buen precio para la zona, reforma ligera como mucho, fotos reales, sin ruido, los datos básicos y gastos razonables."),
        { eyebrow, h1, body });
    }

    // ---------------------------------------------------------------- /what-we-never-do (91)
    {
      const h1 = t("What we never do", "Lo que nunca hacemos");
      const items: [string, string][] = [
        [t("No false urgency", "Sin urgencias falsas"), t(`No countdowns, no "only a few left", no offers that end on a date we made up. A home is on the site until its advert goes, and we say so when it does.`, "Ni cuentas atrás, ni «quedan pocas», ni ofertas que caducan en una fecha inventada. Una casa está en la web hasta que su anuncio desaparece, y lo decimos cuando pasa.")],
        [t("No invented reviews or stars", "Sin reseñas ni estrellas inventadas"), t("We publish no reviews and no star ratings, and our pages carry no review markup for search engines. The score is our own grade, and it says so.", "No publicamos reseñas ni valoraciones con estrellas, y nuestras páginas no llevan marcado de reseñas para los buscadores. La nota es una calificación propia, y así lo decimos.")],
        [t("No promised returns or rents", "Sin rentabilidades ni alquileres prometidos"), t("No text says a price will rise or that a home will earn a given rent. Where we give rental tax rules, they are general information.", "Ningún texto dice que un precio vaya a subir o que una casa vaya a dar un alquiler concreto. Cuando damos las normas fiscales del alquiler, son información general.")],
        [t("No paid places", "Sin puestos de pago"), t("Nobody pays to be listed or to rank higher, and a score cannot be bought. Our founder's own project is labelled as such and never takes part in any ranking.", "Nadie paga por aparecer ni por subir puestos, y una nota no se puede comprar. El proyecto de nuestro fundador va señalado como tal y nunca entra en ninguna clasificación.")],
        [t("No fees from buyers", "Sin cobrar a los compradores"), t(`Buyers pay nothing, and we do not sell the resale homes we list: each one links to its original advert (<a href="/how-we-make-money">how we make money</a>).`, `Los compradores no pagan nada, y no vendemos las casas de segunda mano que publicamos: cada una enlaza con su anuncio original (<a href="/how-we-make-money">cómo ganamos dinero</a>).`)],
        [t("No phone numbers", "Sin teléfonos"), t(`We publish no phone numbers and no messaging links. You reach us by email: ${mail}.`, `No publicamos teléfonos ni enlaces de mensajería. Se nos escribe por correo: ${mail}.`)],
        [t(`No "sold" we did not see`, "Sin «vendida» que no hayamos visto"), t(`When an advert disappears we say it is no longer online, not that the home was sold (<a href="/how-we-check-homes">how we check</a>).`, `Cuando un anuncio desaparece decimos que ya no está publicado, no que la casa se haya vendido (<a href="/how-we-check-homes">cómo lo comprobamos</a>).`)],
        [t("No figure without a source", "Sin cifras sin fuente"), t(`Prices and counts come from the homes on the site; rules, taxes and costs from the sources linked on each page. A figure we could not find in a source is left blank, not guessed (<a href="/editorial-policy">editorial policy</a>).`, `Los precios y los recuentos salen de las casas de la web; las normas, los impuestos y los gastos, de las fuentes enlazadas en cada página. Una cifra que no encontramos en una fuente se deja en blanco, no se adivina (<a href="/editorial-policy">política editorial</a>).`)],
        [t("No inflated numbers", "Sin cifras infladas"), t(`We say how many homes there are: ${k.num(rows.length)} today. Not "thousands".`, `Decimos cuántas casas hay: ${k.num(rows.length)} hoy. No «miles».`)],
        [t("No photos passed off as ours", "Sin fotos ajenas como propias"), t("The photos belong to the original adverts. We do not license them and we do not retouch them to make a home look better.", "Las fotos pertenecen a los anuncios originales. No las licenciamos ni las retocamos para que una casa parezca mejor.")],
      ];
      const body = `<div class="rhx-answer"><p>${esc(t("RealHunt never invents urgency, reviews, returns or numbers, never sells a place in a list, never charges buyers and never publishes a phone number. The build of the site checks every page for false urgency, promised returns, phone numbers and review markup, and reports what it finds.", "RealHunt nunca se inventa urgencias, reseñas, rentabilidades ni cifras, nunca vende un puesto en una lista, nunca cobra a los compradores y nunca publica un teléfono. La generación de la web revisa cada página en busca de urgencias falsas, rentabilidades prometidas, teléfonos y marcado de reseñas, y avisa de lo que encuentra."))}</p></div>` + updated
        + items.map(([h, p]) => `<h2>${esc(h)}</h2><p>${p}</p>`).join("")
        + `<p>${t(`Seen one of these on RealHunt? Tell us at ${mail} and we will fix it and note it in the <a href="/corrections">corrections</a>.`, `¿Has visto algo de esto en RealHunt? Avísanos en ${mail}: lo arreglaremos y lo anotaremos en las <a href="/corrections">correcciones</a>.`)}</p>`;
      put("/what-we-never-do", h1, t("The rules RealHunt keeps on every page: no false urgency, no invented reviews, no promised returns, no paid places, no fees from buyers, no phone numbers, no figures without a source.", "Las normas que RealHunt cumple en cada página: sin urgencias falsas, sin reseñas inventadas, sin rentabilidades prometidas, sin puestos de pago, sin cobrar a compradores, sin teléfonos y sin cifras sin fuente."),
        { eyebrow, h1, body });
    }

    // ---------------------------------------------------------------- /how-we-make-money (92)
    {
      const h1 = t("How RealHunt makes money", "Cómo gana dinero RealHunt");
      const body = `<div class="rhx-answer"><p>${esc(t("Buyers pay nothing. RealHunt earns a fee only from developers of new-build projects, and only when a buyer it introduced buys. It takes no money for the resale homes it lists, for a place in a list or for a score.", "Los compradores no pagan nada. RealHunt solo cobra una comisión a los promotores de obra nueva, y solo cuando compra un comprador que RealHunt les presentó. No cobra por las casas de segunda mano que publica, ni por un puesto en una lista, ni por una nota."))}</p></div>` + updated
        + `<h2>${esc(t("Where the money comes from", "De dónde sale el dinero"))}</h2>` + ul([
          t(`New-build projects: in the <a href="/top">Top 100 rankings</a> (Bali, Phuket, Koh Samui, Tulum and Batumi), RealHunt can earn a fee from the developer if a buyer it introduced buys. The ranking is computed the same way for every project, paying or not (<a href="/top/how-we-rank">how the ranking works</a>).`, `Obra nueva: en las <a href="/top">clasificaciones Top 100</a> (Bali, Phuket, Koh Samui, Tulum y Batumi), RealHunt puede cobrar una comisión al promotor si compra un comprador que RealHunt le presentó. La clasificación se calcula igual para todos los proyectos, paguen o no (<a href="/top/how-we-rank">cómo funciona la clasificación</a>).`),
        ])
        + `<h2>${esc(t("Where it does not come from", "De dónde no sale"))}</h2>` + ul([
          t("Buyers: searching, saving homes, alerts, guides, data and calculators are free.", "Los compradores: buscar, guardar casas, las alertas, las guías, los datos y las calculadoras son gratis."),
          t("Resale homes: RealHunt is not an estate agent, does not sell them and takes no commission. Each home links to its original advert, and you deal with the seller or the agent directly.", "Las casas de segunda mano: RealHunt no es una inmobiliaria, no las vende y no cobra comisión. Cada casa enlaza con su anuncio original, y tratas directamente con el vendedor o la agencia."),
          t("Places and scores: nobody pays to be listed or to rank higher.", "Los puestos y las notas: nadie paga por aparecer ni por subir puestos."),
        ])
        + `<h2>${esc(t("Our founder's project", "El proyecto de nuestro fundador"))}</h2><p>${t(`One card on the site shows Eco Beach City in Sumba, Indonesia, a project of our founder. It is labelled "Our founder's project" and never takes part in any ranking. <a href="/about">Who we are</a>.`, `Una tarjeta de la web muestra Eco Beach City, en Sumba (Indonesia), un proyecto de nuestro fundador. Va señalada como «proyecto de nuestro fundador» y nunca entra en ninguna clasificación. <a href="/about">Quiénes somos</a>.`)}</p>`
        + `<h2>${esc(t("Who is behind it", "Quién está detrás"))}</h2><p>${t(`RealHunt is run by Equinox Investment Group LLC (Sheridan, Wyoming, United States). Questions: ${mail}.`, `RealHunt pertenece a Equinox Investment Group LLC (Sheridan, Wyoming, Estados Unidos). Dudas: ${mail}.`)}</p>`;
      put("/how-we-make-money", h1, t("Short and plain: buyers pay nothing, resale homes bring RealHunt no commission, and the only fee comes from new-build developers when a buyer we introduced buys.", "Breve y claro: los compradores no pagan nada, las casas de segunda mano no le dan comisión a RealHunt y la única comisión llega de promotores de obra nueva cuando compra un comprador que presentamos."),
        { eyebrow, h1, body });
    }

    // ---------------------------------------------------------------- /corrections (95)
    {
      const h1 = t("Corrections and changes, with their dates", "Correcciones y cambios, con su fecha");
      const prices = events.filter((e) => e.kind === "price" && e.old_price_eur && e.price_eur).slice().reverse();
      const title = (e: RemovedEvent) => String(es ? e.title_es || e.location_name || e.slug : e.title || e.slug).replace(/\s+/g, " ").trim();
      const homeCell = (e: RemovedEvent) => (onSite.has(e.slug) ? `<a href="/deal/${esc(e.slug)}">${esc(title(e))}</a>` : esc(title(e)));
      const body = `<div class="rhx-answer"><p>${esc(t("When we find that something we published was wrong or out of date, we change the page and its date, and we write the change here. This page lists the price changes of homes, the changes to the method and the corrections reported to us.", "Cuando vemos que algo que publicamos estaba mal o desfasado, cambiamos la página y su fecha, y anotamos el cambio aquí. Esta página recoge los cambios de precio de las casas, los cambios del método y las correcciones que nos han comunicado."))}</p></div>` + updated
        + `<h2>${esc(t("Prices changed to match the advert", "Precios cambiados para coincidir con el anuncio"))}</h2>`
        + (prices.length ? `<p>${esc(t(`The asking price on RealHunt changed for these homes: the nightly check read a new price in the original advert on two different days, or a person corrected it. Newest first (${k.num(prices.length)}).`, `El precio de salida en RealHunt cambió en estas casas: la revisión nocturna leyó un precio nuevo en el anuncio original dos días distintos, o una persona lo corrigió. De la más reciente a la más antigua (${k.num(prices.length)}).`))}</p>`
          + table([{ h: t("Date", "Fecha") }, { h: t("Home", "Casa"), cls: "w" }, { h: t("Before", "Antes"), cls: "n" }, { h: t("After", "Después"), cls: "n" }], prices.map((e) => [`<time datetime="${e.date}">${esc(k.date(e.date))}</time>`, homeCell(e), k.eur(e.old_price_eur!), k.eur(e.price_eur!)]), t("Prices changed", "Precios cambiados"), true)
          : `<p>${esc(t("No price has changed since the log began on 24 October 2026.", "Ningún precio ha cambiado desde que empezó el registro, el 24 de octubre de 2026."))}</p>`)
        + `<h2>${esc(t("Changes to how the score works", "Cambios en el funcionamiento de la nota"))}</h2><p>${t(`The method has its own dated change log; the current version is of <time datetime="${METHOD_VERSION}">${esc(k.date(METHOD_VERSION))}</time>. <a href="/method">How the score works</a>.`, `El método tiene su propio registro de cambios con fecha; la versión vigente es del <time datetime="${METHOD_VERSION}">${esc(k.date(METHOD_VERSION))}</time>. <a href="/method">Cómo funciona la nota</a>.`)}</p>`
        + `<h2>${esc(t("Corrections to studies, guides and rules", "Correcciones en estudios, guías y normas"))}</h2><p>${esc(t("A correction to a figure in a study, a step in a guide or a buying rule is written here with its date and what changed. None has been recorded in this log yet.", "Una corrección de una cifra de un estudio, de un paso de una guía o de una norma de compra se anota aquí con su fecha y lo que cambió. Todavía no se ha anotado ninguna en este registro."))}</p>`
        + `<h2>${esc(t("Homes taken off the site", "Casas retiradas de la web"))}</h2><p>${t(`Homes that left the site, or whose advert went offline, are in their own log: <a href="/research/removed-homes">homes taken off the site, month by month</a>.`, `Las casas que salieron de la web, o cuyo anuncio dejó de estar publicado, tienen su propio registro: <a href="/research/removed-homes">casas retiradas de la web, mes a mes</a>.`)}</p>`
        + `<h2>${esc(t("Report an error", "Avisar de un error"))}</h2><p>${t(`Write to ${mail} with the page and what is wrong. For a home that is sold or wrongly described, the button on its page is the fastest way.`, `Escribe a ${mail} con la página y qué está mal. Si una casa está vendida o mal descrita, lo más rápido es el botón de su página.`)}</p>`;
      put("/corrections", h1, t("Every correction and change to what RealHunt published, with its date: prices changed to match the advert, changes to the method and corrections reported to us.", "Cada corrección y cambio de lo que publicó RealHunt, con su fecha: precios cambiados para coincidir con el anuncio, cambios del método y correcciones comunicadas."),
        { eyebrow: t("Trust", "Confianza"), h1, body, lastmod: prices[0]?.date && prices[0].date > METHOD_VERSION ? prices[0].date : METHOD_VERSION });
    }

    // ---------------------------------------------------------------- /research/removed-homes (100)
    {
      const h1 = t("Homes taken off the site, month by month", "Casas retiradas de la web, mes a mes");
      const log = events.filter((e) => e.kind !== "price").slice().reverse();
      const months = [...new Set(log.map((e) => e.date.slice(0, 7)))];
      const title = (e: RemovedEvent) => String(es ? e.title_es || e.location_name || e.slug : e.title || e.slug).replace(/\s+/g, " ").trim();
      const what = (e: RemovedEvent) => e.kind === "gone" ? t("Advert no longer online (found removed on two different days, or reported by a visitor). The page stays.", "El anuncio ya no está publicado (apareció retirado dos días distintos, o lo avisó un visitante). La página se queda.")
        : e.kind === "back" ? t("Back on the site, or its advert is online again.", "Vuelve a la web, o su anuncio vuelve a estar publicado.")
          : e.was_gone ? t("Taken off the site after its advert went offline.", "Retirada de la web después de que su anuncio dejara de estar publicado.") : t("Taken off the site. No reason is recorded in the public data.", "Retirada de la web. Los datos públicos no recogen el motivo.");
      const cell = (e: RemovedEvent) => (onSite.has(e.slug) ? `<a href="/deal/${esc(e.slug)}">${esc(title(e))}</a>` : esc(title(e))) + `<br><small>${esc([e.location_name || (e.country ? k.country(e.country) : ""), e.price_eur ? k.eur(e.price_eur) : ""].filter(Boolean).join(" · "))}</small>`;
      const count = (m: string, kind: string) => log.filter((e) => e.date.startsWith(m) && e.kind === kind).length;
      const totalGone = log.filter((e) => e.kind === "gone").length, totalRemoved = log.filter((e) => e.kind === "removed").length;
      const answer = log.length
        ? t(`Since 24 October 2026, ${k.num(totalGone)} homes were marked as no longer for sale because their advert went offline, and ${k.num(totalRemoved)} homes were taken off the site. Today ${k.num(st.gone)} of the ${k.num(st.n)} homes on RealHunt carry the notice that their advert is no longer online.`,
          `Desde el 24 de octubre de 2026, ${k.num(totalGone)} casas se marcaron como que ya no están a la venta porque su anuncio dejó de estar publicado, y ${k.num(totalRemoved)} casas se retiraron de la web. Hoy, ${k.num(st.gone)} de las ${k.num(st.n)} casas de RealHunt llevan el aviso de que su anuncio ya no está publicado.`)
        : t("No home has been taken off the site since the log began on 24 October 2026.", "Ninguna casa se ha retirado de la web desde que empezó el registro, el 24 de octubre de 2026.");
      const body = `<div class="rhx-answer"><p>${esc(answer)}</p></div>` + updated
        + (months.length ? `<h2>${esc(t("Month by month", "Mes a mes"))}</h2>` + table([{ h: t("Month", "Mes") }, { h: t("Advert offline", "Anuncio retirado"), cls: "n" }, { h: t("Taken off the site", "Retiradas de la web"), cls: "n" }, { h: t("Back", "Vuelven"), cls: "n" }],
          months.map((m) => [esc(monthName(k, m)), k.num(count(m, "gone")), k.num(count(m, "removed")), k.num(count(m, "back"))]), t("Month by month", "Mes a mes")) : "")
        + months.map((m) => `<h2 id="m${m}">${esc(monthName(k, m))}</h2>` + table([{ h: t("Date", "Fecha") }, { h: t("Home", "Casa"), cls: "w" }, { h: t("What happened", "Qué pasó"), cls: "w" }],
          log.filter((e) => e.date.startsWith(m)).map((e) => [`<time datetime="${e.date}">${esc(k.date(e.date))}</time>`, cell(e), esc(what(e))]), monthName(k, m), true)).join("")
        + `<h2>${esc(t("How this log is made", "Cómo se hace este registro"))}</h2>` + ul([
          t(`The date is the day the change reached the site's daily data. A home is marked as no longer for sale by the rules in <a href="/how-we-check-homes">how we know a home is still for sale</a>.`, `La fecha es el día en que el cambio llegó a los datos diarios de la web. Una casa se marca como que ya no está a la venta según las reglas de <a href="/how-we-check-homes">cómo sabemos que una casa sigue a la venta</a>.`),
          t("The log starts on 24 October 2026, the first day of daily data kept for the site.", "El registro empieza el 24 de octubre de 2026, el primer día de datos diarios guardados de la web."),
          t(`The same log as files: <a href="/research/removed-homes.json">JSON</a> and <a href="/research/removed-homes.csv">CSV</a> (Creative Commons BY 4.0). Price changes are in the <a href="/corrections">corrections</a>.`, `El mismo registro en archivos: <a href="/research/removed-homes.json">JSON</a> y <a href="/research/removed-homes.csv">CSV</a> (Creative Commons BY 4.0). Los cambios de precio están en las <a href="/corrections">correcciones</a>.`),
          t(`Homes added day by day are in <a href="/research/data-changelog">what changed in the data</a>.`, `Las casas añadidas día a día están en <a href="/research/data-changelog">novedades en los datos</a>.`)]);
      put("/research/removed-homes", h1, t("Every home taken off RealHunt, or whose advert went offline, month by month, with the date and what happened. JSON and CSV.", "Cada casa retirada de RealHunt, o cuyo anuncio dejó de estar publicado, mes a mes, con la fecha y lo que pasó. En JSON y CSV."),
        { eyebrow: t("Data log", "Registro de datos"), h1, body, crumbs: [["RealHunt", "/"], [t("Data", "Datos"), "/research"], [h1, "/research/removed-homes"]], lastmod: log[0]?.date || c.today,
          ld: [{ "@context": "https://schema.org", "@type": "Dataset", name: h1, description: answer, url: k.url("/research/removed-homes"), license: LICENSE, creator: ORG, dateModified: c.today, temporalCoverage: `2026-10-24/${c.today}`,
            distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/research/removed-homes.json` }, { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE}/research/removed-homes.csv` }] }] });
    }
  }
  return { pages, events: events.length };
}
