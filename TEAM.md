# Agent Team Overview

## All Agents (13 Total)

### RinkStop (6 agents)
| Agent | Role | Identity |
|-------|------|----------|
| rinkstop-content | Article Writing | ✍️🏒 Eddie |
| rinkstop-research | Research | 🔍📊 Darcy |
| rinkstop-marketing | Marketing | 🏒🎯 Tyla |
| rinkstop-sales | Lead Generation | 🤝🎯 Marcus |
| rinkstop-socialmedia | Social Media | 📱🏒 Nikki |
| rinkstop-head | Management | 🏒🎯📋 Coach |

### SativaExchange (6 agents)
| Agent | Role | Identity |
|-------|------|----------|
| sativa-content | Article Writing | 🌿✍️ Maya |
| sativa-research | Research | 🔍🌿 Theo |
| sativa-marketing | Marketing | 🌙📈 Luna |
| sativa-sales | Lead Generation | 🤝🌿 Jax |
| sativa-socialmedia | Social Media | 📱🌿 Zoe |
| sativa-head | Management | 🌿📋 Director |

### Main (1 agent)
| Agent | Role | Identity |
|-------|------|----------|
| main | Default/Coordinator | 🚀 Ron |

---

## Daily Workflow

### Morning (8:00 AM PH)
1. **Research agents** → Compile trending topics
2. **Content agents** → Draft articles based on research
3. **Social media agents** → Schedule posts
4. **Sales agents** → Follow up on leads
5. **Marketing agents** → Plan campaigns
6. **Head agents** → Coordinate and summarize

### Throughout Day
- Agents work autonomously on their tasks
- Each agent reads its HEARTBEAT.md for daily tasks
- Agents save outputs to their workspace folders

### Evening (11:00 PM PH)
- Evening report generated for human review
- Human provides input where needed

---

## File Structure
Each agent has its own workspace:
- `~/workspace-rinkstop-[role]/` - RinkStop agents
- `~/workspace-sativa-[role]/` - SativaExchange agents

Inside each workspace:
- `HEARTBEAT.md` - Daily task list
- `IDENTITY.md` - Agent identity
- `drafts/` - Content drafts
- `research/` - Research findings
- `leads/` - Lead tracking
- `social/` - Social media posts
- `marketing/` - Campaign materials
- `coordination/` - Team coordination notes