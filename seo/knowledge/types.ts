// Knowledge pages (15-nov-2026): glossaries of local words, buying guides by subject and pages that answer one
// question. The texts live in seo/knowledge/data/*.ts, written by hand in English and Spanish; seo/knowledge/build.ts
// turns them into pages. Rules of this folder:
//  - every legal, tax or procedural statement carries a source: an official page that was opened when the text was
//    written (seo/knowledge/sources.ts, with the day it was read) or one of our own country files
//    (src/data/guides.json, destinations.json, canbuy.json), whose own sources are listed on /costs/<country>;
//  - a statement nobody could source is not written;
//  - local words stay in their language and are explained in plain English and Spanish.

/** A text in both languages. Inline marks: [label](/path) for a link, *word* for a local term. */
export type L = { en: string; es: string };
export type Lang = "en" | "es";

/** An official page that was opened and read. `read` is the day it was read (ISO). */
export type Source = { url: string; org: string; /** The publisher's name as a Spanish text writes it, when the original is in English. */ orgEs?: string; title: L; read: string };

/** What a term is, across countries: the rows of the table of equivalents. */
export type Concept = "registry" | "extract" | "preliminary" | "deposit" | "deed" | "notary" | "transfer-tax" | "yearly-tax" | "tax-id" | "energy" | "cooling-off" | "community";

export type Term = {
  /** Anchor on the page, a-z and dashes. */
  id: string;
  /** The word as it is written where it is used. */
  term: string;
  /** Language of the word (BCP 47) when it differs from the glossary's `tl`. */
  tl?: string;
  /** How it is written in Latin letters or what it stands for, when that helps ("Impuesto sobre Bienes Inmuebles"). */
  aka?: string;
  /** A plain name for it in English and Spanish, for the heading. */
  plain: L;
  concept?: Concept;
  /** One sentence. */
  def: L;
  /** The longer explanation. */
  more: L;
  /** Source ids (sources.ts) or "data:<country key>" for our country files. */
  src: string[];
};

export type Glossary = {
  slug: string;
  /** Country keys of src/data/guides.json this glossary belongs to. */
  cc: string[];
  /** "Spain", "Sweden and Denmark". */
  name: L;
  /** Language of the words (BCP 47), for the lang attribute. */
  tl: string;
  /** The language the words are in, for the reader. */
  tongue: L;
  lede: L;
  terms: Term[];
  reviewed: string;
};

export type Section = {
  h: L;
  /** Paragraphs. A paragraph that starts with "- " is a list item. */
  p: L[];
  src?: string[];
  /** A block computed from our data, placed after the paragraphs (seo/knowledge/blocks.ts). */
  block?: string;
  /** Anchor for links from the question hub. */
  id?: string;
};

export type Topic = {
  slug: string;
  /** "buying": a guide by subject (/guide/buying/<slug>); "questions": a page that answers one question. */
  kind: "buying" | "questions";
  /** The ideas of the list this page implements. */
  ideas: number[];
  /** For the hub: which shelf it sits on. */
  shelf: "papers" | "money" | "tax" | "living" | "risk" | "words";
  /** <= 52 characters: the brand is added when it fits. */
  title: L;
  h1: L;
  /** <= 155 characters. */
  desc: L;
  /** The short answer, shown first. */
  answer: L;
  secs: Section[];
  /** Country keys the page has facts about (for links from the country guides). */
  cc?: string[];
  /** Other pages worth reading next: paths. */
  see?: string[];
  reviewed: string;
};
