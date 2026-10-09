import type { Lang } from "./i18n";

/** October 2026 "top 100/100" pass: search palette, saved hotels, recently viewed, currency,
 *  guests & stay total, gallery lightbox, compare, cheapest cities, embed, newsletter. */
export type Plus = {
  js: Record<string, string>;
  whyScore: (s: string, n: string) => string;
  whyFrom: (n: number) => string;
  in1: string;
  jHotels: string;
  jWhere: string;
  jMap: string;
  jCompare: string;
  jFaq: string;
  flights: string;
  compareWith: (c: string) => string;
  vsTitle: (a: string, b: string) => string;
  vsLead: (a: string, b: string) => string;
  cheapNav: string;
  cheapTitle: string;
  cheapLead: (n: number) => string;
  under: string;
  all: string;
  embedTitle: string;
  embedHow: string;
  newsTitle: string;
  newsLead: string;
  newsBtn: string;
  emailPh: string;
  nfTitle: string;
  nfLead: string;
  savedTitle: string;
  savedLead: string;
  priceRef: (d: string) => string;
  guests: string;
  rooms: string;
  currency: string;
};

const js = (o: Record<string, string>) => o;

export const Y: Record<Lang, Plus> = {
  en: {
    js: js({
      search: "Search a city",
      ph: "Type a city: London, Roma, München…",
      surprise: "Surprise me",
      none: "No city found. Try another spelling.",
      save: "Save",
      saved: "Saved",
      recent: "Recently viewed",
      share: "Share",
      copied: "Link copied",
      total: "≈ {p} for {n} nights",
      approx: "approx.",
      empty: "Nothing saved yet. Tap ♡ on any hotel to keep it here.",
      ok: "Thanks! You're on the list.",
      err: "Something went wrong. Please try again.",
      open: "Open",
      remove: "Remove",
    }),
    whyScore: (s, n) => `${s}/10 from ${n} guest reviews`,
    whyFrom: (n) => `Chosen from ${n} hotels`,
    in1: "In 1 second",
    jHotels: "Hotels",
    jWhere: "Where to stay",
    jMap: "Map",
    jCompare: "Compare",
    jFaq: "FAQ",
    flights: "Direct flights from",
    compareWith: (c) => `Compare ${c} with`,
    vsTitle: (a, b) => `${a} vs ${b}: the best hotels side by side`,
    vsLead: (a, b) =>
      `Our Budget, Best Value and Luxury picks in ${a} and ${b}, with scores and reference prices, so you can choose the city and the hotel in one look.`,
    cheapNav: "Cheapest cities",
    cheapTitle: "The cheapest cities for a great hotel",
    cheapLead: (n) =>
      `${n} destinations ranked by the reference price of our Budget pick, a hotel rated 7.5/10 or better. Two adults, one room.`,
    under: "Under",
    all: "All",
    embedTitle: "Add this Top 3 to your blog or website",
    embedHow: "Copy this code. It shows the three picks with photos and links, and stays up to date.",
    newsTitle: "3 cities, 9 hotels, every Friday",
    newsLead:
      "One short email with three destinations and their Budget, Best Value and Luxury picks. No spam, unsubscribe in one click.",
    newsBtn: "Subscribe",
    emailPh: "Your email",
    nfTitle: "This page took a wrong turn",
    nfLead: "Search any city, or start with one of these.",
    savedTitle: "Your saved hotels",
    savedLead: "Saved on this device only. No account needed.",
    priceRef: (d) => `Reference price, checked ${d}`,
    guests: "Adults",
    rooms: "Rooms",
    currency: "Currency",
  },
  es: {
    js: js({
      search: "Buscar una ciudad",
      ph: "Escribe una ciudad: Londres, Roma, Múnich…",
      surprise: "Sorpréndeme",
      none: "No encontramos esa ciudad. Prueba otra forma de escribirla.",
      save: "Guardar",
      saved: "Guardado",
      recent: "Vistos recientemente",
      share: "Compartir",
      copied: "Enlace copiado",
      total: "≈ {p} por {n} noches",
      approx: "aprox.",
      empty: "Aún no has guardado nada. Toca ♡ en cualquier hotel para tenerlo aquí.",
      ok: "¡Gracias! Ya estás en la lista.",
      err: "Algo ha fallado. Inténtalo de nuevo.",
      open: "Abrir",
      remove: "Quitar",
    }),
    whyScore: (s, n) => `${s}/10 con ${n} opiniones`,
    whyFrom: (n) => `Elegido entre ${n} hoteles`,
    in1: "En 1 segundo",
    jHotels: "Hoteles",
    jWhere: "Dónde alojarse",
    jMap: "Mapa",
    jCompare: "Comparar",
    jFaq: "Preguntas",
    flights: "Vuelos directos desde",
    compareWith: (c) => `Comparar ${c} con`,
    vsTitle: (a, b) => `${a} vs ${b}: los mejores hoteles, cara a cara`,
    vsLead: (a, b) =>
      `Nuestros hoteles Económico, Mejor calidad-precio y Lujo en ${a} y ${b}, con notas y precios de referencia, para elegir ciudad y hotel de un vistazo.`,
    cheapNav: "Ciudades más baratas",
    cheapTitle: "Las ciudades más baratas para dormir en un buen hotel",
    cheapLead: (n) =>
      `${n} destinos ordenados por el precio de referencia de nuestro hotel Económico, con nota de 7,5/10 o más. Dos adultos, una habitación.`,
    under: "Menos de",
    all: "Todos",
    embedTitle: "Añade este Top 3 a tu blog o web",
    embedHow: "Copia este código. Muestra los tres hoteles con fotos y enlaces, y se actualiza solo.",
    newsTitle: "3 ciudades, 9 hoteles, cada viernes",
    newsLead:
      "Un email corto con tres destinos y sus hoteles Económico, Mejor calidad-precio y Lujo. Sin spam, te das de baja con un clic.",
    newsBtn: "Suscribirme",
    emailPh: "Tu email",
    nfTitle: "Esta página se ha perdido",
    nfLead: "Busca cualquier ciudad o empieza por una de estas.",
    savedTitle: "Tus hoteles guardados",
    savedLead: "Se guardan solo en este dispositivo. Sin cuenta.",
    priceRef: (d) => `Precio de referencia, revisado el ${d}`,
    guests: "Adultos",
    rooms: "Habitaciones",
    currency: "Moneda",
  },
  de: {
    js: js({
      search: "Stadt suchen",
      ph: "Stadt eingeben: London, Rom, München…",
      surprise: "Überrasch mich",
      none: "Keine Stadt gefunden. Versuche eine andere Schreibweise.",
      save: "Merken",
      saved: "Gemerkt",
      recent: "Zuletzt angesehen",
      share: "Teilen",
      copied: "Link kopiert",
      total: "≈ {p} für {n} Nächte",
      approx: "ca.",
      empty: "Noch nichts gemerkt. Tippe bei einem Hotel auf ♡.",
      ok: "Danke! Du bist dabei.",
      err: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
      open: "Öffnen",
      remove: "Entfernen",
    }),
    whyScore: (s, n) => `${s}/10 aus ${n} Gästebewertungen`,
    whyFrom: (n) => `Ausgewählt aus ${n} Hotels`,
    in1: "In 1 Sekunde",
    jHotels: "Hotels",
    jWhere: "Wo übernachten",
    jMap: "Karte",
    jCompare: "Vergleich",
    jFaq: "FAQ",
    flights: "Direktflüge ab",
    compareWith: (c) => `${c} vergleichen mit`,
    vsTitle: (a, b) => `${a} vs. ${b}: die besten Hotels im direkten Vergleich`,
    vsLead: (a, b) =>
      `Unsere Budget-, Preis-Leistungs- und Luxus-Tipps in ${a} und ${b} mit Bewertungen und Referenzpreisen: Stadt und Hotel auf einen Blick wählen.`,
    cheapNav: "Günstigste Städte",
    cheapTitle: "Die günstigsten Städte für ein gutes Hotel",
    cheapLead: (n) =>
      `${n} Reiseziele, sortiert nach dem Referenzpreis unseres Budget-Tipps (Bewertung ab 7,5/10). Zwei Erwachsene, ein Zimmer.`,
    under: "Unter",
    all: "Alle",
    embedTitle: "Diese Top 3 in deinen Blog oder deine Website einbauen",
    embedHow: "Code kopieren. Zeigt die drei Hotels mit Fotos und Links und bleibt aktuell.",
    newsTitle: "3 Städte, 9 Hotels, jeden Freitag",
    newsLead:
      "Eine kurze E-Mail mit drei Reisezielen und ihren Budget-, Preis-Leistungs- und Luxus-Tipps. Kein Spam, Abmeldung mit einem Klick.",
    newsBtn: "Abonnieren",
    emailPh: "Deine E-Mail",
    nfTitle: "Diese Seite hat sich verlaufen",
    nfLead: "Suche eine Stadt oder starte mit einer dieser.",
    savedTitle: "Deine gemerkten Hotels",
    savedLead: "Nur auf diesem Gerät gespeichert. Kein Konto nötig.",
    priceRef: (d) => `Referenzpreis, geprüft am ${d}`,
    guests: "Erwachsene",
    rooms: "Zimmer",
    currency: "Währung",
  },
  fr: {
    js: js({
      search: "Chercher une ville",
      ph: "Tapez une ville : Londres, Rome, Munich…",
      surprise: "Surprenez-moi",
      none: "Aucune ville trouvée. Essayez une autre orthographe.",
      save: "Enregistrer",
      saved: "Enregistré",
      recent: "Vus récemment",
      share: "Partager",
      copied: "Lien copié",
      total: "≈ {p} pour {n} nuits",
      approx: "env.",
      empty: "Rien d'enregistré pour l'instant. Touchez ♡ sur un hôtel.",
      ok: "Merci ! Vous êtes inscrit.",
      err: "Une erreur s'est produite. Réessayez.",
      open: "Ouvrir",
      remove: "Retirer",
    }),
    whyScore: (s, n) => `${s}/10 sur ${n} avis clients`,
    whyFrom: (n) => `Choisi parmi ${n} hôtels`,
    in1: "En 1 seconde",
    jHotels: "Hôtels",
    jWhere: "Où dormir",
    jMap: "Carte",
    jCompare: "Comparer",
    jFaq: "FAQ",
    flights: "Vols directs depuis",
    compareWith: (c) => `Comparer ${c} avec`,
    vsTitle: (a, b) => `${a} ou ${b} : les meilleurs hôtels face à face`,
    vsLead: (a, b) =>
      `Nos choix Petit budget, Meilleur rapport qualité-prix et Luxe à ${a} et ${b}, avec notes et prix de référence, pour choisir la ville et l'hôtel d'un coup d'œil.`,
    cheapNav: "Villes les moins chères",
    cheapTitle: "Les villes les moins chères pour un bon hôtel",
    cheapLead: (n) =>
      `${n} destinations classées selon le prix de référence de notre choix Petit budget, noté 7,5/10 ou plus. Deux adultes, une chambre.`,
    under: "Moins de",
    all: "Toutes",
    embedTitle: "Ajoutez ce Top 3 à votre blog ou site",
    embedHow: "Copiez ce code. Il affiche les trois hôtels avec photos et liens, et reste à jour.",
    newsTitle: "3 villes, 9 hôtels, chaque vendredi",
    newsLead:
      "Un e-mail court avec trois destinations et leurs choix Petit budget, Rapport qualité-prix et Luxe. Pas de spam, désinscription en un clic.",
    newsBtn: "S'abonner",
    emailPh: "Votre e-mail",
    nfTitle: "Cette page s'est égarée",
    nfLead: "Cherchez une ville ou commencez par l'une de celles-ci.",
    savedTitle: "Vos hôtels enregistrés",
    savedLead: "Enregistrés sur cet appareil uniquement. Sans compte.",
    priceRef: (d) => `Prix de référence, vérifié le ${d}`,
    guests: "Adultes",
    rooms: "Chambres",
    currency: "Devise",
  },
  it: {
    js: js({
      search: "Cerca una città",
      ph: "Scrivi una città: Londra, Roma, Monaco…",
      surprise: "Sorprendimi",
      none: "Nessuna città trovata. Prova un'altra grafia.",
      save: "Salva",
      saved: "Salvato",
      recent: "Visti di recente",
      share: "Condividi",
      copied: "Link copiato",
      total: "≈ {p} per {n} notti",
      approx: "circa",
      empty: "Ancora niente di salvato. Tocca ♡ su un hotel.",
      ok: "Grazie! Sei iscritto.",
      err: "Qualcosa è andato storto. Riprova.",
      open: "Apri",
      remove: "Rimuovi",
    }),
    whyScore: (s, n) => `${s}/10 su ${n} recensioni`,
    whyFrom: (n) => `Scelto tra ${n} hotel`,
    in1: "In 1 secondo",
    jHotels: "Hotel",
    jWhere: "Dove dormire",
    jMap: "Mappa",
    jCompare: "Confronta",
    jFaq: "FAQ",
    flights: "Voli diretti da",
    compareWith: (c) => `Confronta ${c} con`,
    vsTitle: (a, b) => `${a} o ${b}: i migliori hotel a confronto`,
    vsLead: (a, b) =>
      `Le nostre scelte Economico, Miglior rapporto qualità-prezzo e Lusso a ${a} e ${b}, con voti e prezzi di riferimento, per scegliere città e hotel in un attimo.`,
    cheapNav: "Città più economiche",
    cheapTitle: "Le città più economiche per un buon hotel",
    cheapLead: (n) =>
      `${n} destinazioni ordinate per il prezzo di riferimento della nostra scelta Economica, con voto da 7,5/10 in su. Due adulti, una camera.`,
    under: "Sotto",
    all: "Tutte",
    embedTitle: "Aggiungi questa Top 3 al tuo blog o sito",
    embedHow: "Copia questo codice. Mostra i tre hotel con foto e link, sempre aggiornati.",
    newsTitle: "3 città, 9 hotel, ogni venerdì",
    newsLead:
      "Una breve email con tre destinazioni e le loro scelte Economico, Qualità-prezzo e Lusso. Niente spam, disiscrizione con un clic.",
    newsBtn: "Iscriviti",
    emailPh: "La tua email",
    nfTitle: "Questa pagina si è persa",
    nfLead: "Cerca una città o inizia da una di queste.",
    savedTitle: "I tuoi hotel salvati",
    savedLead: "Salvati solo su questo dispositivo. Nessun account.",
    priceRef: (d) => `Prezzo di riferimento, verificato il ${d}`,
    guests: "Adulti",
    rooms: "Camere",
    currency: "Valuta",
  },
  pt: {
    js: js({
      search: "Pesquisar uma cidade",
      ph: "Escreva uma cidade: Londres, Roma, Munique…",
      surprise: "Surpreenda-me",
      none: "Nenhuma cidade encontrada. Tente outra grafia.",
      save: "Guardar",
      saved: "Guardado",
      recent: "Vistos recentemente",
      share: "Partilhar",
      copied: "Link copiado",
      total: "≈ {p} por {n} noites",
      approx: "aprox.",
      empty: "Ainda não guardou nada. Toque em ♡ num hotel.",
      ok: "Obrigado! Já está na lista.",
      err: "Algo correu mal. Tente novamente.",
      open: "Abrir",
      remove: "Remover",
    }),
    whyScore: (s, n) => `${s}/10 em ${n} avaliações`,
    whyFrom: (n) => `Escolhido entre ${n} hotéis`,
    in1: "Em 1 segundo",
    jHotels: "Hotéis",
    jWhere: "Onde ficar",
    jMap: "Mapa",
    jCompare: "Comparar",
    jFaq: "FAQ",
    flights: "Voos diretos de",
    compareWith: (c) => `Comparar ${c} com`,
    vsTitle: (a, b) => `${a} ou ${b}: os melhores hotéis lado a lado`,
    vsLead: (a, b) =>
      `As nossas escolhas Económico, Melhor custo-benefício e Luxo em ${a} e ${b}, com notas e preços de referência, para escolher cidade e hotel num instante.`,
    cheapNav: "Cidades mais baratas",
    cheapTitle: "As cidades mais baratas para um bom hotel",
    cheapLead: (n) =>
      `${n} destinos ordenados pelo preço de referência da nossa escolha Económica, com nota de 7,5/10 ou mais. Dois adultos, um quarto.`,
    under: "Até",
    all: "Todas",
    embedTitle: "Adicione este Top 3 ao seu blog ou site",
    embedHow: "Copie este código. Mostra os três hotéis com fotos e links, sempre atualizados.",
    newsTitle: "3 cidades, 9 hotéis, todas as sextas",
    newsLead:
      "Um email curto com três destinos e as escolhas Económico, Custo-benefício e Luxo. Sem spam, cancele com um clique.",
    newsBtn: "Subscrever",
    emailPh: "O seu email",
    nfTitle: "Esta página perdeu-se",
    nfLead: "Pesquise uma cidade ou comece por uma destas.",
    savedTitle: "Os seus hotéis guardados",
    savedLead: "Guardados só neste dispositivo. Sem conta.",
    priceRef: (d) => `Preço de referência, verificado a ${d}`,
    guests: "Adultos",
    rooms: "Quartos",
    currency: "Moeda",
  },
  da: {
    js: js({
      search: "Søg en by",
      ph: "Skriv en by: London, Rom, München…",
      surprise: "Overrask mig",
      none: "Ingen by fundet. Prøv en anden stavemåde.",
      save: "Gem",
      saved: "Gemt",
      recent: "Senest set",
      share: "Del",
      copied: "Link kopieret",
      total: "≈ {p} for {n} nætter",
      approx: "ca.",
      empty: "Intet gemt endnu. Tryk ♡ på et hotel.",
      ok: "Tak! Du er tilmeldt.",
      err: "Noget gik galt. Prøv igen.",
      open: "Åbn",
      remove: "Fjern",
    }),
    whyScore: (s, n) => `${s}/10 fra ${n} gæsteanmeldelser`,
    whyFrom: (n) => `Valgt blandt ${n} hoteller`,
    in1: "På 1 sekund",
    jHotels: "Hoteller",
    jWhere: "Hvor skal man bo",
    jMap: "Kort",
    jCompare: "Sammenlign",
    jFaq: "FAQ",
    flights: "Direkte fly fra",
    compareWith: (c) => `Sammenlign ${c} med`,
    vsTitle: (a, b) => `${a} eller ${b}: de bedste hoteller side om side`,
    vsLead: (a, b) =>
      `Vores Budget-, Bedste værdi- og Luksusvalg i ${a} og ${b} med bedømmelser og referencepriser, så du kan vælge by og hotel med ét blik.`,
    cheapNav: "Billigste byer",
    cheapTitle: "De billigste byer til et godt hotel",
    cheapLead: (n) =>
      `${n} destinationer sorteret efter referenceprisen på vores Budget-valg, bedømt 7,5/10 eller bedre. To voksne, ét værelse.`,
    under: "Under",
    all: "Alle",
    embedTitle: "Tilføj denne Top 3 til din blog eller hjemmeside",
    embedHow: "Kopiér koden. Den viser de tre hoteller med billeder og links og holder sig opdateret.",
    newsTitle: "3 byer, 9 hoteller, hver fredag",
    newsLead:
      "En kort e-mail med tre destinationer og deres Budget-, Værdi- og Luksusvalg. Ingen spam, afmeld med ét klik.",
    newsBtn: "Tilmeld",
    emailPh: "Din e-mail",
    nfTitle: "Denne side er faret vild",
    nfLead: "Søg en by, eller start med en af disse.",
    savedTitle: "Dine gemte hoteller",
    savedLead: "Gemt kun på denne enhed. Ingen konto.",
    priceRef: (d) => `Referencepris, tjekket ${d}`,
    guests: "Voksne",
    rooms: "Værelser",
    currency: "Valuta",
  },
};

