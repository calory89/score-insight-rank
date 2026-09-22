// Light UI translation for RealHunt. Listing titles stay as published; the interface follows the
// visitor's language (Spanish, Italian, German or English) and can be switched in the footer.
export type Lang = "en" | "es" | "it" | "de";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
];

function detect(): Lang {
  try {
    const saved = localStorage.getItem("rh_lang");
    if (saved === "en" || saved === "es" || saved === "it" || saved === "de") return saved;
  } catch { /* storage blocked */ }
  const nav = (typeof navigator !== "undefined" ? navigator.language || "en" : "en").toLowerCase();
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("it")) return "it";
  if (nav.startsWith("de")) return "de";
  return "en";
}

let current: Lang = typeof window !== "undefined" ? detect() : "en";
export const getLang = () => current;
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem("rh_lang", l); } catch { /* ignore */ }
  try { document.documentElement.lang = l; } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("rh-lang", { detail: l }));
}

type Dict = Record<string, [string, string, string]>; // es, it, de
const D: Dict = {
  // header, footer, home
  "Browse homes": ["Ver casas", "Sfoglia case", "Häuser ansehen"],
  "Sign in": ["Entrar", "Accedi", "Anmelden"],
  "My submissions": ["Mis envíos", "I miei invii", "Meine Einsendungen"],
  "Submit a Deal": ["Enviar una casa", "Segnala una casa", "Haus einreichen"],
  "Submit": ["Enviar", "Invia", "Einreichen"],
  "Property worth finding.": ["Casas que merece la pena encontrar.", "Case che vale la pena trovare.", "Häuser, die sich lohnen."],
  "You decide what rises.": ["Tú decides cuál sube.", "Decidi tu cosa sale.", "Du entscheidest, was aufsteigt."],
  "deals": ["casas", "case", "Häuser"],
  "votes this week": ["votos esta semana", "voti questa settimana", "Stimmen diese Woche"],
  "total votes": ["votos en total", "voti totali", "Stimmen insgesamt"],
  "visitors in 24h": ["visitas en 24 h", "visitatori in 24 h", "Besucher in 24 Std."],
  "Top deals this week": ["Las mejores casas de la semana", "Le case migliori della settimana", "Die besten Häuser der Woche"],
  "All-time favourites": ["Favoritas de siempre", "Preferite di sempre", "Allzeit-Favoriten"],
  "This Week": ["Esta semana", "Questa settimana", "Diese Woche"],
  "All Time": ["Siempre", "Di sempre", "Allzeit"],
  "Search listings": ["Buscar anuncios", "Cerca annunci", "Anzeigen suchen"],
  "More discoveries": ["Más casas", "Altre case", "Mehr Häuser"],
  "All countries": ["Todos los países", "Tutti i paesi", "Alle Länder"],
  "Listings belong to their original publishers. RealHunt is not the seller.": ["Los anuncios pertenecen a quien los publica. RealHunt no es el vendedor.", "Gli annunci appartengono a chi li pubblica. RealHunt non è il venditore.", "Die Anzeigen gehören den Anbietern. RealHunt ist nicht der Verkäufer."],
  "Found by people. Ranked by you.": ["Encontradas por personas. Ordenadas por ti.", "Trovate dalle persone. Classificate da te.", "Von Menschen gefunden. Von dir gerankt."],
  // detail
  "View listing": ["Ver anuncio", "Vedi annuncio", "Anzeige öffnen"],
  "Back to this week": ["Volver a esta semana", "Torna a questa settimana", "Zurück zu dieser Woche"],
  "Back to all time": ["Volver a siempre", "Torna a sempre", "Zurück zu Allzeit"],
  "This week's points": ["Puntos esta semana", "Punti questa settimana", "Punkte diese Woche"],
  "All-time points": ["Puntos totales", "Punti totali", "Punkte insgesamt"],
  "Report this deal": ["Denunciar este anuncio", "Segnala questo annuncio", "Anzeige melden"],
  "Is it still for sale?": ["¿Sigue a la venta?", "È ancora in vendita?", "Noch zu verkaufen?"],
  "Still available": ["Sigue disponible", "Ancora disponibile", "Noch verfügbar"],
  "Sold or gone": ["Vendida o retirada", "Venduta o ritirata", "Verkauft oder weg"],
  "No reports yet. Called or checked? Tell the others.": ["Aún no hay avisos. ¿Has llamado o lo has mirado? Cuéntalo.", "Nessuna segnalazione. Hai chiamato o controllato? Dillo agli altri.", "Noch keine Meldungen. Angerufen oder geprüft? Sag es den anderen."],
  // new features
  "Swipe": ["Deslizar", "Scorri", "Wischen"],
  "Map": ["Mapa", "Mappa", "Karte"],
  "Hunters": ["Cazadores", "Cacciatori", "Jäger"],
  "Guides": ["Guías", "Guide", "Ratgeber"],
  "Help buying": ["Ayuda para comprar", "Aiuto per comprare", "Hilfe beim Kauf"],
  "Alerts": ["Alertas", "Avvisi", "Alarme"],
  "Invite": ["Invitar", "Invita", "Einladen"],
  "Explore": ["Explorar", "Esplora", "Entdecken"],
  "Max price": ["Precio máximo", "Prezzo massimo", "Höchstpreis"],
  "Any type": ["Cualquier tipo", "Qualsiasi tipo", "Jeder Typ"],
  "Min size": ["Tamaño mínimo", "Superficie minima", "Mindestgröße"],
  "Sort": ["Ordenar", "Ordina", "Sortieren"],
  "Top voted": ["Más votadas", "Più votate", "Meiste Stimmen"],
  "Newest": ["Más nuevas", "Più recenti", "Neueste"],
  "Cheapest": ["Más baratas", "Più economiche", "Günstigste"],
  "Biggest": ["Más grandes", "Più grandi", "Größte"],
  "More filters": ["Más filtros", "Altri filtri", "Mehr Filter"],
  "Hide filters": ["Ocultar filtros", "Nascondi filtri", "Filter ausblenden"],
  "Clear filters": ["Quitar filtros", "Rimuovi filtri", "Filter zurücksetzen"],
  "New": ["Nueva", "Nuova", "Neu"],
  "Early access": ["Acceso anticipado", "Accesso anticipato", "Früher Zugang"],
  "Price dropped": ["Bajó de precio", "Prezzo sceso", "Preis gesenkt"],
  "Verified by RealHunt": ["Verificada por RealHunt", "Verificata da RealHunt", "Von RealHunt geprüft"],
  "Reported sold": ["Avisan de que se vendió", "Segnalata come venduta", "Als verkauft gemeldet"],
  "Next drop in": ["Próximo estreno en", "Prossima uscita tra", "Nächster Drop in"],
  "New homes go live every day at 18:00 (Madrid).": ["Cada día a las 18:00 (Madrid) salen casas nuevas.", "Ogni giorno alle 18:00 (Madrid) escono case nuove.", "Jeden Tag um 18:00 (Madrid) kommen neue Häuser."],
  "Signed-in members see them a day early.": ["Los registrados las ven un día antes.", "Gli iscritti le vedono un giorno prima.", "Angemeldete sehen sie einen Tag früher."],
  "You have early access": ["Tienes acceso anticipado", "Hai l'accesso anticipato", "Du hast frühen Zugang"],
  "Get early access": ["Consigue acceso anticipado", "Ottieni l'accesso anticipato", "Früher Zugang"],
  "Ask about this home": ["Pedir información", "Chiedi informazioni", "Anfrage senden"],
  "Similar homes": ["Casas parecidas", "Case simili", "Ähnliche Häuser"],
  "What it really costs": ["Lo que cuesta de verdad", "Quanto costa davvero", "Was es wirklich kostet"],
  "Share": ["Compartir", "Condividi", "Teilen"],
  "Email me new matches": ["Avísame de casas nuevas", "Avvisami delle nuove case", "Neue Treffer per E-Mail"],
  "Show my homes": ["Ver mis casas", "Mostra le mie case", "Meine Häuser zeigen"],
  "Install app": ["Instalar app", "Installa l'app", "App installieren"],
  "Language": ["Idioma", "Lingua", "Sprache"],
  "days in a row": ["días seguidos", "giorni di fila", "Tage in Folge"],
  "Your vote counts.": ["Tu voto cuenta.", "Il tuo voto conta.", "Deine Stimme zählt."],
  "Continue with Google": ["Continuar con Google", "Continua con Google", "Weiter mit Google"],
};

const IDX: Record<Exclude<Lang, "en">, number> = { es: 0, it: 1, de: 2 };
export function t(en: string): string {
  if (current === "en") return en;
  const row = D[en];
  return row ? row[IDX[current]] || en : en;
}
