// The words around the listing pages in the languages that have no app (15-nov-2026): header, footer, the notes
// that say which links are in English, and the page that lists every search of the language (/de, /ru, ...).
// The words of the listing pages themselves are in seo/listings/pack.<lang>.ts.
import type { NewLang } from "../listings/packkit";

export type Ui = {
  /** The language in its own words, and its Open Graph locale. */
  name: string; locale: string;
  skip: string; navLabel: string; navAll: string; navCountries: string; langLabel: string;
  /** Under the heading of the cards and of the table: a click opens the home's page, which is in English. */
  enHomes: string;
  /** Tooltip of the EN mark on links that leave the language. */
  enTitle: string;
  footAbout: string; footEnglish: string; footMethod: string; footWho: string; footContact: string; footPrivacy: string; footTerms: string;
  /** A line under the header on every page (Russian: RealHunt does not sell homes or arrange visas). */
  notice?: string;
  /** "м²" where the language does not write the unit in Latin letters. */
  sqm?: string;
  hub: {
    title: string; h1: string; desc: string;
    lede(homes: number, countries: number, searches: number): string;
    /** What the site is and how a home gets its score, in two or three sentences, with this build's numbers. */
    about(homes: number, min: string, max: string): string[];
    all: string; by: string; homes: string; budgets: string; features: string; ranked: string; near: string; combo: string; ccy: string;
    faqTitle: string; faq: [string, string][];
  };
};

/** Names of every language of the site, each in its own language. */
export const LANG_NAME: Record<string, string> = { en: "English", es: "Español", de: "Deutsch", ru: "Русский", fr: "Français", nl: "Nederlands", pl: "Polski" };
/** The label of the language links added to the English and Spanish pages. */
export const OTHER: Record<"en" | "es", string> = { en: "This page in other languages", es: "Esta página en otros idiomas" };

