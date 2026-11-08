"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  RemoveFormatting,
  Underline as UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  ariaLabel?: string;
};

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  return `https://${url}`;
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "focus-ring grid size-7 place-items-center rounded-[3px] transition",
        active
          ? "bg-[#7c6cf5] text-white"
          : "text-[#b9b9c2] hover:bg-[#26262c] hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", previous ?? "https://");
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalizeUrl(url) })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#2a2a30] bg-[#1b1b1f] px-2 py-1.5">
      <ToolbarButton
        title="Bold (Ctrl+B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic (Ctrl+I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline (Ctrl+U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>

      <span className="mx-1 h-4 w-px bg-[#2a2a30]" />

      <ToolbarButton title="Insert / edit link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Remove link"
        onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
      >
        <Link2Off className="size-3.5" />
      </ToolbarButton>

      <span className="mx-1 h-4 w-px bg-[#2a2a30]" />

      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>

      <span className="mx-1 h-4 w-px bg-[#2a2a30]" />

      <ToolbarButton
        title="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}

/**
 * Gmail-style rich text editor (TipTap, MIT).
 * Bold / italic / underline / hyperlinks / lists — outputs plain HTML so it can
 * be dropped straight into the email.
 */
export function RichTextEditor({
  value,
  onChange,
  minHeight = "9rem",
  className,
  ariaLabel = "Rich text editor",
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["mailto", "tel"],
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        "aria-label": ariaLabel,
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  // Keep the editor in sync when the value changes from outside
  // (loading settings, opening a different draft, etc.).
  React.useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="skeleton h-32 rounded-[4px] border border-[#2a2a30]" />
    );
  }

  return (
    <div className={cn("rte overflow-hidden rounded-[4px] border border-[#2a2a30] bg-[#131316]", className)}>
      <Toolbar editor={editor} />
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
