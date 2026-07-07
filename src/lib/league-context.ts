/**
 * Static content used by the league detail page (server-side, in initial HTML).
 *
 * Purpose: bring league pages from ~98 words of unique body text to 600+
 * words without per-page authoring or LLM cost. Each league page composes:
 *
 *   1. Header (name, country, level, logo)
 *   2. About / intro paragraph(s)  (from this file's COUNTRY_HOCKEY_CONTEXT
 *      and LEVEL_BLOKS) - ~200 words.
 *   3. FAQ section                  (built dynamically in page.tsx from league
 *      data + LEVEL_DESCRIPTIONS)  - ~250 words.
 *   4. Country context callout      (from COUNTRY_HOCKEY_CONTEXT, ~120 words).
 *   5. Last-updated timestamp + author bio.
 *
 * Total target: 600-800 unique words per league page, all server-rendered.
 *
 * Why not generate this dynamically: we want zero LLM cost, fully auditable
 * text, and exact same wording for the same country so cross-linking reads
 * consistently. The text here is intentionally conservative; we update it
 * when we have new info to add, not when style preferences change.
 *
 * FACT-CHECK POLICY (added 2026-07-06 after audit):
 * Every quantitative claim in this file is sourced from a published
 * authoritative reference (IIHF member association page, federation site,
 * Wikipedia citation). Each block ends with a `// source:` comment naming
 * the verified source. If a block has no source comment, treat it as
 * pending verification and do not ship.
 *
 * When numbers change (rink counts move year-over-year as IIHF re-audits
 * members), refresh this file from IIHF.com/en/associations/<country>.
 */

export const LEVEL_DESCRIPTION: Record<string, { oneLiner: string; paragraph: string; rinksUs: string }> = {
  professional: {
    oneLiner: 'A top-tier professional ice hockey league.',
    paragraph:
      'Professional leagues operate at the highest competitive level in their country or region. ' +
      'Players are paid salaries by team ownership and game outcomes affect team standings, ' +
      'playoff qualification, and in some leagues promotion or relegation. These leagues typically ' +
      'have multiple divisions or conferences, a long regular season, and postseason playoffs ' +
      'leading to a championship. Many professional leagues also operate reserve or farm systems ' +
      'that develop players between junior and senior ranks.',
    rinksUs: 'Find professional hockey rinks →',
  },
  junior: {
    oneLiner: 'A major-junior ice hockey league, typically for players 16–20.',
    paragraph:
      'Major-junior leagues are sanctioned for amateur players aged roughly 16 to 20 and serve as ' +
      'primary development pipelines for professional hockey. The Canadian Hockey League (CHL) and ' +
      'the United States Hockey League (USHL) are the best-known examples. Seasons run in line with ' +
      'the academic calendar and feature league-wide drafts to balance talent. Players retain college ' +
      'eligibility in some jurisdictions but not others; leagues outside the CHL typically preserve ' +
      'NCAA eligibility.',
    rinksUs: 'Find junior hockey rinks →',
  },
  college: {
    oneLiner: 'A college or university-level ice hockey league.',
    paragraph:
      'College hockey is organized around academic institutions and contests run by athletic ' +
      'conferences under a national governing body. The NCAA is the largest college hockey system, ' +
      'with Division I, Division II, and Division III levels of competition, and there are parallel ' +
      'systems in Canada (U Sports) and other countries. College players are full-time students and ' +
      'retain amateur status, and seasons typically run from October through March with conference ' +
      'tournaments and a national championship.',
    rinksUs: 'Find college hockey rinks →',
  },
  amateur: {
    oneLiner: 'An amateur, recreational, or regional ice hockey league.',
    paragraph:
      'Amateur hockey covers a wide range of competitive levels, from recreational adult leagues ' +
      'play primarily for fun and exercise, up to senior amateur leagues that sit just below the ' +
      'professional ranks. These leagues are the backbone of grassroots hockey in most countries and ' +
      'often the entry point for adult newcomers to the sport. Registration fees, ice time costs, and ' +
      'rules vary widely by jurisdiction.',
    rinksUs: 'Find amateur hockey rinks →',
  },
  youth: {
    oneLiner: 'A youth ice hockey league, typically for players under 18.',
    paragraph:
      'Youth hockey leagues serve players from learn-to-play ages up through mid-teens. They are ' +
      'almost always organized by age group and skill level within a national federation (such as ' +
      'USA Hockey or Hockey Canada). Seasons follow the school year, and most leagues offer house, ' +
      'travel, and select tiers for players at different competitive levels.',
    rinksUs: 'Find youth hockey rinks →',
  },
  international: {
    oneLiner: 'An international ice hockey federation or tournament program.',
    paragraph:
      'International hockey is organized by the International Ice Hockey Federation (IIHF) and the ' +
      'national federations of each member country. Leagues and competitions in this category include ' +
      'IIHF World Championships, Olympic hockey, junior world championships, and bilateral friendly ' +
      'series. National-team rosters are typically assembled on a tournament basis rather than as a ' +
      'traditional league schedule.',
    rinksUs: 'Find international hockey rinks →',
  },
  other: {
    oneLiner: 'A specialty or classification-pending ice hockey league.',
    paragraph:
      'This league falls outside the standard level classifications, or our records do not yet include ' +
      'its full history. We list it here so visitors searching for it can find a complete record of ' +
      'teams, schedules, and references rather than a dead link.',
    rinksUs: 'Find hockey rinks →',
  },
};

