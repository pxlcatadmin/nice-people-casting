export interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
}

export interface Submission {
  id: string;
  job_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  instagram: string;
  date_of_birth: string;
  gender: string;
  // Measurements
  height_cm: number | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  shoe_size: string;
  hair_color: string;
  eye_color: string;
  // Experience
  experience_level: "none" | "some" | "experienced" | "professional";
  experience_notes: string;
  // Photos
  digis: string[];
  portfolio: string[];
  photos: string[]; // combined digis + portfolio
  // Admin
  status: "new" | "shortlisted" | "rejected" | "booked";
  admin_notes: string;
  created_at: string;
}

export interface ShareLink {
  id: string;
  job_id: string;
  token: string;
  client_name: string;
  is_active: boolean;
  allow_selections: boolean;
  created_at: string;
  expires_at: string | null;
  selection_count?: number;
}

export interface ClientSelection {
  id: string;
  share_link_id: string;
  submission_id: string;
  selected: boolean;
  note: string;
  created_at: string;
}

export interface PublicSubmission {
  id: string;
  first_name: string;
  last_name: string;
  instagram: string;
  gender: string;
  height_cm: number | null;
  hair_color: string;
  eye_color: string;
  experience_level: string;
  experience_notes: string;
  photos: string[];
  self_tape_url: string;
  selected?: boolean;
  selection_note?: string;
}
