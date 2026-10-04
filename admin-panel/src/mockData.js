export const initialUsers = [
  {
    id: "USR-001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    mobile: "9876543210",
    points: 1250,
    balance: 125.50,
    totalEarned: 450.00,
    totalWithdrawn: 324.50,
    createdAt: "2026-01-15",
    status: "Active",
    bankDetails: {
      accountHolderName: "Aarav Sharma",
      bankName: "HDFC Bank",
      accountNumber: "XXXX-XXXX-4821",
      ifsc: "HDFC0001234",
      upiId: "aarav***@okhdfcbank"
    },
    transactions: [
      { id: "TXN-101", type: "Credit", amount: "+₹50.00", points: "+150 Points", date: "2026-03-30 14:20", status: "Completed" },
      { id: "TXN-102", type: "Debit", amount: "-₹100.00", points: "-300 Points", date: "2026-03-25 11:10", status: "Success" },
      { id: "TXN-103", type: "Credit", amount: "+₹70.00", points: "+200 Points", date: "2026-03-20 09:45", status: "Completed" }
    ],
    taskHistory: [
      { id: "TSK-H1", title: "Watch YouTube Video #1", points: 100, date: "2026-03-30", status: "Completed" },
      { id: "TSK-H2", title: "Daily Check-in Bonus", points: 50, date: "2026-03-29", status: "Completed" }
    ]
  },
  {
    id: "USR-002",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    mobile: "9123456780",
    points: 3400,
    balance: 340.00,
    totalEarned: 890.00,
    totalWithdrawn: 550.00,
    createdAt: "2026-02-01",
    status: "Active",
    bankDetails: {
      accountHolderName: "Priya Patel",
      bankName: "State Bank of India",
      accountNumber: "XXXX-XXXX-9182",
      ifsc: "SBIN0005678",
      upiId: "priya***@ybl"
    },
    transactions: [
      { id: "TXN-201", type: "Credit", amount: "+₹150.00", points: "+500 Points", date: "2026-03-31 16:00", status: "Completed" },
      { id: "TXN-202", type: "Debit", amount: "-₹250.00", points: "-750 Points", date: "2026-03-28 10:30", status: "Success" }
    ],
    taskHistory: [
      { id: "TSK-H3", title: "Subscribe to Channel", points: 150, date: "2026-03-31", status: "Completed" }
    ]
  },
  {
    id: "USR-003",
    name: "Rohan Verma",
    email: "rohan.verma@example.com",
    mobile: "9988776655",
    points: 450,
    balance: 45.00,
    totalEarned: 120.00,
    totalWithdrawn: 75.00,
    createdAt: "2026-02-20",
    status: "Inactive",
    bankDetails: {
      accountHolderName: "Rohan Verma",
      bankName: "ICICI Bank",
      accountNumber: "XXXX-XXXX-3341",
      ifsc: "ICIC0009101",
      upiId: "rohan***@icici"
    },
    transactions: [
      { id: "TXN-301", type: "Credit", amount: "+₹30.00", points: "+100 Points", date: "2026-03-29 12:15", status: "Completed" }
    ],
    taskHistory: [
      { id: "TSK-H4", title: "Complete Profile Setup", points: 200, date: "2026-02-20", status: "Completed" }
    ]
  },
  {
    id: "USR-004",
    name: "Ananya Gupta",
    email: "ananya.gupta@example.com",
    mobile: "9811223344",
    points: 5200,
    balance: 520.00,
    totalEarned: 1200.00,
    totalWithdrawn: 680.00,
    createdAt: "2026-01-10",
    status: "Active",
    bankDetails: {
      accountHolderName: "Ananya Gupta",
      bankName: "Axis Bank",
      accountNumber: "XXXX-XXXX-7765",
      ifsc: "UTIB0002468",
      upiId: "ananya***@axl"
    },
    transactions: [
      { id: "TXN-401", type: "Debit", amount: "-₹500.00", points: "-1500 Points", date: "2026-03-30 18:40", status: "Success" }
    ],
    taskHistory: [
      { id: "TSK-H5", title: "Watch YouTube Video #1", points: 100, date: "2026-03-30", status: "Completed" }
    ]
  }
];

export const initialWithdrawals = [
  {
    id: "WDR-501",
    userId: "USR-001",
    userName: "Aarav Sharma",
    amount: 150.00,
    method: "Bank Transfer",
    date: "2026-03-31 09:30",
    status: "Pending",
    accountMasked: "XXXX-XXXX-4821"
  },
  {
    id: "WDR-502",
    userId: "USR-002",
    userName: "Priya Patel",
    amount: 300.00,
    method: "UPI",
    date: "2026-03-31 10:15",
    status: "Pending",
    accountMasked: "priya***@ybl"
  },
  {
    id: "WDR-503",
    userId: "USR-003",
    userName: "Rohan Verma",
    amount: 100.00,
    method: "UPI",
    date: "2026-03-30 15:20",
    status: "Approved",
    accountMasked: "rohan***@icici"
  },
  {
    id: "WDR-504",
    userId: "USR-004",
    userName: "Ananya Gupta",
    amount: 500.00,
    method: "Bank Transfer",
    date: "2026-03-29 14:10",
    status: "Rejected",
    accountMasked: "XXXX-XXXX-7765"
  }
];

export const initialTasks = [
  {
    id: "TSK-001",
    title: "Watch YouTube Video #1",
    name: "Watch YouTube Video #1",
    description: "Watch the featured promotional video completely to earn reward points.",
    points: 100,
    status: "Active",
    createdAt: "2026-01-15"
  },
  {
    id: "TSK-002",
    title: "Daily Check-in Bonus",
    name: "Daily Check-in Bonus",
    description: "Open the app daily and claim your streak points.",
    points: 50,
    status: "Active",
    createdAt: "2026-01-18"
  },
  {
    id: "TSK-003",
    title: "Subscribe to Channel",
    name: "Subscribe to Channel",
    description: "Subscribe to our official partner YouTube channel.",
    points: 150,
    status: "Paused",
    createdAt: "2026-02-01"
  },
  {
    id: "TSK-004",
    title: "Complete Profile Setup",
    name: "Complete Profile Setup",
    description: "Fill in your full profile details and verify contact information.",
    points: 200,
    status: "Active",
    createdAt: "2026-02-10"
  }
];

export const initialTransactions = [
  { id: "TXN-101", userName: "Aarav Sharma", type: "Credit", amount: "₹50.00", points: "+150 Pts", date: "2026-03-30 14:20", status: "Completed" },
  { id: "TXN-102", userName: "Aarav Sharma", type: "Debit", amount: "₹100.00", points: "-300 Pts", date: "2026-03-25 11:10", status: "Success" },
  { id: "TXN-201", userName: "Priya Patel", type: "Credit", amount: "₹150.00", points: "+500 Pts", date: "2026-03-31 16:00", status: "Completed" },
  { id: "TXN-202", userName: "Priya Patel", type: "Debit", amount: "₹250.00", points: "-750 Pts", date: "2026-03-28 10:30", status: "Success" },
  { id: "TXN-301", userName: "Rohan Verma", type: "Credit", amount: "₹30.00", points: "+100 Pts", date: "2026-03-29 12:15", status: "Completed" },
  { id: "TXN-401", userName: "Ananya Gupta", type: "Debit", amount: "₹500.00", points: "-1500 Pts", date: "2026-03-30 18:40", status: "Success" }
];
