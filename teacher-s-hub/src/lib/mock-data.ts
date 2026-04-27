// Realistic mock data for the teacher SaaS

export type Student = {
  id: string;
  name: string;
  group: string;
  avgGrade: number;
  attendance: number; // %
  risk: "low" | "medium" | "high";
};

export type Group = {
  id: string;
  name: string;
  subject: string;
  students: number;
  level: string;
  nextLesson: string;
};

export type Lesson = {
  id: string;
  time: string; // "09:00"
  end: string; // "09:45"
  group: string;
  subject: string;
  room: string;
  status: "done" | "now" | "next" | "upcoming";
};

export const todayLessons: Lesson[] = [
  { id: "1", time: "08:30", end: "09:15", group: "10-A", subject: "Algebra II", room: "204", status: "done" },
  { id: "2", time: "09:25", end: "10:10", group: "10-B", subject: "Algebra II", room: "204", status: "done" },
  { id: "3", time: "10:20", end: "11:05", group: "11-A", subject: "Calculus", room: "208", status: "now" },
  { id: "4", time: "11:15", end: "12:00", group: "9-C", subject: "Geometry", room: "204", status: "next" },
  { id: "5", time: "13:00", end: "13:45", group: "11-B", subject: "Calculus", room: "208", status: "upcoming" },
  { id: "6", time: "13:55", end: "14:40", group: "10-A", subject: "Algebra II", room: "204", status: "upcoming" },
];

export const groups: Group[] = [
  { id: "g1", name: "10-A", subject: "Algebra II", students: 28, level: "Grade 10", nextLesson: "Today, 13:55" },
  { id: "g2", name: "10-B", subject: "Algebra II", students: 26, level: "Grade 10", nextLesson: "Tomorrow, 09:25" },
  { id: "g3", name: "11-A", subject: "Calculus", students: 24, level: "Grade 11", nextLesson: "Today, 10:20" },
  { id: "g4", name: "11-B", subject: "Calculus", students: 22, level: "Grade 11", nextLesson: "Today, 13:00" },
  { id: "g5", name: "9-C", subject: "Geometry", students: 30, level: "Grade 9", nextLesson: "Today, 11:15" },
  { id: "g6", name: "9-A", subject: "Geometry", students: 29, level: "Grade 9", nextLesson: "Wed, 10:20" },
];

const firstNames = ["Aiyana", "Marcus", "Sofia", "Liam", "Noor", "Diego", "Hana", "Kenji", "Amara", "Yusuf", "Elena", "Ravi", "Mei", "Jonas", "Priya", "Omar", "Lucia", "Theo", "Zara", "Ivan", "Layla", "Nico", "Ada", "Jin", "Maya", "Felix", "Nora", "Rafael"];
const lastNames = ["Walker", "Chen", "Garcia", "Patel", "Sato", "Rossi", "Khan", "Müller", "Silva", "Park", "Volkov", "Okafor", "Ahmed", "Lopez", "Tanaka", "Nguyen", "Singh", "Kim", "Brown", "Schmidt"];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateStudents(group: string, count: number, seed = 1): Student[] {
  const r = rng(seed + group.charCodeAt(0));
  return Array.from({ length: count }).map((_, i) => {
    const att = Math.round(70 + r() * 30);
    const grade = Math.round((65 + r() * 35) * 10) / 10;
    const risk: Student["risk"] = att < 80 || grade < 70 ? "high" : att < 90 ? "medium" : "low";
    return {
      id: `${group}-${i}`,
      name: `${firstNames[Math.floor(r() * firstNames.length)]} ${lastNames[Math.floor(r() * lastNames.length)]}`,
      group,
      avgGrade: grade,
      attendance: att,
      risk,
    };
  });
}

export const allStudents: Student[] = groups.flatMap((g, i) => generateStudents(g.name, g.students, i + 3));

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const timeSlots = ["08:30", "09:25", "10:20", "11:15", "12:10", "13:00", "13:55", "14:50"];

