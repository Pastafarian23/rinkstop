-- ============================================================
-- Coach Plans — seed 10 practice plan templates
-- ============================================================
-- Day 3 (2026-06-22). Read-only template library.
--
-- 10 templates covering: skills (4), game situations (3),
-- off-ice (1), goalie (1), conditioning (1).
--
-- All ages use IIHF U-system. Durations in minutes. structure
-- is JSONB with warmup, main, cooldown, coach_notes.

INSERT INTO practice_plans (slug, title, summary, focus, age_min, age_max, duration_min, skill_level, structure, coach_notes, equipment) VALUES

-- 1. Skills: U8/U10 fundamentals
('u8-u10-skating-fundamentals',
 'Skating Fundamentals — U8/U10',
 'Forward strides, c-cuts, stops, and falling. The single most important practice for this age group.',
 'skills', 7, 10, 45, 'beginner',
 '{
   "warmup": [
     { "name": "Light jog around rink (2 laps)", "duration_min": 5, "notes": "No pucks. Focus on form." }
   ],
   "main": [
     { "name": "Forward strides — length and power", "duration_min": 10, "drills": "Mark 4 lines across ice. Players skate full-ice focusing on full extension. 4 reps each, rest 30s between.", "notes": "Knees bent, full reach, full recovery under body." },
     { "name": "C-cuts (forwards and backwards)", "duration_min": 10, "drills": "Two parallel lines; players do 5 c-cuts each direction. Mirror drill with partner.", "notes": "Outside edge, push back and out." },
     { "name": "T-pushes and stops", "duration_min": 10, "drills": "Stations: T-push starts from stationary, 2-foot stop, 1-foot stop (snowplow).", "notes": "Stops first, then T-pushes - do not combine yet." },
     { "name": "Falling and getting up", "duration_min": 5, "drills": "Coach blows whistle, players fall safely and recover. Repeat 6-8 times.", "notes": "Knees first, hands out, recover via 3-point stance." }
   ],
   "cooldown": [
     { "name": "Stretching (calves, hips, groin)", "duration_min": 5, "notes": "Static stretches. Hold 20-30 seconds each." }
   ],
   "coach_notes": "Skating is the only thing that matters at this age. Do not over-complicate. Praise effort, not results."
 }'::jsonb,
 'Fun-first. Maximum puck touches = maximum engagement. No lines - keep everyone moving.',
 ARRAY['pucks optional', 'cones']),

-- 2. Skills: U12 puck handling
('u12-puck-control-circuit',
 'Puck Control Circuit — U12',
 'Station-based puckhandling: tight turns, toe drags, give-and-go, head-up handling.',
 'skills', 11, 12, 60, 'intermediate',
 '{
   "warmup": [
     { "name": "Dynamic warmup + 2 laps", "duration_min": 8, "notes": "High knees, butt kicks, lunges." }
   ],
   "main": [
     { "name": "Station 1: Tight turns (figure-8s)", "duration_min": 12, "drills": "4 cones 5m apart, weave at full speed keeping puck close.", "notes": "Both hands on stick, knees deep." },
     { "name": "Station 2: Toe drags + pull-throughs", "duration_min": 12, "drills": "Through 4 cones. Toe drag past cone, pull back through next gap.", "notes": "Pull puck behind stationary foot to change direction." },
     { "name": "Station 3: Head-up handling (with partner)", "duration_min": 12, "drills": "Two players 10m apart, pass and receive while skating. Whistle = change direction.", "notes": "Eyes up - count fingers coach holds up." },
     { "name": "Station 4: Give-and-go around cone", "duration_min": 10, "drills": "Set up wall with 1-2 stationary players, skate give-and-go, receive pass back.", "notes": "Quick hands, soft passes." }
   ],
   "cooldown": [
     { "name": "2 laps easy + stretching", "duration_min": 6, "notes": "Hamstrings, hip flexors, shoulders." }
   ],
   "coach_notes": "Rotate stations every 12 min. Whistle = switch. Have spares ready at each station for quick fix."
 }'::jsonb,
 'If they are not falling, they are not trying. Expect 5-10 falls per player per session.',
 ARRAY['pucks', 'cones', 'passers or static players']),