/* Exonyms so "Londres", "Múnich" or "Kopenhagen" find the right city. Keys are normalised. */
export const ALIASES: Record<string, string> = {
  londres: "london", londra: "london", londen: "london",
  roma: "rome", rom: "rome",
  munich: "munich", munchen: "munich", munique: "munich", monaco: "munich", "monaco di baviera": "munich",
  lisboa: "lisbon", lissabon: "lisbon", lisbonne: "lisbon", lisbona: "lisbon",
  copenhague: "copenhagen", kobenhavn: "copenhagen", kopenhagen: "copenhagen", copenaghen: "copenhagen", copenhaga: "copenhagen",
  atenas: "athens", athen: "athens", athenes: "athens", atene: "athens",
  praga: "prague", prag: "prague",
  viena: "vienna", wien: "vienna", vienne: "vienna", "viena de austria": "vienna",
  venecia: "venice", venezia: "venice", venedig: "venice", veneza: "venice", venise: "venice",
  florencia: "florence", firenze: "florence", florenz: "florence", florenca: "florence",
  milan: "milan", milano: "milan", mailand: "milan", milao: "milan",
  napoles: "naples", napoli: "naples", neapel: "naples",
  bruselas: "brussels", bruxelles: "brussels", brussel: "brussels", bruxelas: "brussels",
  colonia: "cologne", koln: "cologne",
  ginebra: "geneva", geneve: "geneva", genf: "geneva", ginevra: "geneva", genebra: "geneva",
  estocolmo: "stockholm", stoccolma: "stockholm",
  varsovia: "warsaw", warszawa: "warsaw", warschau: "warsaw", varsavia: "warsaw",
  cracovia: "krakow", krakau: "krakow", cracovie: "krakow",
  estambul: "istanbul", istambul: "istanbul",
  "nueva york": "new-york", "nova iorque": "new-york", "new york city": "new-york", nyc: "new-york",
  "el cairo": "cairo", "le caire": "cairo", "il cairo": "cairo", kairo: "cairo",
  pekin: "beijing", pechino: "beijing",
  dublin: "dublin-ireland", dublino: "dublin-ireland",
  edimburgo: "edinburgh",
  amsterdan: "amsterdam", amsterdao: "amsterdam",
  berlin: "berlin", berlim: "berlin", berlino: "berlin",
  paris: "paris", parigi: "paris",
  barcelone: "barcelona", barcellona: "barcelona",
  sevilla: "seville", seville: "seville", siviglia: "seville", sevilha: "seville",
  tokio: "tokyo", toquio: "tokyo",
  "ciudad de mexico": "mexico-city", "cidade do mexico": "mexico-city",
  belgrado: "belgrade", bucarest: "bucharest", bukarest: "bucharest",
  oslo: "oslo", helsinki: "helsinki", "helsingfors": "helsinki",
  zurich: "zurich", zurigo: "zurich",
  "aarhus": "aarhus", "arhus": "aarhus",
};