export type SchedSlot = { day: string; time: string; group?: string; subject?: string; room?: string };
export const schedule: SchedSlot[] = [
  { day: "Mon", time: "08:30", group: "10-A", subject: "Algebra II", room: "204" },
  { day: "Mon", time: "09:25", group: "10-B", subject: "Algebra II", room: "204" },
  { day: "Mon", time: "10:20", group: "11-A", subject: "Calculus", room: "208" },
  { day: "Mon", time: "11:15", group: "9-C", subject: "Geometry", room: "204" },
  { day: "Mon", time: "13:00", group: "11-B", subject: "Calculus", room: "208" },
  { day: "Tue", time: "09:25", group: "9-A", subject: "Geometry", room: "204" },
  { day: "Tue", time: "10:20", group: "11-A", subject: "Calculus", room: "208" },
  { day: "Tue", time: "13:55", group: "10-A", subject: "Algebra II", room: "204" },
  { day: "Wed", time: "08:30", group: "10-B", subject: "Algebra II", room: "204" },
  { day: "Wed", time: "10:20", group: "9-A", subject: "Geometry", room: "204" },
  { day: "Wed", time: "11:15", group: "11-B", subject: "Calculus", room: "208" },
  { day: "Thu", time: "09:25", group: "10-A", subject: "Algebra II", room: "204" },
  { day: "Thu", time: "10:20", group: "11-A", subject: "Calculus", room: "208" },
  { day: "Thu", time: "13:00", group: "9-C", subject: "Geometry", room: "204" },
  { day: "Fri", time: "08:30", group: "11-B", subject: "Calculus", room: "208" },
  { day: "Fri", time: "10:20", group: "10-B", subject: "Algebra II", room: "204" },
  { day: "Fri", time: "13:55", group: "9-A", subject: "Geometry", room: "204" },
];

// Trend data
export const attendanceTrend = [
  { week: "W1", value: 94 },
  { week: "W2", value: 92 },
  { week: "W3", value: 95 },
  { week: "W4", value: 91 },
  { week: "W5", value: 93 },
  { week: "W6", value: 96 },
  { week: "W7", value: 94 },
  { week: "W8", value: 92 },
];

export const gradeDistribution = [
  { band: "90–100", count: 38 },
  { band: "80–89", count: 52 },
  { band: "70–79", count: 41 },
  { band: "60–69", count: 18 },
  { band: "<60", count: 9 },
];

// ============ Face recognition mock ============

export type ScanState =
  | "idle"
  | "permission"
  | "ready"
  | "scanning"
  | "matched"
  | "uncertain"
  | "unknown"
  | "timeout"
  | "unavailable";

export type ScanEvent = {
  id: string;
  studentId: string;
  studentName: string;
  group: string;
  confidence: number; // 0–100
  status: "matched" | "uncertain" | "unknown";
  time: string; // "10:21:14"
};

// Pre-built recent scan log used for the live face-scan screen
export const recentScans: ScanEvent[] = [
  { id: "s1", studentId: "11-A-3", studentName: "Sofia Garcia", group: "11-A", confidence: 98, status: "matched", time: "10:20:42" },
  { id: "s2", studentId: "11-A-7", studentName: "Marcus Chen", group: "11-A", confidence: 96, status: "matched", time: "10:20:51" },
  { id: "s3", studentId: "11-A-1", studentName: "Aiyana Walker", group: "11-A", confidence: 94, status: "matched", time: "10:21:03" },
  { id: "s4", studentId: "11-A-9", studentName: "Liam Patel", group: "11-A", confidence: 72, status: "uncertain", time: "10:21:11" },
  { id: "s5", studentId: "11-A-5", studentName: "Noor Khan", group: "11-A", confidence: 99, status: "matched", time: "10:21:18" },
  { id: "s6", studentId: "unknown", studentName: "Unknown person", group: "—", confidence: 0, status: "unknown", time: "10:21:24" },
  { id: "s7", studentId: "11-A-12", studentName: "Diego Rossi", group: "11-A", confidence: 95, status: "matched", time: "10:21:30" },
];
