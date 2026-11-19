# 🎓 AI Tutor — Multimodal Personalized Learning Platform

> **Transform study materials into interactive AI tutoring sessions with real-time comprehension evaluation and automated spaced-repetition flashcards.**

AI Tutor is an intelligent educational platform powered by Google Gemini AI and Firebase. It turns dense textbooks, lecture notes, PDFs, PowerPoint slides, and handwritten diagrams into structured, interactive study modules — providing continuous feedback, Socratic reasoning challenges, and automated flashcard retention systems.

---

## 📖 About the Project

### 🎯 Problem Statement
Students are frequently overwhelmed by unstructured study resources, passive reading habits, and lack of personalized 1-on-1 tutoring. Traditional study workflows lack active recall reinforcement, fail to identify specific knowledge gaps mid-lesson, and do not provide automated follow-up on weak topics, leading to poor long-term retention.

### 💡 The Solution
AI Tutor acts as a 24/7 personal academic mentor. By uploading course materials in any format, students receive AI-synthesized learning modules with dynamic difficulty adjustment. The AI tutor chats interactively, presents mid-lesson comprehension checkpoints, switches between explanatory and Socratic questioning modes, scores answers with constructive feedback, and automatically converts misunderstood concepts into spaced-repetition review decks.

### 🌟 Core Value Proposition
- **Multimodal Content Ingestion**: Instant client-side parsing of text, images, PDFs, and slide decks into bite-sized learning curricula.
- **Active Recall & Socratic Reasoning**: Interactive dialogue where the AI probes for understanding rather than just spoon-feeding answers.
- **Automated Spaced-Repetition**: Automatically compiles struggled topics into Leitner-style flashcard decks with adaptive review intervals.
- **Quantifiable Progress Tracking**: Visual score distributions, topic mastery ratings, and study streak analytics.

---

## ✨ Features

- 📄 **Multimodal Document Upload** — Direct client-side parsing of lecture images, PDFs, and PPTX files with zero server storage overhead.
- 🧠 **AI-Generated Study Modules** — Google Gemini 2.5 Flash decomposes complex syllabus documents into 3–5 focused, logical modules.
- 💬 **Interactive AI Tutor Chat** — Real-time conversational tutor explaining concepts, asking verification questions, and grading student comprehension.
- 🏛️ **Socratic Guided Mode** — Optional tutoring mode that withholds direct answers, instead guiding students through step-by-step reasoning.
- 📊 **Session Comprehension Evaluation** — "Finish & Evaluate" engine scores student understanding (1–10) with detailed performance feedback.
- 🗂️ **Adaptive Spaced-Repetition Flashcards** — Auto-generated flashcard decks focused strictly on concepts the student struggled with during the session.
- 📈 **Visual Performance Analytics** — Interactive Chart.js charts depicting score distributions, weekly study activity, and weak topic rankings.
- 🔒 **Secure Firebase Authentication** — Google and email/password authentication with isolated per-user data persistence in Cloud Firestore.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite 7 |
| **Routing & Navigation** | React Router DOM v7 |
| **Styling & Icons** | Vanilla CSS3, Lucide React |
| **AI / LLM Integration** | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| **Backend & Database** | Firebase Authentication + Cloud Firestore |
| **Data Visualizations** | Chart.js + react-chartjs-2 |
| **Document Processing** | pdfjs-dist (client-side PDF extraction), JSZip |

---

## 📁 Folder Structure

```
AI-Tutor/
├── functions/                  # Firebase Cloud Functions & backend utilities
├── public/                     # Public assets and icons
├── src/
│   ├── assets/                 # Graphics and SVGs
│   ├── components/             # Navbar, module cards, flashcard flip widgets
│   ├── contexts/               # AuthContext state provider
│   ├── lib/                    # Firebase client and Gemini AI prompt workflows
│   ├── pages/                  # Views (Home, Auth, Dashboard, Chat, Review, Profile)
│   ├── App.jsx                 # Route definitions and application layout
│   └── main.jsx                # Application entrypoint
├── firebase.json               # Firebase deployment configuration
├── firestore.rules             # Firestore access rules
├── package.json                # Project dependencies and npm scripts
└── vite.config.js              # Vite bundler configuration
```

---

## 🚀 How to Install and Run

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) & `npm`
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- A Firebase project with Firestore and Authentication enabled

### 1. Clone the Repository
```bash
git clone https://github.com/karthiban3333-maker/AI-Tutor.git
cd AI-Tutor
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your `VITE_GOOGLE_API_KEY` and Firebase configuration keys.

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Build for Production
```bash
npm run build
npm run preview
```

---

## 📸 Screenshots

> _Add screenshots here._

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 👨‍💻 Author

**Karthiban A** — [Kode Prime](https://github.com/karthiban3333-maker)
