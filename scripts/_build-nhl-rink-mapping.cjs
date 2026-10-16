#!/usr/bin/env node
/**
 * scripts/_build-nhl-rink-mapping.cjs
 *
 * Maps all 32 current NHL teams to rink IDs in team_workspaces.
 * Exact matches only (verified rink IDs). Non-matches → /tmp/nhl-rink-review.csv.
 *
 * Run dry-run:  node scripts/_build-nhl-rink-mapping.cjs
 * Run live:     node scripts/_build-nhl-rink-mapping.cjs --apply
 */
const fs = require("fs");

const DRY_RUN = !process.argv.includes("--apply");
console.log(DRY_RUN ? "DRY RUN (pass --apply to write)" : "LIVE RUN\n");

// Verified rink IDs from rinks table (confirmed via live query)
const NHL_RINK_MAP = {
  "Boston Bruins":           { rinkId: "ad4a2fec-4797-42f0-8161-db6f4e4940c9", rinkName: "TD Garden" },
  "Buffalo Sabres":         { rinkId: "2c5e1585-ba41-4919-a208-bdcf9078cdeb", rinkName: "KeyBank Center" },
  "Calgary Flames":         { rinkId: "3ce403a5-90d3-421d-add2-d781aebbb241", rinkName: "Scotiabank Saddledome" },
  "Carolina Hurricanes":     { rinkId: "79d1682e-c9aa-4df6-9f18-cc19644584c4", rinkName: "PNC Arena" },
  "Chicago Blackhawks":      { rinkId: "7f192426-0ca7-4678-beb7-fab56f90081b", rinkName: "United Center" },
  "Colorado Avalanche":      { rinkId: "f772b088-26fd-4105-b459-30e55c842fa2", rinkName: "Ball Arena" },
  "Columbus Blue Jackets":  { rinkId: "0641ddf1-322e-46b0-90e7-eae73268f0f2", rinkName: "Nationwide Arena" },
  "Dallas Stars":           { rinkId: "6f9fe2aa-d05c-4388-8c91-3efed0205c50", rinkName: "American Airlines Center" },
  "Detroit Red Wings":      { rinkId: "ced14e55-602a-459d-afdb-6af62ffb67c7", rinkName: "Little Caesars Arena" },
  "Edmonton Oilers":        { rinkId: "ec2baafd-ce21-4263-a35e-efcd076a103f", rinkName: "Rogers Place" },
  "Florida Panthers":       { rinkId: "f9fd3455-5763-4a1f-95e4-f1708c5028fe", rinkName: "Amerant Bank Arena" },
  "Los Angeles Kings":      { rinkId: "ba3c1a80-ecfd-48a1-9ad2-821295e0cdb6", rinkName: "Crypto.com Arena" },
  "Minnesota Wild":          { rinkId: "98c28a32-0d98-4564-9506-1479288ed538", rinkName: "Xcel Energy Center" },
  "Montreal Canadiens":     { rinkId: null,                                      rinkName: null }, // Bell Centre not in DB
  "Nashville Predators":    { rinkId: "48e902cb-49ca-4261-a1a1-6015a7f6318e", rinkName: "Bridgestone Arena" },
  "New Jersey Devils":      { rinkId: "e6050fe5-f5ce-480e-b709-b2bd6258d7b9", rinkName: "Prudential Center" },
  "New York Islanders":     { rinkId: "e6e7a16b-695b-4f3b-a621-81d257b2e325", rinkName: "UBS Arena" },
  "New York Rangers":       { rinkId: "c20df201-5cb9-4417-913c-ef1f1add663f", rinkName: "Madison Square Garden" },
  "Ottawa Senators":        { rinkId: "d1c3b550-bab7-4dc4-897e-8056d4d1d314", rinkName: "Canadian Tire Centre" },
  "Philadelphia Flyers":    { rinkId: "430b78a6-4e65-4e18-9786-2b3b6196788c", rinkName: "Wells Fargo Center" },
  "Pittsburgh Penguins":    { rinkId: "872f4b74-7205-4e0e-b7d2-5eba5e9e1d0a", rinkName: "PPG Paints Arena" },
  "San Jose Sharks":        { rinkId: "98021177-2f13-46bb-876a-0e78eceeb252", rinkName: "SAP Center at San Jose" },
  "Seattle Kraken":         { rinkId: "e4a1305b-d828-4acd-9ecb-4b103d9e152d", rinkName: "Climate Pledge Arena" },
  "St. Louis Blues":       { rinkId: "71ecad1a-688b-4764-93b2-a6fae2fee05c", rinkName: "Enterprise Center" },
  "Tampa Bay Lightning":    { rinkId: "09e19173-47c2-4ab5-bfed-0c3c544b9db8", rinkName: "Amalie Arena" },
  "Toronto Maple Leafs":    { rinkId: "f5a91f5a-10c5-42fa-92a0-73dd8997749e", rinkName: "Scotiabank Arena" },
  "Utah Mammoth":           { rinkId: "1de78776-8bb2-487e-b16e-0cb9a1bbb6ef", rinkName: "Delta Center" },
  "Vancouver Canucks":      { rinkId: null,                                      rinkName: null }, // Rogers Arena not in DB
  "Vegas Golden Knights":   { rinkId: "fb7f00e3-71dd-4bd6-96d9-0f11c7a00bfe", rinkName: "T-Mobile Arena" },
  "Washington Capitals":    { rinkId: "0966e204-fc6e-44d0-8958-5abcaefe2116", rinkName: "Capital One Arena" },
  "Winnipeg Jets":          { rinkId: "981ce0fc-ce44-4eba-b123-4d11d95e0096", rinkName: "Canada Life Centre" },
  "Anaheim Ducks":          { rinkId: "7028efb4-16cb-4b33-aeef-2c335f0d7432", rinkName: "Honda Center" },
};

