/**
 * Global hockey federations reference table.
 *
 * Covers national/territorial governing bodies recognized by the IIHF or
 * otherwise operating a meaningful junior/adult hockey program.
 * Used to auto-suggest required roster documents when a team sets its country.
 *
 * Doc kinds (match `team_documents.kind`):
 *   birth_cert       — Proof of age / birth certificate
 *   transfer         — Transfer / release / loan form
 *   insurance        — Club/federation insurance certificate
 *   safeguarding     — Safeguarding / background check / police clearance
 *   medical_release  — Medical clearance / fitness to play
 *   registration     — Federation registration / license
 *   code_of_conduct  — Code of conduct / fair play pledge
 *   photo_id         — Government-issued photo ID
 *   injury_waiver    — Injury / concussion waiver
 */

export interface FederationDoc {
  kind: string;
  label: string;
  /** Short note about when it's required or how it works (shown to admins). */
  note?: string;
}

export interface Federation {
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  /** Short English country name. */
  countryName: string;
  /** Official name of the national governing body. */
  federationName: string;
  /** URL of the federation's main or registration portal. */
  federationUrl: string;
  /** Governing hierarchy above the federation (e.g. "IIHF", " Hockey Canada"). */
  governingBody: string;
  /** National body responsible for safeguarding / child protection. */
  safeguardingBody: string;
  safeguardingUrl?: string;
  /** Default required document kinds for this federation. */
  requiredDocKinds: FederationDoc[];
  /** Age-group system note (e.g. "IIHF U20/U18/U16", "Hockey Canada Categories"). */
  ageGroupNote: string;
}

