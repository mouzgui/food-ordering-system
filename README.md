# 🍽️ TableFlow

> The Operating System for Modern Restaurants. A multi-tenant SaaS platform enabling seamless QR code table ordering, real-time kitchen management, and beautiful digital menus.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## ✨ Features

### 📱 For Customers: The "Wow" Ordering Experience
- **No App Required**: Customers simply scan a QR code at their table to view the menu.
- **Premium Glassmorphism UI**: Beautiful, app-like mobile experience with sticky headers, animated floating cart buttons, and emoji-matched categories.
- **Real-Time Order Tracking**: Once an order is placed, a live tracking timeline updates instantly via WebSockets as the kitchen processes the order.
- **Post-Delivery Delight**: A satisfying confetti explosion and a 5-star rating feedback prompt appear the moment their meal is marked "Delivered".
- **Multi-Language**: Full i18n support for English, French, and Arabic (RTL).

### 👨‍🍳 For Staff: The Real-Time Dashboard
- **Live Orders Kanban Board**: Drag-and-drop or click to advance orders through `Pending` → `Preparing` → `Ready` → `Delivered`. 
- **Global Audio & Visual Notifications**: Hear a "Ding!" and see a toast popup from *any* page on the dashboard the second a new order arrives.
- **Dynamic Analytics Overview**: Track today's live revenue, active order counts, and best-selling items in real-time.
- **Menu Management**: Easily add, edit, or toggle the availability of menu items and categories.
- **Table & QR Management**: Generate and print beautiful, scannable QR codes for every table in the restaurant.
- **Role-Based Access Control**: Multi-tenant architecture supporting Owners, Managers, and Waiters with strict Row-Level Security (RLS).

---

## 🏗️ Architecture & Tech Stack

TableFlow is built for scale, utilizing a modern, edge-ready tech stack:

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom glassmorphism utilities & `framer-motion` / CSS animations.
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
  - **Auth**: Secure email/password authentication.
  - **Realtime**: Postgres Change Data Capture (CDC) over WebSockets for instant order updates across devices.
  - **Security**: Strict Row Level Security (RLS) policies ensuring absolute tenant data isolation.
- **Internationalization**: [`next-intl`](https://next-intl-docs.vercel.app/) for seamless routing and translations.
- **Components**: [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible dashboard components.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase Project (Free tier works great)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/startup.git tableflow
cd tableflow
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=TableFlow
```

### 3. Setup the Database
Navigate to your Supabase SQL Editor and run the migration files located in the `supabase/migrations/` folder in sequential order:
1. `00001_create_base_schema.sql`
2. `00002_create_rls_policies.sql`
3. `00003_create_functions.sql`
4. `00004_public_orders_read.sql`

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app!

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/        # Login & Registration flows
│   ├── (customer)/    # The mobile-first QR ordering app
│   ├── (dashboard)/   # The kitchen & management dashboard
│   ├── (landing)/     # Public marketing pages
│   └── globals.css    # Global styles & custom animations
├── components/        # Reusable UI components (shadcn)
├── lib/               # Utility functions & Supabase clients
├── messages/          # i18n translation dictionaries (en, fr, ar)
└── supabase/          # Database schema & migrations
```

---

## 🔒 Security & Multi-Tenancy

TableFlow uses **PostgreSQL Row Level Security (RLS)** to enforce multi-tenancy at the database level. 
Every query is automatically scoped to the logged-in user's `restaurant_id`, guaranteeing that staff from one restaurant can *never* access data from another.

For customers, anonymous realtime subscriptions are secured using custom RLS policies that only allow them to listen to updates for their specific `order_id`.

---

## 🎨 Design Philosophy

TableFlow's UI is designed to feel less like a website and more like a **premium native application**:
- We use **Apple-inspired glassmorphism** (`backdrop-blur`) heavily on mobile interfaces.
- We replaced standard browser scrollbars with custom `no-scrollbar` utilities.
- Important interactions (like adding to cart or delivering an order) are paired with micro-animations and Web Audio API sound effects.

---

*Built with ❤️ for modern hospitality.*
