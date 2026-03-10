import { useState, useEffect } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  Lightbulb,
  Megaphone,
  Hash,
  Building2,
  TrendingUp,
  FolderKanban,
  BarChart3,
  CheckSquare,
  Settings,
  Users,
  Flame,
  MessageCircle,
  ThumbsUp,
  Eye,
  Star,
  ArrowUpDown,
  SlidersHorizontal,
  Download,
  Share2,
  Pencil,
  Trash2,
  Archive,
  Filter,
  X,
  Menu,
  Home,
  Cpu,
  Handshake,
  ClipboardCheck,
  Calendar,
  Clock,
  Target,
  Zap,
  ChevronLeft,
  MoreHorizontal,
  Paperclip,
  Send,
  Award,
  PieChart,
  Activity,
  Globe,
  Mail,
  Layout,
  Layers,
  GitBranch,
  Play,
  Pause,
  SkipForward,
  Check,
  AlertCircle,
  Info,
  ExternalLink,
  Copy,
  Bookmark,
  Flag,
  UserPlus,
  LogOut,
  Moon,
  Sun,
  Radio,
  FileText,
  Image,
  Link2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heart,
  BarChart2,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  CircleDot,
  Square,
  CircleCheck,
} from "lucide-react";

const fonts = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400,300&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
`;

// ============ DATA ============
const campaignsData = [
  {
    id: 1,
    title: "Q4 Sustainability Challenge",
    teaser:
      "How can we reduce our carbon footprint by 30% in the next 2 years?",
    status: "SUBMISSION",
    sponsor: "Sarah Chen",
    ideas: 47,
    comments: 189,
    views: 1240,
    participation: 72,
    daysLeft: 12,
    sia: "Green Innovation",
    banner: "linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)",
  },
  {
    id: 2,
    title: "AI-Powered Customer Experience",
    teaser:
      "Share your ideas for leveraging AI to transform how we serve customers.",
    status: "EVALUATION",
    sponsor: "Marcus Rodriguez",
    ideas: 83,
    comments: 412,
    views: 2890,
    participation: 88,
    daysLeft: 0,
    sia: "Digital Transformation",
    banner: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #3b82f6 100%)",
  },
  {
    id: 3,
    title: "Future of Remote Work",
    teaser: "What tools, processes, or policies would make hybrid work better?",
    status: "DISCUSSION_VOTING",
    sponsor: "Elena Kowalski",
    ideas: 31,
    comments: 156,
    views: 890,
    participation: 54,
    daysLeft: 5,
    sia: "Workplace Innovation",
    banner: "linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb923c 100%)",
  },
  {
    id: 4,
    title: "Supply Chain Resilience 2025",
    teaser: "Ideas to build a more resilient and adaptive supply chain.",
    status: "SEEDING",
    sponsor: "James Liu",
    ideas: 8,
    comments: 23,
    views: 145,
    participation: 15,
    daysLeft: 21,
    sia: "Operations Excellence",
    banner: "linear-gradient(135deg, #0f766e 0%, #0e7490 50%, #1d4ed8 100%)",
  },
  {
    id: 5,
    title: "New Revenue Streams",
    teaser: "What new products or services should we explore?",
    status: "CLOSED",
    sponsor: "Anna Petrov",
    ideas: 112,
    comments: 678,
    views: 4200,
    participation: 91,
    daysLeft: 0,
    sia: "Growth Strategy",
    banner: "linear-gradient(135deg, #9333ea 0%, #c026d3 50%, #e11d48 100%)",
  },
];

const ideasData = [
  {
    id: 1,
    title: "AI-Driven Energy Optimizer",
    author: "David Park",
    status: "HOT",
    campaign: "Q4 Sustainability Challenge",
    votes: 4.6,
    comments: 23,
    likes: 45,
    views: 312,
    isHot: true,
    desc: "Use machine learning to optimize energy consumption across all office buildings in real-time, predicting usage patterns and automatically adjusting HVAC and lighting systems.",
  },
  {
    id: 2,
    title: "Green Commute Incentive Program",
    author: "Lisa Wang",
    status: "COMMUNITY_DISCUSSION",
    campaign: "Q4 Sustainability Challenge",
    votes: 4.2,
    comments: 18,
    likes: 32,
    views: 245,
    isHot: false,
    desc: "Reward employees who use public transport, bike, or carpool with extra PTO days and wellness credits.",
  },
  {
    id: 3,
    title: "Chatbot with Emotional Intelligence",
    author: "Omar Hassan",
    status: "EVALUATION",
    campaign: "AI-Powered Customer Experience",
    votes: 4.8,
    comments: 34,
    likes: 67,
    views: 489,
    isHot: true,
    desc: "Deploy sentiment-aware chatbots that detect customer frustration and seamlessly escalate to human agents with full context.",
  },
  {
    id: 4,
    title: "Predictive Maintenance Dashboard",
    author: "Yuki Tanaka",
    status: "SELECTED_IMPLEMENTATION",
    campaign: "AI-Powered Customer Experience",
    votes: 4.5,
    comments: 29,
    likes: 51,
    views: 378,
    isHot: false,
    desc: "Real-time dashboard predicting equipment failures before they happen, reducing downtime by 40%.",
  },
  {
    id: 5,
    title: "Async-First Meeting Policy",
    author: "Rachel Green",
    status: "HOT",
    campaign: "Future of Remote Work",
    votes: 4.7,
    comments: 41,
    likes: 89,
    views: 567,
    isHot: true,
    desc: "Replace 50% of recurring meetings with async video updates using Loom, freeing up 8+ hours per employee per week.",
  },
  {
    id: 6,
    title: "Virtual Innovation Lab",
    author: "Carlos Mendez",
    status: "COMMUNITY_DISCUSSION",
    campaign: "Future of Remote Work",
    votes: 3.9,
    comments: 15,
    likes: 28,
    views: 198,
    isHot: false,
    desc: "Create a persistent virtual space where cross-functional teams can prototype and test ideas in real-time.",
  },
];

const orgsData = [
  {
    id: 1,
    name: "NeuralFlow AI",
    industry: "Artificial Intelligence",
    status: "PILOT",
    location: "San Francisco, CA",
    funding: "$42M Series B",
    useCases: 3,
    logo: "🤖",
  },
  {
    id: 2,
    name: "GreenTech Solutions",
    industry: "CleanTech",
    status: "QUALIFICATION",
    location: "Berlin, Germany",
    funding: "$18M Series A",
    useCases: 2,
    logo: "🌱",
  },
  {
    id: 3,
    name: "DataBridge Analytics",
    industry: "Data Analytics",
    status: "PARTNERSHIP",
    location: "London, UK",
    funding: "$95M Series C",
    useCases: 5,
    logo: "📊",
  },
  {
    id: 4,
    name: "QuantumLeap Computing",
    industry: "Quantum Tech",
    status: "IDENTIFIED",
    location: "Toronto, CA",
    funding: "$8M Seed",
    useCases: 1,
    logo: "⚛️",
  },
  {
    id: 5,
    name: "CircularWave",
    industry: "Circular Economy",
    status: "EVALUATION",
    location: "Amsterdam, NL",
    funding: "$25M Series A",
    useCases: 2,
    logo: "♻️",
  },
];

const trendsData = [
  {
    id: 1,
    title: "Generative AI in Enterprise",
    type: "MACRO",
    relevance: 95,
    insights: 12,
  },
  {
    id: 2,
    title: "Sustainable Supply Chains",
    type: "MEGA",
    relevance: 88,
    insights: 8,
  },
  {
    id: 3,
    title: "Edge Computing Adoption",
    type: "MICRO",
    relevance: 72,
    insights: 5,
  },
  {
    id: 4,
    title: "Hyper-Personalization",
    type: "MACRO",
    relevance: 81,
    insights: 9,
  },
  { id: 5, title: "Digital Twins", type: "MICRO", relevance: 67, insights: 4 },
];

const statusColors = {
  DRAFT: { bg: "#f3f4f6", text: "#4b5563" },
  SEEDING: { bg: "#f3e8ff", text: "#7c3aed" },
  SUBMISSION: { bg: "#dbeafe", text: "#2563eb" },
  DISCUSSION_VOTING: { bg: "#cffafe", text: "#0891b2" },
  EVALUATION: { bg: "#fef3c7", text: "#d97706" },
  HOT: {
    bg: "linear-gradient(135deg, #f97316, #ef4444, #ec4899)",
    text: "#ffffff",
  },
  COMMUNITY_DISCUSSION: { bg: "#dbeafe", text: "#2563eb" },
  SELECTED_IMPLEMENTATION: { bg: "#d1fae5", text: "#059669" },
  IMPLEMENTED: { bg: "#059669", text: "#ffffff" },
  CLOSED: { bg: "#9ca3af", text: "#ffffff" },
  IDENTIFIED: { bg: "#f1f5f9", text: "#475569" },
  QUALIFICATION: { bg: "#dbeafe", text: "#2563eb" },
  PILOT: { bg: "#fef3c7", text: "#d97706" },
  PARTNERSHIP: { bg: "#d1fae5", text: "#059669" },
  MEGA: { bg: "#fce7f3", text: "#be185d" },
  MACRO: { bg: "#e0e7ff", text: "#4338ca" },
  MICRO: { bg: "#f0fdf4", text: "#15803d" },
};

const statusLabel = (s) =>
  s
    .replace(/_/g, " ")
    .replace("DISCUSSION VOTING", "Discussion & Voting")
    .replace("COMMUNITY DISCUSSION", "Discussion")
    .replace("SELECTED IMPLEMENTATION", "Selected");

// ============ COMPONENTS ============

const Badge = ({ status, size = "sm" }) => {
  const c = statusColors[status] || statusColors.DRAFT;
  const isGradient = c.bg?.includes("gradient");
  const isHot = status === "HOT";
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        fontSize: size === "xs" ? 10 : 11,
        fontWeight: 600,
        padding: size === "xs" ? "2px 6px" : "3px 10px",
        borderRadius: 99,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...(isGradient ? { backgroundImage: c.bg, background: undefined } : {}),
      }}
    >
      {isHot && <Flame size={11} />}
      {statusLabel(status)}
    </span>
  );
};

const Avatar = ({ name, size = 32, color }) => {
  const colors = [
    "#6366f1",
    "#f59e0b",
    "#10b981",
    "#f43f5e",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
  ];
  const idx =
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color || colors[idx],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.38,
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {initials}
    </div>
  );
};

const StatPill = ({ icon: Icon, value, label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      color: "#6b7280",
      fontSize: 12,
    }}
  >
    <Icon size={13} strokeWidth={1.8} />
    <span style={{ fontWeight: 500 }}>{value}</span>
    {label && <span style={{ color: "#9ca3af" }}>{label}</span>}
  </div>
);

const ProgressBar = ({ value, color = "#6366f1", height = 4 }) => (
  <div
    style={{
      width: "100%",
      height,
      background: "#e5e7eb",
      borderRadius: 99,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${Math.min(value, 100)}%`,
        height: "100%",
        background: color,
        borderRadius: 99,
        transition: "width 0.6s ease",
      }}
    />
  </div>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div
    style={{
      display: "flex",
      gap: 0,
      borderBottom: "1px solid #e5e7eb",
      marginBottom: 20,
    }}
  >
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        style={{
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: active === t.id ? 600 : 400,
          color: active === t.id ? "#4f46e5" : "#6b7280",
          borderBottom:
            active === t.id ? "2px solid #4f46e5" : "2px solid transparent",
          background: "none",
          border: "none",
          borderBottomWidth: 2,
          borderBottomStyle: "solid",
          borderBottomColor: active === t.id ? "#4f46e5" : "transparent",
          cursor: "pointer",
          transition: "all 0.15s",
          fontFamily: "inherit",
        }}
      >
        {t.label}
        {t.count !== undefined && (
          <span
            style={{
              marginLeft: 6,
              background: active === t.id ? "#eef2ff" : "#f3f4f6",
              color: active === t.id ? "#4f46e5" : "#9ca3af",
              padding: "1px 7px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {t.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

const Card = ({ children, style, hover = true, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.15s",
      ...style,
    }}
    onMouseEnter={(e) => {
      if (hover) {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#d1d5db";
      }
    }}
    onMouseLeave={(e) => {
      if (hover) {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#e5e7eb";
      }
    }}
  >
    {children}
  </div>
);

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  onClick,
  style,
}) => {
  const styles = {
    primary: { background: "#4f46e5", color: "#fff", border: "none" },
    secondary: {
      background: "#fff",
      color: "#374151",
      border: "1px solid #d1d5db",
    },
    ghost: { background: "transparent", color: "#6b7280", border: "none" },
    danger: { background: "#f43f5e", color: "#fff", border: "none" },
    accent: { background: "#f59e0b", color: "#fff", border: "none" },
  };
  const sizes = {
    sm: { padding: "5px 12px", fontSize: 12 },
    md: { padding: "8px 16px", fontSize: 13 },
    lg: { padding: "10px 20px", fontSize: 14 },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        ...sizes[size],
        fontWeight: 500,
        borderRadius: 7,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "inherit",
        transition: "all 0.15s",
        ...style,
      }}
    >
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
};

