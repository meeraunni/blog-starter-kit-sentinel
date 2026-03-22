import markdownStyles from "./markdown-styles.module.css";

type Props = {
  content: string;
};

export function PostBody({ content }: Props) {
  return (
    <div
      className={`mx-auto max-w-3xl prose prose-lg prose-neutral
        prose-headings:font-semibold
        prose-headings:tracking-[-0.03em]
        prose-a:text-cyan-900
        prose-a:no-underline
        prose-a:transition-colors
        prose-a:hover:text-slate-950
        prose-strong:text-slate-950
        prose-blockquote:border-l-cyan-700
        prose-blockquote:bg-cyan-50/60
        prose-blockquote:px-6
        prose-blockquote:py-2
        prose-img:rounded-[1.75rem]
        prose-img:shadow-[0_20px_50px_rgba(15,23,42,0.12)]
        prose-p:leading-8
        prose-li:leading-8
        ${markdownStyles["markdown"]}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
