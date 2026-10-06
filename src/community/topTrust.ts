// Buyer-protection facts, official registries and independent lawyers per destination (researched and checked 30-sep-2026).
// Facts are general information, not legal advice. Each item links to its source.
export type Reg = { name: string; url: string; what: string };
export type Trust = { company: Reg; permit: Reg | null; permitNote?: string; land: Reg; checklist: { title: string; text: string; source: string }[]; lawyers: { name: string; city: string; url: string; focus: string }[] };
export const TOP_TRUST: Record<string, Trust> = {
 "bali": {
  "company": {
   "name": "AHU Online (Ministry of Law) - company profile search",
   "url": "https://ahu.go.id/pencarian/profil-pt",
   "what": "Search any PT (incl. PT PMA) by name: legal status, deed/SK data, directors (paid extract for full profile)."
  },
  "permit": {
   "name": "SIMBG (Ministry of Public Works) - building approvals",
   "url": "https://simbg.pu.go.id",
   "what": "Official system for PBG building approval and SLF certificate of worthiness; ask for the PBG/SLF numbers issued here."
  },
  "land": {
   "name": "ATR/BPN (National Land Agency)",
   "url": "https://www.atrbpn.go.id",
   "what": "Land titles (SHM/HGB/Hak Pakai) and spatial planning; title checks done at the local BPN office via notary/PPAT."
  },
  "checklist": [
   {
    "title": "No freehold land for foreigners",
    "text": "Foreigners cannot hold Hak Milik over land. Allowed: Hak Pakai (right of use), registered lease (Hak Sewa) and ownership of an apartment unit (Hak Milik atas Sarusun).",
    "source": "https://www.hukumonline.com/klinik/a/hak-atas-tanah-dan-bangunan-bagi-orang-asing-di-indonesia-cl395/"
   },
   {
    "title": "Hak Pakai terms",
    "text": "Hak Pakai runs 30 years, extendable 20, renewable 30 (PP 18/2021). Foreign individuals need valid immigration documents; minimum-price rules apply.",
    "source": "https://www.hukumonline.com/klinik/a/hak-atas-tanah-dan-bangunan-bagi-orang-asing-di-indonesia-cl395/"
   },
   {
    "title": "PT PMA can hold HGB",
    "text": "A foreign-owned PT PMA can hold Hak Guna Bangunan (HGB): 30 years, extendable 20, then renewable. Check the certificate is in the PT's own name.",
    "source": "https://www.cekindo.com/blog/buying-land-indonesia"
   },
   {
    "title": "PBG and SLF, not IMB",
    "text": "Since 2021 (PP 16/2021) the IMB was replaced by PBG building approval, processed on SIMBG, with an SLF certificate before use. Ask for both.",
    "source": "https://dpmptsp.solselkab.go.id/read/109/informasi-tentang-pbg-pengganti-imb"
   },
   {
    "title": "Check zoning separately",
    "text": "PBG checks technical building standards, not spatial planning. Separately confirm the plot's zoning allows the use (e.g. not green/agricultural zone).",
    "source": "https://www.hukumonline.com/berita/a/paradigma-baru-mendirikan-bangunan-lt60504d94ca81d/"
   },
   {
    "title": "Nominee deals are void",
    "text": "Holding land through an Indonesian nominee is null and void under Article 26(2) of the Basic Agrarian Law. The registered owner stays the legal owner.",
    "source": "https://emerhub.com/bali/nominee-arrangements/"
   }
  ],
  "lawyers": [
   {
    "name": "Vidhi Law Office",
    "city": "Kuta, Bali",
    "url": "https://www.vlobali.com/about",
    "focus": "Since 2001; title searches, contract review, nominee-risk advice, in-house notary"
   },
   {
    "name": "Schinder Law Firm",
    "city": "Sanur, Bali (HQ Jakarta)",
    "url": "https://schinderlawfirm.com/",
    "focus": "Land/property legal due diligence and disputes for foreign investors"
   },
   {
    "name": "Yuna Law Firm",
    "city": "Denpasar, Bali",
    "url": "https://www.yunalawfirm.com/",
    "focus": "PERADI-member advocates; property title due diligence for foreigners"
   }
  ]
 },
 "phuket": {
  "company": {
   "name": "DBD DataWarehouse+ (Department of Business Development)",
   "url": "https://datawarehouse.dbd.go.th/",
   "what": "Free search of Thai juristic persons: registration no., status, capital, directors, shareholders, filed financials."
  },
  "permit": null,
  "permitNote": "Building permits are issued by the local authority where the plot sits (e.g. Phuket City Municipality, Kathu or Cherngtalay local administration). There is no single national online lookup, so ask the developer for the permit and the EIA approval.",
  "land": {
   "name": "Department of Lands - LandsMaps",
   "url": "https://landsmaps.dol.go.th/",
   "what": "Official map lookup of a title deed (chanote) parcel by deed number: location, area, appraisal."
  },
  "checklist": [
   {
    "title": "Condo freehold within 49% quota",
    "text": "Foreigners can own condo units freehold only if total foreign ownership stays within 49% of the building's sellable area.",
    "source": "https://lexbangkok.com/can-foreigners-buy-condominiums-in-thailand/"
   },
   {
    "title": "Bring funds from abroad (FET)",
    "text": "Purchase money must be sent from overseas in foreign currency and documented (Foreign Exchange Transaction form) to register condo ownership.",
    "source": "https://lexbangkok.com/can-foreigners-buy-condominiums-in-thailand/"
   },
   {
    "title": "No land ownership",
    "text": "Foreigners cannot own land. Villas are usually sold as leasehold land plus building. Check how the land part is structured.",
    "source": "https://lexbangkok.com/can-foreigners-buy-condominiums-in-thailand/"
   },
   {
    "title": "Lease: 30 years, registered",
    "text": "Leases are capped at 30 years (s.540) and must be registered at the Land Office if over 3 years. Supreme Court (2025): pre-agreed renewals are unenforceable.",
    "source": "https://www.austchamthailand.com/resources/news/thai-supreme-court-shuts-door-long-term-lease-loopholes-foreign-property-investors"
   },
   {
    "title": "Nominee companies are illegal",
    "text": "Holding land via Thai nominee shareholders is prohibited, with criminal penalties and forced sale. Land offices stepped up checks in May 2026.",
    "source": "https://silklegal.com/what-thailands-new-lands-directives-mean-for-nominee-shareholding-and-property-ownership-in-2026/"
   },
   {
    "title": "EIA for larger condos",
    "text": "Condo projects of about 80+ units (or over 23 m high) need an approved EIA before building. Ask for the approval.",
    "source": "https://thairesidential.com/phuket-property-environmental-impact-assessment-eia/"
   }
  ],
  "lawyers": [
   {
    "name": "Siam Legal International",
    "city": "Cherngtalay, Phuket",
    "url": "https://www.siam-legal.com/thai-law/phuket-lawyer.php",
    "focus": "Title investigation, SPA/lease drafting, villa and condo transfers for foreigners"
   },
   {
    "name": "Ake & Associates",
    "city": "Phuket Town",
    "url": "https://ake-associates.co.th/legal-advisory/real-estate/",
    "focus": "~25 years; real estate due diligence, title and zoning checks"
   },
   {
    "name": "Juslaws & Consult",
    "city": "Kathu, Phuket (also Bangkok)",
    "url": "https://www.juslaws.com/contact-us",
    "focus": "Real estate and condo project due diligence, zoning verification"
   }
  ]
 }, "samui": {
  "company": {
   "name": "DBD DataWarehouse+ (Department of Business Development)",
   "url": "https://datawarehouse.dbd.go.th/",
   "what": "Free search of Thai juristic persons: registration no., status, capital, directors, shareholders, filed financials."
  },
  "permit": null,
  "permitNote": "Building permits are issued by the local authority where the plot sits (Koh Samui City Municipality). Steep hillside plots also need slope approval. There is no single national online lookup, so ask the developer for the permit and the EIA approval.",
  "land": {
   "name": "Department of Lands - LandsMaps",
   "url": "https://landsmaps.dol.go.th/",
   "what": "Official map lookup of a title deed (chanote) parcel by deed number: location, area, appraisal."
  },
  "checklist": [
   {
    "title": "Condo freehold within 49% quota",
    "text": "Foreigners can own condo units freehold only if total foreign ownership stays within 49% of the building's sellable area.",
    "source": "https://lexbangkok.com/can-foreigners-buy-condominiums-in-thailand/"
   },
   {
    "title": "Bring funds from abroad (FET)",
    "text": "Purchase money must be sent from overseas in foreign currency and documented (Foreign Exchange Transaction form) to register condo ownership.",
    "source": "https://lexbangkok.com/can-foreigners-buy-condominiums-in-thailand/"
   },
   {
    "title": "No land ownership",
    "text": "Foreigners cannot own land. Villas are usually sold as leasehold land plus building. Check how the land part is structured.",
    "source": "https://lexbangkok.com/can-foreigners-buy-condominiums-in-thailand/"
   },
   {
    "title": "Lease: 30 years, registered",
    "text": "Leases are capped at 30 years (s.540) and must be registered at the Land Office if over 3 years. Supreme Court (2025): pre-agreed renewals are unenforceable.",
    "source": "https://www.austchamthailand.com/resources/news/thai-supreme-court-shuts-door-long-term-lease-loopholes-foreign-property-investors"
   },
   {
    "title": "Nominee companies are illegal",
    "text": "Holding land via Thai nominee shareholders is prohibited, with criminal penalties and forced sale. Land offices stepped up checks in May 2026.",
    "source": "https://silklegal.com/what-thailands-new-lands-directives-mean-for-nominee-shareholding-and-property-ownership-in-2026/"
   },
   {
    "title": "EIA for larger condos",
    "text": "Condo projects of about 80+ units (or over 23 m high) need an approved EIA before building. Ask for the approval.",
    "source": "https://thairesidential.com/phuket-property-environmental-impact-assessment-eia/"
   }
  ],
  "lawyers": [
   {
    "name": "Frank Legal & Tax (FLT)",
    "city": "Koh Samui (also Bangkok)",
    "url": "https://franklegaltax.com/lawyer-koh-samui/",
    "focus": "Business and real estate law on Koh Samui; property and company structuring for foreigners"
   },
   {
    "name": "Samui Law Firm",
    "city": "Koh Samui",
    "url": "https://www.samuilawfirm.com/",
    "focus": "Local law firm on Koh Samui"
   },
   {
    "name": "Sukhothai Interlaw",
    "city": "Koh Samui office (also Bangkok, Phuket)",
    "url": "https://sukhothaiinterlaw.com/blog/lawyers-and-real-estate-legal-services-on-koh-samui/",
    "focus": "Real estate legal services on Koh Samui"
   }
  ]
 },

 "tulum": {
  "company": {
   "name": "SIGER 2.0 - Registro Público de Comercio (Secretaría de Economía)",
   "url": "https://rpc.economia.gob.mx/siger2",
   "what": "National commercial registry: company incorporation, folio mercantil, powers of attorney. Requires free user login to search."
  },
  "permit": {
   "name": "Municipio de Tulum - Dirección General de Desarrollo Urbano",
   "url": "https://www.tulum.gob.mx/",
   "what": "Issues land-use certificates (uso de suelo), construction licences and condominium-regime authorisations."
  },
  "land": {
   "name": "SRE - fideicomiso permit (restricted zone)",
   "url": "https://sre.gob.mx/permiso-para-constituir-un-fideicomiso-en-zona-restringida",
   "what": "Foreign Ministry permit that the bank trust (fideicomiso) needs; ask for the permit number."
  },
  "checklist": [
   {
    "title": "Restricted zone: bank trust",
    "text": "Within 50 km of the coast foreigners cannot hold title directly. Residential property goes into a bank fideicomiso with an SRE permit, max 50 years, renewable.",
    "source": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LIE.pdf"
   },
   {
    "title": "Mexican company: non-residential only",
    "text": "A Mexican company with foreign shareholders may own coastal property directly only for non-residential use, and must notify SRE. Homes require the fideicomiso.",
    "source": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LIE.pdf"
   },
   {
    "title": "Avoid ejido land",
    "text": "Ejido common land can't be sold. An ejido parcel needs dominio pleno, cancellation at the RAN and a title registered in the Public Property Registry.",
    "source": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LAgra.pdf"
   },
   {
    "title": "Federal environmental approval (MIA)",
    "text": "Real estate developments affecting coastal ecosystems need prior SEMARNAT environmental impact authorisation (LGEEPA Art. 28-IX). Ask for the resolution.",
    "source": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LGEEPA.pdf"
   },
   {
    "title": "Municipal land use and licence",
    "text": "Confirm Tulum issued the uso de suelo, the construction licence and, for condos, the condominium-regime authorisation for this project.",
    "source": "https://www.tulum.gob.mx/Pdfs/RTulum/33.pdf"
   }
  ],
  "lawyers": [
   {
    "name": "Goldenberg Associates (Tulum Lawyer)",
    "city": "Tulum (La Veleta)",
    "url": "https://www.tulumlawyer.com/",
    "focus": "Real estate due diligence; litigation against developer malpractice and fraud"
   },
   {
    "name": "MexLaw",
    "city": "Playa del Carmen (also Mérida)",
    "url": "https://mexlaw.com/",
    "focus": "Legal due diligence, contract review, escrow for foreign buyers"
   },
   {
    "name": "Corporativo Riviera Maya",
    "city": "Playa del Carmen",
    "url": "https://corporativorivieramaya.com/en/real-estate-law/",
    "focus": "Property due diligence, purchase contracts and closings in Riviera Maya"
   }
  ]
 },
 "batumi": {
  "company": {
   "name": "NAPR - Registry of Entrepreneurial and Non-Entrepreneurial Legal Entities",
   "url": "https://enreg.reestri.gov.ge/main.php?m=new_index&l=en",
   "what": "Free company search by ID code or name: status, directors, partners, registered filings."
  },
  "permit": {
   "name": "Batumi City Hall",
   "url": "https://batumi.ge/",
   "what": "Municipality that issues and refuses construction permits in Batumi; request a copy of the permit."
  },
  "land": {
   "name": "NAPR - Public Registry portal",
   "url": "https://public.reestri.gov.ge/",
   "what": "Property registry extracts by cadastral code: owner, mortgages, liens, leases."
  },
  "checklist": [
   {
    "title": "Freehold is allowed",
    "text": "Foreigners can own apartments, houses, commercial space and non-agricultural land outright. Ownership is registered with NAPR.",
    "source": "https://nomosgeorgia.com/can-a-foreigner-own-land-or-real-estate-in-georgia/"
   },
   {
    "title": "Agricultural land restricted",
    "text": "Foreigners can't buy farmland (except by inheritance). Foreign-owned Georgian companies also need Government approval of an investment plan.",
    "source": "https://gratanet.com/publications/foreign-ownership-restrictions-limitation-of-foreign-investments-and-equity-in-corporations-in-georgia?region=georgia"
   },
   {
    "title": "Pull the NAPR extract",
    "text": "Check the registry extract for the land and building: registered owner, mortgages and liens. These pass to the buyer.",
    "source": "https://legal.ge/en/service/civil-law-en/off-plan-property-purchase-en"
   },
   {
    "title": "Pre-register off-plan contracts",
    "text": "Register the off-plan contract in the public registry so your future right is recorded before completion, which blocks double sales.",
    "source": "https://legal.ge/en/service/civil-law-en/off-plan-property-purchase-en"
   },
   {
    "title": "Permit and staged payments",
    "text": "Batumi City Hall issues construction permits, so ask for a copy. Tie payments to construction stages. The unit is registered only after completion.",
    "source": "https://oc-media.org/denial-of-construction-permit-for-batumi-mosque-was-discriminatory-court-rules/"
   }
  ],
  "lawyers": [
   {
    "name": "Othniel",
    "city": "Batumi",
    "url": "https://othniel.ge/services/",
    "focus": "Real estate law: sales, purchases, leases, property disputes"
   },
   {
    "name": "Sophio Gabrushidze Law Office",
    "city": "Batumi",
    "url": "https://batumilaw.com/",
    "focus": "Batumi property purchases, developer contracts and real estate disputes"
   },
   {
    "name": "BGI Legal",
    "city": "Tbilisi (nationwide)",
    "url": "https://bgi.ge/",
    "focus": "Established Georgian firm; property and real estate transactions"
   }
  ]
 }
};
