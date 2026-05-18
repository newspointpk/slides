import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
 import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
 import Color from "@tiptap/extension-color";
import { Extension } from "@tiptap/core";
import { useCallback, useEffect } from "react";
 import { Button } from "@/components/ui/button";
import { Bold } from "lucide-react";
import { cn } from "@/lib/utils";

// Font size attribute stored on the existing `textStyle` mark.
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace("px", ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}px` };
            },
          },
        },
      },
    ];
  },
});
 
// Color palette for text
const COLOR_PALETTE = [
  "#ffffff", // white
  "#000000", // black
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#a855f7", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#78716c", // stone
  "#a3a3a3", // gray
];
 
 // Font size options
 const FONT_SIZES = ["24", "32", "40", "48", "56", "64", "72"];
 
interface RichTextEditorProps {
  content: string;
  onContentChange: (html: string, json: any) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = ({ content, onContentChange, placeholder, className }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: true,
        orderedList: true,
        dropcursor: {
          color: 'hsl(var(--primary))',
          width: 2,
        },
      }),

      TextStyle,
      Color,
      FontSize,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[200px] w-full overflow-y-auto rounded-xl border border-border bg-card p-6 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
          className
        ),
        dir: "rtl",
        style: "font-family: 'Jameel Noori Nastaleeq', serif; font-size: 28px; line-height: 1.8;",
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML(), editor.getJSON());
    },
  });

  // Update content if it changes from outside (e.g. from state)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

 
   const setColor = useCallback(
     (color: string) => {
       editor?.chain().focus().setColor(color).run();
     },
     [editor]
   );
 
   const setFontSize = useCallback(
     (size: string) => {
       editor?.chain().focus().setMark("textStyle", { fontSize: size }).run();
     },
     [editor]
   );
 
   const toggleBold = useCallback(() => {
     editor?.chain().focus().toggleBold().run();
   }, [editor]);
 
   if (!editor) return null;
 
    return (
      <div className="w-full max-w-3xl rich-text-editor-fixed">
        {/* Keep editor display font size fixed; preserve font-size marks for canvas rendering */}
        <style>{`
          .rich-text-editor-fixed .ProseMirror {
            font-size: 28px !important;
            line-height: 1.6 !important;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .rich-text-editor-fixed .ProseMirror p {
            margin: 0 !important;
            padding: 0 !important;
          }
          .rich-text-editor-fixed .ProseMirror::-webkit-scrollbar {
            display: none;
          }
          .rich-text-editor-fixed .ProseMirror *[style*="font-size"] {
            font-size: inherit !important;
          }
        `}</style>

        {/* Bubble Menu - appears when text is selected */}
       <BubbleMenu
         editor={editor}
         className="flex items-center gap-1 rounded-lg border border-border bg-card p-2 shadow-lg"
       >
         {/* Bold toggle */}
         <Button
           variant={editor.isActive("bold") ? "default" : "ghost"}
           size="sm"
           onClick={toggleBold}
           className="h-8 w-8 p-0"
         >
           <Bold className="h-4 w-4" />
         </Button>
 
         <div className="mx-1 h-6 w-px bg-border" />
 
         {/* Color palette */}
         <div className="flex gap-1">
           {COLOR_PALETTE.map((color) => (
             <button
               key={color}
               onClick={() => setColor(color)}
               className="h-6 w-6 rounded-full border border-border transition-transform hover:scale-110"
               style={{ backgroundColor: color }}
               title={color}
             />
           ))}
         </div>
 
         <div className="mx-1 h-6 w-px bg-border" />
 
         {/* Font size */}
         <select
           onChange={(e) => setFontSize(e.target.value)}
           className="h-8 rounded border border-border bg-background px-2 text-sm"
           defaultValue=""
         >
           <option value="" disabled>
             Size
           </option>
           {FONT_SIZES.map((size) => (
             <option key={size} value={size}>
               {size}px
             </option>
           ))}
         </select>
       </BubbleMenu>
 
       {/* Editor */}
       <EditorContent editor={editor} />
 
       {/* Instructions */}
       <p className="mt-2 text-center text-sm text-muted-foreground">
         Select text to see styling options • Press Enter for new line
       </p>
     </div>
   );
 };
 
 export default RichTextEditor;