// Sourced notes on listing pages (15-nov-2026): the thing a buyer has to know before looking at homes in a country
// (a permit, a ban, a yearly fee), said once, with the official page it comes from and the month it was checked.
//
// Rules: a note is only here if its source was opened and says what the note says; every note names its source and
// its date on the page; it is general information, never advice; and it is shown only on the pages whose homes it is
// about (`on`). Facts that src/data already holds (destinations.json) stay there: the pages print them in "Buying
// costs and rules for foreigners".
import type { Facts } from "./facts";
import type { Note } from "./page";

type Def = {
  id: string;
  /** Which pages carry it. */
  on: (F: Facts) => boolean;
  en: { h: string; p: string[] };
  es: { h: string; p: string[] };
  /** [name in English, address, name in Spanish]: the Spanish page names the source in Spanish. */
  sources: [name: string, url: string, nameEs: string][];
  asOf: string; // "2026-11"
};
const country = (cc: string) => (F: Facts) => F.f.cc === cc && F.f.kind === "country";

export const NOTES: Def[] = [
  {
    id: "bulgaria-euro", on: country("bulgaria"), asOf: "2026-11",
    sources: [["European Central Bank, Bulgaria joins the euro area", "https://www.ecb.europa.eu/euro/changeover/bulgaria/html/index.en.html", "Banco Central Europeo, Bulgaria entra en la zona del euro"]],
    en: { h: "Bulgaria has used the euro since 1 January 2026", p: [
      "Bulgaria joined the euro area on 1 January 2026 at the fixed rate of 1.95583 leva per euro, and since 1 February 2026 the euro has been the only legal tender. An older listing that still shows a price in leva converts at that fixed rate, and a buyer who already holds euros has no exchange cost on the purchase.",
      "Leva could be exchanged free of charge at commercial banks and some post offices in Bulgaria until 30 June 2026. The Bulgarian National Bank still exchanges them free of charge, with no time limit.",
    ] },
    es: { h: "Bulgaria usa el euro desde el 1 de enero de 2026", p: [
      "Bulgaria entró en la zona del euro el 1 de enero de 2026 con un tipo fijo de 1,95583 levas por euro, y desde el 1 de febrero de 2026 el euro es la única moneda de curso legal. Un anuncio antiguo que aún dé el precio en levas se convierte a ese tipo fijo, y quien ya tiene euros no paga cambio de moneda en la compra.",
      "Las levas se pudieron cambiar sin comisión en los bancos comerciales y en algunas oficinas de correos de Bulgaria hasta el 30 de junio de 2026. El Banco Nacional de Bulgaria las sigue cambiando sin comisión y sin fecha límite.",
    ] },
  },
  {
    id: "spain-nie-residence", on: country("spain"), asOf: "2026-11",
    sources: [["Ministry of Foreign Affairs of Spain, Número de Identidad de Extranjero (NIE)", "https://www.exteriores.gob.es/Consulados/miami/es/ServiciosConsulares/Paginas/index.aspx?scca=Pasaportes+y+otros+documentos&scco=Estados+Unidos&scd=196&scs=N%C3%BAmero+de+Identidad+de+Extranjero+%28NIE%29", "Ministerio de Asuntos Exteriores, Número de Identidad de Extranjero (NIE)"],
      ["La Moncloa, el 3 de abril entra en vigor el fin de las Golden Visa", "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/vivienda-agenda-urbana/paginas/2025/020425-fin-golden-visa.aspx", "La Moncloa, el 3 de abril entra en vigor el fin de las Golden Visa"]],
    en: { h: "Before you buy in Spain: the NIE, and no residence permit for buying", p: [
      "A foreign buyer needs a NIE, the personal number Spain gives to foreigners who have economic, professional or social interests in the country. You can ask for it in Spain or at the Spanish consulate where you live, in person or through an accredited representative, with form EX-15 and your passport. The NIE is not a residence permit and does not prove residence.",
      "Buying a home no longer gives a residence permit: Organic Law 1/2025 ended the investor visas on 3 April 2025, including the one for property purchases above €500,000.",
    ] },
    es: { h: "Antes de comprar en España: el NIE, y comprar ya no da residencia", p: [
      "Un comprador extranjero necesita un NIE, el número personal que España asigna a los extranjeros que se relacionan con el país por sus intereses económicos, profesionales o sociales. Se puede pedir en España o en el consulado español del lugar donde vives, en persona o mediante un representante acreditado, con el impreso EX-15 y el pasaporte. El NIE no es un permiso de residencia ni acredita la residencia.",
      "Comprar una vivienda ya no da permiso de residencia: la Ley Orgánica 1/2025 puso fin a los visados para inversores el 3 de abril de 2025, incluido el de compra de inmuebles por más de 500.000 €.",
    ] },
  },
  {
    id: "sweden-bidding", on: country("sweden"), asOf: "2026-11",
    sources: [["Fastighetsmäklarinspektionen (Swedish Estate Agents Inspectorate), Budgivning", "https://fmi.se/vad-galler-vid-formedling/budgivning/", "Fastighetsmäklarinspektionen (inspección sueca de agentes inmobiliarios), Budgivning"]],
    en: { h: "How bidding works in Sweden, and why the asking price is only a start", p: [
      "In Sweden a bid binds nobody, not even when it is made in writing. The seller does not have to sell to the highest bidder, or at the price shown in the advert. The sale is binding only when buyer and seller have both signed the purchase contract.",
      "The estate agent must pass every bid on to the seller until the contract is signed and keep a list of the bids with each bidder's name, amount and time, which buyer and seller receive when the sale is completed. So the asking prices on this page are where the bidding may start, not what the homes will sell for.",
    ] },
    es: { h: "Cómo funciona la puja en Suecia y por qué el precio de salida es solo el principio", p: [
      "En Suecia una oferta no obliga a nadie, ni siquiera si se hace por escrito. El vendedor no tiene por qué vender a quien más ofrece ni al precio del anuncio. La venta solo es firme cuando comprador y vendedor han firmado el contrato de compraventa.",
      "El agente inmobiliario debe trasladar todas las ofertas al vendedor hasta que se firme el contrato y llevar una lista de las pujas con el nombre, el importe y la hora de cada una, que comprador y vendedor reciben al cerrar la venta. Por eso los precios de esta página son el punto de partida de la puja, no el precio al que se venderán las viviendas.",
    ] },
  },
  {
    id: "uk-non-resident-surcharge", on: country("united-kingdom"), asOf: "2026-11",
    sources: [["GOV.UK, Rates of Stamp Duty Land Tax for non-UK residents", "https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents", "GOV.UK, tipos del Stamp Duty Land Tax para no residentes en el Reino Unido"]],
    en: { h: "Buyers who do not live in the UK pay 2 points more purchase tax", p: [
      "Since 1 April 2021 the Stamp Duty Land Tax rates on a home are 2 percentage points higher for buyers who are not UK residents. For this tax an individual is not resident if they were not present in the UK for at least 183 days in the 12 months before the purchase.",
    ] },
    es: { h: "Quien no vive en el Reino Unido paga 2 puntos más de impuesto de compra", p: [
      "Desde el 1 de abril de 2021, los tipos del impuesto de compra (Stamp Duty Land Tax) sobre una vivienda son 2 puntos porcentuales más altos para quien no es residente en el Reino Unido. A efectos de este impuesto, una persona no es residente si no ha estado en el Reino Unido al menos 183 días en los 12 meses anteriores a la compra.",
    ] },
  },
  {
    id: "us-firpta", on: country("united-states"), asOf: "2026-11",
    sources: [["Internal Revenue Service, FIRPTA withholding", "https://www.irs.gov/individuals/international-taxpayers/firpta-withholding", "Internal Revenue Service (IRS), retención FIRPTA"]],
    en: { h: "Selling later as a foreign owner: the 15% withholding", p: [
      "When a foreign person sells a home in the United States, the buyer is in most cases required to withhold 15% of the amount realized on the sale and send it to the IRS, the federal tax office (FIRPTA). There is an exemption when the buyer acquires the home as a residence and the amount realized is $300,000 or less. It applies on the day you sell, so it is worth knowing on the day you buy.",
    ] },
    es: { h: "Vender después siendo propietario extranjero: la retención del 15 %", p: [
      "Cuando un extranjero vende una vivienda en Estados Unidos, el comprador está obligado en la mayoría de los casos a retener el 15 % del importe de la venta e ingresarlo en el IRS, la agencia tributaria federal (norma FIRPTA). Hay una exención cuando el comprador adquiere la vivienda para vivir en ella y el importe es de 300.000 dólares o menos. Se aplica el día que vendes, así que conviene saberlo el día que compras.",
    ] },
  },
  {
    id: "florida-reserves", on: (F) => F.f.cc === "united-states" && F.f.kind === "region" && F.f.regionSlug === "florida", asOf: "2026-11",
    sources: [["The Florida Senate, 2025 Florida Statutes, section 718.112", "https://www.flsenate.gov/Laws/Statutes/2025/718.112", "Senado de Florida, Estatutos de Florida de 2025, artículo 718.112"]],
    en: { h: "Florida flats: ask for the reserve study before you offer", p: [
      "In Florida, a residential condominium association must have a structural integrity reserve study at least every 10 years for each building of three habitable stories or more. For budgets adopted on or after 31 December 2024, the owners of an association that needs the study may not vote to fund those reserves below what it requires.",
      "The monthly fee in a listing can change after a study. Before you offer on a flat, ask the association for the latest study, the reserve balance and any special assessment already approved.",
    ] },
    es: { h: "Pisos en Florida: pide el estudio de reservas antes de ofertar", p: [
      "En Florida, la comunidad de propietarios de un edificio residencial de tres o más plantas habitables debe tener un estudio de reservas para la integridad estructural al menos cada 10 años. En los presupuestos aprobados desde el 31 de diciembre de 2024, los propietarios de una comunidad obligada a ese estudio no pueden votar dotar esas reservas por debajo de lo que exige.",
      "La cuota mensual del anuncio puede cambiar después de un estudio. Antes de ofertar por un piso, pide a la comunidad el último estudio, el saldo de las reservas y cualquier derrama ya aprobada.",
    ] },
  },
  {
    id: "greece-enfia", on: country("greece"), asOf: "2026-11",
    sources: [["Independent Authority for Public Revenue (AADE), Unified Tax on the Ownership of Real Estate (E9-ENFIA)", "https://www.aade.gr/en/greeks-abroad-non-residents/property-taxation/unified-tax-ownership-real-estate-e9-enfia", "Autoridad Independiente de Ingresos Públicos de Grecia (AADE), impuesto único sobre la propiedad inmobiliaria (E9-ENFIA)"]],
    en: { h: "The yearly property tax in Greece (ENFIA) and the E9 statement", p: [
      "ENFIA is calculated every year on the property held in Greece on 1 January. Owners who live abroad must file the E9 property statement like residents, through the myAADE portal, by 31 March of the year after they buy. The tax can be paid in up to 10 equal monthly instalments of at least €10 each.",
    ] },
    es: { h: "El impuesto anual sobre la vivienda en Grecia (ENFIA) y la declaración E9", p: [
      "El ENFIA se calcula cada año sobre los inmuebles que se tienen en Grecia el 1 de enero. Los propietarios que viven en el extranjero deben presentar la declaración de inmuebles E9 igual que los residentes, en el portal myAADE, antes del 31 de marzo del año siguiente a la compra. El impuesto se puede pagar en hasta 10 plazos mensuales iguales de al menos 10 € cada uno.",
    ] },
  },
  {
    id: "cyprus-contract-deposit", on: country("cyprus"), asOf: "2026-11",
    sources: [["Department of Lands and Surveys of Cyprus, Purchase of Immovable Property: the importance of depositing the sale contract", "https://portal.dls.moi.gov.cy/wp-content/uploads/2022/11/Purchase-of-Immovable-Property-The-importance-of-Depositing-the-Sale-Contract-at-the-Department-of-Lands-and-Surveys.pdf", "Departamento de Tierras y Catastro de Chipre, compra de inmuebles: la importancia de depositar el contrato de compraventa"]],
    en: { h: "Cyprus: a home without its own title deed, and the 6 months to deposit the contract", p: [
      "When a home has no title deed of its own yet, for example a unit that is still being built, the Department of Lands and Surveys recommends signing a sale contract and depositing it with the Department at once, and no later than 6 months after signing. The deposit creates a charge on the property, blocks a later contract for the same unit and lets the buyer ask a court to order the transfer if the seller does not perform. A contract deposited after the 6 months pays transfer fees that are 10% higher.",
    ] },
    es: { h: "Chipre: una vivienda sin escritura propia y los 6 meses para depositar el contrato", p: [
      "Cuando una vivienda todavía no tiene título de propiedad propio, por ejemplo una unidad en construcción, el Departamento de Tierras y Catastro de Chipre recomienda firmar un contrato de compraventa y depositarlo en el Departamento de inmediato, y como máximo 6 meses después de la firma. El depósito crea una carga sobre el inmueble, impide depositar después otro contrato sobre la misma unidad y permite al comprador pedir a un juez que ordene la transmisión si el vendedor no cumple. Si el contrato se deposita pasados los 6 meses, las tasas de transmisión son un 10 % más altas.",
    ] },
  },
];

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const month = (asOf: string, lang: string) => { const m = Number(asOf.slice(5, 7)) - 1, y = asOf.slice(0, 4); return lang === "es" ? `${MONTHS_ES[m]} de ${y}` : `${MONTHS_EN[m]} ${y}`; };

export function notesFor(F: Facts, lang: string): Note[] {
  if (F.f.thin) return [];
  return NOTES.filter((n) => n.on(F)).map((n) => { const t = lang === "es" ? n.es : n.en; return { id: n.id, h: t.h, p: t.p, sources: n.sources.map(([name, url, nameEs]): [string, string] => [lang === "es" ? nameEs : name, url]), asOf: month(n.asOf, lang) }; });
}
