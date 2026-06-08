export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type Sentiment = "Neutral" | "Confused" | "Frustrated" | "Angry";
export type TicketStatus = "New" | "Analyzed" | "Drafted" | "Waiting" | "Escalated" | "Resolved";

export type Ticket = {
  id: string;
  customer: string;
  email: string;
  phone?: string;
  category: string;
  intent: string;
  priority: Priority;
  sentiment: Sentiment;
  status: TicketStatus;
  subject: string;
  body: string;
  createdAt: string;
  confidence: number; // 0..1
  flags: string[];
  conversation: { from: "customer" | "agent" | "system"; at: string; text: string }[];
};

export const tickets: Ticket[] = [
  {
    id: "TCK-001",
    customer: "John Smith",
    email: "john.smith@northwind.io",
    phone: "+1 415 555 0142",
    category: "Billing",
    intent: "refund_request",
    priority: "High",
    sentiment: "Frustrated",
    status: "Drafted",
    subject: "Charged twice for May invoice",
    body: "Hi — I was billed $129 twice on May 14th. Card ending 4242. Please refund the duplicate and confirm.",
    createdAt: "2025-06-08T08:12:00Z",
    confidence: 0.92,
    flags: ["payment_dispute"],
    conversation: [
      { from: "customer", at: "08:12", text: "Hi — I was billed $129 twice on May 14th. Card ending 4242. Please refund the duplicate." },
      { from: "system", at: "08:12", text: "Ticket auto-classified as Billing → refund_request" },
    ],
  },
  {
    id: "TCK-002",
    customer: "Maya Chen",
    email: "maya.c@lumenlabs.co",
    category: "Account",
    intent: "login_issue",
    priority: "High",
    sentiment: "Confused",
    status: "Analyzed",
    subject: "Cannot log in after password reset",
    body: "I reset my password yesterday and now the new one isn't accepted. I've tried twice and locked myself out.",
    createdAt: "2025-06-08T08:40:00Z",
    confidence: 0.81,
    flags: [],
    conversation: [
      { from: "customer", at: "08:40", text: "I reset my password yesterday and now the new one isn't accepted." },
    ],
  },
  {
    id: "TCK-003",
    customer: "Aung Min",
    email: "aung@bytecraft.dev",
    category: "Technical",
    intent: "bug_report",
    priority: "Medium",
    sentiment: "Neutral",
    status: "New",
    subject: "Dashboard chart renders empty on Safari 17",
    body: "Charts on the analytics page show no data on Safari but work in Chrome. No console errors. Reproducible.",
    createdAt: "2025-06-08T09:01:00Z",
    confidence: 0.64,
    flags: ["possible_outage"],
    conversation: [
      { from: "customer", at: "09:01", text: "Charts on analytics page show empty on Safari 17." },
    ],
  },
  {
    id: "TCK-004",
    customer: "Enterprise Client (Helix Corp)",
    email: "security@helix.com",
    category: "Security",
    intent: "account_takeover",
    priority: "Urgent",
    sentiment: "Angry",
    status: "Escalated",
    subject: "Suspected account takeover on admin seat",
    body: "We're seeing unrecognized logins from 3 countries on our admin account in the last hour. We need this escalated NOW.",
    createdAt: "2025-06-08T09:22:00Z",
    confidence: 0.58,
    flags: ["security_issue", "vip_customer", "low_confidence"],
    conversation: [
      { from: "customer", at: "09:22", text: "Unrecognized logins from 3 countries on our admin account in the last hour." },
      { from: "system", at: "09:22", text: "VIP customer detected • Security policy: human-only response required" },
    ],
  },
];

export type KnowledgeSource = {
  id: string;
  title: string;
  type: "policy" | "guide" | "past_ticket";
  excerpt: string;
  updatedAt: string;
};

