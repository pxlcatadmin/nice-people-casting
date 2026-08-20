/**
 * The Nice People talent agreement — SINGLE SOURCE OF TRUTH.
 *
 * Both the on-screen agreement step (src/app/[slug]/page.tsx) and the signed
 * PDF (src/lib/generate-agreement-pdf.ts) render from this file.
 *
 * Do not copy this text into a component. The whole point of this module is
 * that a performer cannot be shown one wording on screen and emailed a signed
 * PDF containing another.
 *
 * When the contract changes, bump AGREEMENT_VERSION. The version is stamped
 * into the PDF and stored on the submission, so it stays possible to tell
 * which wording any given performer actually signed.
 */

export const AGREEMENT_VERSION = "v2";
export const AGREEMENT_EFFECTIVE = "2026-08-20";

export const AGENCY_NAME = "Nice People Talent Agency";
export const AGENCY_ADDRESS = "732a Sydney Road, Brunswick VIC 3056";

/**
 * Who signs on behalf of the agency.
 *
 * These signatures appear ONLY on the countersigned PDF that is emailed to the
 * performer after they sign. They are deliberately not shown during the
 * on-screen signing step — the performer signs first, the agency countersigns.
 *
 * Rendered in the same italic serif as the performer's own signature.
 */
export const AGENCY_SIGNATORIES: { name: string; title: string }[] = [
  { name: "Joel Fenton", title: "Director" },
  { name: "Jake Mercer", title: "Director" },
];

export const AGENCY_SIGNATORY_SUBTITLE = "on behalf of Nice People";

export type AgreementBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] };

export interface AgreementClause {
  number: number;
  title: string;
  blocks: AgreementBlock[];
}

export const AGREEMENT_INTRO =
  "This Agreement sets out the terms on which the Performer, as an independent contractor, engages Nice People Talent Agency (the Representative) to represent them and to procure paid opportunities with clients in the entertainment, advertising and media industries.";

