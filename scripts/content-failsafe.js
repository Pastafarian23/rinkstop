#!/usr/bin/env node

/**
 * Content Failsafe Script
 * Checks if content was submitted, escalates if not
 */

const fs = require('fs');
const path = require('path');

const PROJECTS = [
  { name: 'Confidential', dir: 'confidential' },
  { name: 'SativaExchange', dir: 'sativaexchange' },
  { name: 'RinkStop', dir: 'rinkstop' },
  { name: 'KevlarData', dir: 'kevlar' },
  { name: 'TopShelfToker', dir: 'topshelftoker' }
];
const TYPES = ['social-posts', 'blog-posts'];
const BASE = '/root/.openclaw/workspace/approved';

function checkContent() {
  console.log('🔍 Checking for submitted content...');
  
  let missing = [];
  let found = [];
  
  for (const { name, dir } of PROJECTS) {
    const projectPath = path.join(BASE, dir);
    
    if (!fs.existsSync(projectPath)) {
      missing.push(`${name} (no directory)`);
      console.log(`❌ ${name}: directory not found at ${projectPath}`);
      continue;
    }
    
    let hasToday = false;
    const today = new Date().toISOString().split('T')[0];
    
    for (const type of TYPES) {
      const typePath = path.join(projectPath, type);
      if (fs.existsSync(typePath)) {
        const files = fs.readdirSync(typePath)
          .filter(f => f.startsWith(today));
        if (files.length > 0) {
          hasToday = true;
          found.push(`${project}/${type}: ${files.join(', ')}`);
        }
      }
    }
    
    // Also check for flat files (social-*, blog-*)
    const flatFiles = fs.readdirSync(projectPath)
      .filter(f => f.startsWith(today) && (f.includes('social') || f.includes('blog')));
    if (flatFiles.length > 0) {
      hasToday = true;
      found.push(`${project} (flat): ${flatFiles.join(', ')}`);
    }
    
    if (!hasToday) {
      missing.push(name);
      console.log(`❌ ${name}: NO content for today`);
    } else {
      console.log(`✓ ${name}: Content found`);
    }
  }
  
  if (missing.length > 0) {
    console.log('\n⚠️ Projects missing content today:', missing.join(', '));
    console.log('📢 Escalating to CEO for follow-up');
  } else {
    console.log('\n✅ All projects have content for today!');
  }
  
  console.log('\n📁 Files found:');
  found.forEach(f => console.log(`  ${f}`));
}

checkContent();
