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

## Admin authentication

There is no public admin registration route. Set `MONGO_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the backend environment, then run `npm run admin:provision` from this folder. Provisioning stores only a bcrypt password hash; it can also reset the password for the same email.

The running backend needs `MONGO_URI`, `ADMIN_JWT_SECRET` (a randomly generated value with at least 32 characters), and `ADMIN_PANEL_ORIGIN` (the exact deployed admin site origin, without a path). Keep `JWT_SECRET` configured for the existing Android user login/register JWTs. Set `NODE_ENV=production` in production so the admin session cookie uses `Secure` and cross-site `SameSite=None` attributes. The admin panel host needs `VITE_API_BASE_URL` set to the backend URL ending in `/api`.

The admin session lasts eight hours and uses an HttpOnly cookie. Password reset by email is not implemented; an administrator can change their password from account settings while signed in, or an operator can provision a new password using the environment-based command above.
