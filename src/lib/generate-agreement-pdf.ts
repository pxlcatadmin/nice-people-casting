import { jsPDF } from "jspdf";
import {
  AGREEMENT_CLAUSES,
  AGREEMENT_VERSION,
  AGENCY_NAME,
  AGENCY_ADDRESS,
  AGENCY_SIGNATORIES,
  AGENCY_SIGNATORY_SUBTITLE,
} from "./talent-agreement";

interface AgreementData {
  performerName: string;
  signedAt: string;
  signature: string;
}

export function generateAgreementPdf(data: AgreementData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const signDate = new Date(data.signedAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > 270) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Talent Agreement", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(AGENCY_NAME, margin, y);
  y += 12;

  // Parties
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("This agreement is made between:", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Performer:", margin, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(data.performerName, margin + 25, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Representative:", margin, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(AGENCY_NAME, margin + 30, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.setFontSize(8);
  doc.text(AGENCY_ADDRESS, margin + 30, y);
  y += 10;

  // Divider
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Clauses — rendered from the shared source of truth so this PDF can never
  // disagree with what the performer read on screen before signing.
  for (const clause of AGREEMENT_CLAUSES) {
    const heading = `[${clause.number}] ${clause.title}`;
    const titleLines = doc.splitTextToSize(heading, contentWidth);

    addNewPageIfNeeded(titleLines.length * 5 + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5 + 2;

    for (const block of clause.blocks) {
      if (block.kind === "p") {
        const lines = doc.splitTextToSize(block.text, contentWidth);
        addNewPageIfNeeded(lines.length * 4 + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      } else {
        for (const item of block.items) {
          const lines = doc.splitTextToSize(`•  ${item}`, contentWidth - 4);
          addNewPageIfNeeded(lines.length * 4 + 2);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(60);
          doc.text(lines, margin + 4, y);
          y += lines.length * 4 + 1;
        }
        y += 2;
      }
    }

    y += 4;
  }

  // Signature section
  addNewPageIfNeeded(60);

  y += 4;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Signatures", margin, y);
  y += 10;

  // Performer signature
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Performer", margin, y);
  y += 6;

  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(data.signature, margin, y);
  y += 3;

  doc.setDrawColor(180);
  doc.line(margin, y, margin + 80, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Signed electronically on ${signDate}`, margin, y);
  y += 10;

  // Agency countersignatures.
  // These appear only here, on the emailed PDF — the performer never sees them
  // during the on-screen signing step.
  for (const signatory of AGENCY_SIGNATORIES) {
    addNewPageIfNeeded(34);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(signatory.title, margin, y);
    y += 6;

    // Rendered in the same italic serif as the performer's signature above,
    // so all three signatures on the page match.
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(signatory.name, margin, y);
    y += 3;

    doc.setDrawColor(180);
    doc.line(margin, y, margin + 80, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${signatory.name}, ${AGENCY_SIGNATORY_SUBTITLE}`, margin, y);
    y += 12;
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text(
      `Nice People Talent Agreement ${AGREEMENT_VERSION} - ${data.performerName} - Page ${i} of ${totalPages}`,
      margin,
      290
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