const SearchInput = ({ placeholder = "Search...", width = "100%" }) => (
  <div style={{ position: "relative", width }}>
    <Search
      size={15}
      style={{
        position: "absolute",
        left: 10,
        top: "50%",
        transform: "translateY(-50%)",
        color: "#9ca3af",
      }}
    />
    <input
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "8px 12px 8px 34px",
        border: "1px solid #e5e7eb",
        borderRadius: 7,
        fontSize: 13,
        outline: "none",
        fontFamily: "inherit",
        background: "#f9fafb",
        color: "#111827",
      }}
    />
  </div>
);

const KpiCard = ({ label, value, change, icon: Icon, color = "#4f46e5" }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      padding: "16px 20px",
      flex: 1,
      minWidth: 140,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
        {label}
      </span>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: color + "12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={color} />
      </div>
    </div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 700,
        color: "#111827",
        fontFamily: "'Satoshi', sans-serif",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    {change && (
      <div
        style={{
          fontSize: 11,
          color: change > 0 ? "#059669" : "#ef4444",
          fontWeight: 500,
          marginTop: 4,
        }}
      >
        {change > 0 ? "↑" : "↓"} {Math.abs(change)}% from last period
      </div>
    )}
  </div>
);

// ============ PAGE COMPONENTS ============