-- 3. Skills: U14 shooting
('u14-shooting-mechanics',
 'Shooting Mechanics — U14',
 'Wrist shot, snapshot, backhand. Emphasize weight transfer, hand position, and accuracy over power.',
 'skills', 13, 14, 75, 'intermediate',
 '{
   "warmup": [
     { "name": "Skating warmup + 50 pucks warmup shots", "duration_min": 10, "notes": "Quick releases, find the net." }
   ],
   "main": [
     { "name": "Wrist shot mechanics (stationary)", "duration_min": 15, "drills": "Line up at hash marks, 10 shots each. Coach demos weight transfer.", "notes": "Bottom hand 6 inches from blade. Puck starts at back foot, slides to front, snap wrists." },
     { "name": "Snapshot in stride", "duration_min": 15, "drills": "Receive pass at top of circle, one-timer or quick snap. Alternate sides.", "notes": "Same hand position as wrist shot but less windup." },
     { "name": "Backhand", "duration_min": 10, "drills": "Sweep across crease, finish backhand on short side. 5 reps each.", "notes": "Bottom hand pushes, top hand pulls. Lift puck." },
     { "name": "Shootout competition", "duration_min": 15, "drills": "Top of circle, 3 attempts. Best of 5 wins.", "notes": "Encourage creativity - dekes are allowed." }
   ],
   "cooldown": [
     { "name": "Easy lap + stretch", "duration_min": 10, "notes": "Forearms, shoulders, lower back." }
   ],
   "coach_notes": "Accuracy over power. Every shot should have a target. Track makes and misses for the curious players."
 }'::jsonb,
 'If a player cannot hit the net from 10 feet, they are not ready for harder shots. Back up.',
 ARRAY['pucks (lots)', 'targets or targets painted on boards', 'goalies optional']),

-- 4. Skills: U16/U18 edge work
('u16-u18-edge-work',
 'Edge Work & Pivots — U16/U18',
 'Outside/inside edge work, Mohawk turns, pivots, and quick direction changes for high-speed play.',
 'skills', 15, 18, 60, 'advanced',
 '{
   "warmup": [
     { "name": "Dynamic warmup + activation", "duration_min": 8, "notes": "Glute activation, hip openers." }
   ],
   "main": [
     { "name": "Inside edge holds (stationary)", "duration_min": 8, "drills": "Hold inside edge on each foot for 5 seconds, 6 reps each.", "notes": "Knees over toes, slight lean into the edge." },
     { "name": "Outside edge work (circles)", "duration_min": 10, "drills": "Skate circles using only outside edge. Forward, then backward. Both directions.", "notes": "Push out of the circle, do not pull in." },
     { "name": "Mohawk turns", "duration_min": 12, "drills": "Skate forward, switch to backward without stopping. Across full ice.", "notes": "Heel-toe connection, hips lead." },
     { "name": "Pivots at speed", "duration_min": 12, "drills": "Coach yells direction, players pivot and accelerate. Whistle = change.", "notes": "First step explosive, low body position." },
     { "name": "Edge work with puck", "duration_min": 5, "drills": "Combine edge work with puckhandling - half-ice weave.", "notes": "Now do it with a puck." }
   ],
   "cooldown": [
     { "name": "Static stretch + foam roll", "duration_min": 5, "notes": "Full lower body." }
   ],
   "coach_notes": "This is maintenance work. Players at this age need reminders, not new concepts."
 }'::jsonb,
 'Edge work prevents injuries more than any other drill. Do not skip it.',
 ARRAY['cones', 'pucks for final drill']),

-- 5. Game situations: breakout
('breakout-fundamentals',
 'Breakout Fundamentals — D-to-F',
 'Standard breakout patterns: D-to-D, D-to-F swing, reverse, and stretch. With and without pressure.',
 'game_situations', 11, 18, 75, 'all',
 '{
   "warmup": [
     { "name": "Skating warmup + D-zone breakout walking through patterns", "duration_min": 10, "notes": "No pressure, just walk through." }
   ],
   "main": [
     { "name": "Pattern 1: D-to-D, D-to-F winger", "duration_min": 12, "drills": "D gets puck, passes to partner D, who passes to winger on boards. Winger skates out.", "notes": "Forwards need to change on the fly." },
     { "name": "Pattern 2: Reverse (under pressure)", "duration_min": 15, "drills": "Add 1 forechecker. Reverse to weak-side D if first option is not there.", "notes": "Look off pressure, use the boards as a partner." },
     { "name": "Pattern 3: Stretch pass", "duration_min": 12, "drills": "D reads winger cheating up the boards, hits him in stride for breakaway.", "notes": "Do not force this. Only when winger is open." },
     { "name": "Live 3-on-2 (breakout focused)", "duration_min": 18, "drills": "3 D + 1 F breakout against 2 forecheckers. Score by entering zone with control.", "notes": "Ds job is to support, Fs job is to get open." }
   ],
   "cooldown": [
     { "name": "Cool down laps + video debrief", "duration_min": 8, "notes": "Show one example of a good and bad breakout." }
   ],
   "coach_notes": "Repetition over creativity here. Same pattern 100 times beats 10 patterns once."
 }'::jsonb,
 'If a winger is standing still, the breakout fails. Wingers: change, change, change.',
 ARRAY['pucks', 'cones to mark positions', 'forcheckers (use U12+ players)']),

