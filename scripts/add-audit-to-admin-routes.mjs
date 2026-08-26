#!/usr/bin/env node
/**
 * scripts/add-audit-to-admin-routes.mjs (v3)
 *
 * Augments `getAdminFromRequest()` calls so they receive the in-scope
 * `request` and a descriptive action name. Only modifies calls inside
 * handlers whose signature includes `request: NextRequest`.
 *
 * Idempotent. Re-running matches only the bare form.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = 'src/app/api';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name === 'route.ts') out.push(p);
  }
  return out;
}

const files = walk(ROOT).filter(p => p.includes('/admin/') || p.includes('/corrections/'));
console.log(`Found ${files.length} admin/correction route files`);

// Derive action name from path: admin/claims/[id]/review → claims_review
function actionFromPath(file) {
  // Strip src/app/api/ prefix and trailing /route.ts.
  const parts = file.replace(/^src\/app\/api\//, '').replace(/\/route\.ts$/, '').split('/');
  return parts.filter(p => p !== '[id]').join('_');
}

// Find exported handlers where `request` is in the param list.
function findEligibleHandlers(src) {
  const out = [];
  const headerRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let m;
  while ((m = headerRegex.exec(src)) !== null) {
    const name = m[1];
    let parenDepth = 1;
    let p = m.index + m[0].length;
    let parenEnd = -1;
    while (p < src.length && parenDepth > 0) {
      const c = src[p];
      if (c === '(') parenDepth++;
      else if (c === ')') {
        parenDepth--;
        if (parenDepth === 0) parenEnd = p;
      }
      p++;
    }
    if (parenEnd === -1) continue;
    const paramList = src.slice(m.index + m[0].length, parenEnd);
    if (/\brequest\b/.test(paramList)) out.push(name);
  }
  return out;
}

// For each eligible handler, find its body region and augment calls within it.
function augmentHandlerBody(src, handlerName, action) {
  const headerRe = new RegExp(`export\\s+async\\s+function\\s+${handlerName}\\s*\\(`);
  const headerMatch = headerRe.exec(src);
  if (!headerMatch) return { src, count: 0 };

  let parenDepth = 1;
  let i = headerMatch.index + headerMatch[0].length;
  let parenEnd = -1;
  while (i < src.length && parenDepth > 0) {
    const c = src[i];
    if (c === '(') parenDepth++;
    else if (c === ')') {
      parenDepth--;
      if (parenDepth === 0) parenEnd = i;
    }
    i++;
  }
  if (parenEnd === -1) return { src, count: 0 };

  const braceStart = src.indexOf('{', parenEnd);
  if (braceStart === -1) return { src, count: 0 };

  let depth = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  for (let j = braceStart; j < src.length; j++) {
    if (src[j] === '{') {
      if (depth === 0) bodyStart = j + 1;
      depth++;
    } else if (src[j] === '}') {
      depth--;
      if (depth === 0) { bodyEnd = j; break; }
    }
  }
  if (bodyStart === -1 || bodyEnd === -1) return { src, count: 0 };

  const body = src.slice(bodyStart, bodyEnd);
  let count = 0;
  const newBody = body.replace(
    /const\s+(auth|gate|authz)\s*=\s*await\s+getAdminFromRequest\(\);/g,
    (m, varName) => {
      count++;
      return `const ${varName} = await getAdminFromRequest(request, '${action}');`;
    }
  );
  if (count === 0) return { src, count: 0 };
  return {
    src: src.slice(0, bodyStart) + newBody + src.slice(bodyEnd),
    count,
  };
}

let modified = 0;
let totalCalls = 0;
for (const file of files) {
  let src = readFileSync(file, 'utf8');
  if (!src.includes('getAdminFromRequest()')) continue;

  const action = actionFromPath(file);
  const handlers = findEligibleHandlers(src);
  if (handlers.length === 0) continue;

  let fileAugmented = 0;
  for (const handler of handlers) {
    const result = augmentHandlerBody(src, handler, action);
    if (result.count > 0) {
      src = result.src;
      fileAugmented += result.count;
    }
  }
  if (fileAugmented > 0) {
    writeFileSync(file, src);
    modified++;
    totalCalls += fileAugmented;
    console.log(`  ✓ ${file} (${fileAugmented} calls)`);
  }
}
console.log(`\nModified ${modified} files, ${totalCalls} calls augmented`);