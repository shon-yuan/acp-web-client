import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Code block renderer
const renderer = new marked.Renderer();

renderer.code = (code: string, language?: string) => {
  const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
  const highlighted = hljs.highlight(code, { language: validLanguage }).value;
  
  return `<pre class="hljs"><code class="language-${validLanguage}">${highlighted}</code></pre>`;
};

renderer.codespan = (code: string) => {
  return `<code class="inline-code">${code}</code>`;
};

// Render Markdown
export function renderMarkdown(content: string): string {
  try {
    return marked.parse(content, { renderer }) as string;
  } catch (e) {
    return content;
  }
}

// Escape HTML
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
