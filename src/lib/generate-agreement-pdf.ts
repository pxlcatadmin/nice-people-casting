import { jsPDF } from "jspdf";

interface AgreementData {
  performerName: string;
  signedAt: string;
  signature: string;
}

const CLAUSES = [
  {
    title: "[1] Background",
    text: "This contract defines the Performer as an independent contractor who solicits the services of the Performer Representative to procure paid opportunities with Entertainment Industry Employers.",
  },
  {
    title: "[2] Services Provided",
    text: "[a] Performer Representative hereby agrees to engage The Performer to provide The Performer Representative with the following services.\n\n[b] The Services will also include any other tasks the Parties may agree on. The Performer hereby agrees to give such services to The Performer Representative.",
  },
  {
    title: "[3] Terms of Agreement",
    text: "[a] The terms of this Agreement will begin on the date of this Agreement and will remain in full force and effect until terminated as provided in this Agreement.\n\n[b] Either Party may terminate this Agreement by providing 14 working days written notice to the other Party.\n\n[c] In the event that either Party breaches a material provision under this Agreement, the non-defaulting Party may terminate this Agreement immediately and require the defaulting Party to indemnify the non-defaulting Party against all reasonable damages.\n\n[d] This Agreement may be terminated at any time by mutual agreement between the Parties.",
  },
  {
    title: "[4] Payment",
    text: "[b] The Performer will be responsible for all income tax liabilities and similar contributions relating to the Payment and will indemnify The Performer Representative in respect of any such payments required to be made by The Performer Representative.\n\n[c] The Performer Representative will deduct a 30% commission from the total payment for standard jobs obtained by The Performer Representative for The Performer. For specialty projects or unique services, an alternative project fee may be agreed upon in writing by both parties prior to commencement.\n\n[d] The agreed pay is final unless otherwise negotiated due to specific circumstances. Any changes to the agreed pay must be discussed and agreed upon in writing by both parties.\n\n[e] Unless otherwise stated in the order or agreed by Nice People in writing, payments will be made within 30 days from Invoice date or receipt date, whichever is the latter. In addition, where the supply is on behalf of one of our clients, we shall only pay once we have received the funds from our client. The same principle applies to usage rollover payments.",
  },
  {
    title: "[5] Use of Image & Likeness",
    text: "The Performer grants Nice People permission to use their name, image, and portfolio for promotional and casting purposes. This includes use on the Nice People website, Nice Paper, social media, and in materials shared with prospective clients. Usage beyond these purposes requires Performer consent.",
  },
  {
    title: "[6] Non-Exclusivity",
    text: "The Parties acknowledge that this Agreement is non-exclusive and that either Party will be free, during and after the Term, to engage or contract with third parties for the provision of services similar to the Services, except as restricted below.",
  },
  {
    title: "[7] Non-Solicitation",
    text: "The Performer agrees not to directly or indirectly solicit or provide services to any clients introduced by The Performer Representative for a period of 6 months following the termination of this Agreement, unless such services are coordinated through The Performer Representative.",
  },
  {
    title: "[8] Confidentiality",
    text: "[a] Confidential information refers to any data or information relating to The Performer Representative, whether business or personal, which would reasonably be considered to be private or proprietary to The Performer Representative and that is not generally known and where the release of that Confidential Information could reasonably be expected to cause harm to The Performer Representative.\n\n[b] The Performer agrees not to disclose, divulge, reveal, report, or use, for any purpose, any Confidential Information which The Performer has obtained, except as authorised by The Performer Representative or as required by law.",
  },
  {
    title: "[9] Intellectual Property",
    text: "All intellectual property and related material that is developed or produced under this Agreement will be the sole property of The Performer Representative. The use of the Intellectual Property by The Performer Representative will not be restricted in any manner.",
  },
  {
    title: "[10] Return of Property",
    text: "Upon the expiry or termination of this Agreement, The Performer will return to The Performer Representative any property, documentation, records, or Confidential Information which is the property of The Performer Representative.",
  },
  {
    title: "[11] Capacity/Independent Contractor",
    text: "In providing the Services under this Agreement, it is expressly agreed that The Performer is acting as an independent contractor and not as an employee. This Agreement does not create a partnership or joint venture between the Parties.",
  },
  {
    title: "[12] Autonomy",
    text: "Except as otherwise provided in this Agreement, The Performer will have full control over working time, methods, and decision making in relation to the provision of the Services. However, The Performer will be responsive to the reasonable needs and concerns of The Performer Representative.",
  },
  {
    title: "[13] Notice",
    text: "All notices, requests, demands, or other communications required or permitted by the terms of this Agreement will be given in writing and delivered to the Parties at the following addresses:\n\nNice People Talent Agency: 732a Sydney Road Brunswick",
  },
  {
    title: "[14] Indemnification",
    text: "Each Party agrees to indemnify and hold harmless the other Party against any and all claims, losses, damages, liabilities, expenses, reasonable legal fees, and costs of any kind or amount whatsoever, which result from or arise out of any act or omission of the indemnifying Party. This indemnification will survive the termination of this Agreement.",
  },
  {
    title: "[15] Professional Conduct",
    text: "As an ambassador of Nice People, we expect our talent to embody our core value of kindness in every professional interaction. This includes:\n\n- Arrive 15 minutes early to all bookings, castings, and meetings\n- Treating all cast, crew, and clients with genuine respect and consideration\n- Maintaining a positive, collaborative attitude on set\n- Contributing to a welcoming and inclusive environment on every job",
  },
  {
    title: "[16] Model Safety & Consent",
    text: "At Nice People, we enforce a strict zero-tolerance policy regarding our talent's safety, comfort, and wellbeing. Every client who works with our talent signs an agreement acknowledging that they will respect our talent's boundaries without question, and that any breach of this will result in immediate shoot termination at their expense. If at any point during a shoot you feel even slightly uncomfortable, or if you're asked to do anything beyond what was originally agreed upon (no matter how minor the change may seem), you have the absolute right to stop the shoot immediately. You never need to explain or justify your discomfort. Simply call us - we are here for you 24/7, and we will handle all client communications about the situation. While we expect our talent to maintain the highest standards of professionalism, your safety and comfort take precedence over all other considerations. This policy is non-negotiable: you will never be penalised for speaking up or stopping a shoot due to discomfort or safety concerns. Your instincts are valid, your boundaries are valid, and we will always have your back.",
  },
];

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
  doc.text("Nice People Talent Agency", margin, y);
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
  doc.text("Nice People Talent Agency", margin + 30, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.setFontSize(8);
  doc.text("732a Sydney Road Brunswick", margin + 30, y);
  y += 10;

  // Divider
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Clauses
  for (const clause of CLAUSES) {
    const titleLines = doc.splitTextToSize(clause.title, contentWidth);
    const textLines = doc.splitTextToSize(clause.text, contentWidth);
    const blockHeight = titleLines.length * 5 + textLines.length * 4 + 8;

    addNewPageIfNeeded(blockHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5 + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(textLines, margin, y);
    y += textLines.length * 4 + 6;
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

  // Representative signatures
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Performer Representative", margin, y);
  y += 6;

  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Joel Fenton", margin, y);
  y += 3;
  doc.setDrawColor(180);
  doc.line(margin, y, margin + 80, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Nice People Talent Agency", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Performer Representative", margin, y);
  y += 6;

  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Jake Mercer", margin, y);
  y += 3;
  doc.setDrawColor(180);
  doc.line(margin, y, margin + 80, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Nice People Talent Agency", margin, y);

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text(
      `Nice People Talent Agreement - ${data.performerName} - Page ${i} of ${totalPages}`,
      margin,
      290
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
