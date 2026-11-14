// Russian wording of the listing pages (15-nov-2026), written in Russian: seo/listings/pack.ts says what each entry
// is for. Sentences are built so that names of towns never need a case ending ("город: Kavarna"), numbers agree with
// their noun (1 квартира, 2 квартиры, 5 квартир) and addresses stay in Latin letters (/ru/homes/bulgaria).
// Families covered: countries, budgets, regions, areas, settings, kind of home, bedrooms (seo/langs/config.ts).
import type { Pack, Facts, Form, Named } from "./pack";
import { cityBySlug, NEAR_KM } from "./places";
import { titleIn, placeIn, grouped, NB, type PlaceWords } from "./packkit";

const num = (n: number) => grouped(n, NB);
const money = (n: number) => `${num(n)}${NB}€`;
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const SHORT = ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."];
/** 1 квартира, 2 квартиры, 5 квартир */
const pl = (n: number, one: string, few: string, many: string) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; };

// [name, "в ..."]
const COUNTRY: Record<string, [string, string]> = {
  Bulgaria: ["Болгария", "в Болгарии"], Cyprus: ["Кипр", "на Кипре"], Greece: ["Греция", "в Греции"], Spain: ["Испания", "в Испании"], Italy: ["Италия", "в Италии"], Portugal: ["Португалия", "в Португалии"],
  France: ["Франция", "во Франции"], Germany: ["Германия", "в Германии"], Poland: ["Польша", "в Польше"], Sweden: ["Швеция", "в Швеции"], Denmark: ["Дания", "в Дании"], Netherlands: ["Нидерланды", "в Нидерландах"],
  Switzerland: ["Швейцария", "в Швейцарии"], "United States": ["США", "в США"], Japan: ["Япония", "в Японии"], Mexico: ["Мексика", "в Мексике"], Canada: ["Канада", "в Канаде"],
  "Dominican Republic": ["Доминиканская Республика", "в Доминиканской Республике"], "United Kingdom": ["Великобритания", "в Великобритании"], Norway: ["Норвегия", "в Норвегии"], Scandinavia: ["Скандинавия", "в Скандинавии"],
};
const country = (c: string) => COUNTRY[c]?.[0] || c;
const inC = (c: string) => COUNTRY[c]?.[1] || `в стране ${c}`;
const IN_BY_NAME: Record<string, string> = Object.fromEntries(Object.values(COUNTRY));

const PLACES: PlaceWords = {
  map: {
    Varna: "Варна", Kavarna: "Каварна", Pomorie: "Поморие", Byala: "Бяла", Burgas: "Бургас", "Black Sea": "Чёрное море", "Sunny Beach": "Солнечный берег", Nessebar: "Несебр", "Sveti Vlas": "Святой Влас",
    Crete: "Крит", Halkidiki: "Халкидики", Lesbos: "Лесбос", Messinia: "Мессения", "North Evia": "Северная Эвбея", Evia: "Эвбея", Pelion: "Пелион", Rhodes: "Родос", Samos: "Самос", Skopelos: "Скопелос", Sporades: "Спорады", Corfu: "Корфу", Peloponnese: "Пелопоннес",
    Famagusta: "Фамагуста", Paphos: "Пафос", Protaras: "Протарас", "Coral Bay": "Корал-Бэй",
  },
  near: (n, card) => (card ? `рядом: ${n}` : `окрестности: ${n}`),
  central: (n) => `${n}, центр`,
  area: (n) => `${n} и окрестности`,
};
const place = (n: string, _cc?: string, where?: "card") => placeIn(PLACES, n, where);
const AREA: Record<string, [string, string]> = { "black-sea-coast": ["Черноморское побережье", "на черноморском побережье"], peloponnese: ["Пелопоннес", "на Пелопоннесе"] };
const areaL = (f: { area?: string }) => AREA[f.area || ""]?.[0] || "";
const areaIn = (f: { area?: string }) => AREA[f.area || ""]?.[1] || "";
const city = (slug: string) => cityBySlug(slug)?.[1] || slug;

