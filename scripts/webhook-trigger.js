#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple webhook server that triggers OpenClaw agents
// Make.com calls this endpoint, which sends a message to trigger agents

const PORT = 3456;

const TRIGGERS = {
  'morning-rinkstop': {
    channel: '-5043773858', // RinkStop Ops
    message: '☀️ **MORNING ACTIVATION - RinkStop**\n\nTime to generate today\'s social media content!\n\nPlease create:\n- 2-3 social posts for Facebook\n- 2-3 posts for Twitter/X\n- Focus on: NHL news, hockey training, youth hockey\n\nPost in this channel for approval. After ✅, I\'ll post to Buffer.'
  },
  'morning-sativa': {
    channel: '-5167418353', // Sativa Exchange Ops
    message: '☀️ **MORNING ACTIVATION - SativaExchange**\n\nTime to generate today\'s content!'
  },
  'morning-topshelf': {
    channel: '-5164369379', // Top Shelf Toker Ops
    message: '☀️ **MORNING ACTIVATION - TopShelfToker**\n\nTime to generate today\'s content!'
  },
  'email-check': {
    channel: '-5043773858', // RinkStop Ops
    message: '📧 **EMAIL CHECK**\n\nChecking support@rinkstop.com for new emails...\n\n(Draft replies will be posted for approval)'
  }
};

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', triggers: Object.keys(TRIGGERS) }));
    return;
  }
  
  if (req.method === 'POST' && req.url.startsWith('/trigger/')) {
    const triggerKey = req.url.replace('/trigger/', '');
    const trigger = TRIGGERS[triggerKey];
    
    if (!trigger) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown trigger', available: Object.keys(TRIGGERS) }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      console.log(`Trigger: ${triggerKey}`);
      console.log(`Message: ${trigger.message}`);
      
      // Log the trigger - in production, this would call the message tool
      // For now, we'll write to a file that can be processed
      const logFile = `/root/.openclaw/workspace/scripts/trigger-log.json`;
      const log = {
        timestamp: new Date().toISOString(),
        trigger: triggerKey,
        channel: trigger.channel,
        message: trigger.message,
        body: body || null
      };
      
      try {
        fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
      } catch (e) {
        console.error('Error writing log:', e);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        trigger: triggerKey,
        message: 'Trigger logged - webhook server is running but needs OpenClaw integration'
      }));
    });
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🌐 Webhook server running on http://localhost:${PORT}`);
  console.log(`Available triggers:`);
  Object.keys(TRIGGERS).forEach(key => {
    console.log(`  - ${key}`);
  });
});