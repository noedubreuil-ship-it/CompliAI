/**
 * URLs de repli pour l'ingestion automatique (en plus de fetch_url / portal_url du registre).
 */

export const EU27_ALTERNATE_FETCH_URLS: Record<string, string[]> = {
  CY: [
    "https://www.cylaw.org/nomoi/indexes/2018_1_125.html",
    "https://www.dataprotection.gov.cy/dataprotection/dataprotection.nsf/all/6F623F6C5F2F0C0FC22583D6002F8F0C",
  ],
  DE: [
    "https://www.gesetze-im-internet.de/bdsg_2018/index.html",
    "https://www.gesetze-im-internet.de/bdsg_2018/",
  ],
  DK: [
    "https://www.retsinformation.dk/eli/lta/2018/502",
    "https://www.retsinformation.dk/api/document/eli/lta/2018/502",
  ],
  EE: ["https://www.riigiteataja.ee/akt/104012019011", "https://www.riigiteataja.ee/akt/104012019011?leiaKehtiv"],
  FI: [
    "https://www.finlex.fi/fi/lainsaadanto/2018/1050",
    "https://www.finlex.fi/fi/laki/ajantasa/2018/20181050",
  ],
  FR: [
    "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000886460",
    "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460",
  ],
  GR: [
    "https://www.e-nomothesia.gr/kat-prostasia-dedomenon-prosopikou-kharaktera/nomos-4624-2019.html",
  ],
  HU: ["https://njt.hu/jogszabaly/2011-112-00-00.5"],
  LT: ["https://www.e-tar.lt/portal/lt/legalActEditions/TAR.5368B592234C"],
  LU: ["https://legilux.public.lu/eli/etat/leg/loi/2018/08/01/a724/jo"],
  PL: ["https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20180001000"],
  PT: [
    "https://dre.pt/dre/legislacao-consolidada/lei/2019-128791983",
    "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2019-128791983",
  ],
  RO: ["https://legislatie.just.ro/Public/DetaliiDocument/202439"],
  SI: ["https://www.pisrs.si/Pis.web/pregledPredpisa?id=ZAKO8188"],
  SK: ["https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2018/18/20220901"],
};

export function getAlternateFetchUrlsForCountry(countryCode: string): string[] {
  const code = countryCode.trim().toUpperCase();
  return EU27_ALTERNATE_FETCH_URLS[code] ?? [];
}
