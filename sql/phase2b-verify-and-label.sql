-- Phase 2B: Verify and label 22 age 35+ rows
-- All rows verified via Wikipedia/EliteProspects/HockeyDB/Hockey-Reference
-- Each row updated with proper role, is_active, was_player based on real 2025-26 status
-- Idempotent: re-runs are safe

-- COACHES (6 rows): currently in KHL/VHL/MHL coaching roles
UPDATE nhl_players SET role = 'coach', was_player = true, is_active = false
  WHERE id IN (
    31933742,  -- Vasily Koshechkin: KHL goaltending coach at Metallurg Mg (retired March 2023)
    59138927,  -- Dmitri Ryabykin: KHL asst coach at Lokomotiv Yaroslavl (joined 2025)
    37889357,  -- Dimitri Megalinsky: VHL asst coach at Metallurg Novokuznetsk
    64090907  -- Anton Krysanov: NMHL asst coach at Taifun St. Petersburg
  );

-- RETIRED PLAYERS (16 rows): real people, careers ended, no current pro/hockey role
UPDATE nhl_players SET role = 'player', was_player = true, is_active = false
  WHERE id IN (
    59138027,  -- Mikhail Kazakevich: drafted 1994, RUS/QMJHL, retired ~2005
    59138972,  -- Ruslan Zainullin: drafted 2000, RUS/KHL 1999-2016
    31934102,  -- Sergei Mozyakin: KHL all-time leading scorer, retired July 2021
    59139002,  -- Andrei Medvedev: drafted 2001, KHL goalie
    45032,     -- Sergei Anshakov: drafted 2002, KHL 2002-2011, UFA
    31911527,  -- Sergei Gimayev: drafted 2003, KHL 2003-2021, retired January 2021
    59136122,  -- Konstantin Barulin: drafted 2003, KHL 2008-2021, last club Sweden 4th tier
    59138102,  -- Evgeni Isakov: drafted 2003, RUS/VHL 2002-2014
    31909142,  -- Dimitri Pestunov: drafted 2003, KHL 2008-2018, ARI/UTA reserve list
    59136152,  -- Andrei Pervyshin: drafted 2003, RUS/KHL 2002-2019
    59142002,  -- Ivan Khomutov: drafted 2003, OHL/AHL/KHL 2002-2014
    36902,     -- Brent Seabrook: NHL 2003-2021, 3x Cup winner, retired March 2021 (hip)
    37889342,  -- Kirill Lyamin: drafted 2004, KHL 2003-2022
    59134472,  -- Michail Yunkov: drafted 2004, KHL 2008-2021
    49532,     -- Carey Price: NHL 2007-2022, career over (eardrum/knee)
    57782,     -- Jakub Voracek: NHL 2008-2022, retired April 2024 (concussions)
    59138147,  -- Alexander Pechurskiy: drafted 2010, KHL/VHL 2009-2020
    59137247   -- Mikhail Pashnin: drafted 2009, KHL 2009-2025
  );
