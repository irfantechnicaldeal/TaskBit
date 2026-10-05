# TaskBit Admin Panel (Frontend UI)

A professional, responsive React + Vite admin dashboard built for managing TaskBit users, payouts/withdrawals, and reward tasks.

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Run Development Server:**
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
4. Configure the backend environment and provision an admin account using the backend's `admin:provision` command. There is no public admin registration route.

## Features:
- **Dashboard Overview:** Metric cards for Total Users, Total Points, Total Balance, and Pending Withdrawals.
- **User Management:** Searchable user table with detailed user inspection modal (including masked bank details and transaction history).
- **Withdrawal Requests:** Approve / Reject payout requests.
- **Task Management:** Add, edit, and delete reward tasks.
