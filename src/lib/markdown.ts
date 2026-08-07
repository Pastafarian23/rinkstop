/**
 * Markdown-to-HTML rendering for the RinkStop blog.
 *
 * Shared by:
 *   - src/app/news/[slug]/page.tsx (public blog post page)
 *   - src/app/admin/blog/[slug]/page.tsx (admin article review — body preview)
 *
 * This is a deliberately small, no-dependency renderer that handles the
 * subset of markdown we use in articles: H2/H3, paragraphs, links, bold,
 * italic, and bare YouTube URL lines (rendered as embed iframes). The
 * article-from-highlight pipeline produces this format.
 *
 * Anything more complex (tables, code blocks with backticks, footnotes)
 * is rendered as raw escaped text. Articles that need richer formatting
 * should set `content_html` and the public page will use that instead.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert inline markdown to HTML.
 * Order matters:
 *   1) links first
 *   2) bold (**...**)
 *   3) italic (*...*) — single * not part of **
 */
export function inlineMarkdownToHtml(line: string): string {
  // 1) links: [label](https://url)
  let s = line.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
    (_m, label, url) => {
      const safeLabel = escapeHtml(label);
      const safeUrl = url.replace(/"/g, '&quot;');
      return `<a href="${safeUrl}" rel="noopener noreferrer" target="_blank">${safeLabel}</a>`;
    }
  );
  // 2) bold
  s = s.replace(/\*\*(.+?)\*\*/g, (_m, t) => `<strong>${t}</strong>`);
  // 3) italic — single * not in ** and not part of HTML tags we just emitted
  s = s.replace(/(^|[^*\w])\*([^\*\n]+?)\*(?!\*)/g, (_m, lead, t) => `${lead}<em>${t}</em>`);
  // 4) bare URLs (http/https only — skip already-linked ones). Run AFTER the
  //    markdown link pass so [label](url) is already an <a> tag and won't
  //    match here. Match URL boundaries conservatively to avoid eating
  //    trailing punctuation.
  s = s.replace(
    /(?<!["'>])\b(https?:\/\/[^\s<]+)/g,
    (_m, url) => {
      const safeUrl = url.replace(/"/g, '&quot;');
      return `<a href="${safeUrl}" rel="noopener noreferrer" target="_blank">${safeUrl}</a>`;
    }
  );
  return s;
}

/**
 * Convert full markdown content to HTML.
 * Handles:
 *   - ## H2
 *   - ### H3
 *   - Bare YouTube URL lines (rendered as 16:9 embed iframe)
 *   - Regular paragraphs with inline markdown
 *
 * Removes "Stay true to who you are..." sign-off lines and trailing
 * "-- Arnel" bylines (the public page's metadata footer carries the
 * author info separately).
 */
export function contentToHtml(content: string): string {
  // Strip frontmatter (--- ... ---) at the top of the source file
  let text = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

  // Remove sign-off lines
  text = text
    .replace(/Stay true to who you are\..*$/gim, '')
    .replace(/^\s* -- \s*Arnel\s*$/gim, '')
    .replace(/^\s*Arnel\s*$/gim, '');

  const lines = text.split('\n');
  const html: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { html.push(''); continue; }

    // H1 — skip entirely; the public page renders the title in its own <h1>
    // hero block. Rendering it again in the body creates a duplicate.
    if (line.startsWith('# ')) {
      continue;
    }

    // Blockquote — collect consecutive `> ` lines into one <blockquote>.
    // For simplicity we render single-line blockquotes here and let
    // subsequent paragraphs break out of the block when the loop hits a
    // non-`>` line. Multi-paragraph blockquotes aren't used in our articles.
    if (line.startsWith('> ')) {
      const quoteText = inlineMarkdownToHtml(escapeHtml(line.substring(2)));
      html.push(`<blockquote>${quoteText}</blockquote>`);
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      html.push(`<h2>${inlineMarkdownToHtml(line.substring(3))}</h2>`);
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      html.push(`<h3>${inlineMarkdownToHtml(line.substring(4))}</h3>`);
      continue;
    }

    // YouTube embed: a bare line whose entire content is a YouTube URL
    // (youtube.com/embed/{id}, youtu.be/{id}, or youtube.com/watch?v={id}).
    // The article-from-highlight pipeline puts a single YouTube URL on its
    // own line near the top so the video player renders in-article.
    // Pattern is intentionally strict: must be the whole trimmed line.
    const ytEmbed = line.match(
      /^(https?:\/\/(?:www\.)?youtu\.be\/([\w-]{6,15}))[?#\s]*$|^(https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/)([\w-]{6,15}))[?#\s]*$/i
    );
    if (ytEmbed) {
      const id = (ytEmbed[2] || ytEmbed[4] || '').replace(/[^\w-]/g, '');
      if (id) {
        html.push(
          `<div class="yt-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin:1.5rem 0;">` +
          `<iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" ` +
          `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" ` +
          `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>` +
          `</div>`
        );
        continue;
      }
    }

    // Regular paragraph (escape HTML, then apply inline markdown)
    html.push(`<p>${inlineMarkdownToHtml(escapeHtml(line))}</p>`);
  }

  return html.join('\n');
}

/**
 * Word count for reading time / review QC.
 * Strips markdown syntax before counting.
 */
export function wordCount(content: string): number {
  return content
    .replace(/[#*_`~\-]/g, ' ')
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Excerpt for review sidebar / previews.
 * Strips markdown and returns first N words.
 */
export function excerpt(content: string, words = 40): string {
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/Stay true to who you are\..*$/gim, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= words) return cleaned;
  return parts.slice(0, words).join(' ') + '…';
}