-- 6. Game situations: power play
('power-play-umbrella',
 'Power Play — Umbrella Setup',
 '1-3-1 umbrella formation. Net-front presence, bumper play, and D-to-D activation.',
 'game_situations', 13, 18, 60, 'intermediate',
 '{
   "warmup": [
     { "name": "Skating + puckhandling warmup", "duration_min": 8, "notes": "Quick hands, soft touches." }
   ],
   "main": [
     { "name": "Net-front presence (one-timers)", "duration_min": 12, "drills": "Net-front player tips and redirects. D point shots. 5 players, rotate.", "notes": "Stick on ice, screen the goalie." },
     { "name": "Bumper play (middle slot)", "duration_min": 12, "drills": "Set up umbrella. Bumper in middle slot. D-to-D, D-to-bumper, bumper to net-front.", "notes": "Bumper is a pass-through, not a shooter (usually)." },
     { "name": "D activation (4-on-3 sim)", "duration_min": 12, "drills": "Run umbrella but one D activates down the wall. Creates 4-on-3 advantage.", "notes": "When defense collapses, D has open lane." },
     { "name": "Live 5-on-4 scrimmage (PP only)", "duration_min": 10, "drills": "Start in umbrella. 1 shot = reset to umbrella.", "notes": "Reset to structure after every shot. PP is rehearsed, not improvised." }
   ],
   "cooldown": [
     { "name": "Walk through video clip of a real PP goal", "duration_min": 6, "notes": "Show one of your own goals in this formation." }
   ],
   "coach_notes": "PP patterns need 50+ reps to stick. Same set play 50 times > 5 different plays 10 times each."
 }'::jsonb,
 'Players forget PP rules under fatigue. Reset to structure after every whistle.',
 ARRAY['pucks', 'obstruction for net-front (cones or pad)']),

-- 7. Game situations: faceoffs
('faceoff-techniques',
 'Faceoff Techniques — All Zones',
 'Stick grip, hand position, timing, and reads for defensive, neutral, and offensive zone draws.',
 'game_situations', 12, 18, 45, 'all',
 '{
   "warmup": [
     { "name": "Hand/wrist activation", "duration_min": 5, "notes": "Grip the stick like a baseball bat. Quick wrists." }
   ],
   "main": [
     { "name": "Grip and stance (no puck)", "duration_min": 10, "drills": "Walk through grip (top hand 6 inches down shaft, bottom at heel). Knees bent, weight low.", "notes": "Top hand does 80 percent of the work." },
     { "name": "D-zone faceoff (backward win)", "duration_min": 10, "drills": "Win back to D. D shoots. Repeat 5 wins each side.", "notes": "Do not try to win forward. Just tie up and let D handle it." },
     { "name": "Neutral zone faceoff (forehand/backhand)", "duration_min": 10, "drills": "Coach drops puck. Win forehand to winger, backhand to winger. Alternate.", "notes": "Quick hands = possession. Do not try to score off the draw." },
     { "name": "O-zone faceoff (multiple options)", "duration_min": 5, "drills": "Quick decision tree: tie-up / back to D / win to slot / win to winger.", "notes": "Read the matchup. Do not pre-decide." }
   ],
   "cooldown": [
     { "name": "Stretch wrists and forearms", "duration_min": 5, "notes": "Faceoffs are hand-dominant drills." }
   ],
   "coach_notes": "Faceoff wins are 50 percent technique, 50 percent attitude. Find the kid who wants it."
 }'::jsonb,
 'Pair the strongest faceoff kid with the weakest center for the season. The mentorship alone is worth it.',
 ARRAY['pucks (many)', 'cones for D positioning']),

