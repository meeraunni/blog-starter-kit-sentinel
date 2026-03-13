import markdownStyles from "./markdown-styles.module.css";

type Props = {
  content: string;
};

export function PostBody({ content }: Props) {
  return (
    <div
      className={`mx-auto max-w-3xl prose prose-lg prose-neutral
        prose-a:text-blue-700
        prose-a:underline
        prose-a:underline-offset-4
        prose-img:rounded-xl
        prose-img:shadow-sm
        prose-p:leading-8
        ${markdownStyles["markdown"]}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
