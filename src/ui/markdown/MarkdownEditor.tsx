"use client";

import dynamic from "next/dynamic";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
  safeMarkdownUrlTransform,
} from "@/ui/markdown/pipeline";
import { CONTROL_CLASS_NAME } from "@/ui/projects/project-types";
import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <textarea
      className={CONTROL_CLASS_NAME}
      rows={14}
      disabled
      aria-busy="true"
      aria-label="Carregando editor Markdown"
    />
  ),
});

type MarkdownEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
};

export function MarkdownEditor({ id, value, onChange, invalid = false }: MarkdownEditorProps) {
  return (
    <div data-color-mode="light" className="overflow-hidden rounded-lg border border-outline-variant">
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        height={400}
        visibleDragbar={false}
        preview="live"
        textareaProps={{
          id,
          "aria-invalid": invalid || undefined,
          "aria-describedby": invalid ? `${id}-error` : undefined,
        }}
        previewOptions={{
          remarkPlugins: markdownRemarkPlugins,
          rehypePlugins: markdownRehypePlugins,
          urlTransform: safeMarkdownUrlTransform,
        }}
      />
    </div>
  );
}
