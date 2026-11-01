// 🏀 Hoop Culture Scoreboard — Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYw1Wg2YMdd3M6GRlA-dThBhjaYG7bys8",
  authDomain: "hoop-culture-scoreboard.firebaseapp.com",
  databaseURL: "https://hoop-culture-scoreboard-default-rtdb.firebaseio.com",
  projectId: "hoop-culture-scoreboard",
  storageBucket: "hoop-culture-scoreboard.firebasestorage.app",
  messagingSenderId: "953830619002",
  appId: "1:953830619002:web:e154a9c5118e7a0105c8c3"
};

// Auto-detect if Firebase is configured
const isFirebaseConfigured = typeof firebaseConfig !== 'undefined' &&
                             firebaseConfig.apiKey &&
                             firebaseConfig.apiKey !== "YOUR_API_KEY";
