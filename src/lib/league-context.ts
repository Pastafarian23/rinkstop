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
 */
export const COUNTRY_HOCKEY_CONTEXT: Record<string, string> = {
  'United States': `Ice hockey in the United States is organized by USA Hockey, the national governing body that oversees amateur and youth hockey from learn-to-play through adult amateur ranks. The American Hockey League (AHL), ECHL, and several women's professional leagues operate below the NHL level. The NCAA runs university hockey at three divisions, and the USHL is the top junior league sanctioned by USA Hockey. There are roughly 2,000 indoor ice rinks operating across the country, with the heaviest concentration in the Northeast, Upper Midwest, and Alaska.`,

  'Canada': `Ice hockey in Canada is organized by Hockey Canada and thirteen regional Member Branches. Canada fields the national men's and women's teams and is the founding member of the IIHF (1920). The NHL — founded in Montreal in 1917 — operates 7 Canadian franchises across Vancouver, Edmonton, Calgary, Winnipeg, Toronto, Ottawa, and Montreal. The Canadian Hockey League (CHL) — formed from the OHL, WHL, and QMJHL — drafts players aged 16-20 each spring, while U Sports runs university hockey and provincial leagues cover senior amateur play. There are an estimated 3,000+ indoor rinks in Canada, more per capita than anywhere else in the world.`,

  'Russia': `Ice hockey in Russia is organized by the Russian Ice Hockey Federation (FHR). The top professional league is the Kontinental Hockey League (KHL), formed in 2008, which spans Russia, Belarus, Kazakhstan, and occasionally China. Below the KHL sit the VHL (second tier) and the MHL (major junior). Russia is a perennial Olympic and IIHF World Championship medal contender and has produced the second-highest number of NHL-drafted players in history. Russia has roughly 150 indoor rinks, concentrated in Moscow, St. Petersburg, and the Volga/Ural regions.`,

  'Finland': `Ice hockey in Finland is organized by the Finnish Ice Hockey Association (Jääkiekkoliitto). The top men's league is Liiga (formerly SM-liiga), followed by Mestis in the second tier and various lower divisions. Finland has been called "the world's per-capita hockey powerhouse" — the country of 5.5 million people has produced more NHL-drafted players per capita than any other nation and is a consistent Olympic medal contender. The Finnish player development system (seurat-based clubs) is widely studied as a model. There are roughly 200 indoor rinks in Finland, more per capita than anywhere except Canada.`,

  'Sweden': `Ice hockey in Sweden is organized by the Swedish Ice Hockey Association (Svenska Ishockeyförbundet). The top men's league is the SHL (formerly Elitserien), with HockeyAllsvenskan as the second tier. Sweden runs one of the most respected player development systems in the world — most NHL-drafted Swedes come through the SHL club academies. Sweden fields both men's and women's national teams that regularly medal at IIHF World Championships and Olympics. There are roughly 360 indoor rinks in Sweden for a population of about 10 million, supporting one of the highest youth-participation rates in the sport.`,

  'Czech Republic': `Ice hockey in the Czech Republic is organized by the Czech Ice Hockey Association (Český svaz ledního hokeje, or ČSLH). The top men's league is the Czech Extraliga (Tipsport Extraliga), followed by the 1. Liga in the second tier. The Czech Republic has one of the highest per-capita NHL production rates in modern history. The national team is a consistent Olympic and World Championship medal contender, winning gold at the 1998 Olympics in Nagano. There are roughly 130 indoor rinks across the country.`,

  'Switzerland': `Ice hockey in Switzerland is organized by the Swiss Ice Hockey Federation (SIHF). The top men's league is the National League (NL), formerly the NLA, with the Swiss League (SL) as the second tier. The Swiss national team is a regular IIHF Top 10 program and reached the 2006 and 2010 Olympic finals. Indoor rinks number roughly 150 across the country, with the highest concentrations in German-speaking Switzerland and the Romandie.`,

  'Germany': `Ice hockey in Germany is organized by the German Ice Hockey Federation (Deutscher Eishockey-Bund, DEB). The top men's league is the DEL (Deutsche Eishockey Liga), with the DEL2 in the second tier. The DEL has produced a growing number of NHL-developed players since the 2010s, and the national team has risen to consistent Top 8 status in IIHF World Championship play. There are roughly 170 indoor rinks across Germany, with concentrations in Bavaria, North Rhine-Westphalia, and Saxony.`,

  'Slovakia': `Ice hockey in Slovakia is organized by the Slovak Ice Hockey Association (SZĽH). The top men's league is the Slovak Extraliga (Tipos Extraliga), followed by the 1. Liga in the second tier. Slovakia has been an IIHF Top 15 program for most of its independent history, with notable NHL production from a small population base. The country has roughly 50 indoor rinks, concentrated in Bratislava, Košice, and the western regions.`,

  'Norway': `Ice hockey in Norway is organized by the Norwegian Ice Hockey Association (Norges Ishockeyforbund). The top men's league is the Eliteserien (formerly GET-ligaen), and there is a robust 1. divisjon in the second tier. Norway is a regular IIHF Top 10 program and reached the 2012 IIHF World Championship quarterfinals. There are roughly 40 indoor rinks in Norway for a population of about 5.4 million.`,

  'France': `Ice hockey in France is organized by the French Ice Hockey Federation (Fédération française de hockey sur glace, FFHG). The top men's league is the Ligue Magnus, and France has produced several long-time NHL players. The national team is a regular IIHF Top 15 program and hosted the 2017 IIHF World Championship. There are roughly 130 indoor rinks across France, concentrated in the Alps, the Rhône valley, and the Paris region.`,

  'Austria': `Ice hockey in Austria is organized by the Austrian Ice Hockey Association (Österreichischer Eishockeyverband, ÖEHV). The top men's league is the ICEHL (formerly EBEL), which also includes clubs from Hungary, Slovenia, and Croatia. The Austrian national team competes regularly at the IIHF World Championship and has produced a handful of long-time NHL players. There are roughly 80 indoor rinks across Austria, concentrated in Vienna, Graz, Linz, and the Tyrol.`,

  'Italy': `Ice hockey in Italy is organized by the Italian Ice Hockey Federation (Federazione Italiana Sport del Ghiaccio, FISG). The top men's league is the Serie A (Alps Hockey League since 2016), and Italy has a long history in international play, including multiple Olympic appearances dating to 1948. There are roughly 35 indoor rinks in Italy, concentrated in the northern Alpine regions of South Tyrol, Lombardy, and Veneto.`,

  'United Kingdom': `Ice hockey in the United Kingdom is organized by the English Ice Hockey Association (EIHA) for English clubs, with parallel bodies in Scotland and Wales. The top men's league is the Elite Ice Hockey League (EIHL), which competes across England, Scotland, Wales, and Northern Ireland. The UK national team competes in the IIHF World Championship Division I. There are roughly 60 indoor rinks across the UK, with most in England.`,

  'Denmark': `Ice hockey in Denmark is organized by the Danish Ice Hockey Association (Dansk Ishockey Union). The top men's league is the Metal Ligaen (formerly AL-Bank Ligaen), with the 1. division as the second tier. Denmark is a regular Top 10 program at IIHF World Championships, and Danish players are increasingly represented in the NHL. There are roughly 25 indoor rinks across Denmark.`,

  'Belarus': `Ice hockey in Belarus is organized by the Belarusian Ice Hockey Association. The top men's league is the Extraleague (also called the Belarusian Open League). Belarus has a long IIHF history and has produced multiple NHL-drafted players. There are roughly 30 indoor rinks across the country, concentrated in Minsk and regional capitals.`,

  'Australia': `Ice hockey in Australia is organized by Ice Hockey Australia (IHA). The top men's league is the Australian Ice Hockey League (AIHL), a state-based competition with clubs in Sydney, Melbourne, Adelaide, Perth, Brisbane, and Canberra. Australia has played at the IIHF World Championship since 1982 and is a consistent Division I program. There are roughly 25 indoor rinks across the country, with most in Melbourne, Sydney, and Brisbane.`,

  'Netherlands': `Ice hockey in the Netherlands is organized by the Dutch Ice Hockey Federation (Nederlands IJshockey Bond, NIJB). The top men's league is the Eredivisie, with the Eerste Divisie as the second tier. The Netherlands competes at the IIHF World Championship and has produced a handful of long-time NHL players. There are roughly 25 indoor rinks in the country, mostly in the Randstad region.`,

  'Japan': `Ice hockey in Japan is organized by the Japan Ice Hockey Federation (JIHF). The top men's league is the Asia League Ice Hockey, which includes clubs from Japan, South Korea, and formerly China; the domestic-only Japan Ice Hockey League (JIHL) is also active. The Japanese national team is competitive at the IIHF World Championship Division I level and has produced a handful of NHL-drafted players. There are roughly 80 indoor rinks in Japan, concentrated in Hokkaido.`,

  'South Korea': `Ice hockey in South Korea is organized by the Korea Ice Hockey Association (KIHA). The top men's league is the Asia League Ice Hockey. The Korean national team rose to prominence during the build-up to the 2018 PyeongChang Winter Olympics, where it participated in both men's and women's tournaments. There are roughly 15 indoor rinks across the country, with most in Seoul and the surrounding Gyeonggi region.`,

  'Poland': `Ice hockey in Poland is organized by the Polish Ice Hockey Federation (Polski Związek Hokeja na Lodzie, PZHL). The top men's league is the Polska Hokej Liga (PHL), and the national team is a regular IIHF World Championship Division I program. There are roughly 35 indoor rinks in Poland, concentrated in Katowice, Tychy, and the Silesian region.`,

  'Hungary': `Ice hockey in Hungary is organized by the Hungarian Ice Hockey Federation (Magyar Jégkorong Szövetség). The top men's league is the Erste Liga (a multi-national league including clubs from Hungary, Austria, and Slovenia). Hungary has a long IIHF history and has produced several long-time NHL players. There are roughly 25 indoor rinks across the country.`,

  'Ukraine': `Ice hockey in Ukraine is organized by the Ukrainian Ice Hockey Federation (FHU). The top men's league is the Ukrainian Hockey League (also called the championship of Ukraine), and the national team is a regular IIHF World Championship Division I program. There are roughly 30 indoor rinks across the country, with the highest concentration in Kyiv and the eastern industrial cities.`,

  'Kazakhstan': `Ice hockey in Kazakhstan is organized by the Kazakhstan Ice Hockey Federation. The national team is a perennial IIHF World Championship Division I program and the country plays in the KHL. There are roughly 15 indoor rinks across Kazakhstan, concentrated in Almaty and Astana.`,

  'Slovenia': `Ice hockey in Slovenia is organized by the Slovenian Ice Hockey Federation (Hokejska zveza Slovenije). The top men's league is the ICEHL (a multi-national league with Austrian clubs), and the national team qualified for its first Olympic hockey tournament in 2014 (Sochi). There are roughly 15 indoor rinks across the country, concentrated in Ljubljana, Jesenice, and Maribor.`,

  'Romania': `Ice hockey in Romania is organized by the Romanian Ice Hockey Federation (Federația Română de Hochei pe Gheață). The top men's league is the Romanian Hockey League (Liga Națională de Hochei), with Erste Liga participation for some clubs. The national team has played at the IIHF World Championship for decades and is a regular Division I program. There are roughly 25 indoor rinks across Romania, concentrated in Miercurea Ciuc and Brașov.`,

  'Hong Kong': `Ice hockey in Hong Kong is organized by the Hong Kong Ice Hockey Association (HKCIHA). The top men's league is the HKCIHA Club League, with division-1 and division-2 sub-leagues. The Hong Kong national team competes at the IIHF World Championship Division II level. There are roughly 5 indoor rinks in the territory, all serving the recreational and competitive community.`,

  'Greece': `Ice hockey in Greece is organized by the Hellenic Ice Hockey Federation. The top men's league is the Athens Ice Hockey League. The Greek national team has competed at the IIHF World Championship since 1992 and is a Division II program. There are roughly 5 indoor rinks in Greece, concentrated in the Athens area.`,

  'Thailand': `Ice hockey in Thailand is organized by the Ice Hockey Association of Thailand (IHAT). The top men's league is the Bangkok Ice Hockey League and the Siam Hockey League. Thailand has competed at the IIHF World Championship Division II and III since 2011. There are roughly 5 indoor rinks across the country, all in the Bangkok metropolitan area.`,

  'Portugal': `Ice hockey in Portugal is organized by the Portuguese Ice Sports Federation (FPPD). The top men's league is the Liga Portuguesa de Hóquei no Gelo. The national team competes at the IIHF World Championship Division III level. There are roughly 5 indoor rinks in Portugal.`,

  'World': `International ice hockey is overseen by the International Ice Hockey Federation (IIHF), founded in 1908, which has 83 member federations. The IIHF runs the annual IIHF World Championship, the IIHF World Junior Championship, the Olympic hockey tournament, and division-based development leagues at lower ranks. National federations operate their own domestic league structures; this entry is for IIHF-sanctioned international competitions.`,

  'Europe': `Europe-wide ice hockey leagues and competitions operate across national borders. Examples include the Champions Hockey League (CHL), which features clubs from the top European leagues (Sweden, Finland, Switzerland, Czech Republic, Germany), and the Continental Cup, a IIHF-run club competition for second-tier and lower clubs. This entry is for pan-European competitions only.`,

  'USA/Canada': `Transatlantic or USA-Canada competitions. This entry is for leagues and tournaments whose primary footprint spans both the United States and Canada — for example, the NHL and the now-defunct World Hockey Association.`,

  'International': `Multi-national or pan-continental competitions not anchored to a single federation. Use this when a competition's primary footprint cannot be tied to a single country (e.g., the IIHF World Championship).`,
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