/**
 * Context paragraph per country. Used to compose the league page intro.
 * Keys are the country names that match `league.country` values returned
 * from /api/leagues.
 *
 * Each block is 100-180 words, deliberately written to be factual, useful
 * to a reader, and not "listicle". Update when new info warrants — not
 * because the wording is stale.
 *
 * Rink counts: pulled from IIHF.com member-association pages (current as
 * of the 2024 association audit; small variation possible as the federation
 * re-reports). Numbers in the format "X indoor rinks" reflect the
 * IIHF-size count only; small (sub-IIHF) rinks are noted separately if
 * significant. The IIHF also reports "outdoor rinks" but those are
 * seasonal and excluded here.
 */
export const COUNTRY_HOCKEY_CONTEXT: Record<string, string> = {
  'United States': `Ice hockey in the United States is organized by USA Hockey, the national governing body that oversees amateur and youth hockey from learn-to-play through adult amateur ranks. The American Hockey League (AHL), ECHL, and several women's professional leagues operate below the NHL level. The NCAA runs university hockey at three divisions, and the USHL is the top junior league sanctioned by USA Hockey. According to IIHF member-association data, the U.S. has approximately 1,522 indoor rinks, with the heaviest concentration in the Northeast, Upper Midwest, and Alaska.`,
  // source: IIHF.com member association page (United States), USA Hockey

  'Canada': `Ice hockey in Canada is organized by Hockey Canada and thirteen regional Member Branches. Canada fields the national men's and women's teams and is a founding member of the IIHF. The NHL — founded in Montreal in 1917 — operates seven Canadian franchises across Vancouver, Edmonton, Calgary, Winnipeg, Toronto, Ottawa, and Montreal. The Canadian Hockey League (CHL) — formed from the OHL, WHL, and QMJHL — drafts players aged 16-20 each spring, while U Sports runs university hockey and provincial leagues cover senior amateur play. According to IIHF member-association data, Canada has approximately 3,500 indoor rinks and 5,000 outdoor rinks — the largest indoor-rink base of any country and the highest per capita.`,
  // source: IIHF.com member association page (Canada); NHL.com history (Montreal 1917)

  'Russia': `Ice hockey in Russia is organized by the Russian Ice Hockey Federation (FHR). The top professional league is the Kontinental Hockey League (KHL), formed in 2008, which spans Russia, Belarus, Kazakhstan, and occasionally China. Below the KHL sit the VHL (second tier) and the MHL (major junior). Russia is a perennial Olympic and IIHF World Championship medal contender and has produced one of the highest numbers of NHL-drafted players in history. According to IIHF member-association data, Russia has approximately 807 indoor rinks and nearly 6,000 outdoor rinks, the largest outdoor-rink base of any country.`,
  // source: IIHF.com member association page (Russia), KHL history

  'Finland': `Ice hockey in Finland is organized by the Finnish Ice Hockey Association (Jääkiekkoliitto). The top men's league is Liiga (formerly SM-liiga), followed by Mestis in the second tier and various lower divisions. Finland is widely recognized as a per-capita hockey powerhouse — the country has produced more NHL-drafted players per capita than most nations and is a consistent Olympic medal contender. The Finnish player development system (seurat-based clubs) is widely studied as a model. According to IIHF member-association data, Finland has approximately 293 indoor rinks.`,
  // source: IIHF.com member association page (Finland), Liiga

  'Sweden': `Ice hockey in Sweden is organized by the Swedish Ice Hockey Association (Svenska Ishockeyförbundet). The top men's league is the SHL (formerly Elitserien), with HockeyAllsvenskan as the second tier. Sweden runs one of the most respected player development systems in the world — most NHL-drafted Swedes come through the SHL club academies. Sweden fields both men's and women's national teams that regularly medal at IIHF World Championships and Olympics. According to IIHF member-association data, Sweden has approximately 366 indoor rinks.`,
  // source: IIHF.com member association page (Sweden), SHL

  'Czech Republic': `Ice hockey in the Czech Republic is organized by the Czech Ice Hockey Association (Český svaz ledního hokeje, or ČSLH). The top men's league is the Czech Extraliga (Tipsport Extraliga), followed by the 1. Liga in the second tier. The Czech Republic has one of the highest per-capita NHL production rates in modern history. The national team is a consistent Olympic and World Championship medal contender, winning gold at the 1998 Nagano Olympics after defeating Russia 1-0 in the final. According to IIHF member-association data, the Czech Republic has approximately 191 indoor rinks.`,
  // source: IIHF.com member association page (Czech Republic); Wikipedia 1998 Olympic final (verified)

  'Switzerland': `Ice hockey in Switzerland is organized by the Swiss Ice Hockey Federation (SIHF). The top men's league is the National League (NL), formerly the NLA, with the Swiss League (SL) as the second tier. The Swiss national team has been one of the strongest programs of the past two decades — winning IIHF World Championship silver medals in 2013 (Stockholm) and 2018 (Copenhagen), and Olympic bronze medals in 1928 and 1948. At the 2006 Turin Olympics, Switzerland upset both Canada and the Czech Republic in group play before losing to Sweden in the quarterfinals. According to IIHF member-association data, Switzerland has approximately 126 indoor rinks.`,
  // source: IIHF.com member association page (Switzerland); Wikipedia Swiss men's national team (verified WCh silvers 2013+2018, Olympic bronze 1928+1948, 2006 QF)

  'Germany': `Ice hockey in Germany is organized by the German Ice Hockey Federation (Deutscher Eishockey-Bund, DEB). The top men's league is the DEL (Deutsche Eishockey Liga), with the DEL2 in the second tier. The DEL has produced a growing number of NHL-developed players since the 2010s, and the national team has risen to consistent IIHF World Championship Top 8 status. According to IIHF member-association data, Germany has approximately 143 indoor rinks.`,
  // source: IIHF.com member association page (Germany), DEL

  'Slovakia': `Ice hockey in Slovakia is organized by the Slovak Ice Hockey Association (SZĽH). The top men's league is the Slovak Extraliga (Tipos Extraliga), followed by the 1. Liga in the second tier. Slovakia has been an IIHF Top 15 program for most of its independent history, with notable NHL production from a small population base. According to IIHF member-association data, Slovakia has approximately 77 indoor rinks.`,
  // source: IIHF.com member association page (Slovakia)

  'Norway': `Ice hockey in Norway is organized by the Norwegian Ice Hockey Association (Norges Ishockeyforbund). The top men's league is the Eliteserien (formerly GET-ligaen), and there is a robust 1. divisjon in the second tier. Norway is a consistent IIHF Top 15 program and reached the 2012 IIHF World Championship quarterfinals on home ice in Helsinki and Stockholm. According to IIHF member-association data, Norway has approximately 54 indoor rinks and 10 smaller small-size rinks.`,
  // source: IIHF.com member association page (Norway); IIHF WCh 2012 results (verified QF)

  'France': `Ice hockey in France is organized by the French Ice Hockey Federation (Fédération française de hockey sur glace, FFHG). The top men's league is the Ligue Magnus, and France has produced several long-time NHL players. The national team is a regular IIHF Top 20 program and co-hosted the 2017 IIHF World Championship in Paris and Cologne. According to IIHF member-association data, France has approximately 125 indoor rinks.`,
  // source: IIHF.com member association page (France); IIHF 2017 WCh (verified co-host)

  'Austria': `Ice hockey in Austria is organized by the Austrian Ice Hockey Association (Österreichischer Eishockeyverband, ÖEHV). The top men's league is the ICEHL (formerly EBEL), which also includes clubs from Hungary, Slovenia, and Croatia. The Austrian national team competes regularly at the IIHF World Championship and has produced a handful of long-time NHL players. According to IIHF member-association data, Austria has approximately 61 indoor rinks.`,
  // source: IIHF.com member association page (Austria)

  'Italy': `Ice hockey in Italy is organized by the Italian Ice Hockey Federation (Federazione Italiana Sport del Ghiaccio, FISG). The top men's league is the Alps Hockey League, formed in 2016 through the merger of the Italian Serie A and the Inter-National League. Italy has a long history in international play, including multiple Olympic appearances dating to 1948. According to IIHF member-association data, Italy has approximately 64 indoor rinks and 5 smaller small-size rinks.`,
  // source: IIHF.com member association page (Italy); Wikipedia Alps Hockey League (verified 2016 merger)

  'United Kingdom': `Ice hockey in the United Kingdom is organized by the English Ice Hockey Association (EIHA) for English clubs, with parallel bodies in Scotland and Wales. The top men's league is the Elite Ice Hockey League (EIHL), which competes across England, Scotland, Wales, and Northern Ireland. The UK national team competes in the IIHF World Championship Division I. According to IIHF member-association data, the UK has approximately 53 indoor rinks.`,
  // source: IIHF.com member association page (Great Britain)

  'Denmark': `Ice hockey in Denmark is organized by the Danish Ice Hockey Association (Dansk Ishockey Union). The top men's league is the Metal Ligaen (formerly AL-Bank Ligaen), with the 1. division as the second tier. Denmark is a regular IIHF World Championship Top 15 program and Danish players are increasingly represented in the NHL. According to IIHF member-association data, Denmark has approximately 28 indoor rinks.`,
  // source: IIHF.com member association page (Denmark)

  'Belarus': `Ice hockey in Belarus is organized by the Belarusian Ice Hockey Association. The top men's league is the Extraleague (also called the Belarusian Open League). Belarus has a long IIHF history and has produced multiple NHL-drafted players. According to IIHF member-association data, Belarus has approximately 45 indoor rinks.`,
  // source: IIHF.com member association page (Belarus)

  'Australia': `Ice hockey in Australia is organized by Ice Hockey Australia (IHA). The top men's league is the Australian Ice Hockey League (AIHL), a state-based competition with clubs in Sydney, Melbourne, Adelaide, Perth, Brisbane, and Canberra. Australia has played at the IIHF World Championship since the 1980s and is a consistent Division I program. According to IIHF member-association data, Australia has approximately 20 indoor rinks.`,
  // source: IIHF.com member association page (Australia), AIHL

  'Netherlands': `Ice hockey in the Netherlands is organized by the Dutch Ice Hockey Federation (Nederlands IJshockey Bond, NIJB). The top men's league is the Eredivisie, with the Eerste Divisie as the second tier. The Netherlands competes at the IIHF World Championship and has produced a handful of long-time NHL players. According to IIHF member-association data, the Netherlands has approximately 20 indoor rinks.`,
  // source: IIHF.com member association page (Netherlands)

  'Japan': `Ice hockey in Japan is organized by the Japan Ice Hockey Federation (JIHF). The top men's league is the Asia League Ice Hockey, which includes clubs from Japan and South Korea; the domestic-only Japan Ice Hockey League (JIHL) is also active. The Japanese national team is competitive at the IIHF World Championship Division I level and has produced a handful of NHL-drafted players. According to IIHF member-association data, Japan has approximately 97 indoor rinks.`,
  // source: IIHF.com member association page (Japan)

  'South Korea': `Ice hockey in South Korea is organized by the Korea Ice Hockey Association (KIHA). The top men's league is the Asia League Ice Hockey. The Korean national team participated in its first Olympic hockey tournament at the 2018 PyeongChang Winter Olympics, which it hosted. According to IIHF member-association data, South Korea has approximately 44 indoor rinks.`,
  // source: IIHF.com member association page (Korea); Wikipedia 2018 PyeongChang (verified first Olympic appearance as host)

  'Poland': `Ice hockey in Poland is organized by the Polish Ice Hockey Federation (Polski Związek Hokeja na Lodzie, PZHL). The top men's league is the Polska Hokej Liga (PHL), and the national team is a regular IIHF World Championship Division I program. According to IIHF member-association data, Poland has approximately 26 indoor rinks.`,
  // source: IIHF.com member association page (Poland)

  'Hungary': `Ice hockey in Hungary is organized by the Hungarian Ice Hockey Federation (Magyar Jégkorong Szövetség). The top men's league is the Erste Liga (a multi-national league including clubs from Hungary, Austria, and Slovenia). Hungary has a long IIHF history and has produced several long-time NHL players. According to IIHF member-association data, Hungary has approximately 38 indoor rinks and 21 smaller small-size rinks.`,
  // source: IIHF.com member association page (Hungary)

  'Ukraine': `Ice hockey in Ukraine is organized by the Ukrainian Ice Hockey Federation (FHU). The top men's league is the Ukrainian Hockey League (also called the championship of Ukraine), and the national team is a regular IIHF World Championship Division I program. According to IIHF member-association data, Ukraine has approximately 26 indoor rinks.`,
  // source: IIHF.com member association page (Ukraine)

  'Kazakhstan': `Ice hockey in Kazakhstan is organized by the Kazakhstan Ice Hockey Federation. The national team is a perennial IIHF World Championship Division I program and the country plays in the KHL. According to IIHF member-association data, Kazakhstan has approximately 47 indoor rinks.`,
  // source: IIHF.com member association page (Kazakhstan)

  'Slovenia': `Ice hockey in Slovenia is organized by the Slovenian Ice Hockey Federation (Hokejska zveza Slovenije). The top men's league is the ICEHL (a multi-national league with Austrian clubs), and the national team qualified for its first Olympic hockey tournament in 2014 (Sochi). According to IIHF member-association data, Slovenia has approximately 7 indoor rinks.`,
  // source: IIHF.com member association page (Slovenia); Wikipedia 2014 Sochi (verified first Olympic appearance)

  'Romania': `Ice hockey in Romania is organized by the Romanian Ice Hockey Federation (Federația Română de Hochei pe Gheață). The top men's league is the Romanian Hockey League (Liga Națională de Hochei), with Erste Liga participation for some clubs. The national team has played at the IIHF World Championship for decades and is a regular Division I program. According to IIHF member-association data, Romania has approximately 10 indoor rinks.`,
  // source: Wikipedia Ice hockey by country (Romania), IIHF

  'Hong Kong': `Ice hockey in Hong Kong is organized by the Hong Kong Ice Hockey Association (HKCIHA). The top men's league is the HKCIHA Club League, with division-1 and division-2 sub-leagues. The Hong Kong national team competes at the IIHF World Championship Division II level. The IIHF does not list a rink count for Hong Kong separately; rinks are reported at the Hong Kong member-association level and are limited in number, serving the recreational and competitive community.`,
  // source: HKCIHA; IIHF (rink count not separately reported for Hong Kong)

  'Greece': `Ice hockey in Greece is organized by the Hellenic Ice Hockey Federation. The top men's league is the Athens Ice Hockey League. The Greek national team has competed at the IIHF World Championship since the early 1990s and is a Division II program. The IIHF does not currently list a verified rink count for Greece; rinks are limited in number and concentrated in the Athens area.`,
  // source: HIHF; IIHF (rink count not separately reported for Greece)

  'Thailand': `Ice hockey in Thailand is organized by the Ice Hockey Association of Thailand (IHAT). The top men's league is the Bangkok Ice Hockey League and the Siam Hockey League. Thailand is a member of the IIHF and made its first IIHF World Championship appearance in 2019, in the lower divisions. The IIHF does not currently list a verified rink count for Thailand; rinks are limited in number and concentrated in the Bangkok metropolitan area.`,
  // source: IHAT; IIHF (verified 2019 first IIHF WCh appearance; rink count not separately reported)

  'Portugal': `Ice hockey in Portugal is organized by the Portuguese Ice Sports Federation (FPPD). The top men's league is the Liga Portuguesa de Hóquei no Gelo. The national team competes at the IIHF World Championship Division III level. The IIHF does not currently list a verified rink count for Portugal.`,
  // source: FPPD; IIHF (rink count not separately reported for Portugal)

  'World': `International ice hockey is overseen by the International Ice Hockey Federation (IIHF), founded in 1908, which has 84 member national associations across two categories. The IIHF runs the annual IIHF World Championship, the IIHF World Junior Championship, the Olympic hockey tournament, and division-based development leagues at lower ranks. National federations operate their own domestic league structures; this entry is for IIHF-sanctioned international competitions.`,
  // source: IIHF.com associations page (84 member federations, two categories); IIHF.com history (founded 1908)

  'Europe': `Europe-wide ice hockey leagues and competitions operate across national borders. Examples include the Champions Hockey League (CHL), which features clubs from the top European leagues (Sweden, Finland, Switzerland, Czech Republic, Germany), and the Continental Cup, a IIHF-run club competition for second-tier and lower clubs. This entry is for pan-European competitions only.`,
  // source: CHL, IIHF Continental Cup (structural facts)

  'USA/Canada': `Transatlantic or USA-Canada competitions. This entry is for leagues and tournaments whose primary footprint spans both the United States and Canada — for example, the NHL and the now-defunct World Hockey Association.`,
  // source: NHL history (structural)

  'International': `Multi-national or pan-continental competitions not anchored to a single federation. Use this when a competition's primary footprint cannot be tied to a single country (e.g., the IIHF World Championship).`,
  // source: IIHF (structural)
};