-- 8. Off-ice: U12/U14 conditioning
('u12-u14-off-ice-conditioning',
 'Off-Ice Conditioning — U12/U14',
 'Bodyweight circuit: agility, core, legs. No equipment. Can be done in a gym or outdoors.',
 'off_ice', 11, 14, 45, 'beginner',
 '{
   "warmup": [
     { "name": "5 min jog + dynamic stretches", "duration_min": 5, "notes": "Arm circles, leg swings, high knees." }
   ],
   "main": [
     { "name": "Station 1: Agility ladder (or cone weave)", "duration_min": 8, "drills": "Icky shuffle, in-in-out-out, lateral shuffle. 30s on, 30s rest x 4.", "notes": "Fast feet, stay on toes." },
     { "name": "Station 2: Core (planks + Russian twists)", "duration_min": 8, "drills": "Front plank 30s, side plank 20s each, Russian twists 20 reps.", "notes": "Form over time. Stop if back arches." },
     { "name": "Station 3: Lower body (squats + lunges)", "duration_min": 8, "drills": "Bodyweight squats 15, walking lunges 10 each leg. 3 rounds.", "notes": "Knees over toes, chest up." },
     { "name": "Station 4: Cardio (jumping jacks + burpees)", "duration_min": 8, "drills": "30s jumping jacks, 30s rest, 30s burpees, 30s rest. 4 rounds.", "notes": "Burpees = push-up + jump. Modify as needed." }
   ],
   "cooldown": [
     { "name": "Full body stretch", "duration_min": 8, "notes": "Hold each stretch 20-30s. Calves, quads, hamstrings, hip flexors, shoulders." }
   ],
   "coach_notes": "Off-ice work is invisible to fans but visible to coaches. Make it a habit, not a punishment."
 }'::jsonb,
 'Off-ice is where the difference between teams is made. Do not skip these.',
 ARRAY['none required (optional: agility ladder, mat)']),

-- 9. Goalie: positioning
('goalie-positioning-basics',
 'Goalie Positioning — All Ages',
 'Stance, depth in the crease, angle play, and tracking the puck. Position-specific drill progression.',
 'goalie', 10, 18, 60, 'all',
 '{
   "warmup": [
     { "name": "Lateral movement (no shots)", "duration_min": 8, "notes": "Push across crease, T-push recovery, butterfly slides. 5 reps each direction." }
   ],
   "main": [
     { "name": "Stance + depth", "duration_min": 10, "drills": "Coach points to a spot. Goalies square up, set depth. Walk through angles.", "notes": "Stance width = shoulders. Depth = on top of crease or in. Never in between." },
     { "name": "Angle play (stationary shots)", "duration_min": 12, "drills": "Shooter in 5 spots (high slot, hash marks x2, low slot). Goalies square up. 5 shots each.", "notes": "Push to angle, not past it. Reset between shots." },
     { "name": "Tracking + lateral saves", "duration_min": 15, "drills": "Coach walks laterally with puck, goalies track. Whistle = shot. Random side, random height.", "notes": "Eyes on puck, not on shooter." },
     { "name": "Rebound control", "duration_min": 10, "drills": "Initial shot, freeze second shot. Goalies work on controlling rebounds to corners.", "notes": "When in doubt, freeze. Do not let second chances happen." }
   ],
   "cooldown": [
     { "name": "Hip flexor + lower back stretch", "duration_min": 5, "notes": "Goalie hips are the most abused joint in hockey." }
   ],
   "coach_notes": "One goalie drill done well beats five drills done sloppily. Quality reps."
 }'::jsonb,
 'Goalies develop at their own pace. Do not compare a 12-year-old to an 18-year-old in net.',
 ARRAY['pucks', 'goalies only - small group', 'shooter (coach or trusted player)']),

-- 10. Conditioning: pre-game warmup
('pre-game-warmup',
 'Pre-Game Warmup — Standard',
 '15-minute structured warmup. Skate, stretch, activate, shoot. Use before any game.',
 'conditioning', 8, 20, 15, 'all',
 '{
   "warmup": [
     { "name": "Light skate - 2 laps easy", "duration_min": 3, "notes": "Breathe, get loose. No pressure." }
   ],
   "main": [
     { "name": "Dynamic stretch sequence", "duration_min": 4, "drills": "High knees, butt kicks, lunges with twist, lateral shuffles. Each x 20 yards.", "notes": "Movement prep, not flexibility. Keep moving." },
     { "name": "Activation - 10 hard strides", "duration_min": 2, "drills": "10 explosive full-ice strides, full recovery. 30s rest after.", "notes": "Get the legs firing before the game." },
     { "name": "Shooting warmup", "duration_min": 4, "drills": "5 pucks, 5 shots. Wrist, snap, backhand, one-timer, slap. From your office.", "notes": "Find your range. Do not over-shoot." }
   ],
   "cooldown": [
     { "name": "Final whistle huddle", "duration_min": 2, "notes": "Team huddle. 30 seconds. Out." }
   ],
   "coach_notes": "Game-day warmups should feel routine. Same time, same sequence, same music. Do not experiment on game day."
 }'::jsonb,
 'If you change the warmup before a big game, you have already lost the mental edge.',
 ARRAY['pucks (5 per player)', 'optional music for energy']);

-- Verification
SELECT slug, title, focus, age_min, age_max, duration_min FROM practice_plans ORDER BY focus, age_min;
