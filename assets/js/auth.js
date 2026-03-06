import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js)";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js)";
import { auth, db } from './firebase-config.js';

let unsubUser = null;
let unsubTrades = null;

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

setInterval(() => {
    if (!window.appState.currentUser || !window.appState.userData) return;
    
    let uData = window.appState.userData;
    if (uData.pullsAvailable < 3 && uData.lastPullTimestamp) {
        const now = Date.now();
        const timePassed = now - uData.lastPullTimestamp;
        
        if (timePassed >= EIGHT_HOURS) {
            const pullsEarned = Math.floor(timePassed / EIGHT_HOURS);
            let newPulls = Math.min(3, uData.pullsAvailable + pullsEarned);
            let newTimestamp = uData.lastPullTimestamp + (pullsEarned * EIGHT_HOURS);
            if (newPulls === 3) newTimestamp = null; 

            updateDoc(doc(db, "users", window.appState.currentUser.uid), { pullsAvailable: newPulls, lastPullTimestamp: newTimestamp });
            
            uData.pullsAvailable = newPulls;
            uData.lastPullTimestamp = newTimestamp;
            if(window.updateGachaUI) window.updateGachaUI();
        }

        if (uData.pullsAvailable < 3 && uData.lastPullTimestamp) {
            const timerContainer = document.getElementById('pull-timer-container');
            const timerText = document.getElementById('pull-timer');
            const largeTimer = document.getElementById('large-pull-timer');

            if (timerContainer) timerContainer.classList.remove('hidden');
            
            const timeLeft = EIGHT_HOURS - ((Date.now() - uData.lastPullTimestamp) % EIGHT_HOURS);
            const h = Math.floor(timeLeft / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((timeLeft % (1000 * 60)) / 1000).toString().padStart(2, '0');
            
            const timeString = `${h}h ${m}m ${s}s`;
            if (timerText) timerText.innerText = timeString;
            if (largeTimer) largeTimer.innerText = timeString;
        }
    } else {
        const timerContainer = document.getElementById('pull-timer-container');
        if (timerContainer) timerContainer.classList.add('hidden');
    }
}, 1000);

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const pass = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if(safeUsername.length < 3) {
        errorEl.innerText = "Seu usuário deve ter pelo menos 3 letras.";
        errorEl.classList.remove('hidden');
        return;
    }
    const fakeEmail = `${safeUsername}@nincard.com`;
    
    try {
        if (window.authMode === 'register') {
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
            await updateProfile(userCredential.user, { displayName: username });
            
            const userRole = safeUsername === 'auriosh' ? 'admin' : 'player';

            await setDoc(doc(db, "users", userCredential.user.uid), {
                displayName: username,
                displayNameLower: username.toLowerCase(),
                pullsAvailable: 3,
                lastPullTimestamp: null,
                inventory: {},
                role: userRole,
                tradesToday: 0,
                lastTradeDate: new Date().toDateString()
            });
        } else {
            await signInWithEmailAndPassword(auth, fakeEmail, pass);
        }
        window.closeModal();
    } catch (error) {
        let errorMsg = error.message.replace('Firebase: ', '');
        if (error.code === 'auth/email-already-in-use') errorMsg = "Este usuário já está em uso!";
        if (error.code === 'auth/invalid-credential') errorMsg = "Usuário ou senha incorretos!";
        
        errorEl.innerText = errorMsg;
        errorEl.classList.remove('hidden');
    }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    window.appState.currentUser = user;
    if (user) {
        document.getElementById('logged-out-view').classList.add('hidden');
        document.getElementById('logged-in-view').classList.remove('hidden');
        document.getElementById('logged-in-view').classList.add('flex');
        document.getElementById('user-display-name').innerText = user.displayName || 'Ninja';
        document.getElementById('user-avatar').src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.displayName || user.uid}`;
        
        document.getElementById('gacha-locked').classList.add('hidden');
        document.getElementById('album-locked').classList.add('hidden');
        document.getElementById('album-content').classList.remove('hidden');
        document.getElementById('album-content').classList.add('flex');
        document.getElementById('tab-trade').classList.remove('hidden');

        if (window.appState.cardDatabase.length > 0) {
            document.getElementById('gacha-content').classList.remove('hidden');
            document.getElementById('gacha-content').classList.add('flex');
            document.getElementById('gacha-empty-db').classList.add('hidden');
        }

        if(unsubUser) unsubUser();
        unsubUser = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
            if (docSnap.exists()) {
                window.appState.userData = docSnap.data();
                let uData = window.appState.userData;

                if (uData.pullsAvailable < 3 && !uData.lastPullTimestamp) await updateDoc(doc(db, "users", user.uid), { lastPullTimestamp: Date.now() });
                if (user.email === 'auriosh@nincard.com' && uData.role !== 'admin') await updateDoc(doc(db, "users", user.uid), { role: 'admin' });

                if(window.updateGachaUI) window.updateGachaUI();
                if(window.renderAlbumHTML) window.renderAlbumHTML('album-grid', uData.inventory);
                if(window.updateTradeOptions) window.updateTradeOptions(); 
                if(window.updateTradeLimitsUI) window.updateTradeLimitsUI();

                if (uData.role === 'admin') document.getElementById('tab-admin').classList.remove('hidden');
                else document.getElementById('tab-admin').classList.add('hidden');
            }
        });

        if(unsubTrades) unsubTrades();
        unsubTrades = onSnapshot(query(collection(db, "trades"), where("status", "==", "open")), (snapshot) => {
            window.appState.allOpenTrades = [];
            snapshot.forEach(doc => window.appState.allOpenTrades.push({ id: doc.id, ...doc.data() }));
            if(window.renderTradeBoard) window.renderTradeBoard();
            if(window.updateTradeLimitsUI) window.updateTradeLimitsUI();
        });

    } else {
        document.getElementById('logged-out-view').classList.remove('hidden');
        document.getElementById('logged-in-view').classList.add('hidden');
        document.getElementById('logged-in-view').classList.remove('flex');
        document.getElementById('tab-admin').classList.add('hidden');
        document.getElementById('tab-trade').classList.add('hidden');
        
        document.getElementById('gacha-locked').classList.remove('hidden');
        document.getElementById('gacha-content').classList.add('hidden');
        document.getElementById('gacha-content').classList.remove('flex');
        document.getElementById('gacha-empty-db').classList.add('hidden');
        
        document.getElementById('album-locked').classList.remove('hidden');
        document.getElementById('album-content').classList.add('hidden');
        document.getElementById('album-content').classList.remove('flex');
        
        if(unsubUser) unsubUser();
        if(unsubTrades) unsubTrades();
    }
});