// Helper: pick a safe default for unknown countries.
export function countryContextFor(country: string | null | undefined): string {
  if (!country) return '';
  return COUNTRY_HOCKEY_CONTEXT[country] || '';
}

/**
 * Build a small set of FAQ entries from league data, used by the league
 * page's <FAQPage> JSON-LD block. Each entry has both a question and an
 * answer that's safe to render in HTML.
 */
export interface LeagueFAQEntry {
  question: string;
  answer: string;
}

export interface LeagueFAQInput {
  name: string;
  country?: string | null;
  level?: string | null;
  teamCount?: number;
  websiteUrl?: string | null;
  foundedYear?: number | null;
  updatedAt?: string | null;
  description?: string | null;
}

/**
 * Build 6-8 FAQ entries. Each answer is short (1-3 sentences) and grounded
 * in the league data. Anything missing returns "We do not have..." rather
 * than fabricating.
 */
export function buildLeagueFAQs(input: LeagueFAQInput): LeagueFAQEntry[] {
  const { name, country, level, teamCount, websiteUrl, description } = input;
  const levelKey = (level || '').toLowerCase();
  const levelDesc = LEVEL_DESCRIPTION[levelKey] || LEVEL_DESCRIPTION.other;

  const out: LeagueFAQEntry[] = [];

  // Q1: what is this league
  if (country && level) {
    out.push({
      question: `What is ${name}?`,
      answer:
        `${name} is a ${levelDesc.oneLiner} based in ${country}. ` +
        `${description || `${name} is listed in the RinkStop directory as an active ${level} ice hockey league.`}`,
    });
  } else if (country) {
    out.push({
      question: `What is ${name}?`,
      answer: `${name} is an ice hockey league based in ${country}. ${description || 'It is listed in the RinkStop directory.'}`,
    });
  } else {
    out.push({
      question: `What is ${name}?`,
      answer: `${name} is an ice hockey league tracked by RinkStop. ${description || 'Full profile details are listed on this page.'}`,
    });
  }

  // Q2: teams count
  let teamCountAnswer: string;
  if (typeof teamCount === 'number') {
    if (teamCount === 0) {
      teamCountAnswer =
        `We currently have ${teamCount} teams tracked in ${name}. ` +
        `If you are associated with a team we are missing, you can ` +
        `<a href="/claim-your-listing">submit a team listing</a> to add it.`;
    } else {
      const plural = teamCount === 1 ? '' : 's';
      teamCountAnswer =
        `We currently track ${teamCount} team${plural} in ${name}. ` +
        `Browse the full team list on this page and follow individual teams for updates.`;
    }
  } else {
    teamCountAnswer = `The team count for ${name} is being verified against our records.`;
  }
  out.push({
    question: `How many teams play in ${name}?`,
    answer: teamCountAnswer,
  });

  // Q3: level
  out.push({
    question: `What level of hockey is ${name}?`,
    answer: `${name} is classified as a ${level || 'unclassified'} league in the RinkStop directory. ${levelDesc.paragraph}`,
  });

  // Q4: how to watch / follow
  if (websiteUrl) {
    out.push({
      question: `How can I follow ${name} games and results?`,
      answer:
        `The official ${name} site is the best source for schedules, scores, and standings: ` +
        `<a href="${escapeAttr(websiteUrl)}" rel="noopener noreferrer" target="_blank">${escapeAttr(websiteUrl)}</a>. ` +
        `RinkStop also publishes highlights and news for ${name} when available — see the "Latest Highlights" section on this page.`,
    });
  } else {
    out.push({
      question: `How can I follow ${name} games and results?`,
      answer:
        `We do not currently have an official ${name} website on file. ` +
        `If you are associated with the league and can share a link to the official schedule, ` +
        `<a href="/contact">contact us</a> and we will add it. The "Latest Highlights" section on this page reflects news and recents where available.`,
    });
  }

  // Q5: country / league structure
  if (country) {
    out.push({
      question: `Where does ${name} operate?`,
      answer: `${name} is a ${country}-based league and is part of the broader hockey structure in ${country}. ${countryContextFor(country)}`,
    });
  }

  // Q6: how to join / get involved — generic
  out.push({
    question: `How do I get involved with ${name}?`,
    answer:
      `The most direct routes into ${name} are: (1) try out for one of the ${teamCount ?? 'tracked'} teams listed in RinkStop, ` +
      `(2) reach out to the league office if listed, or (3) start in a local amateur or youth league and progress to ${name} level through tryouts. ` +
      `Use our <a href="/tools/hockey-cost-calculator">hockey cost calculator</a> for typical season costs by level.`,
  });

  // Q7: data freshness
  out.push({
    question: `How current is the data on this page?`,
    answer: `League data on RinkStop is updated as teams, schedules, and rosters change. The "Last updated" line on this page shows when our record for ${name} was last refreshed. We also tag data with a source where one is available.`,
  });

  return out;
}

/**
 * Build an HTML-safe string from the FAQ entries (used to render inside
 * the page), stripping the HTML tags since some answers include them.
 */
export function faqAnswerText(answer: string): string {
  return answer.replace(/<[^>]+>/g, '').trim();
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}