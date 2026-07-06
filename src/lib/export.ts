import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export async function exportToDocx(text: string, title: string = 'Transcript') {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleString()}`,
            spacing: {
              after: 800,
            },
          }),
          ...text.split('\n').map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24, // 12pt
                  }),
                ],
                spacing: {
                  after: 200,
                },
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.docx`);
}
