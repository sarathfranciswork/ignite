"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your description...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  if (!editor) {
    return (
      <div
        className={cn(
          "border border-gray-200 rounded-lg p-4 min-h-[200px] bg-gray-50",
          className,
        )}
      >
        Loading editor...
      </div>
    );
  }

  const toolbarButtons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: "Bold",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: "Italic",
    },
    {
      icon: UnderlineIcon,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
      label: "Underline",
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      label: "Heading",
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      label: "Bullet list",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      label: "Ordered list",
    },
    {
      icon: LinkIcon,
      action: () => {
        const url = window.prompt("URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
      active: editor.isActive("link"),
      label: "Link",
    },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      label: "Undo",
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      label: "Redo",
    },
  ];

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-lg overflow-hidden",
        className,
      )}
    >
      <div
        className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50"
        role="toolbar"
        aria-label="Text formatting"
      >
        {toolbarButtons.map(({ icon: Icon, action, active, label }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className={cn(
              "p-1.5 rounded hover:bg-gray-200 transition-colors",
              active && "bg-primary-100 text-primary-600",
            )}
            title={label}
            aria-label={label}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]"
      />
    </div>
  );
}