/** Styles added on top of the base CSS. */
export const CSS_PLUS = `@view-transition{navigation:auto}
.price,.pricetag,.v2-price,td{font-variant-numeric:tabular-nums lining-nums}
.tbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);font:inherit;font-size:13px;cursor:pointer;padding:0 12px}
.tbtn:hover{border-color:var(--ink)}.tbtn kbd{font:600 11px var(--sans);border:1px solid var(--line);border-radius:5px;padding:1px 5px;color:var(--muted)}
.tbtn .n{background:var(--coral);color:#fff;border-radius:999px;font-size:10.5px;font-weight:700;padding:1px 6px;margin-left:2px}
@media (max-width:640px){.tbtn kbd,.tbtn .lbl{display:none}}
@media (max-width:560px){.top nav>a:first-child{display:none}.tbtn{min-width:42px;min-height:42px;padding:0 10px}.in1 a{padding:9px 12px}.in1h{margin-top:16px}}
.pal{position:fixed;inset:0;z-index:120;background:#05090fb3;display:flex;align-items:flex-start;justify-content:center;padding:10vh 16px 16px;backdrop-filter:blur(4px)}
.pal>div{width:min(620px,100%);background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:0 30px 80px #0007;overflow:hidden;animation:palin .18s ease-out both}
@keyframes palin{from{transform:translateY(-8px) scale(.98);opacity:0}to{transform:none;opacity:1}}
.pal input{width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);font:500 19px var(--sans);padding:20px 22px;outline:0}
.pal ul{list-style:none;margin:0;padding:8px;max-height:52vh;overflow:auto}
.pal li a{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 14px;border-radius:12px;color:var(--ink);text-decoration:none;min-height:48px}
.pal li a span{color:var(--muted);font-size:13px}.pal li a[aria-selected=true],.pal li a:hover{background:var(--soft)}
.pal .foot{display:flex;justify-content:space-between;gap:10px;padding:10px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}.pal .foot a{color:var(--ink);font-weight:600}
.acts{display:flex;gap:6px;position:absolute;right:10px;top:12px;z-index:3}
.acts button{width:40px;height:40px;border-radius:50%;border:0;background:#fffffff0;color:#10213a;font-size:18px;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:0 3px 12px #0003;transition:transform .15s ease}
.acts button:hover{transform:scale(1.08)}.acts button.on{color:#d83b51}.acts button.pop{animation:pop .45s ease}
@keyframes pop{0%{transform:scale(1)}35%{transform:scale(1.35)}70%{transform:scale(.92)}100%{transform:scale(1)}}
.cityphoto{right:auto!important;left:12px;top:auto!important;bottom:62px}
.ring{--p:0;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#fff calc(var(--p)*1%),#ffffff40 0);box-shadow:0 4px 14px #0004}
.ring b{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#10213a;color:#fff;font:700 15px/1 var(--sans)}
.badge span:first-child{padding:7px 12px 7px 10px;border-radius:6px 999px 999px 6px}
.card.lux .badge span:first-child{background:linear-gradient(135deg,#b8860b,#e3c26a 50%,#9a6b00);color:#10213a}
.why{list-style:none;margin:0;padding:10px 12px;background:var(--soft);border-radius:12px;display:grid;gap:5px;font-size:12.5px}
.why li{display:flex;gap:8px;align-items:baseline}.why li:before{content:"✓";color:var(--c);font-weight:800}
.total{font-weight:600;color:var(--ink)}
.cmp a{display:inline-flex;align-items:center;min-height:36px}
.cards .card{animation:rise .6s cubic-bezier(.2,.7,.2,1) both}.cards .card:nth-child(2){animation-delay:.08s}.cards .card:nth-child(3){animation-delay:.16s}
@keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.media .alt{position:absolute;inset:0;opacity:0;transition:opacity .35s ease}.card:hover .media .alt.ready{opacity:1}
.in1{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 0}
.in1 a{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line);border-top:4px solid var(--c);text-decoration:none;color:var(--ink)}
.in1 a small{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700}.in1 a strong{font:600 16px/1.25 var(--serif)}.in1 a span{font-size:12.5px;color:var(--muted)}
.in1 .budget{--c:var(--budget)}.in1 .value{--c:var(--value)}.in1 .lux{--c:var(--lux)}
.in1h{display:flex;align-items:center;gap:8px;margin:22px 0 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}.in1h:before{content:"⚡"}
@media (max-width:700px){.in1{grid-template-columns:1fr}.in1 a{flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 10px}}
.jump{position:sticky;top:66px;z-index:30;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;margin:18px -16px 0;padding:8px 16px;background:color-mix(in srgb,var(--paper) 92%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.jump::-webkit-scrollbar{display:none}.jump a{flex:none;font-size:13px;font-weight:600;color:var(--ink);text-decoration:none;padding:8px 14px;border-radius:999px;min-height:40px;display:inline-flex;align-items:center}.jump a:hover,.jump a.on{background:var(--soft)}
section[id],h2[id]{scroll-margin-top:130px}#hotels{scroll-margin-top:130px}
.flights{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 2px 0;font-size:12.5px;color:var(--muted)}.flights a{font-weight:600;color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:5px 11px;min-height:34px;display:inline-flex;align-items:center;background:var(--card)}
.plan select{font:inherit;border:1px solid var(--line);border-radius:12px;padding:9px 10px;min-height:46px;color:var(--ink);background:var(--paper)}
main section>h2:before{content:"";display:block;width:34px;height:3px;border-radius:3px;background:var(--coral);margin:0 0 14px}
.chipsrow{display:flex;flex-wrap:wrap;gap:8px}.chipsrow a{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:8px 14px;min-height:40px;display:inline-flex;align-items:center;gap:6px;color:var(--ink);text-decoration:none;font-size:13.5px}.chipsrow a:hover{border-color:var(--ink)}
.news{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;align-items:center;background:linear-gradient(135deg,#10213a,#13417a);color:#fff;border-radius:22px;padding:26px 28px}
.news h2{color:#fff;margin:0 0 6px}.news h2:before{background:#ff8a9a}.news p{margin:0;color:#dfe7f1;font-size:14.5px}
.news form{display:flex;gap:8px;flex-wrap:wrap}.news input{flex:1 1 200px;min-height:50px;border-radius:12px;border:0;padding:0 14px;font:inherit;font-size:16px}.news .btn{background:#ff6b7f;color:#10213a}
@media (max-width:760px){.news{grid-template-columns:1fr}}
.lb{flex-direction:column;gap:12px}.lb .nav{position:absolute;top:50%;transform:translateY(-50%);width:52px;height:52px;border-radius:50%;border:0;background:#ffffffe6;color:#10213a;font-size:24px;cursor:pointer}.lb .prev{left:14px}.lb .next{right:14px}
.lb .cnt{color:#dfe7f1;font-size:13px}.lb .x{position:absolute;top:14px;right:14px;width:46px;height:46px;border-radius:50%;border:0;background:#ffffffe6;font-size:22px;cursor:pointer}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:18px}.vs>div{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:var(--shadow)}.vs h2{font-size:28px;margin:0 0 10px}
.vs .row{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid var(--line);font-size:14px}.vs .row b{display:block;font:600 16px/1.25 var(--serif)}.vs .row small{color:var(--muted)}.vs .row .pr{text-align:right;white-space:nowrap}
@media (max-width:700px){.vs{grid-template-columns:1fr}}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.filters button{font:inherit;font-size:13.5px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:8px 16px;min-height:42px;cursor:pointer}.filters button[aria-pressed=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.rank td:first-child{font:600 18px var(--serif);color:var(--muted);width:44px}
.saved{display:grid;gap:12px}.saved .it{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:16px;padding:12px}
.saved .it img{width:84px;height:64px;object-fit:cover;border-radius:10px;background:var(--soft)}.saved .it div{flex:1}.saved .it b{font:600 17px/1.2 var(--serif);display:block}.saved .it small{color:var(--muted)}
.saved .budget{--c:var(--budget)}.saved .value{--c:var(--value)}.saved .lux{--c:var(--lux)}
.ok-flash{animation:pop .45s ease}
@media print{.jump,.acts,.news,.tbtn,.flights{display:none!important}.cards{display:block}.card{break-inside:avoid;margin-bottom:12px;box-shadow:none}}`;

