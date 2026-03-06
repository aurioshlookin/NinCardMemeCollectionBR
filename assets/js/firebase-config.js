import { initializeApp } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js)";
import { getAuth } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js)";
import { getFirestore } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js)";

const firebaseConfig = {
    apiKey: "AIzaSyAWcdJV6INuUeo6-STW5J_VYZ7aUzO51KI",
    authDomain: "nincardcollectionbr.firebaseapp.com",
    projectId: "nincardcollectionbr",
    storageBucket: "nincardcollectionbr.firebasestorage.app",
    messagingSenderId: "453676287016",
    appId: "1:453676287016:web:d9d42209a871b5c3c0211d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Objeto global para armazenar o estado da aplicação
window.appState = {
    currentUser: null,
    userData: { pullsAvailable: 0, inventory: {}, role: 'player', tradesToday: 0, lastTradeDate: "", lastPullTimestamp: null },
    cardDatabase: [],
    allOpenTrades: [],
    GITHUB_RAW_URL: "[https://raw.githubusercontent.com/aurioshlookin/NinCardMemeCollectionBR/main/assets/cards/](https://raw.githubusercontent.com/aurioshlookin/NinCardMemeCollectionBR/main/assets/cards/)",
    TIER_VALUES: { 'C': 1, 'B': 2, 'A': 3, 'S': 4, 'SS': 5 },
    TIER_ORDER: ['SS', 'S', 'A', 'B', 'C']
};

export { auth, db };