async function main() {
  const env = {};
  for (const line of fs.readFileSync(__dirname + "/../.env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const NHL_LEAGUE_ID = "2b5f2b9d-84b9-4edb-8373-a732b72f4e40";

  // Get current NHL team workspaces
  const { data: workspaces, error: wsErr } = await sb
    .from("team_workspaces")
    .select("id, name")
    .eq("league_id", NHL_LEAGUE_ID);
  if (wsErr) { console.error("err:", wsErr.message); return; }

  // Historical team name fragments
  const historicalNames = new Set([
    "(original)","(WHA)","Arizona Coyotes","Phoenix Coyotes","Atlanta Flames",
    "Kansas City Scouts","Colorado Rockies","Cleveland Barons","California Golden Seals",
    "Minnesota North Stars","Hartford Whalers","Atlanta Thrashers","Quebec Nordiques",
    "Winnipeg Jets (original)","Quebec Bulldogs","Hamilton Tigers","Pittsburgh Pirates",
    "Philadelphia Quakers","New York Americans","Brooklyn Americans","St. Louis Eagles",
    "Montreal Maroons","Detroit Cougars","Detroit Falcons","Toronto Arenas",
    "Toronto St. Patricks","New England Whalers","Mighty Ducks of Anaheim",
  ]);
  const current = workspaces.filter(w => !historicalNames.has(w.name));

  const toUpdate = [];
  const noMatch = [];

  for (const team of current) {
    const info = NHL_RINK_MAP[team.name];
    if (!info) {
      noMatch.push({ workspaceId: team.id, teamName: team.name, reason: "no rink map entry" });
    } else if (!info.rinkId) {
      noMatch.push({ workspaceId: team.id, teamName: team.name, reason: "rink not in DB", arena: "known arena but not ingested" });
    } else {
      toUpdate.push({ workspaceId: team.id, teamName: team.name, rinkId: info.rinkId, rinkName: info.rinkName });
    }
  }

  console.log(`Current NHL teams: ${current.length}`);
  console.log(`Can update (exact match): ${toUpdate.length}`);
  console.log(`No match: ${noMatch.length}`);
  if (noMatch.length) noMatch.forEach(m => console.log(`  NO MATCH: ${m.teamName} (${m.reason})`));

  // Verify rink IDs exist in DB
  const rinkIds = toUpdate.map(m => m.rinkId);
  const { data: verifiedRinks } = await sb.from("rinks").select("id,name").in("id", rinkIds);
  const verifiedMap = {};
  verifiedRinks.forEach(r => verifiedMap[r.id] = r.name);
  console.log(`\nRink ID verification: ${verifiedRinks.length}/${toUpdate.length} found in DB`);
  toUpdate.forEach(m => {
    if (!verifiedMap[m.rinkId]) console.log(`  MISSING from DB: ${m.rinkId} (${m.teamName} → ${m.rinkName})`);
  });

  // Write CSV
  const csvLines = ["workspace_id,team_name,arena_name,matched_rink_id,matched_rink_name,status"];
  toUpdate.forEach(m => csvLines.push(`${m.workspaceId},"${m.teamName}","${m.rinkName}","${m.rinkId}","${verifiedMap[m.rinkId]||'NOT IN DB'}","exact"`));
  noMatch.forEach(m => csvLines.push(`${m.workspaceId},"${m.teamName}","${m.arena||''}","","","no_match: ${m.reason}"`));
  fs.writeFileSync("/tmp/nhl-rink-review.csv", csvLines.join("\n"));
  console.log(`\nWritten: /tmp/nhl-rink-review.csv`);

  // Apply
  if (!DRY_RUN) {
    for (const m of toUpdate) {
      const { error } = await sb.from("team_workspaces").update({ home_rink_id: m.rinkId }).eq("id", m.workspaceId);
      if (error) console.error(`FAIL ${m.teamName}:`, error.message);
      else console.log(`Updated: ${m.teamName} → ${m.rinkName}`);
    }
    console.log(`\nDone. ${toUpdate.length} mappings written.`);
  } else {
    console.log(`\nDry run. ${toUpdate.length} updates would be written.`);
  }
}

main().catch(console.error);
