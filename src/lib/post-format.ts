export type TableOfContentsItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=[\]{};:'",.<>/?\\|]/g, "")
    .replace(/\s+/g, "-");
}

export function estimateReadingTime(markdown: string) {
  const wordCount = markdown
    .replace(/^---[\s\S]*?---/, "")
    .replace(/[`*_>#-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(wordCount / 220));
}

export function extractTableOfContents(markdown: string): TableOfContentsItem[] {
  const headings = markdown.match(/^#{2,3}\s+.+$/gm) ?? [];

  return headings
    .map((heading) => {
      const level: 2 | 3 = heading.startsWith("###") ? 3 : 2;
      const title = heading.replace(/^#{2,3}\s+/, "").trim();
      return {
        id: slugify(title),
        title,
        level,
      };
    })
    .filter((item) => item.title.toLowerCase() !== "references");
}

export function addHeadingIdsToHtml(html: string) {
  return html.replace(
    /<h([23])>(.*?)<\/h\1>/g,
    (_, level: string, inner: string) => {
      const plainText = inner.replace(/<[^>]+>/g, "").trim();
      const id = slugify(plainText);
      return `<h${level} id="${id}">${inner}</h${level}>`;
    },
  );
}
