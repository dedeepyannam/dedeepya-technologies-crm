# CRM Production Deployment Guide

This guide provides step-by-step instructions for deploying the CRM application to production using **Vercel** (Frontend), **Render** (Backend), and **Render/Supabase/Neon** (PostgreSQL Database).

---

## 1. PostgreSQL Database Setup (Render / Supabase / Neon)
We recommend using a managed PostgreSQL hosting provider. Render offers a great free-tier PostgreSQL database.

1. Create an account on [Render](https://render.com/).
2. Click **New** -> **PostgreSQL**.
3. Name your database (e.g. `crm-db`) and click **Create Database**.
4. Once created, copy the **Internal Database URL** (if deploying backend to Render) or the **External Database URL**.
   *(Format: `postgresql://user:password@hostname:5432/dbname`)*

### Database Initialization
Before deploying, you must initialize the database schema:
1. Connect to your production database using `psql` or a tool like DBeaver/pgAdmin using the External Database URL.
2. Run the SQL script located at `server/src/config/schema.sql`.

---

## 2. Backend Deployment (Render)

1. Go to your Render Dashboard and click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `crm-backend` (or similar)
   - **Environment**: `Node`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Expand the **Advanced** section and add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DATABASE_URL`: *(Paste the Database URL from Step 1)*
   - `JWT_SECRET`: *(Generate a strong, random 32-character string)*
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: *(Leave this blank for now, you will update it in Step 4)*
5. Click **Create Web Service**.
6. Once deployed, copy your Backend URL (e.g. `https://dedeepya-crm-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

1. Create an account on [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
2. Import your GitHub repository.
3. Configure the following settings:
   - **Project Name**: `crm-dashboard`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand the **Environment Variables** section and add:
   - `VITE_API_BASE_URL`: `https://crm-backend.onrender.com/api/v1` *(Use the Backend URL from Step 2 + `/api/v1`)*
5. Click **Deploy**.
6. Once deployed, copy your Frontend URL (e.g. `dedeepya-technologies-a5aek4wyo-dedeepya-yannam.vercel.app`).

---

## 4. Finalize Configuration

Now that you have your Frontend URL, you must update the backend CORS settings to allow requests from the Vercel app.

1. Go back to your **Backend (Render) Web Service**.
2. Navigate to **Environment**.
3. Update or Add the `CLIENT_URL` environment variable:
   - `CLIENT_URL`: `dedeepya-technologies-a5aek4wyo-dedeepya-yannam.vercel.app` *(Your Vercel URL without a trailing slash)*
4. Save the changes. Render will automatically redeploy the backend.

---

## ✅ Deployment Complete!
You can now access your CRM via your Vercel URL. The frontend will communicate securely with your Render backend and PostgreSQL database.
