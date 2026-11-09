// The main property portals of each country (9-nov-2026, owner: "localizar en cada país qué portales son los más
// importantes, para que cuando alguien escriba sepamos dónde buscar").
// Order = importance in that country. `probe` is a sale search page used to test, from our server, whether our robot
// can read the portal. `read` is the result of that test (scripts/portal-probe.mjs, re-run monthly; first run 9-nov-2026 from the Supabase edge):
//   true  = a listing page opened for our robot (photos included): listings found there can pass the AI check
//   false = blocks robots (403, captcha, JS only): it is never searched, its listings could not be checked
// Edit by hand when a portal changes; the search uses this file directly.

export type Portal = { d: string; name: string; probe: string; read?: boolean };
export type CountryPortals = { cc: string; country: string; portals: Portal[] };

export const PORTALS: CountryPortals[] = [
  { cc: "ES", country: "Spain", portals: [
    { d: "idealista.com", name: "Idealista", probe: "https://www.idealista.com/venta-viviendas/sevilla-sevilla/", read: false },
    { d: "fotocasa.es", name: "Fotocasa", probe: "https://www.fotocasa.es/es/comprar/viviendas/sevilla-capital/todas-las-zonas/l", read: true },
    { d: "pisos.com", name: "pisos.com", probe: "https://www.pisos.com/venta/pisos-sevilla_capital/", read: true },
    { d: "habitaclia.com", name: "Habitaclia", probe: "https://www.habitaclia.com/viviendas-barcelona.htm" },
    { d: "yaencontre.com", name: "Yaencontre", probe: "https://www.yaencontre.com/venta/pisos/sevilla", read: false },
    { d: "milanuncios.com", name: "Milanuncios", probe: "https://www.milanuncios.com/venta-de-pisos-en-sevilla/", read: false },
    { d: "thinkspain.com", name: "ThinkSPAIN", probe: "https://www.thinkspain.com/property-for-sale/sevilla", read: true },
    { d: "kyero.com", name: "Kyero", probe: "https://www.kyero.com/en/seville-province-property-for-sale-0l55491", read: false },
  ] },
  { cc: "PT", country: "Portugal", portals: [
    { d: "idealista.pt", name: "Idealista PT", probe: "https://www.idealista.pt/comprar-casas/lisboa/", read: false },
    { d: "imovirtual.com", name: "Imovirtual", probe: "https://www.imovirtual.com/pt/resultados/comprar/apartamento/lisboa" },
    { d: "casa.sapo.pt", name: "Casa SAPO", probe: "https://casa.sapo.pt/comprar-apartamentos/lisboa/", read: false },
    { d: "supercasa.pt", name: "SuperCasa", probe: "https://supercasa.pt/comprar-casas/lisboa", read: false },
    { d: "olx.pt", name: "OLX", probe: "https://www.olx.pt/imoveis/apartamento-casa-a-venda/lisboa/" },
    { d: "remax.pt", name: "RE/MAX PT", probe: "https://www.remax.pt/comprar?searchQueryState=%7B%22regionName%22%3A%22Lisboa%22%7D" },
  ] },
  { cc: "IT", country: "Italy", portals: [
    { d: "immobiliare.it", name: "Immobiliare.it", probe: "https://www.immobiliare.it/vendita-case/lecce/", read: false },
    { d: "idealista.it", name: "Idealista IT", probe: "https://www.idealista.it/vendita-case/lecce-lecce/", read: false },
    { d: "casa.it", name: "Casa.it", probe: "https://www.casa.it/vendita/residenziale/lecce/", read: false },
    { d: "subito.it", name: "Subito", probe: "https://www.subito.it/annunci-puglia/vendita/appartamenti/lecce/" },
    { d: "wikicasa.it", name: "Wikicasa", probe: "https://www.wikicasa.it/vendita-case/lecce/", read: false },
    { d: "gate-away.com", name: "Gate-away", probe: "https://www.gate-away.com/properties/puglia/lecce/" },
    { d: "trovit.it", name: "Trovit IT", probe: "https://case.trovit.it/vendita-lecce", read: false },
  ] },
  { cc: "FR", country: "France", portals: [
    { d: "seloger.com", name: "SeLoger", probe: "https://www.seloger.com/immobilier/achat/immo-perpignan-66/", read: false },
    { d: "leboncoin.fr", name: "Leboncoin", probe: "https://www.leboncoin.fr/recherche?category=9&locations=Perpignan", read: false },
    { d: "bienici.com", name: "Bien'ici", probe: "https://www.bienici.com/recherche/achat/perpignan-66000" },
    { d: "logic-immo.com", name: "Logic-Immo", probe: "https://www.logic-immo.com/vente-immobilier-perpignan-66000,23366_2/", read: false },
    { d: "pap.fr", name: "PAP", probe: "https://www.pap.fr/annonce/vente-immobiliere-perpignan-66-g43623", read: false },
    { d: "green-acres.fr", name: "Green-Acres", probe: "https://www.green-acres.fr/fr/properties/perpignan.htm" },
    { d: "superimmo.com", name: "Superimmo", probe: "https://www.superimmo.com/achat/perpignan-66000", read: false },
  ] },
  { cc: "DE", country: "Germany", portals: [
    { d: "immobilienscout24.de", name: "ImmoScout24", probe: "https://www.immobilienscout24.de/Suche/de/sachsen/leipzig/wohnung-kaufen", read: false },
    { d: "immowelt.de", name: "Immowelt", probe: "https://www.immowelt.de/suche/leipzig/wohnungen/kaufen", read: false },
    { d: "kleinanzeigen.de", name: "Kleinanzeigen", probe: "https://www.kleinanzeigen.de/s-wohnung-kaufen/leipzig/c196l4233", read: true },
    { d: "immonet.de", name: "Immonet", probe: "https://www.immonet.de/", read: false },
    { d: "ohne-makler.net", name: "Ohne-Makler", probe: "https://www.ohne-makler.net/immobilien/wohnung-kaufen/sachsen/leipzig/", read: true },
  ] },
  { cc: "GB", country: "United Kingdom", portals: [
    { d: "rightmove.co.uk", name: "Rightmove", probe: "https://www.rightmove.co.uk/property-for-sale/Bristol.html" },
    { d: "zoopla.co.uk", name: "Zoopla", probe: "https://www.zoopla.co.uk/for-sale/property/bristol/", read: false },
    { d: "onthemarket.com", name: "OnTheMarket", probe: "https://www.onthemarket.com/for-sale/property/bristol/", read: true },
    { d: "primelocation.com", name: "PrimeLocation", probe: "https://www.primelocation.com/for-sale/property/bristol/", read: false },
    { d: "purplebricks.co.uk", name: "Purplebricks", probe: "https://www.purplebricks.co.uk/search/property-for-sale/bristol", read: true },
  ] },
  { cc: "IE", country: "Ireland", portals: [
    { d: "daft.ie", name: "Daft.ie", probe: "https://www.daft.ie/property-for-sale/cork-city", read: false },
    { d: "myhome.ie", name: "MyHome.ie", probe: "https://www.myhome.ie/residential/cork-city/property-for-sale", read: true },
  ] },
  { cc: "NL", country: "Netherlands", portals: [
    { d: "funda.nl", name: "Funda", probe: "https://www.funda.nl/zoeken/koop?selected_area=%5B%22utrecht%22%5D", read: false },
    { d: "pararius.nl", name: "Pararius", probe: "https://www.pararius.nl/koopwoningen/utrecht", read: false },
    { d: "jaap.nl", name: "Jaap", probe: "https://www.jaap.nl/koophuizen/utrecht/utrecht" },
  ] },
  { cc: "BE", country: "Belgium", portals: [
    { d: "immoweb.be", name: "Immoweb", probe: "https://www.immoweb.be/en/search/house-and-apartment/for-sale/gent/9000" },
    { d: "zimmo.be", name: "Zimmo", probe: "https://www.zimmo.be/nl/gent-9000/te-koop/", read: false },
    { d: "immovlan.be", name: "Immovlan", probe: "https://immovlan.be/en/real-estate?transactiontypes=for-sale&towns=9000-gent", read: true },
  ] },
  { cc: "CH", country: "Switzerland", portals: [
    { d: "homegate.ch", name: "Homegate", probe: "https://www.homegate.ch/buy/real-estate/city-lausanne/matching-list", read: false },
    { d: "immoscout24.ch", name: "ImmoScout24 CH", probe: "https://www.immoscout24.ch/en/real-estate/buy/city-lausanne", read: false },
    { d: "comparis.ch", name: "Comparis", probe: "https://en.comparis.ch/immobilien/marktplatz/lausanne/kaufen", read: false },
  ] },
  { cc: "AT", country: "Austria", portals: [
    { d: "willhaben.at", name: "Willhaben", probe: "https://www.willhaben.at/iad/immobilien/eigentumswohnung/eigentumswohnung-angebote?areaId=601", read: true },
    { d: "immobilienscout24.at", name: "ImmoScout24 AT", probe: "https://www.immobilienscout24.at/regional/graz/wohnung-kaufen" },
    { d: "derstandard.at", name: "derStandard Immobilien", probe: "https://immobilien.derstandard.at/suche/graz/kaufen-wohnung", read: true },
  ] },
  { cc: "DK", country: "Denmark", portals: [
    { d: "boligsiden.dk", name: "Boligsiden", probe: "https://www.boligsiden.dk/by/odense/tilsalg", read: false },
    { d: "boliga.dk", name: "Boliga", probe: "https://www.boliga.dk/resultat?zipCodes=5000", read: false },
    { d: "home.dk", name: "home", probe: "https://home.dk/soeg/?q=odense", read: false },
    { d: "edc.dk", name: "EDC", probe: "https://www.edc.dk/alle-boliger/odense/" },
  ] },
  { cc: "SE", country: "Sweden", portals: [
    { d: "hemnet.se", name: "Hemnet", probe: "https://www.hemnet.se/bostader?location_ids%5B%5D=17989", read: false },
    { d: "booli.se", name: "Booli", probe: "https://www.booli.se/sok/till-salu?areaIds=1", read: false },
  ] },
  { cc: "NO", country: "Norway", portals: [
    { d: "finn.no", name: "FINN", probe: "https://www.finn.no/realestate/homes/search.html?location=0.22046", read: false },
    { d: "hjem.no", name: "Hjem.no", probe: "https://hjem.no/kjop" },
  ] },
  { cc: "FI", country: "Finland", portals: [
    { d: "etuovi.com", name: "Etuovi", probe: "https://www.etuovi.com/myytavat-asunnot/tampere", read: false },
    { d: "oikotie.fi", name: "Oikotie", probe: "https://asunnot.oikotie.fi/myytavat-asunnot/tampere", read: false },
  ] },
  { cc: "PL", country: "Poland", portals: [
    { d: "otodom.pl", name: "Otodom", probe: "https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow" },
    { d: "olx.pl", name: "OLX", probe: "https://www.olx.pl/nieruchomosci/mieszkania/sprzedaz/krakow/" },
    { d: "morizon.pl", name: "Morizon", probe: "https://www.morizon.pl/mieszkania/krakow/", read: true },
    { d: "gratka.pl", name: "Gratka", probe: "https://gratka.pl/nieruchomosci/mieszkania/krakow/sprzedaz", read: true },
  ] },
  { cc: "CZ", country: "Czechia", portals: [
    { d: "sreality.cz", name: "Sreality", probe: "https://www.sreality.cz/hledani/prodej/byty/brno" },
    { d: "bezrealitky.cz", name: "Bezrealitky", probe: "https://www.bezrealitky.cz/vypis/nabidka-prodej/byt/jihomoravsky-kraj/brno", read: true },
  ] },
  { cc: "HU", country: "Hungary", portals: [
    { d: "ingatlan.com", name: "Ingatlan.com", probe: "https://ingatlan.com/lista/elado+lakas+budapest", read: false },
    { d: "otthonterkep.hu", name: "Otthontérkép", probe: "https://otthonterkep.hu/elado/lakas/budapest", read: true },
  ] },
  { cc: "RO", country: "Romania", portals: [
    { d: "imobiliare.ro", name: "Imobiliare.ro", probe: "https://www.imobiliare.ro/vanzare-apartamente/brasov", read: false },
    { d: "storia.ro", name: "Storia", probe: "https://www.storia.ro/ro/rezultate/vanzare/apartament/brasov", read: false },
    { d: "olx.ro", name: "OLX RO", probe: "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/brasov/", read: false },
  ] },
  { cc: "BG", country: "Bulgaria", portals: [
    { d: "imot.bg", name: "Imot.bg", probe: "https://www.imot.bg/obiavi/prodazhbi/grad-plovdiv" },
    { d: "homes.bg", name: "Homes.bg", probe: "https://www.homes.bg/" },
    { d: "imoti.net", name: "Imoti.net", probe: "https://www.imoti.net/bg/obiavi/r/prodava/plovdiv/", read: false },
  ] },
  { cc: "GR", country: "Greece", portals: [
    { d: "spitogatos.gr", name: "Spitogatos", probe: "https://www.spitogatos.gr/en/for_sale-homes/kalamata", read: false },
    { d: "xe.gr", name: "XE.gr", probe: "https://www.xe.gr/property/results?transaction_name=buy&item_type=re_residence&geo_place_ids%5B%5D=ChIJYbF-QW0-YRMR-uwWnDj7O2Y" },
    { d: "tospitimou.gr", name: "Tospitimou", probe: "https://www.tospitimou.gr/", read: false },
  ] },
  { cc: "HR", country: "Croatia", portals: [
    { d: "njuskalo.hr", name: "Njuškalo", probe: "https://www.njuskalo.hr/prodaja-stanova/split", read: false },
    { d: "index.hr", name: "Index oglasi", probe: "https://www.index.hr/oglasi/nekretnine/prodaja-stanova/grad-split" },
    { d: "crozilla.com", name: "Crozilla", probe: "https://www.crozilla.com/en/real-estate/for-sale/split/", read: false },
  ] },
  { cc: "SI", country: "Slovenia", portals: [
    { d: "nepremicnine.net", name: "Nepremičnine.net", probe: "https://www.nepremicnine.net/oglasi-prodaja/ljubljana-mesto/stanovanje/", read: false },
    { d: "bolha.com", name: "Bolha", probe: "https://www.bolha.com/prodaja-stanovanj" },
  ] },
  { cc: "CY", country: "Cyprus", portals: [
    { d: "bazaraki.com", name: "Bazaraki", probe: "https://www.bazaraki.com/real-estate-for-sale/apartments-flats/lemesos-district-limassol/", read: false },
    { d: "home.cy", name: "Home.cy", probe: "https://www.home.cy/", read: true },
  ] },
  { cc: "MT", country: "Malta", portals: [
    { d: "maltapark.com", name: "MaltaPark", probe: "https://www.maltapark.com/listings/category/253" },
    { d: "remax-malta.com", name: "RE/MAX Malta", probe: "https://remax-malta.com/listings?Type=Sale", read: false },
    { d: "frank.com.mt", name: "Frank Salt", probe: "https://www.franksalt.com.mt/property-for-sale/" },
  ] },
  { cc: "TR", country: "Turkey", portals: [
    { d: "sahibinden.com", name: "Sahibinden", probe: "https://www.sahibinden.com/satilik-daire/antalya", read: false },
    { d: "hepsiemlak.com", name: "Hepsiemlak", probe: "https://www.hepsiemlak.com/antalya-satilik", read: false },
    { d: "emlakjet.com", name: "Emlakjet", probe: "https://www.emlakjet.com/satilik-konut/antalya/", read: true },
  ] },
  { cc: "US", country: "United States", portals: [
    { d: "zillow.com", name: "Zillow", probe: "https://www.zillow.com/boise-id/", read: false },
    { d: "realtor.com", name: "Realtor.com", probe: "https://www.realtor.com/realestateandhomes-search/Boise_ID", read: false },
    { d: "redfin.com", name: "Redfin", probe: "https://www.redfin.com/city/2287/ID/Boise", read: false },
    { d: "homes.com", name: "Homes.com", probe: "https://www.homes.com/boise-id/", read: false },
    { d: "trulia.com", name: "Trulia", probe: "https://www.trulia.com/ID/Boise/", read: false },
    { d: "coldwellbanker.com", name: "Coldwell Banker", probe: "https://www.coldwellbanker.com/city/id/boise", read: true },
    { d: "century21.com", name: "Century 21", probe: "https://www.century21.com/real-estate/boise-id/LCIDBOISE/" },
    { d: "remax.com", name: "RE/MAX", probe: "https://www.remax.com/homes-for-sale/id/boise/city/1608830", read: true },
  ] },
  { cc: "CA", country: "Canada", portals: [
    { d: "realtor.ca", name: "REALTOR.ca", probe: "https://www.realtor.ca/on/ottawa/real-estate", read: false },
    { d: "zolo.ca", name: "Zolo", probe: "https://www.zolo.ca/ottawa-real-estate", read: false },
    { d: "remax.ca", name: "RE/MAX CA", probe: "https://www.remax.ca/on/ottawa-real-estate", read: true },
    { d: "point2homes.com", name: "Point2", probe: "https://www.point2homes.com/CA/Real-Estate-Listings/ON/Ottawa.html", read: false },
  ] },
  { cc: "MX", country: "Mexico", portals: [
    { d: "inmuebles24.com", name: "Inmuebles24", probe: "https://www.inmuebles24.com/departamentos-en-venta-en-playa-del-carmen.html", read: false },
    { d: "vivanuncios.com.mx", name: "Vivanuncios", probe: "https://www.vivanuncios.com.mx/s-venta-inmuebles/playa-del-carmen/v1c1097l14108p1", read: false },
    { d: "lamudi.com.mx", name: "Lamudi MX", probe: "https://www.lamudi.com.mx/quintana-roo/solidaridad/playa-del-carmen/for-sale/", read: false },
    { d: "propiedades.com", name: "Propiedades.com", probe: "https://propiedades.com/playa-del-carmen/departamentos-venta", read: false },
    { d: "century21mexico.com", name: "Century 21 México", probe: "https://century21mexico.com/v/resultados/operacion_venta/en-estado_quintana-roo", read: false },
  ] },
  { cc: "CO", country: "Colombia", portals: [
    { d: "fincaraiz.com.co", name: "Finca Raíz", probe: "https://www.fincaraiz.com.co/venta/apartamentos/medellin/antioquia", read: true },
    { d: "metrocuadrado.com", name: "Metrocuadrado", probe: "https://www.metrocuadrado.com/apartamentos/venta/medellin/", read: false },
    { d: "ciencuadras.com", name: "Ciencuadras", probe: "https://www.ciencuadras.com/venta/medellin", read: true },
  ] },
  { cc: "AR", country: "Argentina", portals: [
    { d: "zonaprop.com.ar", name: "Zonaprop", probe: "https://www.zonaprop.com.ar/departamentos-venta-palermo.html", read: false },
    { d: "argenprop.com", name: "Argenprop", probe: "https://www.argenprop.com/departamentos/venta/palermo" },
    { d: "mercadolibre.com.ar", name: "Mercado Libre Inmuebles", probe: "https://inmuebles.mercadolibre.com.ar/departamentos/venta/capital-federal/palermo/" },
  ] },
  { cc: "CL", country: "Chile", portals: [
    { d: "portalinmobiliario.com", name: "Portal Inmobiliario", probe: "https://www.portalinmobiliario.com/venta/departamento/providencia-metropolitana" },
    { d: "toctoc.com", name: "TocToc", probe: "https://www.toctoc.com/venta/departamento/metropolitana/providencia", read: true },
    { d: "yapo.cl", name: "Yapo", probe: "https://www.yapo.cl/region_metropolitana/inmuebles", read: false },
  ] },
  { cc: "PE", country: "Peru", portals: [
    { d: "urbania.pe", name: "Urbania", probe: "https://urbania.pe/buscar/venta-de-departamentos-en-miraflores--lima--lima", read: false },
    { d: "adondevivir.com", name: "Adondevivir", probe: "https://www.adondevivir.com/departamentos-en-venta-en-miraflores.html", read: false },
    { d: "properati.com.pe", name: "Properati PE", probe: "https://www.properati.com.pe/s/miraflores/venta", read: false },
  ] },
  { cc: "EC", country: "Ecuador", portals: [
    { d: "plusvalia.com", name: "Plusvalía", probe: "https://www.plusvalia.com/casas-en-venta-en-cuenca.html", read: false },
    { d: "properati.com.ec", name: "Properati EC", probe: "https://www.properati.com.ec/s/cuenca/venta", read: false },
  ] },
  { cc: "UY", country: "Uruguay", portals: [
    { d: "infocasas.com.uy", name: "InfoCasas", probe: "https://www.infocasas.com.uy/venta/inmuebles/montevideo", read: true },
    { d: "gallito.com.uy", name: "Gallito", probe: "https://www.gallito.com.uy/inmuebles/venta/montevideo" },
    { d: "mercadolibre.com.uy", name: "Mercado Libre UY", probe: "https://inmuebles.mercadolibre.com.uy/venta/montevideo/" },
  ] },
  { cc: "BR", country: "Brazil", portals: [
    { d: "zapimoveis.com.br", name: "ZAP Imóveis", probe: "https://www.zapimoveis.com.br/venda/apartamentos/sc+florianopolis/", read: false },
    { d: "vivareal.com.br", name: "VivaReal", probe: "https://www.vivareal.com.br/venda/santa-catarina/florianopolis/apartamento_residencial/", read: false },
    { d: "imovelweb.com.br", name: "Imovelweb", probe: "https://www.imovelweb.com.br/apartamentos-venda-florianopolis-sc.html", read: false },
    { d: "olx.com.br", name: "OLX BR", probe: "https://www.olx.com.br/imoveis/venda/estado-sc/florianopolis-e-regiao", read: false },
  ] },
  { cc: "CR", country: "Costa Rica", portals: [
    { d: "encuentra24.com", name: "Encuentra24", probe: "https://www.encuentra24.com/costa-rica-es/bienes-raices-venta-de-propiedades-casas", read: false },
    { d: "properati.co.cr", name: "Properati CR", probe: "https://www.properati.co.cr/" },
    { d: "remax-costa-rica.com", name: "RE/MAX CR", probe: "https://www.remax-costa-rica.com/" },
  ] },
  { cc: "PA", country: "Panama", portals: [
    { d: "encuentra24.com", name: "Encuentra24", probe: "https://www.encuentra24.com/panama-es/bienes-raices-venta-de-propiedades-apartamentos", read: false },
    { d: "compreoalquile.com", name: "Compreoalquile", probe: "https://www.compreoalquile.com/apartamentos-venta-panama.html", read: false },
  ] },
  { cc: "DO", country: "Dominican Republic", portals: [
    { d: "supercasas.com", name: "SuperCasas", probe: "https://www.supercasas.com/buscar/?ObjectType=123&Locations=10095", read: true },
    { d: "corotos.com.do", name: "Corotos", probe: "https://www.corotos.com.do/k/apartamentos%20en%20venta" },
    { d: "remaxrd.com", name: "RE/MAX RD", probe: "https://www.remaxrd.com/", read: false },
  ] },
  { cc: "AE", country: "United Arab Emirates", portals: [
    { d: "bayut.com", name: "Bayut", probe: "https://www.bayut.com/for-sale/apartments/dubai/dubai-marina/", read: false },
    { d: "propertyfinder.ae", name: "Property Finder", probe: "https://www.propertyfinder.ae/en/buy/dubai/apartments-for-sale-dubai-marina.html", read: true },
    { d: "dubizzle.com", name: "Dubizzle", probe: "https://dubai.dubizzle.com/property-for-sale/residential/apartmentflat/", read: false },
  ] },
  { cc: "ZA", country: "South Africa", portals: [
    { d: "property24.com", name: "Property24", probe: "https://www.property24.com/for-sale/cape-town/western-cape/432", read: false },
    { d: "privateproperty.co.za", name: "Private Property", probe: "https://www.privateproperty.co.za/for-sale/western-cape/cape-town/55" },
  ] },
  { cc: "MA", country: "Morocco", portals: [
    { d: "mubawab.ma", name: "Mubawab", probe: "https://www.mubawab.ma/fr/st/marrakech/appartements-a-vendre", read: true },
    { d: "avito.ma", name: "Avito", probe: "https://www.avito.ma/fr/marrakech/appartements-%C3%A0_vendre", read: true },
    { d: "sarouty.ma", name: "Sarouty", probe: "https://www.sarouty.ma/fr/acheter/marrakech/appartements-a-vendre.html" },
  ] },
  { cc: "TH", country: "Thailand", portals: [
    { d: "ddproperty.com", name: "DDproperty", probe: "https://www.ddproperty.com/en/property-for-sale?freetext=Chiang+Mai", read: false },
    { d: "hipflat.com", name: "Hipflat", probe: "https://www.hipflat.com/search/sale/condo_y/TH.CM_r1/any_r2/any_p/any_b/any_a/any_w/100.983,18.788_c/12_z/list_v", read: false },
    { d: "fazwaz.com", name: "FazWaz", probe: "https://www.fazwaz.com/property-for-sale/thailand/chiang-mai", read: true },
    { d: "dotproperty.co.th", name: "Dot Property", probe: "https://www.dotproperty.co.th/en/condos-for-sale/chiang-mai", read: true },
  ] },
  { cc: "ID", country: "Indonesia", portals: [
    { d: "rumah123.com", name: "Rumah123", probe: "https://www.rumah123.com/jual/bali/rumah/", read: false },
    { d: "99.co", name: "99.co", probe: "https://www.99.co/id/jual/rumah/bali", read: false },
    { d: "lamudi.co.id", name: "Lamudi ID", probe: "https://www.lamudi.co.id/jual/bali/rumah/", read: false },
    { d: "olx.co.id", name: "OLX ID", probe: "https://www.olx.co.id/bali_g2000002/dijual-rumah-apartemen_c5158" },
    { d: "fazwaz.com", name: "FazWaz", probe: "https://www.fazwaz.com/property-for-sale/indonesia/bali" },
  ] },
  { cc: "MY", country: "Malaysia", portals: [
    { d: "propertyguru.com.my", name: "PropertyGuru", probe: "https://www.propertyguru.com.my/property-for-sale?freetext=Penang", read: false },
    { d: "iproperty.com.my", name: "iProperty", probe: "https://www.iproperty.com.my/sale/penang/all-residential/", read: false },
    { d: "mudah.my", name: "Mudah", probe: "https://www.mudah.my/penang/properties-for-sale", read: true },
  ] },
  { cc: "PH", country: "Philippines", portals: [
    { d: "lamudi.com.ph", name: "Lamudi PH", probe: "https://www.lamudi.com.ph/buy/cebu/", read: false },
    { d: "dotproperty.com.ph", name: "Dot Property PH", probe: "https://www.dotproperty.com.ph/en/properties-for-sale/cebu" },
    { d: "propertyguru.com.ph", name: "PropertyGuru PH", probe: "https://www.propertyguru.com.ph/property-for-sale?freetext=Cebu" },
  ] },
  { cc: "VN", country: "Vietnam", portals: [
    { d: "batdongsan.com.vn", name: "Batdongsan", probe: "https://batdongsan.com.vn/ban-can-ho-chung-cu-da-nang", read: false },
    { d: "chotot.com", name: "Chợ Tốt Nhà", probe: "https://nha.chotot.com/da-nang/mua-ban-can-ho-chung-cu", read: false },
  ] },
  { cc: "GE", country: "Georgia", portals: [
    { d: "ss.ge", name: "SS.ge", probe: "https://home.ss.ge/en/real-estate/l/Flat/For-Sale?cityIdList=95", read: false },
    { d: "myhome.ge", name: "Myhome.ge", probe: "https://www.myhome.ge/en/s/Apartment-for-sale-Tbilisi", read: true },
  ] },
  { cc: "AU", country: "Australia", portals: [
    { d: "realestate.com.au", name: "realestate.com.au", probe: "https://www.realestate.com.au/buy/in-gold+coast,+qld/list-1", read: false },
    { d: "domain.com.au", name: "Domain", probe: "https://www.domain.com.au/sale/gold-coast-qld/", read: false },
    { d: "allhomes.com.au", name: "Allhomes", probe: "https://www.allhomes.com.au/", read: false },
  ] },
  { cc: "NZ", country: "New Zealand", portals: [
    { d: "trademe.co.nz", name: "Trade Me Property", probe: "https://www.trademe.co.nz/a/property/residential/sale/wellington", read: false },
    { d: "realestate.co.nz", name: "realestate.co.nz", probe: "https://www.realestate.co.nz/residential/sale/wellington", read: true },
    { d: "oneroof.co.nz", name: "OneRoof", probe: "https://www.oneroof.co.nz/search/houses-for-sale/region_wellington-35" },
  ] },
  { cc: "JP", country: "Japan", portals: [
    { d: "suumo.jp", name: "SUUMO", probe: "https://suumo.jp/ms/chuko/kyoto/", read: true },
    { d: "homes.co.jp", name: "LIFULL HOME'S", probe: "https://www.homes.co.jp/mansion/chuko/kyoto/", read: true },
    { d: "athome.co.jp", name: "at home", probe: "https://www.athome.co.jp/mansion/chuko/kyoto/" },
    { d: "realestate.co.jp", name: "Real Estate Japan", probe: "https://realestate.co.jp/en/forsale/listing?prefecture=JP-26", read: false },
  ] },
  { cc: "IS", country: "Iceland", portals: [{ d: "fasteignir.visir.is", name: "Fasteignir Vísir", probe: "https://fasteignir.visir.is/", read: true }, { d: "mbl.is", name: "mbl Fasteignir", probe: "https://www.mbl.is/fasteignir/" }] },
  { cc: "ME", country: "Montenegro", portals: [{ d: "realitica.com", name: "Realitica", probe: "https://www.realitica.com/en/listing/montenegro/" }, { d: "estitor.com", name: "Estitor", probe: "https://estitor.com/me-en/real-estates/sale", read: false }] },
  { cc: "AL", country: "Albania", portals: [{ d: "merrjep.al", name: "MerrJep", probe: "https://www.merrjep.al/njoftime/imobiliare-vendbanime/apartamente/ne-shitje", read: true }, { d: "century21albania.com", name: "Century 21 Albania", probe: "https://www.century21albania.com/", read: true }] },
];

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** The portals of a country (by English name or ISO code), most important first. */
export function portalsFor(country: string | null | undefined): Portal[] {
  if (!country) return [];
  const k = strip(country);
  const c = PORTALS.find((x) => strip(x.country) === k || x.cc.toLowerCase() === k || (k === "czech republic" && x.cc === "CZ") || (k === "usa" && x.cc === "US") || (k === "uk" && x.cc === "GB"));
  return c ? c.portals : [];
}
/** Portals our robot can read, for that country (unknown = not tested yet, still tried). */
export const readablePortals = (country: string | null | undefined) => portalsFor(country).filter((p) => p.read !== false);
export const blockedPortals = (country: string | null | undefined) => portalsFor(country).filter((p) => p.read === false);
/** Every portal found to block robots, all countries (their listings are never returned). */
export const ALL_BLOCKED = [...new Set(PORTALS.flatMap((c) => c.portals.filter((p) => p.read === false).map((p) => p.d)))];

