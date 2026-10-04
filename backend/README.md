# TaskBit MERN Backend Server

This folder contains the Node.js, Express, and MongoDB backend server for the TaskBit Android application.

## How to Run:

1. Make sure you have **Node.js** and **MongoDB** installed on your machine.
2. Open a terminal in the `backend` folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
   Or for development with nodemon:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000` and connect to MongoDB. The Android app is already configured via Retrofit to communicate with `http://10.0.2.2:5000/api/`.
