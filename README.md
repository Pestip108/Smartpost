# 🚀 SmartPost AI

SmartPost AI is a web application that helps users generate, manage, and automatically publish social media content using Artificial Intelligence.

Users can connect their social media accounts, generate AI-powered posts based on trends or custom topics, and schedule automated publishing across platforms.

---

## 📌 Features

### 🔐 Authentication
- User registration & login
- Secure JWT-based authentication
- Role-based access (User / Admin)

### 🔗 Social Media Integration
- Connect multiple social media accounts
- OAuth-based authentication
- Token storage & refresh handling

### 🤖 AI Content Generation
- Generate posts from custom topics
- AI-based research & report generation
- Transform reports into publish-ready content
- Supports text, images, and video (AI-generated)

### 🔍 Trend Analysis & Scraping
- Scrape social media platforms for trending topics
- Analyze public sentiment and discussions
- Generate insights-based posts

### 📝 Post Management
- Create, edit, and delete posts
- Save drafts before publishing
- View post history

### 📤 Publishing System
- Publish posts to connected accounts
- Multi-platform support
- Track post status (Draft, Posted, Failed)

### ⏰ Scheduled Posting
- Automatically generate posts at intervals
- Fully automated publishing
- Configurable scheduling system

---

## 🏗️ Tech Stack

### Frontend
- React.js
- HTML / CSS
- Axios

### Backend
- Node.js
- Express.js

### Database
- MySQL
- Prisma ORM

### AI & Automation
- OpenAI API (content generation)
- Puppeteer (scraping)
- Cron jobs / background workers

---

## 🧩 System Architecture

- A **User** can connect multiple social accounts
- Each **Post** belongs to a specific social account
- **ScheduledTask** automates content generation and publishing

---
## 🔄 Application Flow

### 1. Connect Social Account
1. User selects platform
2. OAuth login is triggered
3. Access token is stored securely

### 2. Generate AI Post
1. User provides topic
2. System scrapes related content
3. AI generates report
4. AI generates post
5. User approves or edits
6. Post is published

### 3. Scheduled Posts
1. User sets topic + interval
2. System runs background job
3. Generates and publishes posts automatically

---

## ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smartpost-ai.git
```
### Frontend setup
```bash
cd smartpost-ai
npm install
```

### Backend setup
```bash
cd backend
npm install
cp .env.example .env
```

Fill the .env file with values:
```
PORT=4000
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL="mysql://user:password@localhost:3306/smartpost"

JWT_SECRET=
OPENAI_API_KEY=
```

Replace 'user' with your MySQL80 instance user and 'password' with its password.

Create database in MySQL80:
```
CREATE DATABASE smartpost;
```

Finalize:
```bash
npx prisma migrate dev
```
---
## Run the Project

```bash
# Run backend
npm run dev

# Run frontend (if separate)
npm start
```

---

## 🧪 Testing

- Test authentication flows
- Test AI generation
- Test scraping system
- Test publishing system
- Test scheduled tasks

---

## 🔒 Security Considerations

- Store secrets in environment variables
- Use HTTPS in production
- Validate all user inputs
- Restrict CORS in production
- Secure token storage

---

## 📈 Future Improvements

- Multi-platform simultaneous posting
- Advanced analytics dashboard
- AI media generation improvements
- Notification system
- Team collaboration features

