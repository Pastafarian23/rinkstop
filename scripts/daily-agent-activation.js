#!/usr/bin/env node

/**
 * Daily Agent Activation Script
 * Runs every morning to activate agents
 */

const PROJECTS = [
  { name: 'Confidential', channel: '-5283458613' },
  { name: 'SativaExchange', channel: '-5167418353' },
  { name: 'RinkStop', channel: '-5043773858' },
  { name: 'KevlarData', channel: '-5132774377' },
  { name: 'TopShelfToker', channel: '-5164369379' }
];

const MESSAGE = `📋 **DAILY AGENT ACTIVATION**

Team, it's time to get to work!

**Today's Tasks:**

**Content Team:**
- Draft 1 social post for approval
- Draft 1 blog post (if scheduled)

**Sales Team:**
- Research 5 new leads
- Follow up on warm leads
- Update pipeline

**Research Team:**
- Gather relevant market data
- Update research files

**Support Team:**
- Check for new tickets
- Resolve within SLA

Let's make today productive! 🚀

- Ron (CEO)`;

console.log('Daily activation message prepared for', PROJECTS.length, 'projects');
console.log('Message:', MESSAGE.substring(0, 100) + '...');
