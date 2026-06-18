import type { SidebarItem } from "@/components/sidebar";

export type ScopeRole =
  | "superadmin"
  | "mitra_admin"
  | "narasumber"
  | "peserta"
  | "desa_wisata";

export type ScopeConfig = {
  label: string;
  roleLabel: string;
  items: SidebarItem[];
};

export const SCOPE_NAV: Record<ScopeRole, ScopeConfig> = {
  superadmin: {
    label: "Atourin",
    roleLabel: "Superadmin Atourin",
    items: [
      { href: "/atourin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/atourin/projects", label: "Projects", icon: "Folder" },
      { href: "/atourin/desa", label: "Desa", icon: "MapPin" },
      { href: "/atourin/klasifikasi", label: "Klasifikasi", icon: "Award" },
      { href: "/atourin/insights", label: "AI Insights", icon: "Sparkles" },
      { href: "/atourin/templates", label: "Templates", icon: "LayoutTemplate" },
      { href: "/atourin/users", label: "Users", icon: "Users" },
      { href: "/atourin/orgs", label: "Organisasi", icon: "Building2" },
      { href: "/atourin/narasumber", label: "Narasumber", icon: "GraduationCap" },
      { href: "/atourin/audit", label: "Audit Log", icon: "ShieldCheck" },
    ],
  },
  mitra_admin: {
    label: "Mitra",
    roleLabel: "Mitra Admin",
    items: [
      { href: "/mitra/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/mitra/projects", label: "Project Saya", icon: "Folder" },
      { href: "/mitra/desa", label: "Desa", icon: "MapPin" },
      { href: "/mitra/peserta", label: "Peserta", icon: "Users" },
      { href: "/mitra/narasumber", label: "Narasumber", icon: "GraduationCap" },
      { href: "/mitra/laporan", label: "Laporan", icon: "BarChart3" },
    ],
  },
  narasumber: {
    label: "Narasumber",
    roleLabel: "Narasumber",
    items: [
      { href: "/narasumber/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/narasumber/sesi", label: "Sesi Pendampingan", icon: "CalendarDays" },
      { href: "/narasumber/projects", label: "Project Saya", icon: "Folder" },
      { href: "/narasumber/rencana-aksi", label: "Rencana Aksi", icon: "ListChecks" },
    ],
  },
  peserta: {
    label: "Peserta",
    roleLabel: "Peserta",
    items: [],
  },
  desa_wisata: {
    label: "Desa Wisata",
    roleLabel: "Pengelola Desa Wisata",
    items: [
      { href: "/desa/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/desa/self-assessment", label: "Self-Assessment", icon: "ClipboardCheck" },
      { href: "/desa/rencana-aksi", label: "Rencana Aksi", icon: "ListChecks" },
      { href: "/desa/riwayat", label: "Riwayat Program", icon: "History" },
      { href: "/desa/profil", label: "Profil Desa", icon: "MapPin" },
      { href: "/desa/pengelola", label: "Profil Pengelola", icon: "Building2" },
    ],
  },
};