/** Client features shared by every server-rendered page. Reads window.T3S (strings) and window.T3L (language). */
export const JS_PLUS = `(function(){var S=window.T3S||{},L=window.T3L||'en',pre=L==='en'?'':'/'+L;
function ls(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v))}catch(_){return null}}
function norm(s){return String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\\s+/g,' ').trim()}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;var d=[],i,j;for(i=0;i<=a.length;i++)d[i]=[i];for(j=0;j<=b.length;j++)d[0][j]=j;for(i=1;i<=a.length;i++)for(j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
var IDX=null,AL=${JSON.stringify(ALIASES)};function idx(){return IDX?Promise.resolve(IDX):fetch('/api/cities.json').then(function(r){return r.json()}).then(function(j){IDX=j.map(function(c){return{s:c[0],c:c[1],k:c[2],p:c[3],n:norm(c[1]),nk:norm(c[2])}});return IDX})}
function find(q){q=norm(q);if(!q)return IDX.slice().sort(function(a,b){return b.p-a.p}).slice(0,8);var al=AL[q]||AL[q.replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u')]||AL[q.replace(/ö/g,'o')],out=[];IDX.forEach(function(c){var sc=0;if(al&&c.s===al)sc=1000;else if(c.n===q)sc=900;else if(c.n.indexOf(q)===0)sc=700;else if(c.n.indexOf(' '+q)>=0)sc=500;else if(q.length>3&&lev(q,c.n.slice(0,q.length))<=(q.length>6?2:1))sc=300;else if(c.nk.indexOf(q)===0)sc=150;if(sc)out.push([sc+Math.log(1+c.p),c])});return out.sort(function(a,b){return b[0]-a[0]}).slice(0,8).map(function(x){return x[1]})}
function palette(){if(document.querySelector('.pal'))return;var w=document.createElement('div');w.className='pal';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-label',S.search);w.innerHTML='<div><input type="search" autocomplete="off" spellcheck="false" aria-label="'+esc(S.search)+'" placeholder="'+esc(S.ph)+'"><ul role="listbox"></ul><div class="foot"><a href="/random" data-t="surprise">🎲 '+esc(S.surprise)+'</a><span>↑ ↓ · Enter · Esc</span></div></div>';document.body.appendChild(w);var inp=w.querySelector('input'),ul=w.querySelector('ul'),sel=0,res=[];
function draw(){ul.innerHTML=res.length?res.map(function(c,i){return '<li><a role="option" aria-selected="'+(i===sel)+'" href="'+pre+'/'+c.s+'">'+esc(c.c)+' <span>'+esc(c.k)+'</span></a></li>'}).join(''):'<li style="padding:14px;color:var(--muted)">'+esc(S.none)+'</li>'}
function run(){idx().then(function(){res=find(inp.value);sel=0;draw()})}
function close(){w.remove()}inp.addEventListener('input',run);w.addEventListener('click',function(e){if(e.target===w)close()});inp.addEventListener('keydown',function(e){if(e.key==='Escape')close();else if(e.key==='ArrowDown'){sel=Math.min(sel+1,res.length-1);draw();e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault()}else if(e.key==='Enter'&&res[sel]){location.href=pre+'/'+res[sel].s}});run();setTimeout(function(){inp.focus()},10);if(window.t3track)t3track('search_open',{})}
document.addEventListener('keydown',function(e){var t=e.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);if(!typing&&(e.key==='/'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'))){e.preventDefault();palette()}});
document.addEventListener('click',function(e){if(e.target.closest('[data-pal]')){e.preventDefault();palette()}});
/* saved hotels */
function favs(){return ls('t3-fav')||[]}function savedCount(){var n=favs().length;document.querySelectorAll('[data-savedn]').forEach(function(el){el.textContent=n;el.hidden=!n})}
function markFav(){var f=favs().map(function(x){return x.k});document.querySelectorAll('[data-fav]').forEach(function(b){var on=f.indexOf(JSON.parse(b.getAttribute('data-fav')).k)>=0;b.classList.toggle('on',on);b.textContent=on?'♥':'♡';b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?S.saved:S.save)})}
document.addEventListener('click',function(e){var b=e.target.closest('[data-fav]');if(!b)return;e.preventDefault();var d=JSON.parse(b.getAttribute('data-fav')),f=favs(),i=-1;f.forEach(function(x,j){if(x.k===d.k)i=j});if(i>=0)f.splice(i,1);else f.unshift(d);ls('t3-fav',f.slice(0,60));markFav();savedCount();b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');if(window.t3track)t3track(i>=0?'unsave':'save',{city:d.s,category:d.cat})});
markFav();savedCount();
/* share one card */
document.addEventListener('click',function(e){var b=e.target.closest('[data-sharecard]');if(!b)return;e.preventDefault();var u=b.getAttribute('data-sharecard'),t=b.getAttribute('data-title');var done=function(){b.textContent='✓';b.classList.add('pop');setTimeout(function(){b.textContent='↗';b.classList.remove('pop')},1600)};if(navigator.share&&matchMedia('(pointer:coarse)').matches)navigator.share({url:u,title:t}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(done);if(window.t3track)t3track('share',{p:'card'})});
/* recently viewed */
var me=document.querySelector('[data-track]');if(me){var r=ls('t3-recent')||[],d=JSON.parse(me.getAttribute('data-track'));r=r.filter(function(x){return x.s!==d.s});r.unshift(d);ls('t3-recent',r.slice(0,10))}
document.querySelectorAll('[data-recent]').forEach(function(box){var r=(ls('t3-recent')||[]).filter(function(x){return !me||x.s!==JSON.parse(me.getAttribute('data-track')).s}).slice(0,8);if(!r.length)return;box.hidden=false;box.querySelector('.chipsrow').innerHTML=r.map(function(x){return '<a href="'+pre+'/'+x.s+'">'+esc(x.c)+'</a>'}).join('')});
/* saved page */
var sv=document.querySelector('[data-savedpage]');if(sv){var draw=function(){var f=favs();sv.innerHTML=f.length?f.map(function(x,i){return '<div class="it '+esc(x.cat)+'">'+(x.img?'<img src="'+esc(x.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'<div><small>'+esc(x.lbl)+' · '+esc(x.c)+'</small><b>'+esc(x.n)+'</b><small>'+esc(x.p||'')+'</small></div><a class="btn ghost" href="'+pre+'/'+esc(x.s)+'#'+esc(x.cat)+'">'+esc(S.open)+'</a><button class="tbtn" data-rm="'+i+'" aria-label="'+esc(S.remove)+'">✕</button></div>'}).join(''):'<p class="lead">'+esc(S.empty)+'</p>'};draw();sv.addEventListener('click',function(e){var b=e.target.closest('[data-rm]');if(!b)return;var f=favs();f.splice(+b.getAttribute('data-rm'),1);ls('t3-fav',f);draw();savedCount()})}
/* currency */
var CUR={EUR:1,GBP:.86,USD:1.08,DKK:7.46,SEK:11.4,NOK:11.6,CHF:.94};var cr=ls('t3-rates');if(cr&&Date.now()-cr.t<864e5)Object.assign(CUR,cr.r);else fetch('/api/rates').then(function(r){return r.json()}).then(function(j){if(j&&j.rates){Object.assign(CUR,j.rates);ls('t3-rates',{t:Date.now(),r:j.rates});paint()}}).catch(function(){});
function guessCur(){var l=(navigator.language||'').toLowerCase();if(/-gb$/.test(l))return'GBP';if(/-us$/.test(l))return'USD';if(/^da/.test(l))return'DKK';if(/^sv/.test(l))return'SEK';if(/^(nb|nn|no)/.test(l))return'NOK';if(/-ch$/.test(l))return'CHF';return'EUR'}
var cur=ls('t3-cur')||guessCur();function fmt(v){try{return new Intl.NumberFormat(L,{style:'currency',currency:cur,maximumFractionDigits:0}).format(v*CUR[cur])}catch(_){return Math.round(v)+' €'}}
function nights(){var f=document.querySelector('form.plan');if(!f)return 0;var a=f.querySelector('[name=checkin]').value,b=f.querySelector('[name=checkout]').value;var n=Math.round((Date.parse(b)-Date.parse(a))/864e5);return n>0&&n<60?n:0}
function paint(){document.querySelectorAll('[data-eur]').forEach(function(el){var v=+el.getAttribute('data-eur');if(!v)return;var s=el.querySelector('.v')||el;s.textContent=fmt(v)});var n=nights(),f=document.querySelector('form.plan'),rooms=f&&f.querySelector('[name=rooms]')?+f.querySelector('[name=rooms]').value:1;document.querySelectorAll('[data-total]').forEach(function(el){var v=+el.getAttribute('data-total');el.textContent=n&&v?(S.total||'').replace('{p}',fmt(v*n*rooms)).replace('{n}',n):'';el.hidden=!(n&&v)});document.querySelectorAll('[data-cur]').forEach(function(s){s.value=cur})}
document.addEventListener('change',function(e){if(e.target.matches('[data-cur]')){cur=e.target.value;ls('t3-cur',cur);paint();if(window.t3track)t3track('currency',{c:cur})}});
/* guests, rooms and dates → every booking link on the page */
function relink(){var f=document.querySelector('form.plan');if(!f)return;var ci=f.querySelector('[name=checkin]').value,co=f.querySelector('[name=checkout]').value,ad=f.querySelector('[name=adults]')?f.querySelector('[name=adults]').value:'2',ro=f.querySelector('[name=rooms]')?f.querySelector('[name=rooms]').value:'1',ok=ci&&co&&co>ci;document.querySelectorAll('a[href*="booking.com"],a[href*="expedia.com"],a[href*="agoda.com"]').forEach(function(a){try{var u=new URL(a.href),h=u.hostname;if(/booking/.test(h)){u.searchParams.set('group_adults',ad);u.searchParams.set('no_rooms',ro);if(ok){u.searchParams.set('checkin',ci);u.searchParams.set('checkout',co)}}else if(/expedia/.test(h)){u.searchParams.set('adults',ad);u.searchParams.set('rooms',ro);if(ok){u.searchParams.set('startDate',ci);u.searchParams.set('endDate',co)}}else{u.searchParams.set('adults',ad);u.searchParams.set('rooms',ro);if(ok){u.searchParams.set('checkIn',ci);u.searchParams.set('los',Math.round((Date.parse(co)-Date.parse(ci))/864e5))}}a.href=u.toString()}catch(_){}});paint()}
document.addEventListener('input',function(e){if(e.target.closest('form.plan'))relink()});document.addEventListener('change',function(e){if(e.target.closest('form.plan'))relink()});document.addEventListener('click',function(e){if(e.target.closest('[data-quick]'))setTimeout(relink,0)});
paint();
/* gallery lightbox with swipe, arrows and counter */
document.addEventListener('click',function(e){var im=e.target.closest('.media img');if(!im||e.target.closest('.acts'))return;e.preventDefault();var m=im.closest('.media'),g=[];try{g=JSON.parse(m.getAttribute('data-gallery')||'[]')}catch(_){}if(!g.length)g=[im.currentSrc||im.src];var i=Math.max(0,g.indexOf(im.getAttribute('src'))),d=document.createElement('div');d.className='lb';d.setAttribute('role','dialog');d.setAttribute('aria-label',im.alt||'Photo');d.innerHTML='<img alt="'+esc(im.alt||'')+'" referrerpolicy="no-referrer"><span class="cnt"></span><button class="x" aria-label="Close">✕</button>'+(g.length>1?'<button class="nav prev" aria-label="Previous">‹</button><button class="nav next" aria-label="Next">›</button>':'');var big=d.querySelector('img'),cnt=d.querySelector('.cnt');function show(k){i=(k+g.length)%g.length;big.src=g[i];cnt.textContent=(i+1)+' / '+g.length}show(i);function close(){d.remove();document.removeEventListener('keydown',key)}function key(ev){if(ev.key==='Escape')close();if(ev.key==='ArrowRight')show(i+1);if(ev.key==='ArrowLeft')show(i-1)}document.addEventListener('keydown',key);d.addEventListener('click',function(ev){if(ev.target.closest('.next'))show(i+1);else if(ev.target.closest('.prev'))show(i-1);else if(ev.target===d||ev.target.closest('.x'))close()});var x0=null;d.addEventListener('touchstart',function(ev){x0=ev.touches[0].clientX},{passive:true});d.addEventListener('touchend',function(ev){if(x0===null)return;var dx=ev.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)show(i+(dx<0?1:-1));x0=null});document.body.appendChild(d);d.querySelector('.x').focus()},true);
/* desktop hover: reveal the second photo */
if(matchMedia('(hover:hover)').matches)document.querySelectorAll('.media[data-gallery]').forEach(function(m){var g=[];try{g=JSON.parse(m.getAttribute('data-gallery'))}catch(_){}if(g.length<2)return;m.addEventListener('mouseenter',function(){if(m.querySelector('.alt'))return;var a=new Image();a.className='alt';a.alt='';a.referrerPolicy='no-referrer';a.onload=function(){a.classList.add('ready')};a.onerror=function(){a.remove()};a.src=g[1];m.insertBefore(a,m.querySelector('.badge'))},{once:true})});
/* sticky jump-nav highlight */
var jl=document.querySelectorAll('.jump a');if(jl.length&&'IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting)jl.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+en.target.id)})})},{rootMargin:'-40% 0px -55% 0px'});jl.forEach(function(a){var s=document.querySelector(a.getAttribute('href'));if(s)io.observe(s)})}
/* newsletter */
var nf=document.querySelector('[data-news]');if(nf){fetch('/api/alerts').then(function(r){return r.json()}).then(function(j){if(!j.enabled){var s=nf.closest('section');if(s)s.hidden=true}}).catch(function(){});nf.addEventListener('submit',function(e){e.preventDefault();var em=nf.querySelector('input').value,msg=nf.querySelector('.msg');fetch('/api/alerts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:em,city:'newsletter',category:L,max:1})}).then(function(r){msg.textContent=r.ok?S.ok:S.err;if(r.ok){nf.querySelector('input').value='';msg.classList.add('ok-flash');if(window.t3track)t3track('newsletter',{lang:L})}}).catch(function(){msg.textContent=S.err})})}
/* cheapest-cities filter */
document.querySelectorAll('[data-max]').forEach(function(b){b.addEventListener('click',function(){var mx=+b.getAttribute('data-max');document.querySelectorAll('[data-max]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});document.querySelectorAll('tr[data-price]').forEach(function(tr){tr.hidden=mx>0&&+tr.getAttribute('data-price')>mx})})});
})();`;


