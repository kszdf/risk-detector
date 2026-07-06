import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function GET(request: Request) {
  try {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun("Hello World")]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="test.docx"'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