const list = (l: Named[]) => l.map((x) => `${x.name} (${x.n})`).join(", ");
const upper = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const pc = (x: string) => x.replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s*[-–]\s*/g, "–");
const dot = (x: string) => (x ? (/[.!?]$/.test(x.trim()) ? `: ${x.trim()}` : `: ${x.trim()}.`) : ".");
const range = (lo: string, hi: string) => (lo === hi ? `около ${lo}` : `от ${lo} до ${hi}`);
const bedsIn = (n: number) => (n === 4 ? "с 4 и более спальнями" : n === 1 ? "с 1 спальней" : `с ${n} спальнями`);
const bedsN = (n: number) => `${n} ${pl(n, "спальня", "спальни", "спален")}`;
const objects = (n: number) => `${n} ${pl(n, "объект", "объекта", "объектов")}`;

// [genitive plural, nominative singular, nominative plural, "cheap" nominative plural, "cheapest" nominative singular]
const NOUN = {
  house: ["домов", "дом", "дома", "недорогие дома", "самый дешёвый дом"],
  apartment: ["квартир", "квартира", "квартиры", "недорогие квартиры", "самая дешёвая квартира"],
  mixed: ["объектов недвижимости", "объект недвижимости", "объекты недвижимости", "недорогая недвижимость", "самый дешёвый объект"],
} as const;
type Case = 0 | 1 | 2 | 3 | 4;
const CASE: Record<Form, Case> = { many: 0, one: 1, cheap: 3, cheapest: 4 };
const TAIL: Record<string, string> = { "by-the-sea": " у моря", "in-town": " в городе", "village-houses": " в деревнях и посёлках" };

/** The page's search as a phrase, in the grammatical form the sentence needs. */
function phrase(F: Facts, c: Case): string {
  const f = F.f;
  const noun = f.kind === "ptype" ? (f.key === "apartments" ? "apartment" : "house") : F.noun;
  const b = NOUN[noun][c];
  const where = f.country ? ` ${inC(f.country)}` : "";
  const under = f.cap ? ` до ${f.kind === "ccyBand" ? ccy(f.cap, f.ccy!) : money(f.cap)}` : "";
  const sale = " на продажу";
  switch (f.kind) {
    case "area": return `${b}${sale} ${areaIn(f)}`;
    case "near": return `${b}${sale} в радиусе ${NEAR_KM} км: ${city(f.city || "")}`;
    case "region": return `${b}${sale} (${place(f.region!) || f.region}, ${country(f.country!)})`;
    case "town": return `${b}${sale} (${f.town}, ${place(f.region!) || f.region})`;
    case "regionBand": return f.area ? `${b}${sale} ${areaIn(f)}${under}` : `${b}${sale} (${place(f.region!) || f.region}, ${country(f.country!)})${under}`;
    case "setting": return `${b}${TAIL[f.key!] || ""}${sale}${where}`;
    case "beds": return `${b} ${bedsIn(f.beds!)}${sale}${where}`;
    default: return `${b}${sale}${where}${under}`;
  }
}
const what = (F: Facts, form: Form = "many") => phrase(F, CASE[form]);
const ccy = (n: number, c: string) => `${num(n)} ${c === "GBP" ? "фунтов" : c === "USD" ? "долларов" : "евро"}`;
const AMEN: Record<string, string> = { garden: "с садом", terrace: "с террасой", garage: "с гаражом", pool: "с бассейном", fireplace: "с камином", sauna: "с сауной" };
const LABEL: Record<string, string> = { "by-the-sea": "У моря", "village-houses": "В деревнях", "in-town": "В городе", apartments: "Квартиры", houses: "Дома" };