export const UI: Partial<Record<NewLang, Ui>> = {
  de: {
    name: "Deutsch", locale: "de_DE",
    skip: "Zum Inhalt springen", navLabel: "Hauptnavigation", navAll: "Alle Suchen", navCountries: "Länder", langLabel: "Sprache wählen",
    enHomes: "Ein Klick auf eine Immobilie öffnet ihre Detailseite. Diese Seiten gibt es bisher nur auf Englisch.",
    enTitle: "Diese Seite ist auf Englisch",
    footAbout: "RealHunt ist kein Makler und nimmt keine Provision. Jede Immobilie wurde von einem Menschen geprüft, erhält eine Note von 70 bis 98 und verlinkt auf ihre Originalanzeige.",
    footEnglish: "Links mit dem Zeichen EN führen zu Seiten, die es bisher nur auf Englisch gibt.",
    footMethod: "So entsteht die Note", footWho: "Wer wir sind", footContact: "Kontakt", footPrivacy: "Datenschutz", footTerms: "Nutzungsbedingungen",
    hub: {
      title: "Günstige Häuser im Ausland kaufen: alle Suchen nach Land, Preis und Lage",
      h1: "Günstige Häuser im Ausland kaufen",
      desc: "Günstige Häuser und Wohnungen in Spanien, Italien, Schweden, Dänemark, Frankreich und weiteren Ländern: echte Angebote mit Foto, Preis, Größe, Note und Kaufnebenkosten.",
      lede: (n, c, s) => `${n} Immobilien in ${c} Ländern, aufgeteilt in ${s} Suchen: nach Budget, am Meer, im Dorf, mit Garten oder Pool und nach Land. Jede Seite zeigt echte Angebote mit Foto, Preis, Größe und Note.`,
      about: (n, min, max) => [
        `RealHunt sammelt günstige Häuser und Wohnungen, die im Ausland zum Verkauf stehen, die meisten unter 100.000 €. Heute sind es ${n} Immobilien, von ${min} bis ${max}.`,
        "Ein Mensch sieht sich jede Anzeige an, bevor sie erscheint. Ruinen, reine Grundstücke und Anzeigen mit einem einzigen Foto nehmen wir nicht auf. Danach bekommt jede Immobilie eine Note von 70 bis 98, die Preis, Preis pro m², Fläche, Zustand, Lage und Kaufnebenkosten mit allen anderen Immobilien der Website vergleicht.",
        "Jede Länderseite nennt die Kaufnebenkosten in Prozent und die Regeln für ausländische Käufer, mit dem Stand der Daten. Das ist allgemeine Information, keine Rechts- oder Steuerberatung.",
      ],
      all: "In allen Ländern", by: "Nach Land", homes: "Immobilien", budgets: "Nach Budget", features: "Nach Merkmal", ranked: "Ranglisten", near: "In der Nähe einer Stadt", combo: "Nach Merkmal und Budget", ccy: "In Pfund und Dollar",
      faqTitle: "Häufige Fragen",
      faq: [
        ["Verkauft RealHunt diese Immobilien?", "Nein. RealHunt ist kein Makler und nimmt keine Provision. Jede Immobilie verlinkt auf ihre Originalanzeige; Sie sprechen direkt mit dem Verkäufer oder dem Makler vor Ort."],
        ["Was bedeutet die Note?", "Die Note reicht von 70 bis 98 und vergleicht jede Immobilie mit allen anderen der Website: Preis, Preis pro m², Fläche, Zustand, Ausstattung, Nähe zu Meer oder See, Wetter, Flughafen und Kaufnebenkosten. Sie ist kein Gutachten und keine Wertermittlung."],
        ["Warum sind manche Seiten auf Englisch?", "Die Suchseiten gibt es auf Deutsch. Die Detailseite jeder Immobilie, die Rechner und die Ratgeber gibt es bisher nur auf Englisch; solche Links tragen das Zeichen EN."],
      ],
    },
  },
  ru: {
    name: "Русский", locale: "ru_RU", sqm: "м²",
    skip: "Перейти к содержанию", navLabel: "Основное меню", navAll: "Все подборки", navCountries: "Страны", langLabel: "Выбрать язык",
    enHomes: "По клику открывается страница объекта. Эти страницы пока есть только на английском языке.",
    enTitle: "Эта страница на английском языке",
    notice: "RealHunt не продаёт недвижимость, не берёт комиссию и не оформляет визы и вид на жительство. Покупка жилья сама по себе не даёт права на проживание в стране.",
    footAbout: "RealHunt не агентство недвижимости. Каждый объект проверен человеком, получает оценку от 70 до 98 и ведёт на исходное объявление.",
    footEnglish: "Ссылки со знаком EN ведут на страницы, которые пока есть только на английском языке.",
    footMethod: "Как считается оценка", footWho: "Кто мы", footContact: "Контакты", footPrivacy: "Конфиденциальность", footTerms: "Условия использования",
    hub: {
      title: "Недорогая недвижимость за рубежом: подборки по странам, бюджету и расположению",
      h1: "Недорогая недвижимость за рубежом",
      desc: "Недорогие квартиры и дома в Болгарии, Греции и на Кипре: реальные объявления с фото, ценой, площадью, оценкой и расходами на покупку.",
      lede: (n, c, s) => `Объектов: ${n}, стран: ${c}, подборок: ${s}. Подборки собраны по бюджету, расположению, типу жилья и числу спален. На каждой странице реальные объявления с фото, ценой, площадью и оценкой.`,
      about: (n, min, max) => [
        `RealHunt собирает недорогие дома и квартиры, которые продаются за рубежом; большинство стоит меньше 100 000 €. В русской версии сейчас объектов: ${n}, цены от ${min} до ${max}.`,
        "Каждое объявление перед публикацией смотрит человек. Руины, участки без дома и объявления с одной фотографией мы не берём. Затем объект получает оценку от 70 до 98: она сравнивает цену, цену за м², площадь, состояние, расположение и расходы на покупку со всеми остальными объектами сайта.",
        "На странице каждой страны указаны расходы на покупку в процентах и правила для иностранных покупателей, с годом проверки данных. Это общая информация, а не юридическая или налоговая консультация. Цены указаны в евро.",
      ],
      all: "Во всех странах", by: "По странам", homes: "объектов", budgets: "По бюджету", features: "По особенностям", ranked: "Рейтинги", near: "Рядом с городом", combo: "По особенностям и бюджету", ccy: "В фунтах и долларах",
      faqTitle: "Частые вопросы",
      faq: [
        ["RealHunt продаёт эти объекты?", "Нет. RealHunt не агентство и не берёт комиссию. Каждый объект ведёт на исходное объявление, и вы общаетесь напрямую с продавцом или местным агентом."],
        ["Даёт ли покупка недвижимости вид на жительство?", "Сама по себе покупка жилья не даёт права на проживание. Правила въезда и проживания зависят от страны и от вашего гражданства, и RealHunt не оформляет визы и вид на жительство. Уточняйте правила в консульстве страны."],
        ["Что означает оценка?", "Оценка от 70 до 98 сравнивает объект со всеми остальными на сайте: цена, цена за м², площадь, состояние, удобства, близость к морю или озеру, погода, аэропорт и расходы на покупку. Это не экспертиза и не оценка рыночной стоимости."],
        ["Почему часть страниц на английском?", "Подборки переведены на русский язык. Страница каждого объекта, калькуляторы и руководства пока есть только на английском; такие ссылки отмечены знаком EN."],
      ],
    },
  },
};
