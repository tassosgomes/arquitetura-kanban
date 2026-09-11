import ReactMarkdown from "react-markdown";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
  safeMarkdownUrlTransform,
} from "@/ui/markdown/pipeline";

type MarkdownViewProps = {
  markdown: string;
};

export function MarkdownView({ markdown }: MarkdownViewProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        urlTransform={safeMarkdownUrlTransform}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