/** Trust pass for affiliate approval and hotel partnerships (Oct 2026). */
export type Trust = {
  disc: string;
  consent: string;
  accept: string;
  reject: string;
  more: string;
  filming: (c: string) => string;
  filmingLead: string;
  hotelsTitle: (c: string) => string;
  hotelsLead: string;
  hotelsCta: string;
};
export const Z: Record<Lang, Trust> = {
  en: {
    disc: "We may earn a commission if you book. It never changes our picks.",
    consent: "We use cookies for booking-partner tracking and basic statistics. Essential cookies are always on.",
    accept: "Accept",
    reject: "Reject",
    more: "Cookie policy",
    filming: (c) => `Hotels in ${c}: we're filming our ${c} picks in late October 2026`,
    filmingLead: "Want your hotel in our videos and featured as a labelled partner on this page? Tell us now, we confirm one hotel per category.",
    hotelsTitle: (c) => `Run a hotel in ${c}?`,
    hotelsLead: "Get a free badge for your website, see how travellers find you, or apply for a labelled partner feature with photos and video.",
    hotelsCta: "Work with us",
  },
  es: {
    disc: "Podemos ganar una comisión si reservas. Nunca cambia nuestra elección.",
    consent: "Usamos cookies para el seguimiento de los socios de reserva y estadísticas básicas. Las esenciales están siempre activas.",
    accept: "Aceptar",
    reject: "Rechazar",
    more: "Política de cookies",
    filming: (c) => `Hoteles de ${c}: grabamos nuestra selección de ${c} a finales de octubre de 2026`,
    filmingLead: "¿Quieres tu hotel en nuestros vídeos y destacado como partner (siempre etiquetado) en esta página? Escríbenos ya, confirmamos un hotel por categoría.",
    hotelsTitle: (c) => `¿Tienes un hotel en ${c}?`,
    hotelsLead: "Consigue un sello gratis para tu web, descubre cómo te encuentran los viajeros o solicita aparecer como partner etiquetado con fotos y vídeo.",
    hotelsCta: "Colabora con nosotros",
  },
  de: {
    disc: "Wir erhalten ggf. eine Provision, wenn du buchst. Unsere Auswahl ändert das nie.",
    consent: "Wir nutzen Cookies für das Tracking unserer Buchungspartner und einfache Statistiken. Notwendige Cookies sind immer aktiv.",
    accept: "Akzeptieren",
    reject: "Ablehnen",
    more: "Cookie-Richtlinie",
    filming: (c) => `Hotels in ${c}: Ende Oktober 2026 filmen wir unsere Auswahl in ${c}`,
    filmingLead: "Möchtest du dein Hotel in unseren Videos und als gekennzeichneten Partner auf dieser Seite? Melde dich jetzt, wir bestätigen ein Hotel pro Kategorie.",
    hotelsTitle: (c) => `Du führst ein Hotel in ${c}?`,
    hotelsLead: "Hol dir ein kostenloses Siegel für deine Website oder bewirb dich als gekennzeichneter Partner mit Fotos und Video.",
    hotelsCta: "Mit uns arbeiten",
  },
  fr: {
    disc: "Nous pouvons toucher une commission si vous réservez. Cela ne change jamais nos choix.",
    consent: "Nous utilisons des cookies pour le suivi de nos partenaires de réservation et des statistiques simples. Les cookies essentiels sont toujours actifs.",
    accept: "Accepter",
    reject: "Refuser",
    more: "Politique cookies",
    filming: (c) => `Hôtels à ${c} : nous filmons notre sélection à ${c} fin octobre 2026`,
    filmingLead: "Votre hôtel dans nos vidéos et mis en avant comme partenaire (toujours signalé) sur cette page ? Écrivez-nous, nous confirmons un hôtel par catégorie.",
    hotelsTitle: (c) => `Vous gérez un hôtel à ${c} ?`,
    hotelsLead: "Obtenez un badge gratuit pour votre site ou proposez-vous comme partenaire signalé, avec photos et vidéo.",
    hotelsCta: "Travailler avec nous",
  },
  it: {
    disc: "Potremmo ricevere una commissione se prenoti. Non cambia mai le nostre scelte.",
    consent: "Usiamo cookie per il tracciamento dei partner di prenotazione e statistiche di base. I cookie essenziali sono sempre attivi.",
    accept: "Accetta",
    reject: "Rifiuta",
    more: "Cookie policy",
    filming: (c) => `Hotel a ${c}: a fine ottobre 2026 filmiamo la nostra selezione di ${c}`,
    filmingLead: "Vuoi il tuo hotel nei nostri video e in evidenza come partner (sempre indicato) su questa pagina? Scrivici, confermiamo un hotel per categoria.",
    hotelsTitle: (c) => `Gestisci un hotel a ${c}?`,
    hotelsLead: "Ottieni un badge gratuito per il tuo sito o candidati come partner indicato, con foto e video.",
    hotelsCta: "Collabora con noi",
  },
  pt: {
    disc: "Podemos receber uma comissão se reservar. Isso nunca muda as nossas escolhas.",
    consent: "Usamos cookies para o acompanhamento dos parceiros de reserva e estatísticas básicas. Os essenciais estão sempre ativos.",
    accept: "Aceitar",
    reject: "Rejeitar",
    more: "Política de cookies",
    filming: (c) => `Hotéis em ${c}: vamos filmar a nossa seleção de ${c} no final de outubro de 2026`,
    filmingLead: "Quer o seu hotel nos nossos vídeos e em destaque como parceiro (sempre identificado) nesta página? Fale connosco, confirmamos um hotel por categoria.",
    hotelsTitle: (c) => `Tem um hotel em ${c}?`,
    hotelsLead: "Obtenha um selo gratuito para o seu site ou candidate-se a parceiro identificado, com fotos e vídeo.",
    hotelsCta: "Trabalhe connosco",
  },
  da: {
    disc: "Vi kan få provision, hvis du booker. Det ændrer aldrig vores valg.",
    consent: "Vi bruger cookies til sporing for vores bookingpartnere og enkel statistik. Nødvendige cookies er altid slået til.",
    accept: "Accepter",
    reject: "Afvis",
    more: "Cookiepolitik",
    filming: (c) => `Hoteller i ${c}: vi filmer vores udvalg i ${c} i slutningen af oktober 2026`,
    filmingLead: "Vil du have dit hotel med i vores videoer og fremhævet som (altid markeret) partner på denne side? Skriv nu, vi bekræfter ét hotel pr. kategori.",
    hotelsTitle: (c) => `Driver du et hotel i ${c}?`,
    hotelsLead: "Få et gratis badge til din hjemmeside, eller søg om at blive markeret partner med billeder og video.",
    hotelsCta: "Samarbejd med os",
  },
};