export const FEDERATIONS: Federation[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    federationName: 'USA Hockey',
    federationUrl: 'https://www.usahockey.com',
    governingBody: 'IIHF',
    safeguardingBody: 'USA Hockey SafeSport Program',
    safeguardingUrl: 'https://www.usahockey.com/safesport',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Birth Certificate', note: 'Required for first registration; copy accepted' },
      { kind: 'registration', label: 'USA Hockey Annual Registration', note: 'Must renew each season' },
      { kind: 'insurance', label: 'USA Hockey Insurance Certificate', note: 'Provided by club, not individual' },
      { kind: 'safeguarding', label: 'SafeSport Completion', note: 'Required for coaches/staff; parents strongly encouraged' },
      { kind: 'code_of_conduct', label: 'Code of Conduct Pledge', note: 'Signed by player or parent/guardian for minors' },
      { kind: 'medical_release', label: 'Medical Authorization Form', note: 'Annual; parent/guardian signature required for minors' },
    ],
    ageGroupNote: 'USA Hockey age categories: ADM (6U), 8U, 10U, 12U, 14U, 16U, 18U. Players turning 18 before Dec 31 of the season are eligible for 18U.',
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    federationName: 'Hockey Canada',
    federationUrl: 'https://www.hockeycanada.ca',
    governingBody: 'IIHF',
    safeguardingBody: 'Hockey Canada Safety Program',
    safeguardingUrl: 'https://www.hockeycanada.ca/en-ca/safety',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Proof of Age Certificate', note: 'Birth certificate or passport; Canadian citizens only' },
      { kind: 'transfer', label: 'Hockey Canada Transfer Form', note: 'Required when transferring between Hockey Canada branches' },
      { kind: 'insurance', label: 'Hockey Canada Insurance Confirmation', note: 'Club registers players; insurance via club affiliation' },
      { kind: 'safeguarding', label: 'Respect in Sport Certificate', note: 'Coaches/staff must complete; parents encouraged' },
      { kind: 'code_of_conduct', label: 'Code of Conduct Agreement', note: 'Signed by player/parent for all registered participants' },
      { kind: 'medical_release', label: 'Medical Information Form', note: 'Updated annually; includes emergency contacts and allergies' },
    ],
    ageGroupNote: 'Hockey Canada categories: Initiation (5-6), Novice (7-8), Atom (9-10), Pee Wee (11-12), Bantam (13-14), Midget (15-17), Junior A/B/C, Senior.',
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    federationName: 'Ice Hockey UK (IHUK)',
    federationUrl: 'https://icehockeyuk.co.uk',
    governingBody: 'IIHF',
    safeguardingBody: 'Ice Hockey UK Safeguarding',
    safeguardingUrl: 'https://icehockeyuk.co.uk/governance',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Birth Certificate or Passport', note: 'Proof of age for age-category eligibility' },
      { kind: 'transfer', label: 'Transfer / Import Form', note: 'Required for players transferring from outside England/Scotland' },
      { kind: 'insurance', label: 'Club Insurance Certificate', note: 'Provided by participating club' },
      { kind: 'safeguarding', label: 'DBS Check / PVG Scheme', note: 'Required for coaches, officials, and team staff working with under-18s' },
      { kind: 'code_of_conduct', label: 'Player Registration & Code of Conduct', note: 'Annual sign-off via EIHA registration portal' },
      { kind: 'medical_release', label: 'Medical Information Form', note: 'Emergency contacts, medical conditions, allergies' },
    ],
    ageGroupNote: 'EIHA age categories: U7, U9, U11, U13, U15, U18, U20, Senior. Full-Illness and NIHL levels (NIHL 1, NIHL 2, La Liga Hockey).',
  },
  {
    countryCode: 'SE',
    countryName: 'Sweden',
    federationName: 'Svenska Ishockeyförbundet (SIF)',
    federationUrl: 'https://www.swehockey.se',
    governingBody: 'IIHF',
    safeguardingBody: 'Svenska Ishockeyförbundet — Tävlingsbestämmelser',
    safeguardingUrl: 'https://www.swehockey.se',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Personbevis / Swedish Personal ID', note: 'Swedish personal identity number (personnummer) or equivalent' },
      { kind: 'transfer', label: 'Transfer Certificate (LTAD)', note: 'International transfer required via IIHF if moving from abroad' },
      { kind: 'registration', label: 'Svenska Ishockeyförbundet License', note: 'Annual player license via club registration' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'SSF Player Insurance included with license; additional club coverage possible' },
      { kind: 'code_of_conduct', label: 'Code of Conduct Agreement', note: 'Annual sign-off; covers fair play and anti-doping' },
    ],
    ageGroupNote: 'Swedish age categories: U8, U9, U10, U11, U12, U13, U14, U15, U16, U17, U18, U19, U20, senior. JR and senior levels.',
  },
  {
    countryCode: 'FI',
    countryName: 'Finland',
    federationName: 'Suomen Jääkiekkoliitto (Finnish Ice Hockey Association)',
    federationUrl: 'https://www.finhockey.fi',
    governingBody: 'IIHF',
    safeguardingBody: 'Jääkiekkoliitto — Pelaajien turvallisuus',
    safeguardingUrl: 'https://www.finhockey.fi',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Henkilökortti / Passport', note: 'Finnish personal identity or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'Jääkiekkoliitto Player License', note: 'Annual; processed through club registration system' },
      { kind: 'insurance', label: 'Insurance Certificate', note: 'Jääkiekkoliitto player insurance included with license' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed by player/parent annually' },
      { kind: 'medical_release', label: 'Medical Information Form', note: 'Updated each season; includes emergency contact and health info' },
    ],
    ageGroupNote: 'Finnish age categories: Leijonat at 5-7, Nuoret (U10–U20), A-junior, B-junior, C-junior, senior.',
  },
  {
    countryCode: 'CZ',
    countryName: 'Czech Republic',
    federationName: 'Czech Ice Hockey Association (Český hokej)',
    federationUrl: 'https://www.ceskyhokej.cz',
    governingBody: 'IIHF',
    safeguardingBody: 'ČSLH — Ochrana mládeže',
    safeguardingUrl: 'https://www.cslh.cz',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Rodný list / Birth Certificate', note: 'Czech or officially translated foreign birth certificate' },
      { kind: 'transfer', label: 'Transfer Certificate (Hráčská průkaz)', note: 'Player ID card issued by regional association' },
      { kind: 'registration', label: 'ČSLH Registration', note: 'Annual license via club; player card required for league games' },
      { kind: 'insurance', label: 'Health Insurance Confirmation', note: 'Czech public health insurance (VZP, OZP, etc.) required' },
      { kind: 'code_of_conduct', label: 'Code of Conduct Pledge', note: 'Signed by player/parent for all junior categories' },
    ],
    ageGroupNote: 'Czech age categories: Přípravka (4-8), Elév (9-10), Žák (11-14), Dorost (15-17), Junior (18-20), Senior.',
  },
  {
    countryCode: 'SK',
    countryName: 'Slovakia',
    federationName: 'Slovenský zväz ľadového hokeja (SZĽH)',
    federationUrl: 'https://www.hockeyslovakia.sk',
    governingBody: 'IIHF',
    safeguardingBody: 'SZĽH — Ochrana mládeže',
    safeguardingUrl: 'https://www.hockeyslovakia.sk',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Rodný list / Birth Certificate', note: 'Slovak or officially translated foreign birth certificate' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for players transferring between clubs or from abroad' },
      { kind: 'registration', label: 'SZĽH Player License', note: 'Annual; issued through registered club' },
      { kind: 'insurance', label: 'Health Insurance Confirmation', note: 'Slovak public health insurer confirmation required' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed annually for junior categories' },
    ],
    ageGroupNote: 'Slovak age categories: Prípravka (4-8), Elév (9-10), Žiak (11-14), Dorast (15-17), Junior (18-20), Senior.',
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    federationName: 'Deutscher Eishockey-Bund (DEB)',
    federationUrl: 'https://www.deb-online.de',
    governingBody: 'IIHF',
    safeguardingBody: 'DEB — Kinderschutz & Safe Sport',
    safeguardingUrl: 'https://www.deb-online.de',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Geburtsurkunde / Personalausweis', note: 'German ID, passport, or birth certificate' },
      { kind: 'transfer', label: 'Transfer Certificate (Spielerlaubnis)', note: 'Required for U20+ transfers; U20 and below via MELC system' },
      { kind: 'registration', label: 'DEB Spielberechtigung', note: 'Annual game eligibility certificate via club registration' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'DEB insurance via club affiliation; confirmation of coverage' },
      { kind: 'safeguarding', label: 'Erweitertes Führungszeugnis', note: 'Enhanced CRB check required for coaches/staff working with minors' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed annually for all registered players' },
      { kind: 'medical_release', label: 'Medical Fitness Declaration', note: 'Physician-signed form confirming fitness to play (for competitive categories)' },
    ],
    ageGroupNote: 'DEB age categories: Kleinstklasse (5-6), Kleinklasse (7-8), Kinder (9-10), Schüler (11-13), Jugend (14-17), Junioren (18-20), Senioren.',
  },
  {
    countryCode: 'CH',
    countryName: 'Switzerland',
    federationName: 'Swiss Ice Hockey Federation (SIHF)',
    federationUrl: 'https://www.sihf.ch',
    governingBody: 'IIHF',
    safeguardingBody: 'SIHF — Protection de l\'enfant / Kindesschutz',
    safeguardingUrl: 'https://www.sihf.ch',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Certificat de naissance / Geburtsurkunde', note: 'Swiss civil registry extract or passport' },
      { kind: 'transfer', label: 'Transfer Certificate / Mutation', note: 'Required for inter-club or international transfers via SIHF portal' },
      { kind: 'registration', label: 'SIHF Player License', note: 'Annual; club registers players through SIHF system' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Swiss social health insurance (or equivalent) confirmation required' },
      { kind: 'safeguarding', label: 'Strafregisterauszug / Criminal Record', note: 'Required for coaches and officials working with minors' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Annual sign-off via SIHF licensing portal' },
    ],
    ageGroupNote: 'SIHF age categories: Mini (4-9), Micro (10-12), Novizen (13-15), Junior (16-20), Elite A/B, Senioren, Masters.',
  },
  {
    countryCode: 'AT',
    countryName: 'Austria',
    federationName: 'Österreichischer Eishockeyverband (ÖEHV)',
    federationUrl: 'https://www.eishockey.at',
    governingBody: 'IIHF',
    safeguardingBody: 'EHV — Kinderschutz',
    safeguardingUrl: 'https://www.eishockey.at',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Geburtsurkunde / Reisepass', note: 'Austrian civil document or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF transfer portal' },
      { kind: 'registration', label: 'ÖEHV Player Registration', note: 'Annual; processed through Austrian league system' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Austrian health insurance or equivalent required' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Annual sign-off for registered players' },
    ],
    ageGroupNote: 'Austrian age categories: Schüler (8-10), Jugend (11-13), Junioren (14-18), Senioren.',
  },
  {
    countryCode: 'NO',
    countryName: 'Norway',
    federationName: 'Norges Ishockeyforbund (NIHF)',
    federationUrl: 'https://www.hockey.no',
    governingBody: 'IIHF',
    safeguardingBody: 'Norges Idrettsforbund — Barneidrett',
    safeguardingUrl: 'https://www.idrettsforbundet.no',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Fødselsattest / Pass', note: 'Norwegian birth certificate or passport' },
      { kind: 'registration', label: 'NIHF Player License', note: 'Annual; via club registration through NIHF\'s KlubbAdmin system' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'NIHF members insurance covers players; club confirmation accepted' },
      { kind: 'safeguarding', label: 'Politiattest', note: 'Police certificate of conduct required for coaches/staff working with under-18s' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Annual sign-off for players in competitive categories' },
    ],
    ageGroupNote: 'Norwegian age categories: Smågodt (5-6), Lille (7-8), Liten (9-10), Middels (11-12), Stor (13-15), Junior (16-20), Senior.',
  },
  {
    countryCode: 'DK',
    countryName: 'Denmark',
    federationName: 'Danmarks Ishockey Union (DIU)',
    federationUrl: 'https://www.diuhockey.dk',
    governingBody: 'IIHF',
    safeguardingBody: 'Danmarks Idrætsforbund — Børneattest',
    safeguardingUrl: 'https://www.idraetsforbundet.dk',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Fødselsattest / Pas', note: 'Danish CPR number or passport for age verification' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for players transferring internationally via IIHF' },
      { kind: 'registration', label: 'DIU Player License', note: 'Annual; via DIU\'s official licensing system' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Danish health insurance (det gule sygesikringskort) required' },
      { kind: 'safeguarding', label: 'Børneattest', note: 'Child clearance certificate required for coaches/staff working with under-18s' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed by player/parent for youth categories' },
    ],
    ageGroupNote: 'Danish age categories: Lilleput (8-10), Junior (11-13), Yngste (14-15), Ældste (16-18), Junior (19-20), Senior.',
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    federationName: 'Fédération Française de Hockey sur Glace (FFHG)',
    federationUrl: 'https://www.hockeyfrance.com',
    governingBody: 'IIHF',
    safeguardingBody: 'FFHG — Protection des mineurs',
    safeguardingUrl: 'https://www.hockeyfrance.com',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Acte de naissance / CNI', note: 'French birth certificate or national ID card (CNI) or passport' },
      { kind: 'transfer', label: 'Certificat de transfert', note: 'Required for international transfers; French league transfers via FFHG portal' },
      { kind: 'registration', label: 'Licence FFHG', note: 'Annual player license; club submits through FFHG Gestbowl system' },
      { kind: 'insurance', label: 'Attestation d\'assurance', note: 'FFHG group accident insurance included with license; supplementary recommended' },
      { kind: 'safeguarding', label: 'Travail sur Mineurs — Autorisation', note: 'Coaches/staff require formal authorization to work with under-18s' },
      { kind: 'code_of_conduct', label: 'Règlement intérieur', note: 'Signed by player/parent at club level each season' },
    ],
    ageGroupNote: 'FFHG age categories: Baby (4-6), Mini (7-8), Petit (9-10), Poussin (11-12), Benjamin (13-14), U15 (M15), U17, U19, Senior.',
  },
  {
    countryCode: 'IT',
    countryName: 'Italy',
    federationName: 'Federazione Italiana Sport del Ghiaccio (FISG)',
    federationUrl: 'https://www.fisg.it',
    governingBody: 'IIHF',
    safeguardingBody: 'FISG — Tutela minori',
    safeguardingUrl: 'https://www.fisg.it',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Certificato di nascita / Carta d\'identità', note: 'Italian birth certificate, ID card (CIE/CNS), or passport' },
      { kind: 'transfer', label: 'Certificato di trasferimento', note: 'Required for inter-club and international transfers' },
      { kind: 'registration', label: 'Tessera FISG', note: 'Annual player card/license via club registration' },
      { kind: 'insurance', label: 'Certificato assicurativo', note: 'Italian national health insurance (SSN) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Codice di condotta', note: 'Annual sign-off; parents/guardians sign for all junior players' },
    ],
    ageGroupNote: 'Italian age categories: Primi Passi (5-7), Cuccioli (8-9), Esordienti (10-11), Ragazzi (12-13), Allievi (14-15), Juniores (16-18), Seniores.',
  },
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    federationName: 'IJshockey Nederland',
    federationUrl: 'https://www.ijshockey.nl',
    governingBody: 'IIHF',
    safeguardingBody: 'Koninklijk Nederlands Jeugd Institutuut',
    safeguardingUrl: 'https://www.nji.nl',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Geboorteakte / Paspoort', note: 'Dutch birth certificate, ID card (ID), or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'IJshockey Nederland Registration', note: 'Annual; via club registration system' },
      { kind: 'insurance', label: 'Health Insurance Confirmation', note: 'Dutch basic health insurance (verplicht verzekerd) required' },
      { kind: 'safeguarding', label: 'VOG / Certificate of Conduct', note: 'Certificate of Conduct (Verklaring Omtrent Gedrag) required for coaches working with youth' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Annual sign-off by player/parent' },
    ],
    ageGroupNote: 'Dutch age categories: Toekomst (5-7), Junior (8-10), Scholieren (11-13), Junior (14-17), Senioren.',
  },
  {
    countryCode: 'BE',
    countryName: 'Belgium',
    federationName: 'Royal Belgian Ice Hockey Federation (Fédération Royale Belge de Hockey sur Glace)',
    federationUrl: 'https://www.belgianicehockey.be',
    governingBody: 'IIHF',
    safeguardingBody: 'Belgian Child Protection Services',
    safeguardingUrl: 'https://www.kindbijslag.be',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Certificat de naissance / Geboorteakte', note: 'Belgian civil registry extract or passport' },
      { kind: 'transfer', label: 'Certificat de transfert / Transfertbewijs', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'Royal Belgian Ice Hockey Federation License', note: 'Annual; processed through Belgian Ice Hockey League system' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Belgian health insurance or European Health Insurance Card (EHIC) for EU citizens' },
      { kind: 'code_of_conduct', label: 'Code de conduite', note: 'Annual sign-off for youth players' },
    ],
    ageGroupNote: 'Belgian categories follow IIHF U20/U18/U16 guidelines; senior league in TopDivision.',
  },
  {
    countryCode: 'ES',
    countryName: 'Spain',
    federationName: 'Real Federación Española de Deportes de Hielo (RFEDH)',
    federationUrl: 'https://www.rfedh.es',
    governingBody: 'IIHF',
    safeguardingBody: 'Protección Infantil — Consejo Superior de Deportes',
    safeguardingUrl: 'https://www.csd.gob.es',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Certificado de nacimiento / DNI', note: 'Spanish birth certificate or national ID (DNI) or passport' },
      { kind: 'transfer', label: 'Certificado de transferencia', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'RFEDH Licencia', note: 'Annual player license; club submits via RFEDH portal' },
      { kind: 'insurance', label: 'Certificado de seguro', note: 'Spanish social security or private health insurance required' },
      { kind: 'code_of_conduct', label: 'Código de conducta', note: 'Annual sign-off; parents sign for junior players' },
    ],
    ageGroupNote: 'Spanish age categories: Prebenjamín (5-8), Benjamín (9-10), Alevín (11-12), Infantil (13-14), Cadete (15-16), Juvenil (17-18), Junior, Sénior.',
  },
  {
    countryCode: 'PL',
    countryName: 'Poland',
    federationName: 'Polski Związek Hokeja na Lodzie (PZHL)',
    federationUrl: 'https://www.pzhl.pl',
    governingBody: 'IIHF',
    safeguardingBody: 'PZHL — Ochrona młodzieży',
    safeguardingUrl: 'https://www.pzhl.pl',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Akt urodzenia / Dowód osobisty', note: 'Polish birth certificate, ID card (PESEL), or passport' },
      { kind: 'transfer', label: 'Certyfikat transferowy', note: 'Required for international transfers via PZHL/IIHF' },
      { kind: 'registration', label: 'Licencja PZHL', note: 'Annual player license via club registration' },
      { kind: 'insurance', label: 'Ubezpieczenie NFZ', note: 'Polish National Health Fund (NFZ) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Kodeks postępowania', note: 'Signed by player/parent for junior categories' },
    ],
    ageGroupNote: 'Polish age categories: Młodzik (10-12), Junior młodszy (13-15), Junior (16-18), Senior.',
  },
  {
    countryCode: 'LV',
    countryName: 'Latvia',
    federationName: 'Latvijas Hokeja Federācija (LHF)',
    federationUrl: 'https://www.lhf.lv',
    governingBody: 'IIHF',
    safeguardingBody: 'LHF — Bērnu aizsardzība',
    safeguardingUrl: 'https://www.lhf.lv',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Dzimšanas apliecība / Pase', note: 'Latvian birth certificate or passport' },
      { kind: 'transfer', label: 'Pārejas sertifikāts', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'LHF Licence', note: 'Annual; club registers through LHF portal' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Latvian VSAA or equivalent health insurance required' },
      { kind: 'code_of_conduct', label: 'Kodekss', note: 'Annual sign-off for registered players' },
    ],
    ageGroupNote: 'Latvian age categories: Zīdaiļi (4-6), Puišu (7-10), Jauniešu (11-14), Juniori (15-18), Seniori.',
  },
  {
    countryCode: 'LT',
    countryName: 'Lithuania',
    federationName: 'Hockey Lietuva',
    federationUrl: 'https://hockey.lt',
    governingBody: 'IIHF',
    safeguardingBody: 'Lietuvos vaiko teisių apsauga',
    safeguardingUrl: 'https://www.vaikoteises.lt',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Gimimo liudijimas / Pasas', note: 'Lithuanian birth certificate or passport' },
      { kind: 'transfer', label: 'Perėjimo sertifikatas', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'Hockey Lietuva License', note: 'Annual; club registers players' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Lithuanian health insurance (PSDF) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Elgesio kodeksas', note: 'Annual sign-off for youth categories' },
    ],
    ageGroupNote: 'Follows IIHF age classifications; senior and youth leagues under Hockey Lietuva jurisdiction.',
  },
  {
    countryCode: 'EE',
    countryName: 'Estonia',
    federationName: 'Estonian Ice Hockey Association (Eesti Jäähokiliit)',
    federationUrl: 'https://www.eestihoki.ee',
    governingBody: 'IIHF',
    safeguardingBody: 'Eesti Lastekaitse Liit',
    safeguardingUrl: 'https://www.lastekaitseliit.ee',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Sünnitunnistus / Pass', note: 'Estonian birth certificate or passport' },
      { kind: 'transfer', label: 'Üleminekusertifikaat', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'EJHL License', note: 'Annual; club registers players' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Estonian Health Insurance Fund (EHIF) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Käitumisjuhend', note: 'Annual sign-off for youth players' },
    ],
    ageGroupNote: 'Estonian age categories: Tippu (5-7), Lapsed (8-10), Noored (11-13), Juuniorid (14-18), Täiskasvanud.',
  },
  {
    countryCode: 'SI',
    countryName: 'Slovenia',
    federationName: 'Hokejska Zveza Slovenije (HZS)',
    federationUrl: 'https://www.hzs.si',
    governingBody: 'IIHF',
    safeguardingBody: 'HZS — Zaščita mladih',
    safeguardingUrl: 'https://www.hzs.si',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Rojstni list / Potni list', note: 'Slovenian birth certificate or passport' },
      { kind: 'transfer', label: 'Prenosno spričevalo', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'HZS License', note: 'Annual; club registers players' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Slovenian health insurance (ZZZS) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Kodeks ravnanja', note: 'Annual sign-off for youth players' },
    ],
    ageGroupNote: 'Slovenian categories: Mladinci (13-17), Kadeti (18-20), Člani (seniorji).',
  },
  {
    countryCode: 'HR',
    countryName: 'Croatia',
    federationName: 'Hrvatski savez za hokej na ledu (HSHL)',
    federationUrl: 'https://www.hshl.hr',
    governingBody: 'IIHF',
    safeguardingBody: 'HSHL — Zaštita mladih',
    safeguardingUrl: 'https://www.hshl.hr',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Rodni list / Putovnica', note: 'Croatian birth certificate or passport' },
      { kind: 'transfer', label: 'Prijenosna potvrda', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'HSHL License', note: 'Annual; processed through HSHL' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'Croatian health insurance (HZZO) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Kodeks ponašanja', note: 'Annual sign-off for youth players' },
    ],
    ageGroupNote: 'Croatian age groups: Mladež (10-18), Seniori (18+).',
  },
  {
    countryCode: 'HU',
    countryName: 'Hungary',
    federationName: 'Hungarian Ice Hockey Federation (HIHF)',
    federationUrl: 'https://www.jegkorongszovetseg.hu',
    governingBody: 'IIHF',
    safeguardingBody: 'HIHF — Gyermekvédelem',
    safeguardingUrl: 'https://www.jegkorongszovetseg.hu',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Születési anyakönyvi kivonat / Útlevél', note: 'Hungarian birth certificate, ID card (személyi igazolvány), or passport' },
      { kind: 'transfer', label: 'Átigazolási lap', note: 'Required for inter-club and international transfers' },
      { kind: 'registration', label: 'MJSz Versenyzői licenc', note: 'Annual player license; club registers through MJSz system' },
      { kind: 'insurance', label: 'TB Card / Insurance Confirmation', note: 'Hungarian social security (TB) or equivalent required' },
      { kind: 'code_of_conduct', label: 'Etikai kódex', note: 'Annual sign-off for youth players' },
    ],
    ageGroupNote: 'Hungarian age categories: Gyermek (8-10), Serdülő (11-14), Ifjúsági (15-17), Junior (18-20), Felnőtt (senior).',
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    federationName: 'Japanese Ice Hockey Federation (JIHF)',
    federationUrl: 'https://www.jihf.jp',
    governingBody: 'IIHF',
    safeguardingBody: 'JIHF — Child Protection',
    safeguardingUrl: 'https://www.jihf.jp',
    requiredDocKinds: [
      { kind: 'birth_cert', label: '出生証明書 / パスポート', note: 'Japanese family register (koseki) or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'JIHF Player Registration', note: 'Annual; submitted by club through JIHF' },
      { kind: 'insurance', label: 'National Health Insurance / 국민건강보험', note: 'Japanese national health insurance (kokumin kenkō hoken) required' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed by player/parent for youth leagues' },
      { kind: 'medical_release', label: 'Medical Information Form', note: 'Emergency medical info; updated each season' },
    ],
    ageGroupNote: 'JIHF age categories: Minor (6-12), Youth (13-15), Junior (16-18), Senior.',
  },
  {
    countryCode: 'KR',
    countryName: 'South Korea',
    federationName: 'Korea Ice Hockey Association (KIHA)',
    federationUrl: 'https://www.kiHA.co.kr',
    governingBody: 'IIHF',
    safeguardingBody: 'Korean Child Welfare System',
    safeguardingUrl: 'https://www.mogef.go.kr',
    requiredDocKinds: [
      { kind: 'birth_cert', label: '출생 신고서 / 여권', note: 'Korean family relation certificate (가족관계증명서) or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'KIHA Player License', note: 'Annual; submitted by club' },
      { kind: 'insurance', label: '국민건강보험 / Health Insurance', note: 'Korean National Health Insurance (국민건강보험) required' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed by player/parent for youth categories' },
      { kind: 'medical_release', label: 'Medical Information Form', note: 'Emergency contacts, allergies, medical conditions' },
    ],
    ageGroupNote: 'Korean age categories: Youth (under 12), Junior (13-18), Senior.',
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    federationName: 'Ice Hockey Australia (IHA)',
    federationUrl: 'https://www.icehockey australia.com.au',
    governingBody: 'IIHF',
    safeguardingBody: 'IHA Child Safety Policy',
    safeguardingUrl: 'https://www.icehockeyaustralia.com.au',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Birth Certificate / Passport', note: 'Australian birth certificate or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for interstate or international transfers via IIHF' },
      { kind: 'registration', label: 'IHA Player Registration', note: 'Annual; via state association through IHA portal' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'IHA national insurance covers registered players; supplementary recommended' },
      { kind: 'safeguarding', label: 'Working with Children Check (WWCC)', note: 'Required for all coaches, officials, and volunteers working with minors in all states' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed by player/parent for all registered participants' },
    ],
    ageGroupNote: 'IHA age categories: Under 7, Under 9, Under 11, Under 13, Under 15, Under 18, Senior.',
  },
  {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    federationName: 'Ice Hockey New Zealand',
    federationUrl: 'https://www.icehockeynz.co.nz',
    governingBody: 'IIHF',
    safeguardingBody: 'NZIHF — Child Protection',
    safeguardingUrl: 'https://www.nzicehockey.co.nz',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'Birth Certificate / Passport', note: 'New Zealand birth certificate or passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'NZIHF Registration', note: 'Annual; via NZIHF or applicable regional association' },
      { kind: 'insurance', label: 'Accident Compensation Corporation (ACC)', note: 'NZ\'s no-fault accident cover applies; supplementary health insurance recommended' },
      { kind: 'safeguarding', label: 'Police Vetting', note: 'Required for coaches and officials working with under-18s' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Annual sign-off by player/parent for registered participants' },
    ],
    ageGroupNote: 'NZIHF follows IIHF age guidelines; senior and youth programs under regional associations.',
  },
  {
    countryCode: 'PH',
    countryName: 'Philippines',
    federationName: 'Federation of Ice Hockey League, Inc. (FIHL) — Hockey Philippines',
    federationUrl: 'https://hockeyphilippines.com',
    governingBody: 'IIHF',
    safeguardingBody: 'Philippine Sports Commission — Child Protection',
    safeguardingUrl: 'https://www.psc.gov.ph',
    requiredDocKinds: [
      { kind: 'birth_cert', label: 'PSA Birth Certificate / Passport', note: 'Philippine Statistics Authority (PSA) birth certificate or valid passport' },
      { kind: 'transfer', label: 'Transfer Certificate', note: 'Required for international transfers via IIHF' },
      { kind: 'registration', label: 'FIHL / Hockey Philippines Registration', note: 'Annual; registered club players eligible for national team selection' },
      { kind: 'insurance', label: 'Insurance Confirmation', note: 'PhilHealth or private health insurance required; accident coverage recommended' },
      { kind: 'code_of_conduct', label: 'Code of Conduct', note: 'Signed by player/parent/guardian' },
      { kind: 'medical_release', label: 'Medical Information & Consent Form', note: 'Emergency contacts, medical conditions, parental consent for minors' },
    ],
    ageGroupNote: 'Emerging hockey nation; IIHF full member since 2016. Categories follow IIHF guidelines; operates Philippine Hockey League (PHL) and Philippine Minor Hockey League.',
  },
];

/** ISO 3166-1 alpha-2 → Federation entry. */
const fedByCode = new Map(FEDERATIONS.map((f) => [f.countryCode, f]));

/** ISO 3166-1 alpha-2 → currency code (heuristic). */
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', SE: 'SEK', FI: 'EUR', CZ: 'CZK',
  SK: 'EUR', DE: 'EUR', CH: 'CHF', AT: 'EUR', NO: 'NOK', DK: 'DKK',
  FR: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', ES: 'EUR', PL: 'PLN',
  LV: 'EUR', LT: 'EUR', EE: 'EUR', SI: 'EUR', HR: 'EUR', HU: 'HUF',
  JP: 'JPY', KR: 'KRW', AU: 'AUD', NZ: 'NZD', PH: 'PHP', RU: 'RUB',
  UA: 'UAH', KZ: 'KZT', BY: 'BYN', RO: 'RON', BG: 'BGN',
};

export function lookupFederation(countryCode: string): Federation | null {
  return fedByCode.get(countryCode.toUpperCase()) ?? null;
}

/** All country options for a <select> dropdown. */
export const COUNTRY_OPTIONS: { code: string; name: string }[] =
  FEDERATIONS.map((f) => ({ code: f.countryCode, name: f.countryName }));
