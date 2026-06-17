import { remark } from "remark";
import gfm from "remark-gfm";
import html from "remark-html";
import { createHighlighter, type Highlighter } from "shiki";
import { addHeadingIdsToHtml } from "./post-format";

type CalloutKind = "note" | "tip" | "important" | "warning" | "caution";

const CALLOUT_LABEL: Record<CalloutKind, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

const CALLOUT_REGEX =
  /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*?)<\/p>([\s\S]*?)<\/blockquote>/gi;

function transformCallouts(input: string) {
  return input.replace(CALLOUT_REGEX, (_match, kindRaw: string, firstLine: string, rest: string) => {
    const kind = kindRaw.toLowerCase() as CalloutKind;
    const label = CALLOUT_LABEL[kind] ?? "Note";
    const firstParagraph = firstLine.trim() ? `<p>${firstLine.trim()}</p>` : "";
    const body = `${firstParagraph}${rest}`.trim();
    return `<aside class="callout callout-${kind}" role="note"><p class="callout-label">${label}</p><div class="callout-body">${body}</div></aside>`;
  });
}

const SHIKI_LANGS = [
  "powershell",
  "kusto",
  "bash",
  "shellscript",
  "yaml",
  "json",
  "xml",
  "ini",
  "typescript",
  "javascript",
  "html",
  "markdown",
  "python",
  "dockerfile",
] as const;

const LANG_LABEL: Record<string, string> = {
  powershell: "PowerShell",
  ps1: "PowerShell",
  kusto: "KQL",
  kql: "KQL",
  bash: "bash",
  sh: "bash",
  shellscript: "shell",
  shell: "shell",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  xml: "XML",
  ini: "INI",
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  csv: "CSV",
  html: "HTML",
  markdown: "Markdown",
  md: "Markdown",
  python: "Python",
  py: "Python",
  dockerfile: "Dockerfile",
  txt: "",
  text: "",
};

const LANG_ALIAS: Record<string, string> = {
  kql: "kusto",
  ps1: "powershell",
  ps: "powershell",
  sh: "bash",
  shell: "shellscript",
  yml: "yaml",
  ts: "typescript",
  js: "javascript",
  py: "python",
  md: "markdown",
};

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark-dimmed"],
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighterPromise;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}

const CODE_BLOCK_REGEX = /<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g;

async function highlightCodeBlocks(input: string): Promise<string> {
  const matches = Array.from(input.matchAll(CODE_BLOCK_REGEX));
  if (matches.length === 0) return input;

  const highlighter = await getHighlighter();
  const loadedLangs = new Set(highlighter.getLoadedLanguages());

  const replacements: Array<{ original: string; replacement: string }> = [];

  for (const match of matches) {
    const [fullMatch, langRaw, content] = match;
    const code = decodeHtmlEntities(content).replace(/\n$/, "");
    const aliased = langRaw ? (LANG_ALIAS[langRaw] ?? langRaw) : "text";
    const label = LANG_LABEL[langRaw ?? "text"] ?? langRaw ?? "";

    const useLang = loadedLangs.has(aliased) ? aliased : "text";

    let highlighted: string;
    try {
      highlighted = highlighter.codeToHtml(code, {
        lang: useLang,
        themes: { light: "github-light", dark: "github-dark-dimmed" },
        defaultColor: false,
      });
    } catch {
      highlighted = `<pre><code>${content}</code></pre>`;
    }

    const labelAttr = label ? ` data-language-label="${escapeAttr(label)}"` : "";
    const enhanced = highlighted.replace(
      /^<pre /,
      `<pre data-code-block="true" data-language="${escapeAttr(useLang)}"${labelAttr} `,
    );

    replacements.push({ original: fullMatch, replacement: enhanced });
  }

  let result = input;
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }
  return result;
}

export default async function markdownToHtml(markdown: string) {
  const result = await remark().use(gfm).use(html).process(markdown);
  let output = addHeadingIdsToHtml(result.toString());
  output = transformCallouts(output);
  output = await highlightCodeBlocks(output);
  return output;
}