export const CSS_TRUST = `.disc{font-size:11.5px;color:var(--muted);margin:-4px 0 0;text-align:center}
.cbar{position:fixed;left:16px;right:16px;bottom:16px;z-index:90;max-width:720px;margin:0 auto;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px #0004;padding:14px 16px;font-size:13.5px}
.cbar p{margin:0;flex:1 1 280px}.cbar a{color:var(--muted)}.cbar .btn{min-height:42px;padding:0 16px}
@media (max-width:900px){.cbar{bottom:76px}}
.guide{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch;margin-top:16px}
.guide .box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px;box-shadow:var(--shadow)}
.guide h3{font:600 19px/1.2 var(--serif);margin:0 0 10px}.guide p{margin:0 0 10px;font-size:14.5px}
.guide dl{margin:0;display:grid;gap:10px}.guide dt{font-weight:700;font-size:13.5px}.guide dd{margin:2px 0 0;color:var(--muted);font-size:13.5px}
.guide ul{margin:0;padding-left:18px;display:grid;gap:8px;font-size:14px}
.hoods{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:6px}
.hood{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;position:relative;overflow:hidden}
.hood:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--budget),var(--value),var(--lux))}
.hood b{display:block;font:600 18px/1.2 var(--serif)}.hood small{display:block;color:var(--coral);font-size:11.5px;font-weight:600;letter-spacing:.3px;margin:4px 0 6px}.hood p{margin:0;font-size:13.5px;color:var(--muted)}
@media (max-width:960px){.guide{grid-template-columns:1fr}}@media (max-width:860px){.hoods{grid-template-columns:1fr 1fr}}@media (max-width:520px){.hoods{grid-template-columns:1fr}}
.collab{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:center;justify-content:space-between;border-radius:22px;padding:22px 26px;background:linear-gradient(120deg,#9a6b00,#c9971c 55%,#e3c26a);color:#10213a}
.collab h2{margin:0 0 6px;color:#10213a;font-size:clamp(22px,2.6vw,30px)}.collab h2:before{display:none}.collab p{margin:0;max-width:640px;font-size:14.5px}
.collab .btn{background:#10213a;color:#fff}
.forh{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between;border:1px dashed var(--line);border-radius:18px;padding:18px 20px}
.forh h3{font:600 20px/1.2 var(--serif);margin:0 0 4px}.forh p{margin:0;color:var(--muted);font-size:14px;max-width:640px}`;

