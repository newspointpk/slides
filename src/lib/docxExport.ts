import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { NewsBlock } from "@/hooks/useWorkflowStore";

/**
 * Exports all news blocks and slides into a single .docx file.
 */
export const exportSlidesToDocx = async (blocks: NewsBlock[]) => {
  const sections = blocks.map((block) => ({
    children: [
      // Block Header
      new Paragraph({
        text: `${block.id}`,
        spacing: { before: 400, after: 200 },
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_3,
      }),
      
      // Slides
      ...block.slides.flatMap((slide, index) => [
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. `,
              bold: true,
              color: "666666",
            }),
            new TextRun({
              text: slide.text,
              font: "Jameel Noori Nastaleeq", // Try to use the same font
              size: 24, // 14pt
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          bidirectional: true, // RTL support
        }),
      ]),
      
    ],
  }));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections.flatMap(s => s.children),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Newsroom_Full_Report_${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
