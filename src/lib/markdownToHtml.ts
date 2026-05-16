import { remark } from "remark";
import gfm from "remark-gfm";
import html from "remark-html";
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

function markCodeBlocks(input: string) {
  // Tag every <pre> block so the client copy-button can find it. Idempotent.
  return input.replace(/<pre(?![^>]*data-code-block)>/g, '<pre data-code-block="true">');
}

export default async function markdownToHtml(markdown: string) {
  const result = await remark().use(gfm).use(html).process(markdown);
  let output = addHeadingIdsToHtml(result.toString());
  output = transformCallouts(output);
  output = markCodeBlocks(output);
  return output;
}