/** Cookie consent: Travelpayouts (and any analytics) only load after "Accept". */
export const consentScript = (z: Trust) =>
  `<script>(function(){var K='t3-consent',v=null;try{v=localStorage.getItem(K)}catch(_){}function tp(){var s=document.createElement('script');s.async=1;s.setAttribute('data-cmp-ab','2');s.src='https://tp-em.com/NTc2OTIx.js?t=576921';document.head.appendChild(s)}function go(){(window.requestIdleCallback||function(f){setTimeout(f,1500)})(tp)}if(v==='yes'){if(document.readyState==='complete')go();else addEventListener('load',go);return}if(v==='no')return;addEventListener('DOMContentLoaded',function(){var b=document.createElement('div');b.className='cbar';b.setAttribute('role','dialog');b.setAttribute('aria-label','Cookies');b.innerHTML='<p>${z.consent.replace(/'/g, "\\'")} <a href="/cookies">${z.more}</a></p><button type="button" class="btn ghost" data-c="no">${z.reject}</button><button type="button" class="btn" data-c="yes">${z.accept}</button>';b.addEventListener('click',function(e){var c=e.target.getAttribute&&e.target.getAttribute('data-c');if(!c)return;try{localStorage.setItem(K,c)}catch(_){}b.remove();if(c==='yes')go()});document.body.appendChild(b)})})();</script>`;
