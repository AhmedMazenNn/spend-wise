# 💸 Spend Wise

Spend Wise is a full-stack personal expense tracking web application that allows users to track their daily spending, filter by custom date ranges, and generate printable PDF reports.

Built with a modern MERN-style architecture.

---

## 🚀 Tech Stack

### Frontend
- React
- TypeScript
- Axios
- Modern component-based architecture

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt for password hashing

---

## 📂 Project Structure
spend-wise/
│
├── frontend/ # React + TypeScript app
└── backend/ # Express + MongoDB API


---

## ✨ Features (Planned & In Progress)

- User authentication (JWT-based)
- Add / Edit / Delete expenses
- Filter expenses by:
  - Specific day
  - Specific month
  - Custom date range
- Predefined categories with icons
- Monthly and custom-range PDF reports
- Admin dashboard (role-based access)
- Pagination for expenses
- Mobile-ready REST API

---

## ⚙️ Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/spend-wise.git
cd spend-wise

---

### 2️⃣ Setup Backend

```bash
cd backend
npm install

Create a .env file inside backend/:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000

Start backend:
```bash
npm run dev

---

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install
npm start