const DashboardPage = ({ setPage, setDetail }) => (
  <div style={{ animation: "fadeIn 0.3s ease" }}>
    <div style={{ marginBottom: 28 }}>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 4,
          fontFamily: "'Satoshi', sans-serif",
        }}
      >
        Welcome back, Sarath
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14 }}>
        Your innovation pulse —{" "}
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
    <div
      style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}
    >
      <KpiCard
        label="Active Campaigns"
        value="4"
        change={12}
        icon={Megaphone}
        color="#4f46e5"
      />
      <KpiCard
        label="Ideas Submitted"
        value="47"
        change={23}
        icon={Lightbulb}
        color="#f59e0b"
      />
      <KpiCard
        label="Pending Evaluations"
        value="3"
        icon={ClipboardCheck}
        color="#f43f5e"
      />
      <KpiCard
        label="Active Projects"
        value="7"
        change={-5}
        icon={FolderKanban}
        color="#10b981"
      />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
            Active Campaigns
          </h2>
          <button
            onClick={() => setPage("campaigns")}
            style={{
              fontSize: 12,
              color: "#4f46e5",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            View all →
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {campaignsData
            .filter((c) => c.status !== "CLOSED")
            .slice(0, 3)
            .map((c) => (
              <Card
                key={c.id}
                style={{ minWidth: 260, flex: "0 0 260px" }}
                onClick={() => {
                  setDetail({ type: "campaign", data: c });
                  setPage("campaignDetail");
                }}
              >
                <div
                  style={{
                    height: 80,
                    background: c.banner,
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 12,
                  }}
                >
                  <Badge status={c.status} />
                </div>
                <div style={{ padding: "12px 14px 14px" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#111827",
                      marginBottom: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {c.title}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}
                  >
                    👤 {c.sponsor}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <StatPill icon={Lightbulb} value={c.ideas} />
                    <StatPill icon={MessageCircle} value={c.comments} />
                    <StatPill icon={Eye} value={c.views} />
                  </div>
                  <ProgressBar value={c.participation} color="#4f46e5" />
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                    {c.participation}% participation
                    {c.daysLeft > 0 ? ` · ${c.daysLeft} days left` : ""}
                  </div>
                </div>
              </Card>
            ))}
        </div>
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
            Recent Activity
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            {
              actor: "David Park",
              action: "submitted a new idea",
              target: "AI-Driven Energy Optimizer",
              time: "2h ago",
              icon: Lightbulb,
              color: "#f59e0b",
            },
            {
              actor: "Lisa Wang",
              action: "commented on",
              target: "Green Commute Incentive Program",
              time: "3h ago",
              icon: MessageCircle,
              color: "#6366f1",
            },
            {
              actor: "Omar Hassan",
              action: "'s idea reached HOT! status",
              target: "Chatbot with Emotional Intelligence",
              time: "5h ago",
              icon: Flame,
              color: "#ef4444",
            },
            {
              actor: "Rachel Green",
              action: "completed evaluation in",
              target: "AI-Powered Customer Experience",
              time: "6h ago",
              icon: ClipboardCheck,
              color: "#10b981",
            },
            {
              actor: "Carlos Mendez",
              action: "created a use case for",
              target: "NeuralFlow AI",
              time: "1d ago",
              icon: Handshake,
              color: "#8b5cf6",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid #f3f4f6",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: item.color + "14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <item.icon size={15} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 13, color: "#374151", lineHeight: 1.4 }}
                >
                  <span style={{ fontWeight: 600 }}>{item.actor}</span>{" "}
                  {item.action}{" "}
                  <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                    {item.target}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {item.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Card hover={false} style={{ marginBottom: 16 }}>
          <div style={{ padding: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckSquare size={15} /> My Tasks
            </h3>
            {[
              {
                label: "Evaluate 3 ideas",
                sub: "AI-Powered Customer Experience",
                urgent: true,
              },
              {
                label: "Review shortlist",
                sub: "New Revenue Streams",
                urgent: false,
              },
              {
                label: "Complete Phase 2 tasks",
                sub: "CX Transformation Project",
                urgent: true,
              },
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < 2 ? "1px solid #f3f4f6" : "none",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: t.urgent ? "#f43f5e" : "#d1d5db",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}
                  >
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card hover={false} style={{ marginBottom: 16 }}>
          <div style={{ padding: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Flame size={15} color="#ef4444" /> Trending Ideas
            </h3>
            {ideasData
              .filter((i) => i.isHot)
              .map((idea, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < 1 ? "1px solid #f3f4f6" : "none",
                  }}
                  onClick={() => {
                    setDetail({ type: "idea", data: idea });
                    setPage("ideaDetail");
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#111827",
                      cursor: "pointer",
                    }}
                  >
                    {idea.title}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <StatPill icon={Star} value={idea.votes} />
                    <StatPill icon={Heart} value={idea.likes} />
                  </div>
                </div>
              ))}
          </div>
        </Card>
        <Card hover={false}>
          <div style={{ padding: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 14,
              }}
            >
              Quick Actions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn
                variant="primary"
                icon={Lightbulb}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Submit New Idea
              </Btn>
              <Btn
                variant="secondary"
                icon={Megaphone}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Create Campaign
              </Btn>
              <Btn
                variant="secondary"
                icon={Building2}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Browse Partners
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
);

const CampaignsPage = ({ setPage, setDetail }) => {
  const [filter, setFilter] = useState("ALL");
  const [view, setView] = useState("grid");
  const filtered =
    filter === "ALL"
      ? campaignsData
      : campaignsData.filter((c) => c.status === filter);
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#111827",
            fontFamily: "'Satoshi', sans-serif",
          }}
        >
          Campaigns
        </h1>
        <Btn variant="primary" icon={Plus}>
          New Campaign
        </Btn>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {[
          "ALL",
          "SUBMISSION",
          "SEEDING",
          "EVALUATION",
          "DISCUSSION_VOTING",
          "CLOSED",
        ].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "5px 14px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 500,
              border: filter === s ? "none" : "1px solid #e5e7eb",
              background: filter === s ? "#111827" : "#fff",
              color: filter === s ? "#fff" : "#6b7280",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {s === "ALL" ? "All" : statusLabel(s)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <SearchInput placeholder="Search campaigns..." width={220} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((c) => (
          <Card
            key={c.id}
            onClick={() => {
              setDetail({ type: "campaign", data: c });
              setPage("campaignDetail");
            }}
          >
            <div
              style={{
                height: 100,
                background: c.banner,
                display: "flex",
                alignItems: "flex-end",
                padding: "12px 14px",
                position: "relative",
              }}
            >
              <Badge status={c.status} />
              {c.daysLeft > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 99,
                  }}
                >
                  {c.daysLeft}d left
                </span>
              )}
            </div>
            <div style={{ padding: "14px 16px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                {c.sia}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}
              >
                {c.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  lineHeight: 1.5,
                  marginBottom: 12,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {c.teaser}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Avatar name={c.sponsor} size={22} />
                <span
                  style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}
                >
                  {c.sponsor}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                <StatPill icon={Lightbulb} value={c.ideas} label="ideas" />
                <StatPill icon={MessageCircle} value={c.comments} />
                <StatPill icon={Eye} value={c.views} />
              </div>
              <ProgressBar value={c.participation} />
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                {c.participation}% participation
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const CampaignDetailPage = ({ detail, setPage, setDetail }) => {
  const c = detail?.data || campaignsData[0];
  const [tab, setTab] = useState("overview");
  const campaignIdeas = ideasData.filter((i) => i.campaign === c.title);
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            height: 180,
            background: c.banner,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "20px 24px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Badge status={c.status} />
              {c.sia && (
                <span
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 10px",
                    borderRadius: 99,
                  }}
                >
                  {c.sia}
                </span>
              )}
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 6,
                fontFamily: "'Satoshi', sans-serif",
              }}
            >
              {c.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={c.sponsor} size={24} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                Sponsored by <strong>{c.sponsor}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "14px 0",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          <StatPill icon={Lightbulb} value={c.ideas} label="ideas" />
          <StatPill icon={MessageCircle} value={c.comments} label="comments" />
          <StatPill icon={Eye} value={c.views} label="views" />
          {c.daysLeft > 0 && (
            <StatPill icon={Clock} value={c.daysLeft} label="days left" />
          )}
        </div>
        <Btn variant="primary" icon={Lightbulb}>
          Submit Idea
        </Btn>
        <Btn variant="secondary" icon={Bookmark}>
          Follow
        </Btn>
      </div>
      <TabBar
        tabs={[
          { id: "overview", label: "Overview" },
          {
            id: "ideas",
            label: "Ideas",
            count: campaignIdeas.length || c.ideas,
          },
          { id: "inspired", label: "Be Inspired" },
          { id: "community", label: "Community" },
          { id: "cockpit", label: "Cockpit" },
          { id: "board", label: "Idea Board" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && (
        <div style={{ maxWidth: 720 }}>
          <p
            style={{
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.7,
              marginBottom: 16,
            }}
          >
            {c.teaser}
          </p>
          <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
            We're looking for creative, actionable ideas that can be implemented
            within the next 12 months. Think about technology, processes,
            partnerships, or cultural changes that could drive real impact. Both
            incremental improvements and breakthrough innovations are welcome.
          </p>
          <div
            style={{
              margin: "20px 0",
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 8,
              }}
            >
              📎 Attachments
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" size="sm" icon={FileText}>
                Challenge Brief.pdf
              </Btn>
              <Btn variant="ghost" size="sm" icon={FileText}>
                Background Research.docx
              </Btn>
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#eef2ff",
              borderRadius: 8,
              border: "1px solid #c7d2fe",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#4338ca",
                marginBottom: 4,
              }}
            >
              💡 Need help?
            </div>
            <div style={{ fontSize: 12, color: "#4b5563" }}>
              Contact the campaign team at innovation@company.com
            </div>
          </div>
        </div>
      )}
      {tab === "ideas" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <SearchInput placeholder="Search ideas..." width={260} />
            <Btn variant="ghost" size="sm" icon={SlidersHorizontal}>
              Filters
            </Btn>
            <Btn variant="ghost" size="sm" icon={ArrowUpDown}>
              Sort
            </Btn>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {(campaignIdeas.length ? campaignIdeas : ideasData.slice(0, 4)).map(
              (idea) => (
                <Card
                  key={idea.id}
                  onClick={() => {
                    setDetail({ type: "idea", data: idea });
                    setPage("ideaDetail");
                  }}
                >
                  <div style={{ padding: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Badge status={idea.status} size="xs" />
                      {idea.isHot && <Badge status="HOT" size="xs" />}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                        marginBottom: 6,
                        lineHeight: 1.3,
                      }}
                    >
                      {idea.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.5,
                        marginBottom: 10,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {idea.desc}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Avatar name={idea.author} size={20} />
                      <span style={{ fontSize: 12, color: "#4b5563" }}>
                        {idea.author}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 14 }}>
                      <StatPill icon={Star} value={idea.votes} />
                      <StatPill icon={MessageCircle} value={idea.comments} />
                      <StatPill icon={Heart} value={idea.likes} />
                      <StatPill icon={Eye} value={idea.views} />
                    </div>
                  </div>
                </Card>
              ),
            )}
          </div>
        </div>
      )}
      {tab === "cockpit" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 14,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <KpiCard
              label="Awareness"
              value={`${Math.round(c.views / 15)}%`}
              icon={Eye}
              color="#6366f1"
            />
            <KpiCard
              label="Participation"
              value={`${c.participation}%`}
              change={8}
              icon={Users}
              color="#10b981"
            />
            <KpiCard
              label="Ideas"
              value={c.ideas}
              change={15}
              icon={Lightbulb}
              color="#f59e0b"
            />
            <KpiCard
              label="Comments"
              value={c.comments}
              icon={MessageCircle}
              color="#8b5cf6"
            />
          </div>
          <Card hover={false} style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Activity Over Time
            </h3>
            <div
              style={{
                height: 180,
                background: "linear-gradient(to right, #eef2ff, #f9fafb)",
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-end",
                padding: "0 8px 8px",
                gap: 4,
              }}
            >
              {[30, 45, 38, 52, 48, 65, 72, 68, 85, 78, 92, 88, 95, 89].map(
                (v, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${v}%`,
                      background: `linear-gradient(to top, #4f46e5, #818cf8)`,
                      borderRadius: "4px 4px 0 0",
                      opacity: 0.7 + i * 0.02,
                      transition: "height 0.3s ease",
                    }}
                  />
                ),
              )}
            </div>
          </Card>
          <Card hover={false} style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Idea Funnel
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Submitted", count: c.ideas, pct: 100 },
                {
                  label: "In Discussion",
                  count: Math.round(c.ideas * 0.7),
                  pct: 70,
                },
                { label: "HOT!", count: Math.round(c.ideas * 0.3), pct: 30 },
                {
                  label: "In Evaluation",
                  count: Math.round(c.ideas * 0.15),
                  pct: 15,
                },
                {
                  label: "Selected",
                  count: Math.round(c.ideas * 0.08),
                  pct: 8,
                },
              ].map((stage, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      width: 90,
                      textAlign: "right",
                    }}
                  >
                    {stage.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 28,
                      background: "#f3f4f6",
                      borderRadius: 6,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${stage.pct}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, #4f46e5, #818cf8)`,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 10,
                        transition: "width 0.6s ease",
                      }}
                    >
                      <span
                        style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}
                      >
                        {stage.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {tab === "board" && (
        <IdeaBoardView
          ideas={campaignIdeas.length ? campaignIdeas : ideasData.slice(0, 4)}
        />
      )}
      {tab === "community" && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Campaign Team
          </h3>
          <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            {[
              { role: "Sponsor", name: c.sponsor },
              { role: "Manager", name: "You" },
              { role: "Moderator", name: "Alex Kim" },
            ].map((m, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <Avatar name={m.name} size={36} />
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
                  >
                    {m.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Top Contributors
          </h3>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 80px 80px 80px 80px",
                padding: "8px 16px",
                background: "#f9fafb",
                fontSize: 11,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>#</span>
              <span>Contributor</span>
              <span>Ideas</span>
              <span>Comments</span>
              <span>Likes</span>
              <span>Score</span>
            </div>
            {[
              {
                n: "Rachel Green",
                ideas: 5,
                comments: 23,
                likes: 45,
                score: 134,
              },
              {
                n: "Omar Hassan",
                ideas: 4,
                comments: 18,
                likes: 67,
                score: 121,
              },
              {
                n: "David Park",
                ideas: 3,
                comments: 31,
                likes: 32,
                score: 113,
              },
              { n: "Lisa Wang", ideas: 6, comments: 12, likes: 28, score: 106 },
            ].map((u, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 80px 80px 80px 80px",
                  padding: "10px 16px",
                  borderTop: "1px solid #f3f4f6",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: i < 3 ? "#f59e0b" : "#9ca3af",
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={u.n} size={24} />
                  <span style={{ fontWeight: 500 }}>{u.n}</span>
                </div>
                <span>{u.ideas}</span>
                <span>{u.comments}</span>
                <span>{u.likes}</span>
                <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                  {u.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "inspired" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          {trendsData.slice(0, 3).map((t) => (
            <Card key={t.id}>
              <div
                style={{
                  height: 60,
                  background: "linear-gradient(135deg, #eef2ff, #faf5ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp size={24} color="#6366f1" />
              </div>
              <div style={{ padding: 14 }}>
                <Badge status={t.type} size="xs" />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                    marginTop: 6,
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {t.insights} insights · {t.relevance}% relevance
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const IdeaBoardView = ({ ideas }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      gap: 16,
      minHeight: 400,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 10,
        }}
      >
        Buckets
      </div>
      {[
        { name: "All Ideas", count: ideas.length, active: true },
        { name: "Q4 Review", count: 3, color: "#6366f1" },
        { name: "Quick Wins", count: 2, color: "#10b981" },
        { name: "Needs Research", count: 1, color: "#f59e0b" },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 6,
            cursor: "pointer",
            background: b.active ? "#eef2ff" : "transparent",
            marginBottom: 2,
            fontSize: 13,
            color: b.active ? "#4338ca" : "#374151",
            fontWeight: b.active ? 600 : 400,
          }}
        >
          {b.color && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: b.color,
              }}
            />
          )}
          <span style={{ flex: 1 }}>{b.name}</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{b.count}</span>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 10,
          }}
        >
          Eval Sessions
        </div>
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            color: "#374151",
            cursor: "pointer",
          }}
        >
          🗒 Expert Review
        </div>
      </div>
    </div>
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <SearchInput placeholder="Filter ideas..." width={200} />
        <Btn variant="ghost" size="sm" icon={SlidersHorizontal}>
          Columns
        </Btn>
        <Btn variant="ghost" size="sm" icon={ArrowUpDown}>
          Sort
        </Btn>
        <div style={{ flex: 1 }} />
        <Btn variant="secondary" size="sm" icon={Download}>
          Export
        </Btn>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "36px 1fr 100px 80px 80px 60px 80px",
          padding: "6px 12px",
          background: "#fafafa",
          fontSize: 10,
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <span>☐</span>
        <span>Title</span>
        <span>Author</span>
        <span>Status</span>
        <span>Score</span>
        <span>💬</span>
        <span>Bucket</span>
      </div>
      {ideas.map((idea, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 100px 80px 80px 60px 80px",
            padding: "10px 12px",
            borderBottom: "1px solid #f3f4f6",
            fontSize: 13,
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <span>☐</span>
          <span style={{ fontWeight: 500, color: "#111827" }}>
            {idea.title}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{idea.author}</span>
          <Badge status={idea.status} size="xs" />
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Star size={12} color="#f59e0b" />
            {idea.votes}
          </span>
          <span style={{ color: "#6b7280" }}>{idea.comments}</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>—</span>
        </div>
      ))}
    </div>
  </div>
);

const IdeaDetailPage = ({ detail, setPage }) => {
  const idea = detail?.data || ideasData[0];
  const [tab, setTab] = useState("description");
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button
        onClick={() => setPage("campaigns")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          color: "#6b7280",
          background: "none",
          border: "none",
          cursor: "pointer",
          marginBottom: 16,
          fontFamily: "inherit",
        }}
      >
        <ChevronLeft size={16} />
        Back to campaign
      </button>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}
      >
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <Badge status={idea.status} />
            {idea.isHot && <Badge status="HOT" />}
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 8,
              fontFamily: "'Satoshi', sans-serif",
            }}
          >
            {idea.title}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Avatar name={idea.author} size={28} />
            <span style={{ fontSize: 13, color: "#374151" }}>
              by <strong>{idea.author}</strong>
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              · {idea.campaign}
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <StatPill icon={Star} value={idea.votes} label="avg" />
            <StatPill
              icon={MessageCircle}
              value={idea.comments}
              label="comments"
            />
            <StatPill icon={Heart} value={idea.likes} label="likes" />
            <StatPill icon={Eye} value={idea.views} label="views" />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Btn variant="primary" icon={Heart} size="sm">
              Like
            </Btn>
            <Btn variant="secondary" icon={Bookmark} size="sm">
              Follow
            </Btn>
            <Btn variant="ghost" icon={Share2} size="sm">
              Share
            </Btn>
          </div>
          <TabBar
            tabs={[
              { id: "description", label: "Description" },
              { id: "discussion", label: "Discussion", count: idea.comments },
              { id: "evaluation", label: "Evaluation" },
              { id: "history", label: "History" },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "description" && (
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
              <p style={{ marginBottom: 16 }}>{idea.desc}</p>
              <p>
                This approach leverages existing infrastructure while
                introducing cutting-edge technology that can scale across the
                organization. Initial pilots in our NYC and London offices
                showed promising results with 18% energy reduction in the first
                month.
              </p>
              <div
                style={{
                  margin: "20px 0",
                  padding: 14,
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  📎 Supporting Documents
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="sm" icon={FileText}>
                    Pilot Results.pdf
                  </Btn>
                  <Btn variant="ghost" size="sm" icon={FileText}>
                    Cost Analysis.xlsx
                  </Btn>
                </div>
              </div>
            </div>
          )}
          {tab === "discussion" && (
            <div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <textarea
                  placeholder="Share your thoughts..."
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    minHeight: 60,
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: "#374151",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn variant="ghost" size="sm" icon={Bold} />
                    <Btn variant="ghost" size="sm" icon={Italic} />
                    <Btn variant="ghost" size="sm" icon={Paperclip} />
                  </div>
                  <Btn variant="primary" size="sm" icon={Send}>
                    Comment
                  </Btn>
                </div>
              </div>
              {[
                {
                  author: "Sarah Chen",
                  time: "2h ago",
                  text: "This is exactly what we need! Have you considered integrating with our existing BMS system? That could speed up deployment significantly.",
                  likes: 8,
                },
                {
                  author: "Marcus Rodriguez",
                  time: "5h ago",
                  text: "Great idea. I'd recommend starting with the London office as a pilot since they already have smart meters installed.",
                  likes: 5,
                },
                {
                  author: "Elena Kowalski",
                  time: "1d ago",
                  text: "The ROI projections look solid. Can you share more details about the ML model architecture?",
                  likes: 3,
                },
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Avatar name={c.author} size={24} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {c.author}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {c.time}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      lineHeight: 1.6,
                      paddingLeft: 32,
                    }}
                  >
                    {c.text}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      paddingLeft: 32,
                      marginTop: 6,
                    }}
                  >
                    <button
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Heart size={12} /> {c.likes}
                    </button>
                    <button
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "evaluation" && (
            <div>
              <Card hover={false} style={{ padding: 16, marginBottom: 16 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}
                >
                  Expert Review Session
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  {[
                    { label: "Feasibility", score: 4.2 },
                    { label: "Impact", score: 4.8 },
                    { label: "Novelty", score: 3.9 },
                  ].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#f9fafb",
                        borderRadius: 8,
                        padding: 12,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          marginBottom: 4,
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: "#111827",
                          fontFamily: "'Satoshi', sans-serif",
                        }}
                      >
                        {c.score}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 2,
                          marginTop: 4,
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            fill={s <= Math.round(c.score) ? "#f59e0b" : "none"}
                            color={
                              s <= Math.round(c.score) ? "#f59e0b" : "#d1d5db"
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
        <div>
          <Card hover={false} style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Community Voting
            </h3>
            {[
              { label: "Feasibility", score: 4.2 },
              { label: "Attractiveness", score: 4.5 },
              { label: "Impact", score: 4.0 },
            ].map((v, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>{v.label}</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>
                    {v.score}
                  </span>
                </div>
                <ProgressBar value={v.score * 20} color="#f59e0b" height={6} />
              </div>
            ))}
          </Card>
          {idea.isHot && (
            <Card
              hover={false}
              style={{
                padding: 16,
                marginBottom: 16,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Flame size={14} color="#f97316" /> Community Graduation
              </h3>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                  fontFamily: "'Satoshi', sans-serif",
                }}
              >
                🔥 HOT!
              </div>
              {[
                { label: "Visitors", current: 15, target: 10 },
                { label: "Commenters", current: 8, target: 5 },
              ].map((m, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>{m.label}</span>
                    <span style={{ color: "#059669", fontWeight: 600 }}>
                      {m.current}/{m.target} ✓
                    </span>
                  </div>
                  <ProgressBar value={100} color="#10b981" height={4} />
                </div>
              ))}
            </Card>
          )}
          <Card hover={false} style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Similar Ideas
            </h3>
            {[
              { title: "Smart Building Controller", score: 87 },
              { title: "Energy Usage Analytics", score: 72 },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 0",
                  borderBottom: i === 0 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#4f46e5",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {s.score}% match
                </div>
              </div>
            ))}
          </Card>
          <Card hover={false} style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Tags
            </h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["AI", "Sustainability", "Energy", "IoT", "Automation"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      background: "#f3f4f6",
                      color: "#374151",
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontWeight: 500,
                    }}
                  >
                    {t}
                  </span>
                ),
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PartnersPage = ({ setPage, setDetail }) => {
  const [tab, setTab] = useState("orgs");
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#111827",
            fontFamily: "'Satoshi', sans-serif",
          }}
        >
          Partner Ecosystem
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" icon={Search}>
            Search External
          </Btn>
          <Btn variant="primary" icon={Plus}>
            Add Organization
          </Btn>
        </div>
      </div>
      <Card
        hover={false}
        style={{
          padding: 20,
          marginBottom: 20,
          background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 12,
          }}
        >
          Use Case Pipeline
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          {[
            { label: "Identified", count: 8, pct: 100 },
            { label: "Qualification", count: 5, pct: 65 },
            { label: "Evaluation", count: 3, pct: 40 },
            { label: "Pilot", count: 2, pct: 25 },
            { label: "Partnership", count: 1, pct: 12 },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: 80,
                  background: `linear-gradient(to top, #4f46e5${Math.round(40 + i * 12).toString(16)}, #818cf8${Math.round(20 + i * 8).toString(16)})`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                  position: "relative",
                }}
              >
                <span
                  style={{ fontSize: 20, fontWeight: 700, color: "#4f46e5" }}
                >
                  {s.count}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <TabBar
        tabs={[
          { id: "orgs", label: "Organizations", count: orgsData.length },
          { id: "usecases", label: "Use Cases" },
          { id: "scouting", label: "Scouting Boards" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "orgs" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <SearchInput placeholder="Search organizations..." width={260} />
            <Btn variant="ghost" size="sm" icon={SlidersHorizontal}>
              Filter
            </Btn>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {orgsData.map((org) => (
              <Card key={org.id}>
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{org.logo}</div>
                    <Badge status={org.status} size="xs" />
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#111827",
                      marginBottom: 2,
                    }}
                  >
                    {org.name}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}
                  >
                    {org.industry} · {org.location}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "#6b7280" }}>💰 {org.funding}</span>
                    <span style={{ color: "#6b7280" }}>
                      📋 {org.useCases} use cases
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      {tab === "scouting" && (
        <div>
          <Btn variant="secondary" icon={Plus} style={{ marginBottom: 16 }}>
            New Scouting Board
          </Btn>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {[
              { name: "AI Partners 2025", items: 12, shared: true },
              { name: "Sustainability Startups", items: 8, shared: false },
            ].map((b, i) => (
              <Card key={i}>
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#111827",
                      marginBottom: 4,
                    }}
                  >
                    {b.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {b.items} organizations · {b.shared ? "Shared" : "Private"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StrategyPage = () => {
  const [tab, setTab] = useState("trends");
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#111827",
            fontFamily: "'Satoshi', sans-serif",
          }}
        >
          Strategy & Foresight
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" icon={Globe}>
            Web Clipper
          </Btn>
          <Btn variant="primary" icon={Plus}>
            New
          </Btn>
        </div>
      </div>
      <TabBar
        tabs={[
          { id: "trends", label: "Trends", count: 5 },
          { id: "tech", label: "Technologies" },
          { id: "insights", label: "Insights" },
          { id: "sias", label: "Innovation Areas" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "trends" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {trendsData.map((t) => (
            <Card key={t.id}>
              <div
                style={{
                  height: 80,
                  background:
                    t.type === "MEGA"
                      ? "linear-gradient(135deg, #fce7f3, #fdf2f8)"
                      : t.type === "MACRO"
                        ? "linear-gradient(135deg, #e0e7ff, #eef2ff)"
                        : "linear-gradient(135deg, #d1fae5, #f0fdf4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp
                  size={28}
                  color={
                    t.type === "MEGA"
                      ? "#be185d"
                      : t.type === "MACRO"
                        ? "#4338ca"
                        : "#15803d"
                  }
                />
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <Badge status={t.type} size="xs" />
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  {t.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {t.insights} insights
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: t.relevance > 80 ? "#059669" : "#d97706",
                      }}
                    >
                      {t.relevance}%
                    </span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>
                      relevance
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectsPage = () => (
  <div style={{ animation: "fadeIn 0.3s ease" }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          fontFamily: "'Satoshi', sans-serif",
        }}
      >
        Projects
      </h1>
      <Btn variant="primary" icon={Plus}>
        New Project
      </Btn>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {[
        {
          name: "CX Transformation",
          process: "Innovation Pipeline",
          phase: "Phase 2: Business Case",
          status: "ELABORATION",
          progress: 45,
          leader: "You",
          team: 5,
        },
        {
          name: "Green Logistics Pilot",
          process: "Sustainability Track",
          phase: "Phase 3: Implementation",
          status: "GATE",
          progress: 72,
          leader: "Sarah Chen",
          team: 8,
        },
        {
          name: "AI Chatbot MVP",
          process: "Digital Fast Track",
          phase: "Phase 1: Feasibility",
          status: "ELABORATION",
          progress: 30,
          leader: "Omar Hassan",
          team: 4,
        },
        {
          name: "Partner Portal",
          process: "Innovation Pipeline",
          phase: "Phase 2: Business Case",
          status: "POSTPONED",
          progress: 55,
          leader: "Elena Kowalski",
          team: 6,
        },
      ].map((p, i) => (
        <Card key={i}>
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}
                >
                  {p.process}
                </div>
                <div
                  style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}
                >
                  {p.name}
                </div>
              </div>
              <span
                style={{
                  background:
                    p.status === "GATE"
                      ? "#fef3c7"
                      : p.status === "POSTPONED"
                        ? "#f3f4f6"
                        : "#dbeafe",
                  color:
                    p.status === "GATE"
                      ? "#d97706"
                      : p.status === "POSTPONED"
                        ? "#6b7280"
                        : "#2563eb",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                }}
              >
                {p.status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 12 }}>
              {p.phase}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {[1, 2, 3, 4].map((phase) => (
                <div
                  key={phase}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 99,
                    background:
                      phase <= Math.ceil(p.progress / 25)
                        ? "#4f46e5"
                        : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar name={p.leader} size={20} />
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {p.leader} + {p.team} members
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                {p.progress}%
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

const ReportsPage = () => (
  <div style={{ animation: "fadeIn 0.3s ease" }}>
    <h1
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 20,
        fontFamily: "'Satoshi', sans-serif",
      }}
    >
      Reports & Analytics
    </h1>
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
    >
      {[
        {
          title: "Ideation Reports",
          icon: Lightbulb,
          color: "#f59e0b",
          items: [
            "Campaign Overview",
            "Compare Campaigns",
            "Organization Analysis",
            "Success Factors",
            "Idea Funnel",
            "User Engagement",
          ],
        },
        {
          title: "Partnering Reports",
          icon: Handshake,
          color: "#8b5cf6",
          items: [
            "Use Case Pipeline",
            "Organization Activity",
            "Scouting Overview",
          ],
        },
        {
          title: "Project Reports",
          icon: FolderKanban,
          color: "#10b981",
          items: [
            "Portfolio Analyzer",
            "Phase Completion",
            "Resource Allocation",
          ],
        },
      ].map((cat, i) => (
        <Card key={i} hover={false}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: cat.color + "14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <cat.icon size={20} color={cat.color} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
                {cat.title}
              </div>
            </div>
            {cat.items.map((item, j) => (
              <div
                key={j}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    j < cat.items.length - 1 ? "1px solid #f3f4f6" : "none",
                  fontSize: 13,
                  color: "#4b5563",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {item}
                <ChevronRight size={14} color="#d1d5db" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  </div>
);

const AdminPage = () => {
  const [tab, setTab] = useState("users");
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 20,
          fontFamily: "'Satoshi', sans-serif",
        }}
      >
        Administration
      </h1>
      <TabBar
        tabs={[
          { id: "users", label: "Users", count: 234 },
          { id: "groups", label: "Groups" },
          { id: "orgunits", label: "Org Units" },
          { id: "notifications", label: "Notifications" },
          { id: "settings", label: "Settings" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "users" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <SearchInput placeholder="Search users..." width={260} />
            <Btn variant="ghost" size="sm" icon={SlidersHorizontal}>
              Filter
            </Btn>
            <div style={{ flex: 1 }} />
            <Btn variant="primary" size="sm" icon={UserPlus}>
              Invite User
            </Btn>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 120px 120px 100px 80px",
                padding: "8px 16px",
                background: "#f9fafb",
                fontSize: 10,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>User</span>
              <span>Email</span>
              <span>Org Unit</span>
              <span>Groups</span>
              <span>Last Login</span>
              <span>Status</span>
            </div>
            {[
              {
                name: "Sarath Francis",
                email: "sarath@co.com",
                unit: "Innovation",
                groups: "Admin, IM",
                login: "Today",
                active: true,
              },
              {
                name: "Sarah Chen",
                email: "sarah@co.com",
                unit: "Strategy",
                groups: "IM",
                login: "Yesterday",
                active: true,
              },
              {
                name: "Marcus Rodriguez",
                email: "marcus@co.com",
                unit: "R&D",
                groups: "IM, Eval",
                login: "2 days ago",
                active: true,
              },
              {
                name: "Elena Kowalski",
                email: "elena@co.com",
                unit: "Operations",
                groups: "Contributor",
                login: "1 week ago",
                active: true,
              },
              {
                name: "James Liu",
                email: "james@co.com",
                unit: "Supply Chain",
                groups: "Contributor",
                login: "3 days ago",
                active: false,
              },
            ].map((u, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 120px 120px 100px 80px",
                  padding: "10px 16px",
                  borderTop: "1px solid #f3f4f6",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={u.name} size={28} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {u.email}
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{u.unit}</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {u.groups}
                </span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {u.login}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: u.active ? "#10b981" : "#d1d5db",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ MAIN APP ============

export default function InnoFlowApp() {
  const [page, setPage] = useState("dashboard");
  const [detail, setDetail] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(3);

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { type: "divider" },
    { id: "campaigns", label: "Campaigns", icon: Megaphone, count: 4 },
    { id: "channels", label: "Channels", icon: Hash },
    { id: "ideas", label: "Ideas", icon: Lightbulb },
    { type: "divider" },
    { id: "partners", label: "Partners", icon: Handshake },
    { id: "strategy", label: "Strategy", icon: TrendingUp },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { type: "divider" },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "tasks", label: "Tasks", icon: CheckSquare, count: 3 },
    { type: "divider" },
    { id: "admin", label: "Admin", icon: Settings },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage setPage={setPage} setDetail={setDetail} />;
      case "campaigns":
        return <CampaignsPage setPage={setPage} setDetail={setDetail} />;
      case "campaignDetail":
        return (
          <CampaignDetailPage
            detail={detail}
            setPage={setPage}
            setDetail={setDetail}
          />
        );
      case "ideaDetail":
        return <IdeaDetailPage detail={detail} setPage={setPage} />;
      case "partners":
        return <PartnersPage setPage={setPage} setDetail={setDetail} />;
      case "strategy":
        return <StrategyPage />;
      case "projects":
        return <ProjectsPage />;
      case "reports":
        return <ReportsPage />;
      case "admin":
        return <AdminPage />;
      default:
        return <DashboardPage setPage={setPage} setDetail={setDetail} />;
    }
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#f8f9fb",
        minHeight: "100vh",
        display: "flex",
        color: "#111827",
        fontSize: 14,
      }}
    >
      <style>
        {fonts}
        {`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        input::placeholder, textarea::placeholder { color: #9ca3af; }
      `}
      </style>

      {/* SIDEBAR */}
      <div
        style={{
          width: sidebarWidth,
          minHeight: "100vh",
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            padding: sidebarCollapsed ? "16px 12px" : "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Zap size={18} color="#fff" />
          </div>
          {!sidebarCollapsed && (
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "'Satoshi', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              InnoFlow
            </span>
          )}
        </div>
        <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
          {navItems.map((item, i) => {
            if (item.type === "divider")
              return (
                <div
                  key={i}
                  style={{
                    height: 1,
                    background: "#1e293b",
                    margin: "8px 6px",
                  }}
                />
              );
            const isActive =
              page === item.id ||
              (item.id === "campaigns" && page === "campaignDetail") ||
              (item.id === "ideas" && page === "ideaDetail");
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: sidebarCollapsed ? "9px 0" : "9px 12px",
                  borderRadius: 7,
                  background: isActive
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: isActive ? "#fff" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "inherit",
                  transition: "all 0.12s",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  borderLeft: isActive
                    ? "2px solid #818cf8"
                    : "2px solid transparent",
                  marginBottom: 2,
                }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {!sidebarCollapsed && (
                  <span style={{ flex: 1, textAlign: "left" }}>
                    {item.label}
                  </span>
                )}
                {!sidebarCollapsed && item.count && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 99,
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            padding: 12,
            background: "none",
            border: "none",
            borderTop: "1px solid #1e293b",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "inherit",
            fontSize: 12,
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />{" "}
              <span style={{ marginLeft: 8 }}>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* MAIN AREA */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          transition: "margin-left 0.2s ease",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            height: 56,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            <button
              onClick={() => setPage("dashboard")}
              style={{
                color: "#9ca3af",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            >
              Home
            </button>
            {page !== "dashboard" && (
              <>
                <ChevronRight size={12} />
                <span
                  style={{
                    color: "#374151",
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {page.replace("Detail", "")}
                </span>
              </>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", width: 260 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
              }}
            />
            <input
              placeholder="Search... ⌘K"
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                border: "1px solid #e5e7eb",
                borderRadius: 7,
                fontSize: 12,
                background: "#f9fafb",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ position: "relative", cursor: "pointer" }}>
            <Bell size={18} color="#6b7280" />
            {notifications > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {notifications}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Avatar name="Sarath Francis" size={30} color="#4f46e5" />
            <ChevronDown size={14} color="#9ca3af" />
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