/** Extra sites that block robots and are not a country's main portal. */
const EXTRA_BLOCKED = ["spainhouses.net", "engelvoelkers.com", "properstar.com", "properstar.es", "green-acres.com", "idealista.com", "idealista.pt", "idealista.it"];
/** True when the listing URL is on a portal that blocks our robot (so it could never pass the AI check). */
export function isBlocked(u: string): boolean {
  let h = "";
  try { h = new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return true; }
  return [...ALL_BLOCKED, ...EXTRA_BLOCKED].some((d) => h === d || h.endsWith("." + d));
}
/** The lines for the AI search: where to look in this country, and where not to. */
export function searchHint(country: string | null | undefined): string {
  const all = portalsFor(country);
  const ok = all.filter((p) => p.read === true).map((p) => p.d);
  const maybe = all.filter((p) => p.read == null).map((p) => p.d);
  const no = [...new Set([...ALL_BLOCKED, ...EXTRA_BLOCKED])];
  const lines: string[] = [];
  if (all.length) lines.push(`The main property portals in ${country} are, most used first: ${all.map((p) => p.d).join(", ")}.`);
  if (ok.length || maybe.length) lines.push(`Search these first, with site: queries (e.g. "site:${(ok[0] || maybe[0])} <town> <home type> for sale"): ${[...ok, ...maybe].join(", ")}, then estate agents' own websites in that town.`);
  else lines.push("Search local estate agents' own websites in that town and the national portals that are not in the blocked list below.");
  lines.push(`Never return listings from these sites (they block our robot, so their listings cannot be checked): ${no.join(", ")}.`);
  return lines.join(" ");
}
