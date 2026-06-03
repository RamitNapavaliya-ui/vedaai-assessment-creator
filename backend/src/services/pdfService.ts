import PDFDocument from 'pdfkit';
import { GeneratedPaper, Difficulty } from '../types';

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#16a34a',
  medium: '#d97706',
  hard: '#dc2626',
};

export async function generatePDF(
  paper: GeneratedPaper,
  studentName = '',
  rollNumber = '',
  section = ''
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 120; // minus margins

    // ── Header ──────────────────────────────────────────────
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('VEDAAI EDUCATIONAL INSTITUTE', { align: 'center' });

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(paper.title, { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Subject: ${paper.subject}`, { align: 'center' });

    doc.moveDown(0.5);

    // Meta row
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Duration: ${paper.duration}`, { continued: true })
      .text(`   |   Total Marks: ${paper.totalMarks}`, { continued: true })
      .text(`   |   Date: ${new Date(paper.generatedAt).toLocaleDateString('en-IN')}`, { align: 'right' });

    // Divider
    doc.moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // ── Student Info ─────────────────────────────────────────
    const sy = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555555').text('Student Name:', 60, sy);
    doc.fontSize(10).font('Helvetica').fillColor('#000000').text(studentName || '________________________________', 160, sy);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555555').text('Roll Number:', 60, doc.y + 4);
    doc.fontSize(10).font('Helvetica').fillColor('#000000').text(rollNumber || '________________', 160, doc.y - 14);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555555').text('Section:', 300, sy);
    doc.fontSize(10).font('Helvetica').fillColor('#000000').text(section || '________', 360, sy);

    doc.moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).stroke('#cccccc');
    doc.moveDown(0.8);

    // ── Sections ─────────────────────────────────────────────
    paper.sections.forEach((sec) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 150) doc.addPage();

      // Section header box
      doc
        .rect(60, doc.y, pageWidth, 22)
        .fillAndStroke('#f3f4f6', '#e5e7eb');

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1e1b4b')
        .text(`${sec.title}  —  [${sec.totalMarks} Marks]`, 68, doc.y - 18);

      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text(sec.instruction, 68);

      doc.moveDown(0.5);

      // Questions
      sec.questions.forEach((q, idx) => {
        if (doc.y > doc.page.height - 120) doc.addPage();

        const qY = doc.y;
        const diffColor = DIFFICULTY_COLORS[q.difficulty] || '#555';

        // Question number + text
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#4f46e5')
          .text(`${idx + 1}.`, 60, qY, { width: 20, continued: false });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#111827')
          .text(q.text, 82, qY, { width: pageWidth - 120 });

        // Difficulty badge + marks on right
        const rightX = doc.page.width - 60;
        const badgeY = qY;

        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(diffColor)
          .text(
            q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1),
            rightX - 80,
            badgeY,
            { width: 50, align: 'right' }
          );

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`[${q.marks}m]`, rightX - 30, badgeY, { width: 30, align: 'right' });

        // Options for MCQ
        if (q.options && q.options.length > 0) {
          doc.moveDown(0.3);
          const optionsPerRow = 2;
          const colWidth = (pageWidth - 30) / optionsPerRow;

          q.options.forEach((opt, oi) => {
            const col = oi % optionsPerRow;
            const row = Math.floor(oi / optionsPerRow);
            const ox = 90 + col * colWidth;
            const oy = doc.y + row * 16 - (col === 0 ? 0 : 16);

            doc
              .fontSize(9)
              .font('Helvetica')
              .fillColor('#374151')
              .text(opt, ox, oy, { width: colWidth - 10 });
          });

          doc.moveDown(Math.ceil(q.options.length / optionsPerRow) * 0.6);
        }

        doc.moveDown(0.6);
        // Light separator between questions
        doc.moveTo(82, doc.y).lineTo(doc.page.width - 60, doc.y).stroke('#f3f4f6');
        doc.moveDown(0.4);
      });

      doc.moveDown(0.8);
    });

    // ── Footer ───────────────────────────────────────────────
    if (doc.y > doc.page.height - 60) doc.addPage();
    doc.moveDown(1);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).stroke('#cccccc');
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text(
        '*** End of Question Paper ***  |  Generated by VedaAI Assessment Creator',
        { align: 'center' }
      );

    doc.end();
  });
}
