# 🎓 AI Tutor

> An intelligent, personalized learning platform powered by Google Gemini AI and Firebase — turning any study material into interactive tutoring sessions with spaced-repetition flashcard reviews.

AI Tutor lets students upload lecture notes, PDFs, PowerPoint slides, or images, and instantly generates structured study modules. Each module comes with a live AI tutor chat interface that teaches, challenges, and evaluates understanding in real time. After each session, the app auto-generates targeted flashcards based on concepts the student struggled with, delivered through a spaced-repetition review system.

---

## ✨ Features

- **📄 Multimodal Input** — Upload images, PDFs, or PPTX files; text is extracted automatically client-side (no server uploads)
- **🧠 AI-Generated Study Modules** — Gemini 2.5 Flash breaks study material into 3–5 focused, labelled modules per topic
- **💬 Interactive AI Tutor Chat** — Conversational tutor that explains, asks comprehension-check questions, and tracks incorrect answers mid-session
- **🧐 Socratic Mode** — Toggle a guided questioning mode where the tutor never gives answers directly, nudging students to reason it out
- **📊 Session Evaluation** — "Finish & Evaluate" scores the student's understanding (1–10), provides written feedback, and updates module completion status
- **🃏 Spaced-Repetition Flashcards** — Flashcards are automatically generated from the student's struggled concepts after each evaluated session
- **🔁 Flashcard Review Deck** — Flip-card UI with Again / Good / Easy ratings that schedule the next review (1 / 3 / 7 days)
- **📈 Performance Dashboard** — Pie chart (score distribution), bar chart (weekly activity), and weak-area rankings with visual score bars
- **🔥 Streak Tracking** — Daily study streaks updated on every completed module evaluation
- **🔐 Firebase Authentication** — Secure Google / email login with per-user data isolation in Firestore
- **🗂️ Topic Management** — Organise modules by topic with tabbed navigation; delete individual modules or entire subjects

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| AI / LLM | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Backend / Database | Firebase Firestore + Firebase Auth |
| Deployment | Firebase Hosting |
| Charts | Chart.js + react-chartjs-2 |
| PDF Parsing | pdfjs-dist (client-side, CDN worker) |
| PPTX Parsing | JSZip (client-side XML extraction) |
| Icons | Lucide React |
| Cloud Functions | Firebase Functions (Node.js) |
| Linting | ESLint 9 |

---

## 📁 Folder Structure

```
AI TUTOR/
├── src/
│   ├── components/
│   │   └── Navbar.jsx          # Top navigation bar
│   ├── contexts/
│   │   └── AuthContext.jsx     # Firebase Auth context & provider
│   ├── lib/
│   │   ├── firebase.js         # Firestore & Auth initialisation
│   │   └── gemini.js           # All Gemini API calls (modules, chat, eval, flashcards)
│   ├── pages/
│   │   ├── Auth.jsx            # Login / sign-up page
│   │   ├── Home.jsx            # Module library + study material upload
│   │   ├── Chat.jsx            # Per-module AI tutor chat interface
│   │   ├── Dashboard.jsx       # Progress charts & weak-area analysis
│   │   ├── Review.jsx          # Spaced-repetition flashcard review
│   │   └── Profile.jsx         # User profile & settings
│   ├── App.jsx                 # Route definitions & layout wrapper
│   └── main.jsx                # React app entry point
├── functions/
│   └── index.js                # Firebase Cloud Functions
├── public/                     # Static assets
├── firebase.json               # Firebase hosting & functions config
├── firestore.rules             # Firestore security rules
├── vite.config.js              # Vite build configuration
└── package.json
```

---

## 🚀 Installation & Running

### Prerequisites
- Node.js ≥ 18
- A [Firebase project](https://console.firebase.google.com/) with Firestore and Authentication enabled
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

### 1. Clone the repository
```bash
git clone https://github.com/karthiban3333-maker/AI-Tutor.git
cd AI-Tutor
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```env
VITE_GOOGLE_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Start the development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for production
```bash
npm run build
```

### 6. Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## 📸 Screenshots

> _Add screenshots here._

---

## 📄 License

This project is private and proprietary.

---

## 👨‍💻 Author

**Karthiban A** — [Kode Prime](https://github.com/karthiban3333-maker)
