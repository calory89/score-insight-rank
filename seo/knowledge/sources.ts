// Official pages opened and read on the day in `read` while the texts of seo/knowledge/data were written. A text may
// only state a rule, a rate, a deadline or a fee that one of these pages (or one of our country files) states.
// To review a page: open its sources again, correct the text, and move `read` (and the page's `reviewed`) forward.
import type { Source } from "./types";

const D = "2026-11-14";
const s = (org: string | [string, string], url: string, en: string, es: string, read = D): Source => ({ org: typeof org === "string" ? org : org[0], ...(typeof org === "string" ? {} : { orgEs: org[1] }), url, title: { en, es }, read });

export const SOURCES: Record<string, Source> = {
  // ---------------------------------------------------------------- Spain
  esCivil: s("Boletín Oficial del Estado", "https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763", "Spanish Civil Code, consolidated text (articles 392, 400 and 1454)", "Código Civil, texto consolidado (artículos 392, 400 y 1454)"),
  esRegistradores: s("Colegio de Registradores de España", "https://sede.registradores.org/site/propiedad?lang=es_ES", "Land Registry online office: nota simple", "Sede electrónica del Registro de la Propiedad: nota simple"),
  esHaciendasLocales: s("Boletín Oficial del Estado", "https://www.boe.es/buscar/act.php?id=BOE-A-2004-4214", "Local Treasuries Act, consolidated text (articles 72 and 104)", "Ley Reguladora de las Haciendas Locales, texto consolidado (artículos 72 y 104)"),
  esRetencion: s("Agencia Tributaria", "https://sede.agenciatributaria.gob.es/Sede/no-residentes/irnr-sin-establecimiento-permanente/retenciones-irnr-sin-establecimiento-permanente/retencion-adquirente-inmueble.html", "Non-residents: withholding by the buyer of a property", "No residentes: retención del adquirente de un inmueble"),
  esRentasInmuebles: s("Agencia Tributaria", "https://sede.agenciatributaria.gob.es/Sede/no-residentes/irnr-sin-establecimiento-permanente/cuestiones-especificas-sobre-tributacion-inmuebles.html", "Non-residents: kinds of income from property", "No residentes: tipos de rentas procedentes de inmuebles"),
  esPatrimonio: s("Agencia Tributaria", "https://sede.agenciatributaria.gob.es/Sede/no-residentes/impuesto-sobre-patrimonio/exigibilidad-impuesto-sobre-patrimonio-no-residentes.html", "Wealth tax for non-residents", "Exigibilidad del Impuesto sobre el Patrimonio a los no residentes"),
  esResidencia: s("Agencia Tributaria", "https://sede.agenciatributaria.gob.es/Sede/no-residentes/residencia-personas-fisicas-juridicas/persona-fisica-residente-espana.html", "When a person is tax resident in Spain", "Persona física residente en España"),
  esReglamentoNotarial: s("Boletín Oficial del Estado", "https://www.boe.es/buscar/act.php?id=BOE-A-1944-6578", "Notarial Regulations, consolidated text (article 150)", "Reglamento Notarial, texto consolidado (artículo 150)"),
  esLEC: s("Boletín Oficial del Estado", "https://www.boe.es/buscar/act.php?id=BOE-A-2000-323", "Civil Procedure Act, consolidated text (articles 656, 669 and 670)", "Ley de Enjuiciamiento Civil, texto consolidado (artículos 656, 669 y 670)"),
  esSubastas: s("Agencia Estatal Boletín Oficial del Estado", "https://subastas.boe.es/", "Electronic auctions portal", "Portal de Subastas Electrónicas"),
  // ---------------------------------------------------------------- France
  frPromesse: s("Service-Public.gouv.fr", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2965", "Promise to sell an existing home: unilateral promise or compromis (checked by the administration on 10 April 2026)", "Promesa de venta de una vivienda existente: promesa unilateral o compromis (revisada por la administración el 10 de abril de 2026)"),
  frNotaires: s(["Notaires de France", "Notariado francés (notaires.fr)"], "https://www.notaires.fr/index.php/fr/immobilier-fiscalite/achat-et-vente-les-etapes/la-promesse-de-vente-et-le-compromis-de-vente", "The promesse de vente and the compromis de vente", "La promesse de vente y el compromis de vente"),
  frDiagnostics: s("Service-Public.gouv.fr", "https://www.service-public.gouv.fr/particuliers/vosdroits/F10798", "Which surveys must a seller hand over? (checked on 7 March 2025)", "¿Qué diagnósticos debe entregar el vendedor? (revisada el 7 de marzo de 2025)"),
  frIndivision: s("Service-Public.gouv.fr", "https://www.service-public.gouv.fr/particuliers/vosdroits/F1296", "Inheritance: joint ownership between heirs (checked on 16 April 2026)", "Herencia: indivisión entre herederos (revisada el 16 de abril de 2026)"),
  frInsee: s("Insee", "https://www.insee.fr/fr/statistiques/9055697", "Housing stock on 1 January 2026 (Insee Focus 388)", "Parque de viviendas a 1 de enero de 2026 (Insee Focus 388)"),
  // ---------------------------------------------------------------- Italy
  itVisura: s("Agenzia delle Entrate", "https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/consultazione-personale/scheda-info-consultazione-personale-cittadini", "Personal consultation of the cadastre and land records (updated 20 February 2026)", "Consulta personal del catastro y los registros (actualizada el 20 de febrero de 2026)"),
  itIstat: s("Istat", "https://www.istat.it/comunicato-stampa/censimento-permanente-2021-caratteristiche-delle-abitazioni/", "Permanent census 2021: dwellings", "Censo permanente de 2021: viviendas"),
  // ---------------------------------------------------------------- Germany
  deGBO12: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/gbo/__12.html", "Land Register Code (GBO), section 12", "Ordenanza del Registro de la Propiedad (GBO), artículo 12"),
  deBGB311b: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/bgb/__311b.html", "Civil Code (BGB), section 311b", "Código Civil alemán (BGB), artículo 311b"),
  deBGB883: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/bgb/__883.html", "Civil Code (BGB), section 883", "Código Civil alemán (BGB), artículo 883"),
  deBeurkG16: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/beurkg/__16.html", "Notarial Recording Act (BeurkG), section 16", "Ley de Documentación Notarial (BeurkG), artículo 16"),
  deZVG68: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/zvg/__68.html", "Forced Sale Act (ZVG), section 68", "Ley de Subasta Forzosa (ZVG), artículo 68"),
  deZVG85a: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/zvg/__85a.html", "Forced Sale Act (ZVG), section 85a", "Ley de Subasta Forzosa (ZVG), artículo 85a"),
  deZVG74a: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/zvg/__74a.html", "Forced Sale Act (ZVG), section 74a", "Ley de Subasta Forzosa (ZVG), artículo 74a"),
  deAO9: s("Bundesministerium der Justiz", "https://www.gesetze-im-internet.de/ao_1977/__9.html", "Fiscal Code (AO), section 9", "Ordenanza Tributaria (AO), artículo 9"),
  // ---------------------------------------------------------------- Netherlands
  nlBedenktijd: s("Rijksoverheid", "https://www.rijksoverheid.nl/onderwerpen/huis-kopen/vraag-en-antwoord/hoeveel-bedenktijd-heb-ik-na-het-kopen-van-een-woning", "How long can I reconsider after buying a home?", "¿Cuánto tiempo tengo para pensarlo después de comprar una vivienda?"),
  nlKosten: s("Rijksoverheid", "https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/huis-kopen/met-welke-kosten-krijg-ik-te-maken-als-ik-een-huis-koop", "What costs do I face when I buy a house?", "¿Qué gastos tengo al comprar una casa?"),
  nlOvb: s("Belastingdienst", "https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/woning/overdrachtsbelasting/tarieven_overdrachtsbelasting/het_tarief_van_de_overdrachtbelasting", "The rate of the transfer tax", "El tipo del impuesto de transmisiones"),
  // ---------------------------------------------------------------- Sweden
  seStamp: s("Lantmäteriet", "https://www2.lantmateriet.se/stamp-duty-and-fees", "Stamp duty and fees", "Impuesto de timbre y tasas"),
  seBud: s("Fastighetsmäklarinspektionen", "https://fmi.se/vad-galler-vid-formedling/budgivning/", "Bidding (budgivning)", "La puja (budgivning)"),
  // ---------------------------------------------------------------- Portugal
  ptIMI: s("Autoridade Tributária e Aduaneira", "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi112.aspx", "Municipal Property Tax Code (CIMI), article 112", "Código del Impuesto Municipal sobre Inmuebles (CIMI), artículo 112"),
  ptCertidao: s("Justiça.gov.pt", "https://justica.gov.pt/Servicos/Pedir-certidao-permanente-de-registo-predial", "Services of the registries: permanent land certificate", "Servicios de los registros: certificado permanente predial"),
  // ---------------------------------------------------------------- Greece
  grEnfia: s(["AADE (Independent Authority for Public Revenue)", "AADE (Autoridad Independiente de Ingresos Públicos de Grecia)"], "https://www.aade.gr/en/greeks-abroad-non-residents/property-taxation/unified-tax-ownership-real-estate-e9-enfia", "Unified tax on the ownership of real estate (E9, ENFIA)", "Impuesto único sobre la propiedad inmobiliaria (E9, ENFIA)"),
  // ---------------------------------------------------------------- United Kingdom
  ukLandRegistry: s("GOV.UK", "https://www.gov.uk/search-property-information-land-registry", "Search for land and property information", "Buscar información de fincas y propiedades"),
  ukJoint: s("GOV.UK", "https://www.gov.uk/joint-property-ownership", "Joint property ownership", "Propiedad conjunta de una vivienda"),
  ukResidence: s("GOV.UK", "https://www.gov.uk/tax-foreign-income/residence", "Tax on foreign income: UK residence and tax", "Impuestos sobre rentas del extranjero: residencia fiscal en el Reino Unido"),
  ukForeignIncome: s("GOV.UK", "https://www.gov.uk/tax-foreign-income", "Tax on foreign income", "Impuestos sobre rentas del extranjero"),
  ukTaxedTwice: s("GOV.UK", "https://www.gov.uk/tax-foreign-income/taxed-twice", "Tax on foreign income: if you are taxed twice", "Impuestos sobre rentas del extranjero: si tributas dos veces"),
  ukSchengen: s("GOV.UK", "https://www.gov.uk/travel-to-eu-schengen-area", "Travelling to the EU and Schengen area", "Viajar a la UE y al espacio Schengen"),
  ukPets: s("GOV.UK", "https://www.gov.uk/taking-your-pet-abroad", "Taking your pet dog, cat or ferret abroad", "Llevar al extranjero a tu perro, gato o hurón"),
  // ---------------------------------------------------------------- United States
  usFbar: s(["Internal Revenue Service", "IRS (agencia tributaria de Estados Unidos)"], "https://www.irs.gov/businesses/comparison-of-form-8938-and-fbar-requirements", "Comparison of Form 8938 and FBAR requirements", "Comparación de los requisitos del formulario 8938 y del FBAR"),
  usAbroad: s(["Internal Revenue Service", "IRS (agencia tributaria de Estados Unidos)"], "https://www.irs.gov/individuals/international-taxpayers/us-citizens-and-resident-aliens-abroad", "U.S. citizens and resident aliens abroad", "Ciudadanos y residentes de EE. UU. en el extranjero"),
  usPresence: s(["Internal Revenue Service", "IRS (agencia tributaria de Estados Unidos)"], "https://www.irs.gov/individuals/international-taxpayers/substantial-presence-test", "Substantial presence test", "Prueba de presencia sustancial"),
  usCfpb: s(["Consumer Financial Protection Bureau", "CFPB (oficina federal de protección financiera del consumidor)"], "https://www.consumerfinance.gov/consumer-tools/mortgages/answers/key-terms/", "Mortgage key terms", "Términos clave de las hipotecas"),
  // ---------------------------------------------------------------- Japan
  jpStat: s(["Statistics Bureau of Japan", "Oficina de Estadística de Japón"], "https://www.stat.go.jp/english/info/news/20241030.html", "2023 Housing and Land Survey: final results", "Encuesta de Vivienda y Suelo de 2023: resultados definitivos"),
  // ---------------------------------------------------------------- Bulgaria
  bgCensus: s(["National Statistical Institute of Bulgaria", "Instituto Nacional de Estadística de Bulgaria"], "https://www.nsi.bg/en/content/19807/pressrelease/population-3-september-2021", "Population on 7 September 2021 (Census 2021)", "Población a 7 de septiembre de 2021 (censo de 2021)"),
  // ---------------------------------------------------------------- European Union and treaties
  euInheritance: s(["Your Europe (European Union)", "Tu Europa (Unión Europea)"], "https://europa.eu/youreurope/citizens/family/inheritances/planning-inheritance/index_en.htm", "Planning your cross-border inheritance in the EU", "Planificar una herencia transfronteriza en la UE"),
  euPets: s(["Your Europe (European Union)", "Tu Europa (Unión Europea)"], "https://europa.eu/youreurope/citizens/travel/carry/animal-plant/index_en.htm", "Travelling with pets and other animals in the EU", "Viajar con animales de compañía en la UE"),
  euEhic: s(["Your Europe (European Union)", "Tu Europa (Unión Europea)"], "https://europa.eu/youreurope/citizens/health/unplanned-healthcare/temporary-stays/index_en.htm", "Health cover for temporary stays", "Cobertura sanitaria en estancias temporales"),
  euBank: s(["Your Europe (European Union)", "Tu Europa (Unión Europea)"], "https://europa.eu/youreurope/citizens/consumers/financial-products-and-services/bank-accounts-eu/index_en.htm", "Bank accounts in the EU", "Cuentas bancarias en la UE"),
  euPayments: s(["Your Europe (European Union)", "Tu Europa (Unión Europea)"], "https://europa.eu/youreurope/citizens/consumers/financial-products-and-services/payments-transfers-cheques/index_en.htm", "Payments, transfers and cheques in the EU", "Pagos, transferencias y cheques en la UE"),
  euRegister: s(["Your Europe (European Union)", "Tu Europa (Unión Europea)"], "https://europa.eu/youreurope/citizens/residence/documents-formalities/registering-residence/index_en.htm", "Registering residence abroad after the first 3 months", "Registrar la residencia en otro país pasados los 3 primeros meses"),
  hcch: s(["Hague Conference on Private International Law", "Conferencia de La Haya de Derecho Internacional Privado"], "https://www.hcch.net/en/instruments/conventions/specialised-sections/apostille", "Apostille Section", "Sección Apostilla"),
};

export type SourceId = keyof typeof SOURCES;