export const ru: Pack = {
  lang: "ru",
  money,
  perSqm: (n) => `${num(n)}${NB}€/м²`,
  date: (d) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}${NB}г.`,
  dateShort: (d) => `${Number(d.slice(8, 10))} ${SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`,
  country,
  inC,
  place,
  homeTitle: (h) => titleIn("ru", h),
  homeWhy: () => "",
  what,
  h1: (F) => upper(phrase(F, (F.f.cap && F.f.cap <= 100000) || F.median <= 100000 ? 3 : 2)),
  title: (h1, n, min) => `${h1}: ${n} ${pl(n, "предложение", "предложения", "предложений")} от ${min}`,
  desc: (F, w) => `Число ${w}: ${F.n}, цены от ${money(F.min)} до ${money(F.max)}. Медианная цена: ${money(F.median)}. Фото, площадь, оценки, расходы на покупку и на что обратить внимание.`,
  crumbRoot: "RealHunt", crumbCheap: "Недорогие дома",
  crumbCountry: (c) => `Недвижимость ${IN_BY_NAME[c] || c}`,
  label: (f) => (f.kind === "area" ? areaL(f) : f.kind === "near" ? `Рядом: ${city(f.city || "")}` : f.kind === "ccyBand" ? `До ${ccy(f.cap!, f.ccy!)}`
    : f.cap ? `До ${money(f.cap)}` : f.kind === "region" ? place(String(f.region)) || String(f.region) : f.kind === "town" ? String(f.town) : f.kind === "beds" ? (f.beds === 4 ? "4 и более спален" : bedsN(f.beds!)) : f.kind === "country" ? country(String(f.country)) : LABEL[f.key!] || String(f.key)),
  updated: (d, newest) => `Обновлено ${d}${newest ? ` Последний объект добавлен ${newest}` : ""}`,
  l1: (n, w, min, max) => (min === max ? `Число ${w} на RealHunt сегодня: ${n}, цена у всех одна: ${min}.` : `Число ${w} на RealHunt сегодня: ${n}, цены от ${min} до ${max}.`),
  l2: (title, town, price, sqm, beds) => `Самый дешёвый вариант стоит ${price}: ${title}, ${town}${sqm || beds ? ` (${[sqm ? `${sqm} м²` : "", beds ? bedsN(beds) : ""].filter(Boolean).join(", ")})` : ""}.`,
  l3: (med, pp, pMed, pPp, parent) => `Медианная цена: ${med}${pp ? ` (${pp})` : ""}. Для сравнения, ${parent}: ${pMed}${pPp ? ` (${pPp})` : ""}.`,
  l3all: (med, pp, max, parent) => `Медианная цена: ${med}${pp ? ` (${pp})` : ""}. На этой странице ${parent}: дороже ${max} нет ни одного.`,
  parent: (kind, n, name, countries) => (kind === "site" ? `все объекты RealHunt, ${countries} ${pl(countries, "страна", "страны", "стран")} (${n})` : kind === "country" ? `все объекты RealHunt ${name} (${n})` : `все объекты RealHunt, ${name} (${n})`),
  kpi: { homes: "Объектов", from: "От", median: "Медианная цена", ppsqm: "Медиана за м²", size: "Медианная площадь", score: "Лучшая оценка" },
  gridTitle: (n, shown) => (n === shown ? `Все объекты (${n}), сначала с лучшей оценкой` : `Лучшие ${shown} из ${n}, по оценке`),
  gridMore: (shown, n) => `Показаны ${shown} с лучшей оценкой из ${n}. Остальные есть в таблице и в более узких подборках ниже.`,
  card: { isNew: "Новый", drop: (p) => `Цена снижена на ${p}${NB}%`, score: "Оценка", beds: (n) => `${n} спал.`, noPhoto: "Фото в объявлении" },
  tableTitle: (n, shown) => (n === shown ? `Сравнение всех объектов (${n}), от дешёвых к дорогим` : `Сравнение: ${shown} самых дешёвых из ${n}`),
  th: { home: "Объект", place: "Место", price: "Цена", size: "Площадь", ppsqm: "За м²", beds: "Спален", score: "Оценка", added: "Добавлен" },
  factsTitle: (F) => (F.f.cap ? `Что можно купить за ${money(F.f.cap)}${F.f.area ? ` ${areaIn(F.f)}` : F.f.region ? "" : F.f.country ? ` ${inC(F.f.country)}` : ""}` : `Объекты в цифрах (${F.n})`),
  fSize: (med, max, title) => `Площадь: у половины ${med} м² и больше. Самый большой объект, ${max} м²: ${title}.`,
  fBeds: (b, unknown) => `Спальни: ${b.map(([k, n]) => `${k === 4 ? "4 и более" : k}: ${objects(n)}`).join("; ")}${unknown ? `; не указано в объявлении: ${unknown}` : ""}.`,
  fType: (a, h) => `Тип: ${[a ? `${a} ${pl(a, "квартира", "квартиры", "квартир")}` : "", h ? `${h} ${pl(h, "дом", "дома", "домов")}` : ""].filter(Boolean).join(" и ")}.`,
  fSetting: (sea, v, t) => `Расположение: ${[sea ? `у моря: ${sea}` : "", v ? `в деревнях и посёлках: ${v}` : "", t ? `в городе: ${t}` : ""].filter(Boolean).join("; ")}.`,
  fWhere: (l) => `Где: ${list(l)}.`,
  fTowns: (l) => `Населённые пункты: ${list(l)}.`,
  fCountries: (l, more) => `Страны: ${list(l)}${more ? ` и ещё ${more}` : ""}.`,
  fStep: (from, to, n, title, nota, price) => `От ${from} до ${to}: ${objects(n)}. Лучшая оценка среди них (${nota}, цена ${price}): ${title}.`,
  fNext: (next, add) => `При бюджете ${next} добавится ещё ${objects(add)}.`,
  fRegions: (low, high) => `Самая низкая медианная цена: ${low.name}, ${low.median} (объектов: ${low.n}). Самая высокая: ${high.name}, ${high.median} (объектов: ${high.n}).`,
  fScore: (min, max, title) => (min === max ? `Оценки: у всех ${max} из 98. Первый в списке: ${title}.` : `Оценки: от ${min} до ${max} из 98. Лучшая оценка: ${title}.`),
  fNew: (n30, title, date) => `Последний добавленный объект, ${date}: ${title}.${n30 ? ` За последние 30 дней добавлено: ${n30}.` : ""}`,
  costsTitle: (c) => `Расходы на покупку и правила для иностранцев ${c}`,
  cForeign: (t) => `Могут ли покупать иностранцы? ${t}`,
  cCosts: (pct, br, med, lo, hi, tLo, tHi) => `Налоги и сборы добавляют к цене примерно ${pc(pct)}${NB}%${dot(br)} Для объекта с медианной ценой этой страницы (${med}) это ${range(lo, hi)}, то есть всего ${range(tLo, tHi)}.`,
  cAllIn: (cap, maxAsk, fit, n) => `Чтобы вся покупка уложилась в ${cap}, цена в объявлении должна быть не выше примерно ${maxAsk}. На этой странице таких объектов: ${fit} из ${n}.`,
  cTax: (t) => `Ежегодный налог на недвижимость: ${t}`,
  cExamples: (rows) => `С теми же процентами: ${rows.map(([p, lo, hi]) => `при цене ${p} это ${range(lo, hi)}`).join("; ")}.`,
  firstTitle: "Можно ли вам здесь покупать? Сначала прочитайте это",
  cNote: (asOf) => `Общая информация, не налоговая и не юридическая консультация.${asOf ? ` Данные проверены в ${asOf} году.` : ""}`,
  cLinks: { calc: (c) => `Калькулятор расходов на покупку ${c}`, detail: "Все расходы и налоги", guide: "Как проходит покупка, шаг за шагом", nat: "Правила для вашего гражданства" },
  costTableTitle: "Расходы на покупку в странах этой страницы", costTh: { country: "Страна", homes: "Объектов здесь", from: "От", costs: "Налоги и сборы" },
  watchTitle: "На что обратить внимание перед покупкой",
  wNoSqm: (k, n) => `Площадь не указана в объявлениях: ${k} из ${n}. Цену за м² у них сравнить нельзя.`,
  wHoa: (k, min, max) => `Ежемесячная плата за обслуживание указана в объявлениях (${k}): ${min === max ? min : `от ${min} до ${max}`}. Прибавьте её к ежегодным расходам.`,
  wHoaUnknown: (k) => `Объектов в доме или комплексе с общими расходами, где объявление не называет сумму: ${k}. Попросите указать её письменно.`,
  wWhyCheap: (title, t) => (t ? `У низкой цены есть причина. ${title}: ${t}` : `У низкой цены всегда есть причина. Для объекта «${title}» она указана на его странице.`),
  wFlood: (k, n) => `Наша ориентировочная проверка показывает средний или высокий риск затопления: ${k} из ${n}. На странице каждого объекта есть ссылка на официальную карту.`,
  wNoise: (k, n) => `Рядом автомагистраль, железная дорога или аэропорт (высокий уровень шума по нашей проверке): ${k} из ${n}.`,
  wOld: (k, n) => `Добавлены более 60 дней назад: ${k} из ${n}. Прежде чем планировать поездку, уточните в агентстве, что объект ещё продаётся.`,
  wSold: (k) => `Посетители сообщили, что объект, возможно, продан; идёт проверка: ${k}.`,
  wApprox: (k, n) => `Место на карте приблизительное (в объявлении указан населённый пункт, а не улица): ${k} из ${n}.`,
  wDims: (weak, wa, strong, sa) => `Самая слабая составляющая оценки в среднем: ${weak} (${wa}/100). Самая сильная: ${strong} (${sa}/100).`,
  wRental: (t) => `Планируете сдавать? ${t}`,
  dim: (k) => ({ price: "цена", value: "цена за м²", space: "площадь", condition: "готовность к заселению", extras: "удобства", water: "близость к морю или озеру", weather: "дни с хорошей погодой", access: "близость к аэропорту", costs: "расходы на покупку" } as Record<string, string>)[k] || k,
  faqTitle: "Вопросы покупателей",
  qCheapest: (x) => `${/^самая/.test(x) ? "Какая" : "Какой"} ${x}?`,
  aCheapest: (title, town, price, sqm, beds, nota) => `${title} (${town}), цена в объявлении ${price}${sqm ? `, ${sqm} м²` : ""}${beds ? `, ${bedsN(beds)}` : ""}.${nota ? ` Оценка RealHunt: ${nota}.` : ""}`,
  qCount: (w) => `Сколько сейчас ${w}?`,
  aCount: (n, date, _parent, n30) => `${n}, по состоянию на ${date}${n30 ? ` За последние 30 дней добавлено: ${n30}.` : ""}`,
  qSize: (w) => `Какая площадь у ${w}?`,
  aSize: (med, beds, max, town) => `Медианная площадь: ${med} м²${beds ? `, чаще всего ${beds === 4 ? "4 и более спален" : bedsN(beds)}` : ""}. Самый большой объект, ${max} м²: ${town}.`,
  qAllIn: (cap, c) => `Хватит ли ${cap}, чтобы купить жильё ${c} вместе с налогами и сборами?`,
  aAllIn: (cap, pct, lo, hi, maxAsk, fit) => `Нет, если цена в объявлении равна ${cap}: с налогами и сборами (примерно ${pc(pct)}${NB}%) покупка обойдётся в сумму ${range(lo, hi)}. Чтобы уложиться в ${cap}, ищите цену не выше примерно ${maxAsk}. Таких объектов на этой странице: ${fit}.`,
  qWhere: (w) => `Где находится большинство ${w}?`,
  aWhere: (l) => `В основном здесь: ${list(l)}.`,
  qPrice: (one) => `Сколько стоит ${one}?`,
  aPrice: (min, med, pp, max, n) => `Цены в объявлениях: от ${min} до ${max} (объектов: ${n}). Медианная цена: ${med}${pp ? ` (${pp})` : ""}.`,
  qForeign: (c) => `Могут ли иностранцы купить дом ${c}?`,
  qCosts: (c) => `Какие расходы на покупку ${c}?`,
  aCosts: (pct, br, med, lo, hi) => `Примерно ${pc(pct)}${NB}% сверх цены${dot(br)} Для объекта с медианной ценой этой страницы (${med}) это ${range(lo, hi)}. Общая информация, не налоговая консультация.`,
  qRegion: (c) => `Какой регион самый дешёвый ${c}?`,
  aRegion: (low, high) => `Среди регионов, где на RealHunt есть хотя бы 3 объекта, самая низкая медианная цена: ${low.name}, ${low.median} (объектов: ${low.n}). Самая высокая: ${high.name}, ${high.median}.`,
  qVs: (p, wider) => `Дешевле ли жильё здесь (${p}), чем в среднем по стране или региону (${wider})?`,
  aVs: (p, wider, med, pMed, pct, n, pn) => `Медианная цена (${p}): ${med}, объектов: ${n}. Это ${pct < 0 ? `на ${-pct}${NB}% ниже` : pct > 0 ? `на ${pct}${NB}% выше` : "столько же"}, чем медиана ${pMed} по всем объектам (${wider}, ${pn}).`,
  qCountries: (w) => `В каких странах есть предложения: ${w}?`,
  aCountries: (l) => `Сегодня на RealHunt: ${list(l)}.`,
  moreTitle: (F) => (F.f.country ? `Другие подборки ${inC(F.f.country)}` : "Другие подборки"),
  more: { budget: "По бюджету", region: "По региону", setting: "По расположению", type: "По типу", beds: "По числу спален", feature: "По особенностям", town: "По населённому пункту", elsewhere: (l) => `${l}: другие страны`, countries: "По стране", all: "Все подборки недорогих домов",
    area: "По зоне", combo: "По особенностям и бюджету", ccy: "В фунтах и долларах", near: "Рядом с городом", ranked: "Рейтинги" },
  ccy,
  city,
  how: (F) => (F.f.kind === "area" && F.f.area === "black-sea-coast" ? "В эту подборку входят объекты в Варненской, Бургасской и Добричской областях, расположенные у моря: не дальше 5 км от берега или с пометкой в объявлении, что это жильё у пляжа." : ""),
  l1rank: (w, min, max) => `Цены (${w}): от ${min} до ${max}.`,
  gridTitleRank: (_key, n) => `Объекты (${n}) по порядку`,
  x: {
    amen: (l) => `Удобства, названные в объявлениях: ${l.map(([k, n]) => `${AMEN[k] || k}: ${n}`).join("; ")}.`,
    airport: (med, title, km, _name, _l, code) => `Аэропорты: медианное расстояние ${med} км. Ближе всего к аэропорту${code ? ` ${code}` : ""}: ${title}, ${km < 1 ? "меньше 1" : km} км.`,
    sea: (n, med, title, m) => `Расстояние до моря (измерено для ${n}): ближайший объект в ${num(m)} м (${title}), медиана ${num(med)} м.`,
    plot: (med, title, m2) => `Участок: медиана ${num(med)} м². Самый большой, ${num(m2)} м²: ${title}.`,
    ppsqm: (title, low, high) => `Цена за м²: от ${low} (${title}) до ${high}.`,
    score: (n, pct, _parent, n95) => `Оценка 90 и выше: ${n} (${pct}${NB}%).${n95 ? ` Оценка 95 и выше: ${n95}.` : ""}`,
    fee: (n, min, max, yMin, yMax) => `Плата за обслуживание, указанная в объявлениях (${n}): ${min === max ? min : `от ${min} до ${max}`} в месяц, то есть ${yMin === yMax ? yMin : `от ${yMin} до ${yMax}`} в год.`,
    drop: (title, pct, amount, med) => `Самое большое снижение цены: ${pct}${NB}% (${amount}), ${title}. Медианное снижение на этой странице: ${med}${NB}%.`,
    days: (med, title, v) => `Дни с хорошей погодой: медиана ${med} в год. Больше всего, ${v}: ${title}.`,
    elev: (n, med, title, v) => `Высота над уровнем моря (известна для ${n}): медиана ${num(med)} м. Выше всех, ${num(v)} м: ${title}.`,
    islands: (l) => `Острова: ${list(l)}.`,
    dist: (c, med, title, km, far) => `Расстояние по прямой (${c}): от ${km < 1 ? "меньше 1" : km} км (${title}) до ${far} км, медиана ${med} км.`,
    rank: (_key, n, title, v, of) => `Граница сегодня: ${v}. ${title}: номер ${n} из ${of}.`,
    vs: (other, med, n, oMed, on, pct) => `Для сравнения, ${other}: здесь медиана ${med} (объектов: ${n}), это на ${pct}${NB}% ниже, чем там: ${oMed} (объектов: ${on}).`,
  },
  noteSource: "Источник", noteAsOf: (asOf) => `Проверено: ${asOf}. Общая информация, не юридическая и не налоговая консультация.`,
  season: { title: "По сезону", winter: "На зиму", summer: "На лето" },
  allIn: (c, n) => `Все объекты ${c} (${n})`,
  sources: (l) => `Источники объявлений: ${l.map(([d, n]) => `${d} (${n})`).join(", ")}.`,
  notAgent: "RealHunt не агентство недвижимости и не продаёт эти объекты: каждый ведёт на исходное объявление, и каждый перед публикацией проверил человек.",
  alert: (c) => `Сообщать по почте о новых объектах ${c}`,
  filter: "Фильтр и сортировка этих объектов",
  method: "Как считается оценка",
  moved: "Эта страница перемещена.",
};