export const AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    number: 1,
    title: "Background",
    blocks: [{ kind: "p", text: AGREEMENT_INTRO }],
  },
  {
    number: 2,
    title: "Services Provided",
    blocks: [
      {
        kind: "p",
        text: "[a] The Representative agrees to provide the Performer with the following services:",
      },
      {
        kind: "list",
        items: [
          "Presenting and promoting the Performer to prospective clients",
          "Submitting the Performer for castings, bookings and other opportunities",
          "Negotiating fees, usage and booking terms on the Performer’s behalf",
          "Listing the Performer on the Nice People website and associated channels",
          "Arranging test shoots and portfolio development where mutually agreed",
          "Issuing invoices to clients and administering payment to the Performer",
        ],
      },
      {
        kind: "p",
        text: "[b] The Services may include any other tasks the Parties agree in writing.",
      },
      {
        kind: "p",
        text: "[c] The Performer agrees to respond to casting and booking requests in a timely manner, to keep the Representative informed of their availability, and to notify the Representative of any direct approach from a client introduced by the Representative.",
      },
    ],
  },
  {
    number: 3,
    title: "Term and Termination",
    blocks: [
      {
        kind: "p",
        text: "[a] This Agreement begins on the date of this Agreement and remains in force until terminated in accordance with this clause.",
      },
      {
        kind: "p",
        text: "[b] Either Party may terminate this Agreement by giving 14 working days’ written notice to the other Party.",
      },
      {
        kind: "p",
        text: "[c] If either Party breaches a material provision of this Agreement, the non-defaulting Party may terminate immediately and require the defaulting Party to indemnify it against all reasonable damages arising from that breach.",
      },
      {
        kind: "p",
        text: "[d] This Agreement may be terminated at any time by mutual written agreement.",
      },
      {
        kind: "p",
        text: "[e] Termination does not affect any booking already confirmed before the termination date. Those bookings will be completed and paid under the terms of this Agreement.",
      },
    ],
  },
  {
    number: 4,
    title: "Payment and Commission",
    blocks: [
      {
        kind: "p",
        text: "[a] The Representative will deduct a commission of 30% from the total fee for standard bookings obtained by the Representative for the Performer. The Performer receives the remaining 70%.",
      },
      {
        kind: "p",
        text: "[b] On larger-scale bookings the Representative may charge the client a separate booking fee. This fee is charged to the client in addition to the Performer’s fee and is not deducted from the Performer’s fee.",
      },
      {
        kind: "p",
        text: "[c] For specialty projects or unique services, an alternative project fee or commission rate may be agreed in writing by both Parties before the work begins.",
      },
      {
        kind: "p",
        text: "[d] The agreed fee for a booking is final unless both Parties agree a change in writing.",
      },
      {
        kind: "p",
        text: "[e] The Representative will pay the Performer within 30 days of the Performer’s correctly rendered invoice, or within 7 days of the Representative receiving cleared funds from the client, whichever is earlier. The same applies to any usage rollover payments.",
      },
      {
        kind: "p",
        text: "[f] The Representative is responsible for invoicing clients and for pursuing payment. Where a client fails to pay, the Representative will keep the Performer informed and will not withhold payment beyond the period in clause 4[e] without the Performer’s written agreement.",
      },
      {
        kind: "p",
        text: "[g] The Performer is responsible for their own income tax and similar contributions relating to payments under this Agreement, and will indemnify the Representative in respect of any such payments the Representative is required to make.",
      },
    ],
  },
  {
    number: 5,
    title: "Use of Image and Likeness",
    blocks: [
      {
        kind: "p",
        text: "The Performer grants the Representative permission to use their name, image and portfolio for promotional and casting purposes. This includes use on the Nice People website, Nice Paper, social media, and in materials shared with prospective clients. Any use beyond these purposes requires the Performer’s consent. This permission ends on termination of this Agreement, except that the Representative may retain materials in its internal records and in archived campaign work already published.",
      },
    ],
  },
  {
    number: 6,
    title: "Non-Exclusivity",
    blocks: [
      {
        kind: "p",
        text: "This Agreement is non-exclusive. Both during and after the Term, the Performer is free to work with other agencies, accept direct bookings and pursue any other opportunities, and the Representative is free to represent other performers. The only restriction is the one set out in clause 7.",
      },
    ],
  },
  {
    number: 7,
    title: "Non-Solicitation",
    blocks: [
      {
        kind: "p",
        text: "[a] For a period of 6 months following termination of this Agreement, the Performer agrees not to provide services to any client first introduced to the Performer by the Representative, unless those services are coordinated through the Representative. This applies whether the Performer approaches the client or the client approaches the Performer.",
      },
      {
        kind: "p",
        text: "[b] Bookings falling within clause 7[a] are administered by the Representative and attract the commission set out in clause 4[a].",
      },
      {
        kind: "p",
        text: "[c] For the avoidance of doubt, this clause does not apply to any client with whom the Performer had an existing relationship before the Representative’s introduction, or to any client the Performer sources independently of the Representative. Those clients are entirely the Performer’s own and no commission is payable on them.",
      },
      {
        kind: "p",
        text: "[d] This clause lapses entirely 6 months after termination.",
      },
    ],
  },
  {
    number: 8,
    title: "Confidentiality",
    blocks: [
      {
        kind: "p",
        text: "[a] Confidential Information means any data or information relating to the Representative, whether business or personal, that would reasonably be considered private or proprietary, is not generally known, and where disclosure could reasonably be expected to cause harm to the Representative. This includes client rate cards, contact details and unreleased campaign work.",
      },
      {
        kind: "p",
        text: "[b] The Performer agrees not to disclose or use any Confidential Information except as authorised by the Representative or as required by law.",
      },
      {
        kind: "p",
        text: "[c] This clause does not prevent the Performer from discussing their own fees, working conditions or treatment on a booking.",
      },
    ],
  },
  {
    number: 9,
    title: "Intellectual Property",
    blocks: [
      {
        kind: "p",
        text: "[a] Each Party retains ownership of all intellectual property it owned before this Agreement or creates independently of it.",
      },
      {
        kind: "p",
        text: "[b] The Performer retains full ownership of their existing portfolio, personal creative work, and anything they create outside bookings made under this Agreement, including music, art and personal projects. Nothing in this Agreement transfers ownership of that material.",
      },
      {
        kind: "p",
        text: "[c] Material created specifically for the Representative or for a client on a booking made under this Agreement – including campaign images, casting tapes and commissioned content – is owned or licensed as set out in the relevant client engagement. The Performer will not be asked to grant usage beyond what has been agreed and paid for on that booking.",
      },
      {
        kind: "p",
        text: "[d] The Representative’s right to use the Performer’s name, image and portfolio for promotion is limited to clause 5.",
      },
    ],
  },
  {
    number: 10,
    title: "Return of Property",
    blocks: [
      {
        kind: "p",
        text: "On expiry or termination of this Agreement, each Party will return to the other any property, documentation, records or Confidential Information belonging to that Party.",
      },
    ],
  },
  {
    number: 11,
    title: "Capacity / Independent Contractor",
    blocks: [
      {
        kind: "p",
        text: "In providing services under this Agreement, the Performer acts as an independent contractor and not as an employee. This Agreement does not create a partnership or joint venture between the Parties.",
      },
    ],
  },
  {
    number: 12,
    title: "Autonomy",
    blocks: [
      {
        kind: "p",
        text: "Except as otherwise provided in this Agreement, the Performer has full control over their working time, methods and decision-making. The Performer will be responsive to the reasonable needs of the Representative, and is under no obligation to accept any particular booking.",
      },
    ],
  },
  {
    number: 13,
    title: "Notice",
    blocks: [
      {
        kind: "p",
        text: "All notices required under this Agreement will be given in writing and delivered to the Parties at the addresses below.",
      },
      {
        kind: "p",
        text: `${AGENCY_NAME}: ${AGENCY_ADDRESS}`,
      },
      {
        kind: "p",
        text: "Performer: [Performer address / email]",
      },
    ],
  },
  {
    number: 14,
    title: "Indemnification",
    blocks: [
      {
        kind: "p",
        text: "Each Party agrees to indemnify and hold harmless the other against any claims, losses, damages, liabilities, expenses, reasonable legal fees and costs that result from or arise out of any act or omission of the indemnifying Party. This indemnification survives termination of this Agreement.",
      },
    ],
  },
  {
    number: 15,
    title: "Professional Conduct",
    blocks: [
      {
        kind: "p",
        text: "As an ambassador of Nice People, we expect our talent to embody our core value of kindness in every professional interaction. This includes:",
      },
      {
        kind: "list",
        items: [
          "Arriving 15 minutes early to all bookings, castings and meetings",
          "Treating all cast, crew and clients with genuine respect and consideration",
          "Maintaining a positive, collaborative attitude on set",
          "Contributing to a welcoming and inclusive environment on every job",
        ],
      },
    ],
  },
  {
    number: 16,
    title: "Talent Safety and Consent",
    blocks: [
      {
        kind: "p",
        text: "At Nice People we enforce a strict zero-tolerance policy regarding our talent’s safety, comfort and wellbeing. Every client who works with our talent signs an agreement acknowledging that they will respect our talent’s boundaries without question, and that any breach of this will result in immediate shoot termination at their expense.",
      },
      {
        kind: "p",
        text: "If at any point during a shoot you feel even slightly uncomfortable, or if you are asked to do anything beyond what was originally agreed (no matter how minor the change may seem), you have the absolute right to stop the shoot immediately. You never need to explain or justify your discomfort. Simply call us – we are here for you 24/7, and we will handle all client communication about the situation.",
      },
      {
        kind: "p",
        text: "While we expect our talent to maintain the highest standards of professionalism, your safety and comfort take precedence over all other considerations. This policy is non-negotiable: you will never be penalised for speaking up or stopping a shoot due to discomfort or safety concerns. Your instincts are valid, your boundaries are valid, and we will always have your back.",
      },
    ],
  },
  {
    number: 17,
    title: "Entire Agreement and Governing Law",
    blocks: [
      {
        kind: "p",
        text: "[a] This Agreement is the entire agreement between the Parties and supersedes any prior agreement or understanding on the same subject matter.",
      },
      {
        kind: "p",
        text: "[b] Any variation to this Agreement must be agreed in writing by both Parties.",
      },
      {
        kind: "p",
        text: "[c] This Agreement is governed by the laws of Victoria, Australia.",
      },
    ],
  },
];

export const AGREEMENT_CLAUSE_COUNT = AGREEMENT_CLAUSES.length;
