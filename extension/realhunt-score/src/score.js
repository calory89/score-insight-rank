// RealHunt Score — shared scoring engine (runs in content scripts and the side panel).
// Transparent 0–100 score from the listing the user is viewing. Every point comes with a reason.
// It is an estimate, not an appraisal. Sponsorship never changes a score.
(function (g) {
  const RHS = (g.RHS = g.RHS || {});
  const SQFT = 0.09290304;

  RHS.money = (n, cur) => {
    if (n == null || !isFinite(n)) return "—";
    const sym = { EUR: "€", GBP: "£", USD: "$" }[cur];
    if (RHS.lang === "es" && cur === "EUR") return Math.round(n).toLocaleString("es-ES") + " €";
    if (sym) return sym + Math.round(n).toLocaleString("en-GB");
    // v0.7: very large amounts in low-value currencies (IDR, VND, COP…) read better compact: "IDR 4.5B"
    if (Math.abs(n) >= 1e8) { try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur || "EUR", notation: "compact", maximumSignificantDigits: 3 }).format(n); } catch { /* fall through */ } }
    try { return new Intl.NumberFormat(RHS.lang === "da" && cur === "DKK" ? "da-DK" : "en-GB", { style: "currency", currency: cur || "EUR", maximumFractionDigits: 0 }).format(n); } catch { return Math.round(n).toLocaleString("en-GB") + " " + (cur || ""); }
  };
  RHS.num = (s) => {
    if (s == null) return null;
    if (typeof s === "number") return isFinite(s) ? s : null;
    const t = String(s).replace(/ /g, " ");
    const m = t.match(/\d[\d.,\s]*\d|\d/);
    if (!m) return null;
    let x = m[0].replace(/\s/g, "");
    // 1.250.000 / 1,250,000 / 1.250,50 / 85,5
    if (/^\d{1,3}([.,]\d{3})+$/.test(x)) x = x.replace(/[.,]/g, "");
    else if (/,\d{1,2}$/.test(x)) x = x.replace(/\./g, "").replace(",", ".");
    else x = x.replace(/,/g, "");
    const v = parseFloat(x);
    return isFinite(v) ? v : null;
  };
  RHS.sqm = (s) => {
    if (s == null) return null;
    if (typeof s === "number") return s;
    const t = String(s);
    const ft = t.match(/(\d[\d.,]*)\s*(sq\.?\s*ft|sqft|ft²|ft2)/i);
    if (ft) return Math.round(RHS.num(ft[1]) * SQFT);
    const m = t.match(/(\d[\d.,]*)\s*(m²|m2|mq|sqm|sq\.?\s*m)/i);
    return m ? RHS.num(m[1]) : null;
  };

  // Words that point to a problem. Kept short and literal so the reason shown is always the matched word.
  const FLAGS = [
    { k: "occupied", pts: 15, re: /\b(okupa|ocupad[ao]|sin posesi[oó]n|occupied|sitting tenant|tenant in situ|occupato|ocupado)\b/i, label: "Occupied or no possession" },
    { k: "auction", pts: 12, re: /\b(subasta|auction|asta giudiziaria|leilão|leilao)\b/i, label: "Auction sale" },
    { k: "bare", pts: 12, re: /\b(nuda propiedad|nuda propriet[aà]|usufructo|bare ownership)\b/i, label: "Bare ownership / usufruct" },
    { k: "legal", pts: 12, re: /(sin c[eé]dula|sin legalizar|fuera de ordenaci[oó]n|proindiviso|no habitab|abuso edilizio|non a norma|short lease|cladding|ews1)/i, label: "Possible legal or paperwork issue" },
    { k: "renovation", pts: 8, re: /\b(a reformar|para reformar|necesita reforma|needs? (some )?(work|renovation|updating|modernisation|modernization)|fixer|doer[- ]upper|renovation project|da ristrutturare|para recuperar|tlc)\b/i, label: "Needs renovation" },
    { k: "investors", pts: 6, re: /(ideal inversores|solo inversores|investors? only|cash (buyers )?only|ideale per investitori|rentabilidad garantizada)/i, label: "Pitched at investors / cash only" },
    { k: "rented", pts: 6, re: /\b(alquilad[oa] con|con inquilino|actualmente alquilad|tenanted|sold with tenant|affittato|arrendad[oa])\b/i, label: "Sold with a tenant" },
    { k: "rustic", pts: 5, re: /\b(r[uú]stic[oa] no|suelo r[uú]stico|non urbanizable|agricultural land only)\b/i, label: "Rural land status" },
    { k: "vague", pts: 4, re: /(incre[ií]ble oportunidad|no te lo pierdas|must see|won'?t last|chollo|bargain of the year|opportunit[aà] unica)/i, label: "Hype wording, few facts" },
  ];
  const INFO = [
    { k: "floor", re: /(planta|floor|piano|andar|etage|sal)\s*\d|bajo|ground floor|piano terra|r[eé]s[- ]do[- ]ch[aã]o/i, label: "floor" },
    { k: "energy", re: /(certificado energ|energy (rating|certificate|performance)|epc|classe energetica|certificado energético|energim[aæ]rk|clase energ)/i, label: "energy rating" },
    { k: "orientation", re: /(orientaci[oó]n|south[- ]facing|north[- ]facing|esposizione|orienta[cç][aã]o|exterior|interior)/i, label: "orientation" },
    { k: "fees", re: /(comunidad|community fees|service charge|hoa|spese condominiali|condom[ií]nio|ground rent|ejerudgift|f[aæ]llesudgift)/i, label: "community fees" },
    { k: "year", re: /(construid[oa] en|built in|year built|anno di costruzione|\b(18|19|20)\d{2}\b)/i, label: "year built" },
  ];

  // v0.13: "NO AGE RESTRICTION", "not a short sale", "owner occupied", "sin okupas" are not red flags
  const NEG = /(\bno\b|\bnot\b|\bnon[- ]?|\bnever\b|\bwithout\b|\bsin\b|\bnada de\b|\bowner[- ]?|\bkein\w*\b|\bingen\b|\bpas de\b|\bsenza\b|\bsem\b)[\s\w-]{0,12}$/i;
  RHS.hit = (re, text) => {
    const t = String(text || ""); const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); let m;
    while ((m = g.exec(t))) { const before = t.slice(Math.max(0, m.index - 24), m.index); if (!NEG.test(before)) return m[0]; if (!m[0]) g.lastIndex++; }
    return null;
  };
  RHS.flagsFrom = (text) => {
    const t = String(text || "");
    return FLAGS.map((f) => ({ f, w: RHS.hit(f.re, t) })).filter((x) => x.w != null).map(({ f, w }) => ({ k: f.k, pts: f.pts, label: f.label, word: w }));
  };

  // ---------------------------------------------------------------- Reasons in the reader's language. Columns: English pattern → es, da, de, it, pt.
  RHS.lang = (() => { try { return (chrome.i18n.getUILanguage() || "en").slice(0, 2); } catch { return (typeof navigator !== "undefined" ? navigator.language : "en").slice(0, 2); } })();
  const COL = { es: 1, da: 2, de: 3, it: 4, pt: 5 };
  const TR = [
    // v0.14 market reference
    [/(\d+)% cheaper than the market/g, "$1% más barata que el mercado", "$1% billigere end markedet", "$1% günstiger als der Markt", "$1% più economica del mercato", "$1% mais barata que o mercado"],
    [/(\d+)% below the market/g, "$1% por debajo del mercado", "$1% under markedet", "$1% unter dem Markt", "$1% sotto il mercato", "$1% abaixo do mercado"],
    ["priced like the market", "a precio de mercado", "prissat som markedet", "Marktpreis", "a prezzo di mercato", "a preço de mercado"],
    [/(\d+)% above the market/g, "$1% por encima del mercado", "$1% over markedet", "$1% über dem Markt", "$1% sopra il mercato", "$1% acima do mercado"],
    [/(\d+)% more expensive than the market/g, "$1% más cara que el mercado", "$1% dyrere end markedet", "$1% teurer als der Markt", "$1% più cara del mercato", "$1% mais cara que o mercado"],
    [" even after the work", " incluso tras la obra", " selv efter renoveringen", " selbst nach der Renovierung", " anche dopo i lavori", " mesmo depois das obras"],
    ["Exactly at the market", "Justo a precio de mercado", "Præcis på markedsprisen", "Genau auf Marktniveau", "Esattamente a prezzo di mercato", "Exatamente ao preço de mercado"],
    [" against a market price of ", " frente a un precio de mercado de ", " mod en markedspris på ", " gegenüber einem Marktpreis von ", " contro un prezzo di mercato di ", " face a um preço de mercado de "],
    [" for a home this size in ", " para una casa de este tamaño en ", " for en bolig på denne størrelse i ", " für eine Wohnung dieser Größe in ", " per una casa di questa misura a ", " para uma casa deste tamanho em "],
    ["median asking price, ", "mediana de precios de oferta, ", "median udbudspris, ", "Median der Angebotspreise, ", "mediana dei prezzi richiesti, ", "mediana dos preços pedidos, "],
    [", few homes there", ", pocas casas allí", ", få boliger der", ", wenige Objekte dort", ", poche case lì", ", poucas casas lá"],
    [/It needs work \(“([^”]*)”\): about (.+?) of renovation is added before comparing\./g, "Necesita obra (“$1”): se suman unos $2 de reforma antes de comparar.", "Den kræver arbejde (“$1”): ca. $2 til renovering lægges til før sammenligning.", "Renovierungsbedarf (“$1”): etwa $2 werden vor dem Vergleich addiert.", "Servono lavori (“$1”): circa $2 di ristrutturazione aggiunti prima del confronto.", "Precisa de obras (“$1”): somam-se cerca de $2 de obras antes de comparar."],
    [/(\d+)% below the market/g, "$1% por debajo del mercado", "$1% under markedet", "$1% unter dem Markt", "$1% sotto il mercato", "$1% abaixo do mercado"],
    ["No market price for this place and not enough comparable homes yet, so price counts as neutral.", "No hay precio de mercado para este lugar ni casas comparables suficientes, así que el precio cuenta como neutral.", "Ingen markedspris for stedet og ikke nok sammenlignelige boliger endnu, så prisen tæller neutralt.", "Kein Marktpreis für diesen Ort und noch zu wenige Vergleichsobjekte: Preis zählt neutral.", "Nessun prezzo di mercato per questo luogo e poche case confrontabili: il prezzo conta come neutro.", "Sem preço de mercado para este local nem casas comparáveis suficientes: o preço conta como neutro."],
    ["The listing says: ", "El anuncio dice: ", "Annoncen siger: ", "Laut Anzeige: ", "L'annuncio dice: ", "O anúncio diz: "],
    [". No exact map point to check it.", ". Sin punto exacto en el mapa para comprobarlo.", ". Intet præcist kortpunkt at tjekke det med.", ". Kein genauer Kartenpunkt zum Prüfen.", ". Nessun punto esatto sulla mappa per verificarlo.", ". Sem ponto exato no mapa para confirmar."],
    ["No map point on the page, so location counts as neutral.", "La página no tiene punto en el mapa, así que la ubicación cuenta como neutral.", "Siden har intet kortpunkt, så beliggenhed tæller neutralt.", "Kein Kartenpunkt auf der Seite: Lage zählt neutral.", "Nessun punto sulla mappa: la posizione conta come neutra.", "Sem ponto no mapa: a localização conta como neutra."],
    ["beachfront", "primera línea de playa", "ved stranden", "direkt am Strand", "fronte spiaggia", "primeira linha de praia"], ["close to the beach", "cerca de la playa", "tæt på stranden", "nah am Strand", "vicino alla spiaggia", "perto da praia"],
    ["close to shops", "cerca de tiendas", "tæt på butikker", "nah an Geschäften", "vicino ai negozi", "perto de lojas"], ["close to schools", "cerca de colegios", "tæt på skoler", "nah an Schulen", "vicino alle scuole", "perto de escolas"],
    ["close to golf", "cerca del golf", "tæt på golf", "nah am Golfplatz", "vicino al golf", "perto do golfe"], ["close to a marina", "cerca de un puerto deportivo", "tæt på en lystbådehavn", "nah am Jachthafen", "vicino a un porto turistico", "perto de uma marina"],
    ["Occupied or no possession", "Okupada o sin posesión", "Beboet eller ingen overtagelse", "Bewohnt oder keine Übergabe", "Occupato o senza possesso", "Ocupada ou sem posse"],
    ["Price far below similar homes: check why (auction, bare ownership, a share, tenants)", "Precio muy por debajo de casas similares: comprueba por qué (subasta, nuda propiedad, una parte, inquilinos)", "Pris langt under lignende boliger: tjek hvorfor (auktion, andel, lejere)", "Preis weit unter ähnlichen Objekten: prüfe warum (Versteigerung, Nießbrauch, Anteil, Mieter)", "Prezzo molto sotto case simili: verifica perché (asta, nuda proprietà, quota, inquilini)", "Preço muito abaixo de casas semelhantes: veja porquê (leilão, nua propriedade, quota, inquilinos)"],
    ["Auction sale", "Venta en subasta", "Tvangsauktion", "Versteigerung", "Vendita all'asta", "Venda em leilão"],
    ["Bare ownership / usufruct", "Nuda propiedad / usufructo", "Ejerskab uden brugsret", "Nießbrauch belastet", "Nuda proprietà / usufrutto", "Nua propriedade / usufruto"],
    ["Possible legal or paperwork issue", "Posible problema legal o de papeles", "Mulig juridisk eller papirproblem", "Mögliches rechtliches Problem", "Possibile problema legale o di documenti", "Possível problema legal ou de papéis"],
    ["Needs renovation", "Necesita reforma", "Kræver renovering", "Renovierungsbedürftig", "Da ristrutturare", "Precisa de obras"],
    ["Pitched at investors / cash only", "Dirigida a inversores o solo al contado", "Rettet mod investorer / kun kontant", "Für Investoren / nur bar", "Per investitori / solo contanti", "Para investidores / só a pronto"],
    ["Sold with a tenant", "Se vende con inquilino", "Sælges med lejer", "Vermietet verkauft", "Venduto con inquilino", "Vendida com inquilino"],
    ["Rural land status", "Suelo rústico", "Landbrugsjord", "Außenbereich / Agrarland", "Terreno agricolo", "Solo rústico"],
    ["Hype wording, few facts", "Mucho bombo y pocos datos", "Mange superlativer, få fakta", "Viel Werbung, wenig Fakten", "Molti slogan, pochi dati", "Muita publicidade, poucos dados"],
    ["Other risk", "Otro riesgo", "Anden risiko", "Anderes Risiko", "Altro rischio", "Outro risco"],
    [/[Oo]n the market for (\d+) days/g, "$1 días en venta", "$1 dage til salg", "$1 Tage auf dem Markt", "$1 giorni in vendita", "$1 dias à venda"],
    ["energy rating", "certificado energético", "energimærke", "Energieausweis", "classe energetica", "certificado energético"],
    ["community fees", "gastos de comunidad", "fællesudgifter", "Hausgeld", "spese condominiali", "condomínio"],
    ["year built", "año de construcción", "byggeår", "Baujahr", "anno di costruzione", "ano de construção"],
    ["orientation", "orientación", "orientering", "Ausrichtung", "esposizione", "orientação"],
    [/\bfloor\b/g, "planta", "etage", "Etage", "piano", "andar"],
    ["terrace or balcony", "terraza o balcón", "terrasse eller altan", "Terrasse oder Balkon", "terrazzo o balcone", "terraço ou varanda"],
    ["renovated or new", "reformada o nueva", "renoveret eller ny", "renoviert oder neu", "ristrutturata o nuova", "renovada ou nova"],
    ["air conditioning", "aire acondicionado", "aircondition", "Klimaanlage", "aria condizionata", "ar condicionado"],
    ["storage room", "trastero", "depotrum", "Abstellraum", "cantina", "arrecadação"],
    ["lots of light", "mucha luz", "masser af lys", "viel Licht", "molta luce", "muita luz"],
    [/\blift\b/g, "ascensor", "elevator", "Aufzug", "ascensore", "elevador"], [/\bparking\b/g, "garaje", "parkering", "Stellplatz", "posto auto", "estacionamento"],
    [/\bpool\b/g, "piscina", "pool", "Pool", "piscina", "piscina"], [/\bgarden\b/g, "jardín", "have", "Garten", "giardino", "jardim"], [/\bviews\b/g, "vistas", "udsigt", "Aussicht", "vista", "vista"],
    ["Checking what's within a walk on the map…", "Mirando en el mapa qué hay a pie…", "Tjekker kortet for hvad der er i gåafstand…", "Prüfe auf der Karte, was zu Fuß erreichbar ist…", "Controllo sulla mappa cosa c'è a piedi…", "A ver no mapa o que há a pé…"],
    ["The listing doesn't publish a map location, so location counts as neutral.", "El anuncio no publica su ubicación en el mapa, así que la ubicación cuenta como neutral.", "Annoncen viser ingen placering på kort, så beliggenhed tæller neutralt.", "Die Anzeige zeigt keinen Kartenpunkt, die Lage zählt neutral.", "L'annuncio non pubblica la posizione, quindi conta come neutra.", "O anúncio não publica a localização, por isso conta como neutra."],
    ["Within a 10-minute walk: ", "A 10 minutos andando: ", "Inden for 10 minutters gang: ", "In 10 Minuten zu Fuß: ", "A 10 minuti a piedi: ", "A 10 minutos a pé: "],
    ["Nothing useful within a 10-minute walk.", "Nada útil a 10 minutos andando.", "Intet nyttigt inden for 10 minutters gang.", "Nichts Nützliches in 10 Minuten zu Fuß.", "Niente di utile a 10 minuti a piedi.", "Nada útil a 10 minutos a pé."],
    [" None nearby: ", " Nada cerca: ", " Intet i nærheden: ", " Nichts in der Nähe: ", " Niente vicino: ", " Nada perto: "],
    [" Source: OpenStreetMap.", " Fuente: OpenStreetMap.", " Kilde: OpenStreetMap.", " Quelle: OpenStreetMap.", " Fonte: OpenStreetMap.", " Fonte: OpenStreetMap."],
    ["transport stops", "paradas de transporte", "stoppesteder", "Haltestellen", "fermate", "paragens"], ["transport stop", "parada de transporte", "stoppested", "Haltestelle", "fermata", "paragem"],
    ["food shops", "tiendas de alimentación", "dagligvarebutikker", "Lebensmittelläden", "negozi di alimentari", "mercearias"], ["food shop", "tienda de alimentación", "dagligvarebutik", "Lebensmittelladen", "negozio di alimentari", "mercearia"],
    ["schools", "colegios", "skoler", "Schulen", "scuole", "escolas"], ["school", "colegio", "skole", "Schule", "scuola", "escola"],
    ["pharmacies or doctors", "farmacias o médicos", "apoteker eller læger", "Apotheken oder Ärzte", "farmacie o medici", "farmácias ou médicos"], ["pharmacy or doctor", "farmacia o médico", "apotek eller læge", "Apotheke oder Arzt", "farmacia o medico", "farmácia ou médico"],
    ["parks", "parques", "parker", "Parks", "parchi", "parques"], [/\bpark\b/g, "parque", "park", "Park", "parco", "parque"],
    ["a beach within 2 km", "una playa a menos de 2 km", "en strand inden for 2 km", "ein Strand im Umkreis von 2 km", "una spiaggia entro 2 km", "uma praia a menos de 2 km"],
    ["Not enough comparable homes nearby yet, so price counts as neutral. It gets sharper with every search.", "Aún no hay suficientes casas comparables cerca, así que el precio cuenta como neutral. Mejora con cada búsqueda.", "Endnu ikke nok sammenlignelige boliger i nærheden, så prisen tæller neutralt. Det bliver bedre med hver søgning.", "Noch nicht genug vergleichbare Objekte in der Nähe, der Preis zählt neutral. Wird mit jeder Suche genauer.", "Non ci sono ancora abbastanza case simili vicine, il prezzo conta come neutro. Migliora a ogni ricerca.", "Ainda não há casas comparáveis suficientes perto, por isso o preço conta como neutro. Melhora a cada pesquisa."],
    ["No size published, so price per m² can't be checked.", "No publica los m², así que no se puede comparar el precio por m².", "Ingen størrelse oplyst, så m²-prisen kan ikke tjekkes.", "Keine Größe angegeben, Preis pro m² nicht prüfbar.", "Superficie non indicata, impossibile confrontare il prezzo al m².", "Sem área publicada, não dá para comparar o preço por m²."],
    [/is (\d+)% below the median of/g, "está un $1% por debajo de la mediana de", "er $1% under medianen af", "liegt $1% unter dem Median von", "è il $1% sotto la mediana di", "está $1% abaixo da mediana de"],
    [/is (\d+)% above the median of/g, "está un $1% por encima de la mediana de", "er $1% over medianen af", "liegt $1% über dem Median von", "è il $1% sopra la mediana di", "está $1% acima da mediana de"],
    ["is exactly at the median of", "está justo en la mediana de", "ligger præcis på medianen af", "liegt genau auf dem Median von", "è esattamente sulla mediana di", "está exatamente na mediana de"],
    [/(\d+) comparable homes within (\d) km/g, "$1 casas comparables a menos de $2 km", "$1 sammenlignelige boliger inden for $2 km", "$1 vergleichbaren Objekten im Umkreis von $2 km", "$1 case simili entro $2 km", "$1 casas comparáveis a menos de $2 km"],
    [/the (\d+) homes on your search page/g, "las $1 casas de tu búsqueda", "de $1 boliger i din søgning", "den $1 Objekten deiner Suche", "le $1 case della tua ricerca", "as $1 casas da tua pesquisa"],
    [/(\d+) homes in /g, "$1 casas en ", "$1 boliger i ", "$1 Objekten in ", "$1 case a ", "$1 casas em "],
    ["No red-flag wording found in the listing.", "El anuncio no tiene palabras de alerta.", "Annoncen har ingen advarselsord.", "Keine Warnwörter in der Anzeige.", "Nessuna parola d'allarme nell'annuncio.", "O anúncio não tem palavras de alerta."],
    [/(^|\. )Has /g, "$1Tiene ", "$1Har ", "$1Hat ", "$1Ha ", "$1Tem "], [/\bNo photos/g, "Sin fotos", "Ingen billeder", "Keine Fotos", "Nessuna foto", "Sem fotos"], [/(\d+) photos/g, "$1 fotos", "$1 billeder", "$1 Fotos", "$1 foto", "$1 fotos"],
    ["characters of description", "caracteres de descripción", "tegn beskrivelse", "Zeichen Beschreibung", "caratteri di descrizione", "caracteres de descrição"], ["no description", "sin descripción", "ingen beskrivelse", "keine Beschreibung", "nessuna descrizione", "sem descrição"],
    [". Missing: ", ". Falta: ", ". Mangler: ", ". Fehlt: ", ". Manca: ", ". Falta: "], ["Key facts are all there.", "Tiene todos los datos clave.", "Alle vigtige fakta er der.", "Alle wichtigen Fakten sind da.", "Ci sono tutti i dati chiave.", "Tem todos os dados importantes."],
    ["Answer 5 quick questions to score how well it fits you.", "Responde 5 preguntas rápidas para saber si encaja contigo.", "Svar på 5 hurtige spørgsmål for at se om den passer dig.", "Beantworte 5 kurze Fragen, um zu sehen, ob es passt.", "Rispondi a 5 domande per sapere se fa per te.", "Responde a 5 perguntas rápidas para saber se combina contigo."],
    ["within your budget", "dentro de tu presupuesto", "inden for dit budget", "im Budget", "nel tuo budget", "dentro do teu orçamento"], ["% over your budget", "% por encima de tu presupuesto", "% over dit budget", "% über Budget", "% sopra il budget", "% acima do orçamento"],
    ["in a place you want", "en un sitio que buscas", "et sted du ønsker", "an einem Wunschort", "in una zona che cerchi", "num sítio que procuras"], ["outside your places", "fuera de tus zonas", "uden for dine områder", "außerhalb deiner Orte", "fuori dalle tue zone", "fora das tuas zonas"],
    ["your type of home", "tu tipo de casa", "din boligtype", "dein Objekttyp", "il tuo tipo di casa", "o teu tipo de casa"], ["Not enough data to compare with your profile.", "No hay datos suficientes para compararla con tu perfil.", "Ikke nok data til at sammenligne med din profil.", "Zu wenig Daten für deinen Profilvergleich.", "Dati insufficienti per confrontarla con il tuo profilo.", "Sem dados suficientes para comparar com o teu perfil."],
    [/(\d+)% cheaper than similar homes/g, "$1% más barata que casas similares", "$1% billigere end lignende boliger", "$1% günstiger als ähnliche Objekte", "$1% più economica di case simili", "$1% mais barata que casas semelhantes"],
    [/(\d+)% below similar homes/g, "$1% por debajo de casas similares", "$1% under lignende boliger", "$1% unter ähnlichen Objekten", "$1% sotto case simili", "$1% abaixo de casas semelhantes"],
    ["priced like similar homes", "al precio de casas similares", "prissat som lignende boliger", "Preis wie ähnliche Objekte", "prezzo in linea con case simili", "ao preço de casas semelhantes"],
    [/(\d+)% above similar homes/g, "$1% por encima de casas similares", "$1% over lignende boliger", "$1% über ähnlichen Objekten", "$1% sopra case simili", "$1% acima de casas semelhantes"],
    [/(\d+)% more expensive than similar homes/g, "$1% más cara que casas similares", "$1% dyrere end lignende boliger", "$1% teurer als ähnliche Objekte", "$1% più cara di case simili", "$1% mais cara que casas semelhantes"],
    [/(\d+)% below the official average/g, "$1% por debajo de la media oficial", "$1% under det officielle gennemsnit", "$1% unter dem amtlichen Schnitt", "$1% sotto la media ufficiale", "$1% abaixo da média oficial"],
    [/(\d+)% above the official average/g, "$1% por encima de la media oficial", "$1% over det officielle gennemsnit", "$1% über dem amtlichen Schnitt", "$1% sopra la media ufficiale", "$1% acima da média oficial"],
    ["everything within a walk", "todo a mano andando", "alt i gåafstand", "alles zu Fuß erreichbar", "tutto a piedi", "tudo a pé"], ["isolated, you'll need a car", "aislada, necesitarás coche", "isoleret, du får brug for bil", "abgelegen, Auto nötig", "isolata, serve l'auto", "isolada, vais precisar de carro"],
    ["no red flags", "sin alertas", "ingen advarsler", "keine Warnsignale", "nessun allarme", "sem alertas"],
    ["Description read by AI: ", "Descripción leída por IA: ", "Beskrivelse læst af AI: ", "Beschreibung von KI gelesen: ", "Descrizione letta dall'IA: ", "Descrição lida por IA: "],
    [/No comparable homes nearby yet\. Official appraisal average in (.+?): (.+?)\/m² \(Ministry of Housing, (.+?)\)\. This home: (.+?)\/m²\. Asking prices usually sit above appraisals, so price counts as neutral until there are comparables\./g,
      "Aún no hay casas comparables cerca. Valor tasado medio oficial en $1: $2/m² (Ministerio de Vivienda, $3). Esta casa: $4/m². Los precios de oferta suelen estar por encima de la tasación, así que el precio cuenta como neutral hasta tener comparables.",
      "Endnu ingen sammenlignelige boliger. Officiel gennemsnitsvurdering i $1: $2/m² (Boligministeriet, $3). Denne bolig: $4/m². Udbudspriser ligger typisk over vurderinger, så prisen tæller neutralt indtil der er sammenligninger.",
      "Noch keine Vergleichsobjekte. Amtlicher Durchschnittsschätzwert in $1: $2/m² (Wohnungsministerium, $3). Dieses Objekt: $4/m². Angebotspreise liegen meist über Schätzwerten, daher zählt der Preis neutral, bis es Vergleiche gibt.",
      "Ancora nessuna casa simile vicina. Valore medio di perizia ufficiale a $1: $2/m² (Ministero della Casa, $3). Questa casa: $4/m². I prezzi richiesti di solito superano le perizie, quindi il prezzo conta come neutro finché non ci sono confronti.",
      "Ainda não há casas comparáveis perto. Valor médio oficial de avaliação em $1: $2/m² (Ministério da Habitação, $3). Esta casa: $4/m². Os preços pedidos costumam ficar acima da avaliação, por isso o preço conta como neutro até haver comparáveis."],
  ];
  TR.push(
    [/Fair price about (.+?) for its size, bedrooms, bathrooms, type and area \((\d+) similar homes, same area\)\./g, "Precio justo de unos $1 por su tamaño, dormitorios, baños, tipo y zona ($2 casas parecidas de la misma zona).", "Rimelig pris omkring $1 ud fra størrelse, værelser, bad, type og område ($2 lignende boliger i samme område).", "Fairer Preis etwa $1 nach Größe, Zimmern, Bädern, Typ und Lage ($2 ähnliche Objekte, gleiche Gegend).", "Prezzo giusto circa $1 per superficie, camere, bagni, tipo e zona ($2 case simili, stessa zona).", "Preço justo de cerca de $1 pelo tamanho, quartos, casas de banho, tipo e zona ($2 casas semelhantes, mesma zona)."],
    [/Fair price about (.+?) for its size, bedrooms, bathrooms, type and area \((\d+) similar homes nearby\)\./g, "Precio justo de unos $1 por su tamaño, dormitorios, baños, tipo y zona ($2 casas parecidas cerca).", "Rimelig pris omkring $1 ud fra størrelse, værelser, bad, type og område ($2 lignende boliger i nærheden).", "Fairer Preis etwa $1 nach Größe, Zimmern, Bädern, Typ und Lage ($2 ähnliche Objekte in der Nähe).", "Prezzo giusto circa $1 per superficie, camere, bagni, tipo e zona ($2 case simili vicine).", "Preço justo de cerca de $1 pelo tamanho, quartos, casas de banho, tipo e zona ($2 casas semelhantes perto)."],
    [/Fair price about (.+?) for its size, bedrooms, bathrooms, type and area \((\d+) homes in this search\)\./g, "Precio justo de unos $1 por su tamaño, dormitorios, baños, tipo y zona ($2 casas de esta búsqueda).", "Rimelig pris omkring $1 ud fra størrelse, værelser, bad, type og område ($2 boliger i søgningen).", "Fairer Preis etwa $1 nach Größe, Zimmern, Bädern, Typ und Lage ($2 Objekte dieser Suche).", "Prezzo giusto circa $1 per superficie, camere, bagni, tipo e zona ($2 case di questa ricerca).", "Preço justo de cerca de $1 pelo tamanho, quartos, casas de banho, tipo e zona ($2 casas desta pesquisa)."],
    [/This home is (\d+)% below it\./g, "Esta casa está un $1% por debajo.", "Denne bolig ligger $1% under.", "Dieses Objekt liegt $1% darunter.", "Questa casa è il $1% sotto.", "Esta casa está $1% abaixo."],
    [/This home is (\d+)% above it\./g, "Esta casa está un $1% por encima.", "Denne bolig ligger $1% over.", "Dieses Objekt liegt $1% darüber.", "Questa casa è il $1% sopra.", "Esta casa está $1% acima."],
    ["This home is exactly at it.", "Esta casa está justo en ese precio.", "Denne bolig ligger præcis der.", "Dieses Objekt liegt genau dort.", "Questa casa è esattamente lì.", "Esta casa está exatamente nesse preço."],
    [/Price already cut (\d+)%\./g, "Ya ha bajado un $1%.", "Prisen er allerede sat $1% ned.", "Preis schon um $1% gesenkt.", "Prezzo già ribassato del $1%.", "Preço já baixou $1%."],
    ["Mobile or manufactured home", "Casa móvil o prefabricada", "Mobilhome eller præfabrikeret hus", "Mobilheim oder Fertighaus", "Casa mobile o prefabbricata", "Casa móvel ou pré-fabricada"],
    ["Land is rented, not owned", "El terreno es alquilado, no tuyo", "Grunden er lejet, ikke ejet", "Grundstück gepachtet, nicht Eigentum", "Il terreno è in affitto", "O terreno é arrendado"],
    ["Timeshare or a fraction of the home", "Multipropiedad o una fracción de la casa", "Timeshare eller en andel af boligen", "Timesharing oder Anteil", "Multiproprietà o una quota", "Timeshare ou uma fração"],
    ["Sold as-is", "Se vende tal cual", "Sælges som beset", "Verkauf wie besehen", "Venduto così com'è", "Vendido no estado em que está"],
    ["Foreclosure, bank-owned or short sale", "Ejecución, de banco o venta forzosa", "Tvangssalg eller bankejet", "Zwangsversteigerung oder Bankbesitz", "Pignoramento o di banca", "Execução ou de banco"],
    ["Only for over-55s", "Solo para mayores de 55", "Kun for over 55", "Nur für über 55-Jährige", "Solo per over 55", "Só para maiores de 55"],
    ["Flood zone", "Zona inundable", "Oversvømmelsesområde", "Hochwassergebiet", "Zona alluvionale", "Zona inundável"],
    ["Co-op or share: you buy shares, not the home", "Cooperativa: compras participaciones, no la casa", "Andel: du køber en andel, ikke boligen", "Genossenschaft: Anteile, nicht die Wohnung", "Cooperativa: compri quote, non la casa", "Cooperativa: compras quotas, não a casa"],
    ["Land or a plot, not a home", "Terreno o parcela, no una casa", "Grund, ikke en bolig", "Grundstück, kein Haus", "Terreno, non una casa", "Terreno, não uma casa"],
    ["No longer for sale (pending, under offer or sold)", "Ya no está en venta (reservada o vendida)", "Ikke længere til salg (solgt eller under handel)", "Nicht mehr verfügbar (reserviert oder verkauft)", "Non più in vendita (in trattativa o venduta)", "Já não está à venda (reservada ou vendida)"],
    [/(\d+) bathrooms/g, "$1 baños", "$1 badeværelser", "$1 Bäder", "$1 bagni", "$1 casas de banho"], [/built (\d{4})/g, "construida en $1", "opført $1", "Baujahr $1", "costruita nel $1", "construída em $1"], ["new build", "obra nueva", "nybyggeri", "Neubau", "nuova costruzione", "construção nova"], [/(\S+) m² plot/g, "parcela de $1 m²", "$1 m² grund", "$1 m² Grundstück", "terreno di $1 m²", "terreno de $1 m²"],
  );
  TR.push(
    ["Location not counted: the map service didn't answer, try again later.", "La ubicación no cuenta: el servicio de mapas no respondió, prueba más tarde.", "Beliggenhed tæller ikke: korttjenesten svarede ikke, prøv igen senere.", "Lage zählt nicht: der Kartendienst antwortete nicht, später erneut versuchen.", "La posizione non conta: il servizio mappe non ha risposto, riprova più tardi.", "A localização não conta: o serviço de mapas não respondeu, tenta mais tarde."],
    ["Location not counted: no map point on the page and the address couldn't be found.", "La ubicación no cuenta: el anuncio no tiene punto en el mapa y no se ha encontrado la dirección.", "Beliggenhed tæller ikke: intet kortpunkt og adressen blev ikke fundet.", "Lage zählt nicht: kein Kartenpunkt und Adresse nicht gefunden.", "La posizione non conta: nessun punto sulla mappa e indirizzo non trovato.", "A localização não conta: sem ponto no mapa e morada não encontrada."],
    [/Sought-after area: homes nearby cost (\d+)% more per m² than the city average\./g, "Zona demandada: las casas de alrededor cuestan un $1% más por m² que la media de la ciudad.", "Eftertragtet område: boliger i nærheden koster $1% mere pr. m² end byens gennemsnit.", "Gefragte Lage: Objekte in der Nähe kosten $1% mehr pro m² als der Stadtschnitt.", "Zona richiesta: le case vicine costano il $1% in più al m² della media cittadina.", "Zona procurada: as casas à volta custam mais $1% por m² que a média da cidade."],
    [/Cheaper area: homes nearby cost (\d+)% less per m² than the city average\./g, "Zona más barata: las casas de alrededor cuestan un $1% menos por m² que la media de la ciudad.", "Billigere område: boliger i nærheden koster $1% mindre pr. m² end byens gennemsnit.", "Günstigere Lage: Objekte in der Nähe kosten $1% weniger pro m² als der Stadtschnitt.", "Zona più economica: le case vicine costano il $1% in meno al m².", "Zona mais barata: as casas à volta custam menos $1% por m²."],
    ["Area priced like the city average.", "Zona con precios como la media de la ciudad.", "Området er prissat som byens gennemsnit.", "Lage im Stadtschnitt.", "Zona in linea con la media cittadina.", "Zona com preços na média da cidade."],
    [/In the centre of ([^.]+)\./g, "En el centro de $1.", "I centrum af $1.", "Im Zentrum von $1.", "In centro a $1.", "No centro de $1."], [/([\d.]+) km from the centre of ([^.]+)\./g, "A $1 km del centro de $2.", "$1 km fra centrum af $2.", "$1 km vom Zentrum von $2.", "A $1 km dal centro di $2.", "A $1 km do centro de $2."],
    ["Map point found from the address (approximate).", "Punto del mapa sacado de la dirección (aproximado).", "Kortpunkt fundet ud fra adressen (omtrentligt).", "Kartenpunkt aus der Adresse (ungefähr).", "Punto ricavato dall'indirizzo (approssimativo).", "Ponto do mapa a partir da morada (aproximado)."],
    ["cafés or restaurants", "cafés o restaurantes", "caféer eller restauranter", "Cafés oder Restaurants", "bar o ristoranti", "cafés ou restaurantes"], ["café or restaurant", "café o restaurante", "café eller restaurant", "Café oder Restaurant", "bar o ristorante", "café ou restaurante"],
  );
  TR.push(
    ["furnished", "amueblada", "møbleret", "möbliert", "arredata", "mobilada"], ["bills included", "gastos incluidos", "forbrug inkluderet", "Nebenkosten inklusive", "spese incluse", "despesas incluídas"], ["pets allowed", "admite mascotas", "husdyr tilladt", "Haustiere erlaubt", "animali ammessi", "aceita animais"],
    [/Deposit of (\d+) months/g, "Fianza de $1 meses", "Depositum på $1 måneder", "Kaution von $1 Monatsmieten", "Deposito di $1 mesi", "Caução de $1 meses"],
    ["Holiday let (priced per night), not a home to rent", "Alquiler vacacional (por noche), no es vivienda para alquilar", "Ferieudlejning (pr. nat), ikke en lejebolig", "Ferienwohnung (pro Nacht), keine Mietwohnung", "Affitto turistico (a notte), non una casa in affitto", "Alojamento de férias (por noite), não é casa para arrendar"],
    ["enough bedrooms", "dormitorios suficientes", "nok værelser", "genug Zimmer", "camere sufficienti", "quartos suficientes"], [/learned from (\d+) homes you liked/g, "aprendido de $1 casas que te gustaron", "lært af $1 boliger du kunne lide", "gelernt aus $1 Objekten, die dir gefielen", "imparato da $1 case che ti piacciono", "aprendido de $1 casas de que gostaste"],
  );
  RHS.tr = (s) => { const c = COL[RHS.lang]; if (!c || !s) return s; let o = String(s); for (const row of TR) { const a = row[0], b = row[c]; o = typeof a === "string" ? o.split(a).join(b) : o.replace(a, b); } return o; };

  // Things buyers pay more for. Shown as highlights; they add to listing quality and to the one-line verdict.
  const PLUS = [
    { k: "terrace", re: /(terraza|terrace|balc[oó]n|balcony|terrazzo|varanda|altan|roof ?garden)/i, label: "terrace or balcony" },
    { k: "lift", re: /(ascensor|lift|elevator|ascensore|elevador|elevador)/i, label: "lift" },
    { k: "parking", re: /(garaje|parking|plaza de aparcamiento|garage|box auto|posto auto|estacionamento|carport)/i, label: "parking" },
    { k: "pool", re: /(piscina|swimming pool|\bpool\b)/i, label: "pool" },
    { k: "garden", re: /(jard[ií]n|garden|giardino|jardim|have\b)/i, label: "garden" },
    { k: "renovated", re: /(reformad[oa]|renovated|refurbished|ristrutturat[oa]|remodelad[oa]|newly (fitted|built)|obra nueva|new build)/i, label: "renovated or new" },
    { k: "view", re: /(vistas al mar|sea views?|ocean views?|vista mare|vista mar|havudsigt|vistas despejadas|panoramic)/i, label: "views" },
    { k: "ac", re: /(aire acondicionado|air[- ]?con|climatizzat|ar condicionado)/i, label: "air conditioning" },
    { k: "light", re: /(muy luminos|bright|luminos[oa]|soleggiat|lots of (natural )?light)/i, label: "lots of light" },
    { k: "furnished", re: /(amueblad[oa]|furnished|möbliert|meublée?|arredat[oa]|mobilad[oa]|møbleret|gemeubileerd|möblerad|berperabot)/i, label: "furnished" },
    { k: "bills", re: /(bills included|gastos incluidos|suministros incluidos|inkl\.? nebenkosten|charges comprises|spese incluse|despesas inclu[ií]das|forbrug inkluderet|inclusief g\/w\/l)/i, label: "bills included" },
    { k: "pets", re: /(pets? (allowed|ok|welcome)|admite mascotas|mascotas permitidas|haustiere erlaubt|animaux acceptés|animali ammessi|aceita animais|husdyr tilladt|huisdieren toegestaan)/i, label: "pets allowed" },
    { k: "storage", re: /(trastero|storage room|cantina|arrecadação|loft storage)/i, label: "storage room" },
  ];
  RHS.plusFrom = (text) => { const t = String(text || ""); return PLUS.filter((x) => x.re.test(t)).map((x) => ({ k: x.k, label: x.label })); };

  // Location: counts of places within a short walk (from OpenStreetMap), see background.js.
  // loc = { transit, shop, school, health, park, beach } (counts within 800 m; beach within 2 km) | null (no coordinates) | undefined (still loading)
  RHS.locScore = (loc) => {
    if (loc === undefined) return { pts: 10, why: "Checking what's within a walk on the map…", pending: true };
    if (!loc) return { pts: 10, why: "The listing doesn't publish a map location, so location counts as neutral." };
    let pts = 0; const have = [], lack = [];
    const add = (n, full, max, one, many) => { if (n > 0) have.push(`${n >= 10 ? "10+" : n} ${n === 1 ? one : many}`); else lack.push(many); return n >= full ? max : n > 0 ? Math.ceil(max / 2) : 0; };
    pts += add(loc.transit, 3, 6, "transport stop", "transport stops");
    pts += add(loc.shop, 2, 4, "food shop", "food shops");
    pts += add(loc.school, 1, 4, "school", "schools");
    pts += add(loc.health, 1, 3, "pharmacy or doctor", "pharmacies or doctors");
    pts += add(loc.park, 1, 3, "park", "parks");
    if (loc.food != null) pts += add(loc.food, 5, 3, "café or restaurant", "cafés or restaurants");
    if (loc.beach > 0) { pts += 2; have.push("a beach within 2 km"); }
    pts = Math.min(20, pts);
    const why = (have.length ? `Within a 10-minute walk: ${have.join(", ")}.` : "Nothing useful within a 10-minute walk.") + (lack.length && have.length ? ` None nearby: ${lack.join(", ")}.` : "") + " Source: OpenStreetMap.";
    return { pts, why, rural: have.length <= 1 };
  };

  // features: {price, currency, sqm, rooms, baths, lot, year, ptype, drop, days, status, area, country, desc, photos, portal, lat, lng}
  // ctx: {fair: fair price from the model (model.js), conf, fairN, fairSrc | bench: price per m² benchmark, benchN, benchSource, benchKm, profile, loc, ai}
  // v0.8 weights: price 45 · location 15 · risks 15 · the home 15 · fit 10. The score is the share of points won among the parts we
  // could actually check (a search card has no map point and no profile: those parts are left out, not counted as average).
  const tanh = (x) => { const e = Math.exp(2 * x); return (e - 1) / (e + 1); };
  RHS.score = (f, ctx = {}) => {
    const parts = [];
    const ppsqm = f.price && f.sqm ? f.price / f.sqm : null;
    const text = (f.desc || "") + " " + (f.title || "");
    // 1) Price — 55. v0.14: first against the MARKET price per m² of the exact place (municipality or district, bundled
    // reference: the same home always gets the same reference), then the old local comparables when there's no market data.
    // A home that needs work is compared with its price plus the cost of the work, so "cheap because it's a ruin" isn't a deal
    // and "cheap even after the work" is.
    const REN = /(restoration required|needs? (some |full |complete )?(work|renovation|refurbishment|updating|modernisation|modernization|reform)|would benefit from (some )?(renovation|refurbishment|modernisation|modernization|updating)|in need of (renovation|refurbishment|modernisation)|to (renovate|refurbish|reform)\b|renovation project|fixer|doer[- ]upper|a reformar|para reformar|necesita (una )?reforma|requiere (una )?reforma|para actualizar|da ristrutturare|para recuperar|para remodelar|à rénover|renovierungsbedürftig|sanierungsbedürftig)/i;
    const renW = RHS.hit(REN, text); const reno = renW != null && f.deal !== "rent" && !/(fully|recently|newly|completely) (renovated|refurbished|reformed)|reformad[oa] (integral|completamente|recientemente)/i.test(text) ? renW : null;
    const PMAX = 55;
    let p1 = PMAX / 2, why1 = "No market price for this place and not enough comparable homes yet, so price counts as neutral.", pct = null, conf = 0, renoCost = 0, refUsed = null;
    const mr0 = ctx.mref || f._mref || null; const mr = mr0 && mr0.ppsqm && f.sqm && f.price && f.deal !== "rent" ? mr0 : null;
    if (mr) {
      // bigger homes cost less per m² than small flats in the same place (about 10% less per doubling)
      const sizeK = Math.max(0.85, Math.min(1.12, Math.pow(f.sqm / 100, -0.1)));
      const ref = mr.ppsqm * sizeK; refUsed = ref;
      if (reno) renoCost = Math.round(Math.min(0.2 * ref, 1000) * f.sqm);
      const eff = (f.price + renoCost) / f.sqm;
      pct = Math.round((eff / ref - 1) * 100); conf = mr.conf || 0.8;
      why1 = `${RHS.money(Math.round(ppsqm), f.currency)}/m² against a market price of ${RHS.money(Math.round(ref), f.currency)}/m² for a home this size in ${mr.place} (median asking price, ${mr.src} ${mr.period}${mr.level === "muni" && mr.n < 40 ? ", few homes there" : ""}).` +
        (renoCost ? ` It needs work (“${reno.trim()}”): about ${RHS.money(renoCost, f.currency)} of renovation is added before comparing.` : "") +
        ` ${pct === 0 ? "Exactly at the market" : Math.abs(pct) + "% " + (pct < 0 ? "below" : "above") + " the market"}${renoCost ? " even after the work" : ""}.`;
    } else if (ctx.fair && f.price) {
      pct = Math.round((f.price / ctx.fair - 1) * 100); conf = ctx.conf || 0.7;
      const src = ctx.fairSrc === "local" ? `${ctx.fairN} similar homes, same area` : ctx.fairSrc === "near" ? `${ctx.fairN} similar homes nearby` : `${ctx.fairN} homes in this search`;
      why1 = `Fair price about ${RHS.money(RHS.nice ? RHS.nice(ctx.fair) : ctx.fair, f.currency)} for its size, bedrooms, bathrooms, type and area (${src}). This home is ${pct === 0 ? "exactly at" : Math.abs(pct) + "% " + (pct < 0 ? "below" : "above")} it.`;
    } else if (ppsqm && ctx.bench) {
      pct = Math.round((ppsqm / ctx.bench - 1) * 100); conf = Math.max(0.4, Math.min(0.9, 0.35 + (ctx.benchN || 5) / 40));
      const src = ctx.benchSource === "near" ? `${ctx.benchN} comparable homes within ${ctx.benchKm || 2} km` : ctx.benchSource === "area" ? `${ctx.benchN} homes in ${f.area || "this area"}` : `the ${ctx.benchN} homes on your search page`;
      why1 = `${RHS.money(ppsqm, f.currency)}/m² is ${pct === 0 ? "exactly at" : Math.abs(pct) + "% " + (pct < 0 ? "below" : "above")} the median of ${src} (${RHS.money(ctx.bench, f.currency)}/m²).`;
    } else if (!ppsqm && !ctx.fair) { why1 = "No size published, so price per m² can't be checked."; }
    let eff = pct;
    // comparables from a model that misses some homes by ±20% can't tell -40% from -20%: shrink big gaps by its error
    if (pct != null && !mr && ctx.fair) { const u = ctx.u || 0.2, s2 = 0.12 * 0.12; eff = pct * Math.min(1, (s2 / (s2 + u * u)) * 1.9); }
    if (pct != null && !mr && !ctx.fair) eff = pct * conf;
    if (pct != null && mr) eff = pct * conf;
    // -30% → about 52/55, -15% → 45, at market → 27.5, +15% → 10, +30% → 3
    if (pct != null) p1 = PMAX / 2 + (PMAX / 2) * tanh(-eff / 22);
    let opct = null;
    if (pct == null && ppsqm && ctx.official && ctx.official.ppsqm) {
      const o = ctx.official; opct = Math.round((ppsqm / o.ppsqm - 1) * 100);
      why1 = `Official appraisal average in ${o.place}: ${RHS.money(o.ppsqm, f.currency)}/m² (Ministry of Housing, ${o.period}). This home: ${RHS.money(ppsqm, f.currency)}/m². Asking prices usually sit above appraisals, so price counts as neutral.`;
    }
    // already cut: the seller is moving
    if (f.drop > 0 && f.price) { const dp = f.drop / (f.price + f.drop); if (dp >= 0.01 && dp < 0.5) { p1 += Math.min(3, dp * 40); why1 += ` Price already cut ${Math.round(dp * 100)}%.`; } }
    p1 = Math.max(0, Math.min(PMAX, p1));
    parts.push({ k: "price", label: mr ? "Price vs the market" : "Price vs comparable homes", pts: p1, max: PMAX, why: why1 });

    // 2) Location — 10. What's within a walk (OpenStreetMap) when the map point is known; otherwise what the listing says
    // about it ("close to the beach", "walking distance to shops"); otherwise neutral. Never left out: the total is always /100.
    const LOCMAX = 10;
    const L = RHS.locScore(ctx.loc);
    const locKnown = ctx.loc && typeof ctx.loc === "object";
    let lp, lwhy = L.why;
    const LOCW = [[/(beach ?front|front[- ]line|primera l[ií]nea|first line|on the beach|a pie de playa|steps (from|to) the beach)/i, 4, "beachfront"], [/(close to|near|walking distance (to|from)|minutes? (walk )?(to|from)|cerca de|a pocos metros|junto a)[^.]{0,30}(beach|sea|playa|mar)\b/i, 2.5, "close to the beach"],
      [/(close to|near|walking distance|cerca de)[^.]{0,25}(shops?|supermarket|town|centre|center|restaurants|tiendas|comercios|centro)/i, 2, "close to shops"], [/(close to|near|cerca de)[^.]{0,20}(schools?|colegios?)/i, 1, "close to schools"], [/(close to|near|cerca de)[^.]{0,20}(golf)/i, 0.5, "close to golf"], [/(close to|near|cerca de)[^.]{0,20}(port|marina|puerto)/i, 0.5, "close to a marina"]];
    const lHits = LOCW.filter(([re]) => re.test(text));
    if (locKnown) {
      lp = L.pts * 0.4; // up to 8
      const ai2 = ctx.areaIdx;
      if (ai2) { const d = Math.round((ai2 - 1) * 100); lp += ai2 >= 1.15 ? 2 : ai2 >= 1 ? 1.5 : ai2 >= 0.85 ? 1 : 0.5; lwhy += d >= 5 ? ` Sought-after area: homes nearby cost ${d}% more per m² than the city average.` : d <= -5 ? ` Cheaper area: homes nearby cost ${-d}% less per m² than the city average.` : " Area priced like the city average."; }
      else lp += lHits.length ? 2 : 1;
      if (ctx.centreKm != null && ctx.cityName) lwhy += ` ${ctx.centreKm < 1 ? "In the centre" : ctx.centreKm.toFixed(1) + " km from the centre"} of ${ctx.cityName}.`;
      if (ctx.geoApprox) lwhy += " Map point found from the address (approximate).";
    } else if (lHits.length) {
      lp = Math.min(8, 4 + lHits.reduce((a, x) => a + x[1], 0) * 0.8);
      lwhy = `The listing says: ${lHits.map((x) => x[2]).join(", ")}. No exact map point to check it.`;
    } else { lp = LOCMAX / 2; if (!L.pending) lwhy = "No map point on the page, so location counts as neutral."; }
    parts.push({ k: "location", label: "Location", pts: Math.min(LOCMAX, lp), max: LOCMAX, why: lwhy, pending: !!L.pending });

    // 3) Risks — 15
    const flags = RHS.flagsFrom(text);
    for (const x of RHS.FLAGS2 || []) { const w = RHS.hit(x.re, text); if (w != null && !flags.some((y) => y.k === x.k)) flags.push({ k: x.k, pts: x.pts, label: x.label, word: w }); }
    // v0.13: what the portal itself says about the sale (Zillow: foreclosure, bank-owned, auction)
    const sub = (f.sub || []).join(" ");
    if (/foreclosure|bankOwned/i.test(sub) && !flags.some((y) => y.k === "shortsale")) flags.push({ k: "shortsale", pts: 6, label: "Foreclosure, bank-owned or short sale", word: "" });
    if (/Auction/i.test(sub) && !flags.some((y) => y.k === "auction")) flags.push({ k: "auction", pts: 12, label: "Auction sale", word: "" });
    // v0.13: a high community fee (HOA) makes a cheap price less cheap
    if (f.hoa > 0 && f.price && f.deal !== "rent") { const yr = (f.hoa * 12) / f.price; if (yr >= 0.012) flags.push({ k: "hoa", pts: yr >= 0.025 ? 8 : 4, label: `High community fees (${RHS.money(f.hoa, f.currency)}/month)`, word: "" }); }
    if (f.ptype === "mobile" && !flags.some((x) => x.k === "mobile")) flags.push({ k: "mobile", pts: 12, label: "Mobile or manufactured home", word: "" });
    if (f.ptype === "land" && !flags.some((x) => x.k === "landonly")) flags.push({ k: "landonly", pts: 12, label: "Land or a plot, not a home", word: "" });
    if (f.deal === "rent" && f.depositMonths >= 3) flags.push({ k: "deposit", pts: Math.min(8, f.depositMonths), label: `Deposit of ${f.depositMonths} months`, word: "" });
    if (f.status === "short") flags.push({ k: "short", pts: 20, label: "Holiday let (priced per night), not a home to rent", word: "" });
    if (f.status === "off") flags.push({ k: "off", pts: 20, label: "No longer for sale (pending, under offer or sold)", word: "" });
    const ai = ctx.ai || null;
    if (ai && ai.flags) for (const x of ai.flags) {
      if (flags.some((y) => y.k === x.k && x.k !== "other")) continue;
      const base = FLAGS.find((y) => y.k === x.k);
      // v0.14: what the AI reads is shown, but it never moves the number (the same home must score the same for everyone)
      flags.push({ k: x.k, pts: 0, label: base ? base.label : "Other risk" + (x.note ? ": " + x.note : ""), word: x.quote || "", ai: true });
    }
    // v0.14: work the home needs is already priced in above (renovation cost added to the price), not a red flag twice
    const rf = flags.findIndex((x) => x.k === "renovation"); if (rf >= 0 && renoCost) flags.splice(rf, 1); else if (rf >= 0) flags[rf].pts = 5;
    if (renoCost && !flags.some((x) => x.k === "renovation")) { /* shown in the price line */ }
    // a price this far under the market is usually a reason, not a bargain: cap it and say so
    const explained = flags.some((x) => ["auction", "bare", "occupied", "share", "mobile", "landlease", "timeshare", "shortsale", "landonly", "coop"].includes(x.k));
    const zOk = ctx.zest && f.price <= ctx.zest * 0.9; // an outside estimate agrees it's cheap
    if (pct != null && pct <= (mr ? -50 : -40) && !explained && !zOk) { flags.push({ k: "too_cheap", pts: 6, label: "Price far below similar homes: check why (auction, bare ownership, a share, tenants)", word: "" }); parts[0].pts = Math.min(parts[0].pts, mr ? 47 : 42); }
    let p3 = 15 - flags.reduce((a, x) => a + x.pts * 0.6, 0);
    if (f.days != null && f.days > 180) { flags.push({ k: "stale", pts: 3, label: `On the market for ${f.days} days`, word: "" }); p3 -= 2; }
    p3 = Math.max(0, p3);
    parts.push({ k: "flags", label: "Red flags", pts: p3, max: 15,
      why: flags.length ? flags.map((x) => RHS.tr(x.label) + (x.word ? ` (${x.ai ? "AI: " : ""}“${x.word.trim()}”)` : "")).join("; ") + "." : "No red-flag wording found in the listing." });

    // 4) The home and the listing — 20
    const miss = [], missK = [];
    const ph = f.photos || 0, dl = (f.desc || "").length;
    let info = 0;
    for (const i of INFO) { if (i.re.test(f.desc || "") || (f.extra && f.extra[i.k])) info++; else { miss.push(i.label); missK.push(i.k); } }
    const plus = RHS.plusFrom(text);
    const nPlus = plus.length; // v0.14: only what the listing itself says counts (AI extras are shown, not counted)
    if (ai && ai.plus) for (const x of ai.plus) {
      if (plus.some((y) => y.k === x.k && x.k !== "other")) continue;
      const base = PLUS.find((y) => y.k === x.k);
      plus.push({ k: x.k, label: base ? base.label : (x.note || x.quote || "").toLowerCase(), ai: true });
    }
    let p2;
    if (f.partial) p2 = 9; // a search card shows little: start in the middle and move with what it does show
    else p2 = 6 + (ph >= 20 ? 2 : ph >= 10 ? 1.5 : ph >= 5 ? 0.75 : 0) + (dl >= 600 ? 1 : dl >= 250 ? 0.5 : 0) + (info / INFO.length) * 2;
    p2 += Math.min(6, nPlus * 1);
    const hb = [];
    if (f.year) { const a = f.year >= 2015 ? 2 : f.year >= 2000 ? 1 : f.year >= 1970 ? 0 : -1; p2 += a; hb.push(`built ${f.year}`); }
    if (f.newBuild) { p2 += 1; hb.push("new build"); }
    if (f.sqm && f.rooms) { const per = f.sqm / f.rooms; if (per < 14) p2 -= 2; else if (per >= 40) p2 += 1.5; else if (per >= 30) p2 += 1; }
    if (f.rooms && f.baths) { if (f.baths >= f.rooms) p2 += 0.5; hb.push(`${f.baths} bathrooms`); }
    if (f.lot && f.sqm && f.lot > f.sqm * 3) { p2 += 1; hb.push(`${Math.round(f.lot).toLocaleString("en-GB")} m² plot`); }
    p2 = Math.max(0, Math.min(20, p2));
    parts.push({ k: "quality", label: "The home and the listing", pts: p2, max: 20,
      why: `${ai && ai.summary ? "Description read by AI: " + ai.summary + " " : ""}${plus.length ? "Has " + plus.map((x) => x.label).join(", ") + ". " : ""}${hb.length ? hb.join(", ") + ". " : ""}${ph || "No"} photos, ${dl > 0 ? dl + " characters of description" : "no description"}${miss.length ? `. Missing: ${miss.join(", ")}.` : ". Key facts are all there."}` });

    // 5) Fit with your profile — shown on its own, never inside the score (v0.14: the score is the same for everyone)
    let p4 = 5, why4 = "Answer 5 quick questions to score how well it fits you.", fitKnown = false;
    const pr = ctx.profile;
    if (pr && (pr.budget || (pr.places && pr.places.length) || pr.ptype || pr.rooms)) {
      fitKnown = true; p4 = 0; const w = [];
      const budgetOk = pr.budget && f.price && (pr.learned || (f.deal || "sale") === "sale");
      if (budgetOk) { if (f.price <= pr.budget) { p4 += 5; w.push("within your budget"); } else w.push(`${Math.round((f.price / pr.budget - 1) * 100)}% over your budget`); }
      const hay = `${f.area || ""} ${f.city || ""} ${f.country || ""} ${({ ES: "spain", PT: "portugal", IT: "italy", GB: "united kingdom", US: "united states", DK: "denmark", FR: "france", ID: "indonesia" })[f.country] || ""}`.toLowerCase();
      if (pr.places && pr.places.length) { if (pr.places.some((x) => hay.includes(String(x).toLowerCase()))) { p4 += 3; w.push("in a place you want"); } else w.push("outside your places"); }
      if (pr.ptype && pr.ptype !== "any" && f.ptype) { if ((pr.ptype === "house" && /house|town|villa/.test(f.ptype)) || (pr.ptype === "flat" && f.ptype === "flat")) { p4 += 2; w.push("your type of home"); } }
      else if (pr.ptype === "any") p4 += 2;
      else if (pr.rooms && f.rooms) { if (f.rooms >= pr.rooms) { p4 += 2; w.push("enough bedrooms"); } }
      if (pr.learned) w.push(`learned from ${pr.n} homes you liked`);
      p4 = Math.min(10, p4); why4 = w.length ? w.join(", ") + "." : "Not enough data to compare with your profile.";
    }
    parts.push({ k: "fit", label: "Fit with you", pts: p4, max: 10, why: why4, na: true, info: fitKnown });

    for (const p of parts) p.pts = Math.round(p.pts * 10) / 10;
    // v0.14: always out of 100 (price 55 · the home 20 · red flags 15 · location 10). Parts we can't check count as neutral,
    // so a map service that answers one day and not the next can't move the score by 10 points.
    const known = parts.filter((p) => !p.na);
    const raw = known.reduce((a, x) => a + x.pts, 0) / 100;
    let score = Math.max(1, Math.min(99, Math.round(raw * 100)));
    // v0.13: a home only read from the search results can't be a "top deal" on a big gap alone: it stays under 85 until
    // its whole listing is read (or an outside estimate confirms it). No more 90s that turn into 70s when you open them.
    let check = false;
    if (f.partial && pct != null && pct <= -25 && !zOk && score > 84) { score = 84; check = true; }
    for (const p of parts) p.pts = Math.round(p.pts);
    const verdict = RHS.verdict({ pct, opct, flags, plus, L: locKnown ? L : null, ppsqm, mk: !!mr });
    for (const p of parts) p.why = RHS.tr(p.why);
    for (const x of flags) x.label = RHS.tr(x.label);
    for (const x of plus) x.label = RHS.tr(x.label);
    return { score, check, v: 2, mref: mr ? { ppsqm: Math.round(refUsed), place: mr.place, src: mr.src, period: mr.period } : null, renoCost, eff: eff != null ? Math.round(eff) : null, range: ctx.fair && ctx.u ? Math.round((Math.exp(ctx.u) - 1) * 100) : null, parts, flags, plus, ppsqm, pct, opct, conf, fair: ctx.fair || null, ai: !!ai, pending: !!L.pending, verdict, missing: missK, checked: known.map((p) => p.k) };
  };

  // One honest line a person can read in two seconds.
  RHS.verdict = ({ pct, opct, flags, plus, L, mk }) => {
    const bits = [];
    if (pct != null && mk) bits.push(pct <= -15 ? `${-pct}% cheaper than the market` : pct < -4 ? `${-pct}% below the market` : pct <= 4 ? "priced like the market" : pct < 15 ? `${pct}% above the market` : `${pct}% more expensive than the market`);
    else if (pct != null) bits.push(pct <= -15 ? `${-pct}% cheaper than similar homes` : pct < -4 ? `${-pct}% below similar homes` : pct <= 4 ? "priced like similar homes" : pct < 15 ? `${pct}% above similar homes` : `${pct}% more expensive than similar homes`);
    if (pct == null && opct != null) bits.push(opct <= 0 ? `${-opct}% below the official average` : `${opct}% above the official average`);
    if (L && !L.pending && L.pts >= 15) bits.push("everything within a walk"); else if (L && !L.pending && L.rural) bits.push("isolated, you'll need a car");
    const W = { es: ["con ", " y "], da: ["med ", " og "], de: ["mit ", " und "], it: ["con ", " e "], pt: ["com ", " e "] }[RHS.lang] || ["with ", " and "];
    const done = [];
    if (flags && flags.length) done.push("⚠ " + RHS.tr(flags[0].label).toLowerCase());
    else if (plus && plus.length) done.push(W[0] + plus.slice(0, 2).map((x) => RHS.tr(x.label)).join(W[1]));
    else bits.push("no red flags");
    const s = bits.map((b) => RHS.tr(b)).concat(done).join(" · ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  RHS.tone = (s) => (s >= 75 ? "great" : s >= 60 ? "good" : s >= 45 ? "ok" : "low");
  RHS.grade = (s) => (s >= 85 ? "A+" : s >= 75 ? "A" : s >= 65 ? "B" : s >= 55 ? "C" : s >= 45 ? "D" : "E");
  RHS.km = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  RHS.color = (s) => ({ great: "#0F6B34", good: "#2E9E5B", ok: "#D39B12", low: "#C2412D" }[RHS.tone(s)]);
  RHS.median = (a) => { const b = a.filter((x) => x > 0).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  RHS.hash = async (s) => {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, "0")).join("");
  };
})(typeof window !== "undefined" ? window : self);
