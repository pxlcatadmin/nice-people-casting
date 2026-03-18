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