export const knowledgeSources: KnowledgeSource[] = [
  { id: "KB-01", title: "Refund Policy — Duplicate Charges", type: "policy", excerpt: "Duplicate charges within 30 days are auto-eligible for refund. Verify last-4 of card and transaction ID before issuing.", updatedAt: "2025-04-11" },
  { id: "KB-02", title: "Login Troubleshooting Guide", type: "guide", excerpt: "Step 1: confirm email. Step 2: trigger reset link. Step 3: if account locked >5 attempts, manual unlock required.", updatedAt: "2025-03-02" },
  { id: "KB-03", title: "Account Recovery Policy", type: "policy", excerpt: "Identity proof required for full recovery. Use the standard recovery flow; never share recovery codes over chat.", updatedAt: "2025-05-19" },
  { id: "KB-04", title: "SLA Rules for Enterprise Customers", type: "policy", excerpt: "Urgent tickets must receive human acknowledgement within 15 minutes. AI may not auto-close enterprise tickets.", updatedAt: "2025-05-30" },
  { id: "KB-05", title: "Privacy Policy", type: "policy", excerpt: "PII must be masked in all logs and AI prompts. No card numbers may be stored in plaintext.", updatedAt: "2025-01-22" },
  { id: "KB-06", title: "Past Ticket TCK-384 — Duplicate billing after payment retry", type: "past_ticket", excerpt: "Resolved by refunding duplicate and disabling retry flag. Customer notified within 2h.", updatedAt: "2025-02-08" },
];

export type LiveChat = {
  id: string;
  customer: string;
  email: string;
  topic: string;
  priority: Priority;
  sentiment: Sentiment;
  status: "active" | "waiting" | "ended";
  unread: number;
  flags: string[];
  messages: { from: "customer" | "agent" | "ai"; at: string; text: string }[];
};

export const liveChats: LiveChat[] = [
  {
    id: "CHAT-101",
    customer: "Priya Raman (Helix Corp)",
    email: "priya@helix.com",
    topic: "Enterprise customer cannot log in urgently",
    priority: "Urgent",
    sentiment: "Angry",
    status: "active",
    unread: 3,
    flags: ["vip_customer", "security_issue"],
    messages: [
      { from: "customer", at: "10:01", text: "Our entire team is locked out. Board meeting in 20 minutes." },
      { from: "agent", at: "10:01", text: "I'm on it — pulling up your account now." },
      { from: "customer", at: "10:02", text: "Please hurry. This is unacceptable." },
      { from: "customer", at: "10:03", text: "Hello?" },
    ],
  },
  {
    id: "CHAT-102",
    customer: "John Smith",
    email: "john.smith@northwind.io",
    topic: "Duplicate payment refund request",
    priority: "High",
    sentiment: "Frustrated",
    status: "active",
    unread: 1,
    flags: ["payment_dispute"],
    messages: [
      { from: "customer", at: "10:10", text: "Following up on my refund — any update?" },
    ],
  },
  {
    id: "CHAT-103",
    customer: "Devon Park",
    email: "devon@parklabs.io",
    topic: "API key not working",
    priority: "Medium",
    sentiment: "Confused",
    status: "waiting",
    unread: 0,
    flags: [],
    messages: [
      { from: "customer", at: "09:48", text: "My API key returns 401 since this morning." },
      { from: "agent", at: "09:49", text: "Can you share the first 6 chars of the key?" },
    ],
  },
  {
    id: "CHAT-104",
    customer: "Sasha Ivanova",
    email: "sasha@brightline.app",
    topic: "Customer angry about delayed support",
    priority: "High",
    sentiment: "Angry",
    status: "active",
    unread: 2,
    flags: ["angry_customer"],
    messages: [
      { from: "customer", at: "10:14", text: "I have been waiting two days for a response." },
      { from: "customer", at: "10:14", text: "This is the third time I'm writing." },
    ],
  },
];

export type AuditEntry = {
  id: string;
  at: string;
  actor: "AI" | "Agent" | "System";
  action: string;
  target: string;
  detail: string;
  risk: "low" | "medium" | "high";
};

export const auditLog: AuditEntry[] = [
  { id: "A-9821", at: "10:14:22", actor: "AI", action: "Drafted reply", target: "TCK-001", detail: "Refund draft generated with 3 citations", risk: "low" },
  { id: "A-9820", at: "10:13:50", actor: "AI", action: "Classified intent", target: "TCK-003", detail: "bug_report — confidence 0.64 (low)", risk: "medium" },
  { id: "A-9819", at: "10:12:11", actor: "System", action: "Escalated", target: "TCK-004", detail: "Policy: VIP + security_issue → human-only", risk: "high" },
  { id: "A-9818", at: "10:09:01", actor: "Agent", action: "Edited AI draft", target: "TCK-002", detail: "Replaced 2 sentences before sending", risk: "low" },
  { id: "A-9817", at: "10:02:44", actor: "AI", action: "Masked PII", target: "CHAT-102", detail: "Masked card last-4 in transcript", risk: "low" },
];
