window.authMode = 'login';
window.currentAlbumSort = 'tier-desc';
window.currentAlbumView = 'grid';

window.showModal = (mode) => {
    window.authMode = mode;
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-password').value = '';
    document.getElementById('modal-title').innerText = mode === 'register' ? 'Criar Conta' : 'Entrar';
    document.getElementById('auth-submit-btn').innerText = mode === 'register' ? 'Cadastrar' : 'Login';
};

window.closeModal = () => document.getElementById('auth-modal').classList.add('hidden');

window.showMessage = (msg, isConfirm = false, onConfirm = null) => {
    document.getElementById('msg-modal-text').innerText = msg;
    const modal = document.getElementById('msg-modal');
    const btnCancel = document.getElementById('msg-modal-cancel');
    const btnOk = document.getElementById('msg-modal-ok');
    
    modal.classList.remove('hidden');
    
    if (isConfirm) {
        btnCancel.classList.remove('hidden');
        btnOk.onclick = () => { modal.classList.add('hidden'); if(onConfirm) onConfirm(); };
        btnCancel.onclick = () => { modal.classList.add('hidden'); };
    } else {
        btnCancel.classList.add('hidden');
        btnOk.onclick = () => { modal.classList.add('hidden'); };
    }
};

window.switchTab = (tabName) => {
    ['gacha', 'album', 'explore', 'trade', 'admin'].forEach(t => {
        const sec = document.getElementById(`section-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if(!btn) return;

        if (t === tabName) {
            sec.classList.remove('hidden'); sec.classList.add('flex');
            btn.classList.remove('tab-inactive', 'text-yellow-600', 'text-green-500', 'text-red-600', 'border-transparent');
            btn.classList.add('tab-active');
            if(t === 'explore') btn.classList.add('text-yellow-500', 'border-yellow-500');
            if(t === 'trade') btn.classList.add('text-green-500', 'border-green-500');
            if(t === 'admin') btn.classList.add('text-red-500', 'border-red-500');

            if (t === 'explore' && window.loadAllPlayers) window.loadAllPlayers(); 
            if (t === 'admin' && window.loadGitHubImages) {
                window.loadGitHubImages(); 
                window.updateAdminPreview(); 
            }
        } else {
            sec.classList.add('hidden'); sec.classList.remove('flex');
            btn.classList.remove('tab-active', 'text-yellow-500', 'border-yellow-500', 'text-green-500', 'border-green-500', 'text-red-500', 'border-red-500');
            btn.classList.add('tab-inactive', 'border-transparent');
            if(t === 'explore') btn.classList.add('text-yellow-600');
            if(t === 'trade') btn.classList.add('text-green-500');
            if(t === 'admin') btn.classList.add('text-red-600');
        }
    });
};

window.setAlbumViewMode = (mode) => {
    window.currentAlbumView = mode;
    ['grid', 'table', 'ranked'].forEach(m => {
        const btn = document.getElementById(`btn-view-${m}`);
        if(btn) {
            if (m === mode) {
                btn.classList.add('bg-green-600', 'text-white');
                btn.classList.remove('text-gray-400', 'hover:bg-gray-700', 'hover:text-white', 'bg-gray-600');
            } else {
                btn.classList.remove('bg-green-600', 'text-white', 'bg-gray-600');
                btn.classList.add('text-gray-400', 'hover:bg-gray-700', 'hover:text-white');
            }
        }
    });
    if(window.refreshAlbum) window.refreshAlbum();
};

window.updateAlbumViewSettings = () => {
    window.currentAlbumSort = document.getElementById('album-sort').value;
    if(window.refreshAlbum) window.refreshAlbum();
};

// Audio
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

window.playGachaSound = (tier) => {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    
    if(tier === 'SS') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);

        const osc2 = audioCtx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(450, now);
        osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        osc2.connect(gainNode);
        osc2.start(now); osc2.stop(now + 1.5);
    } else if(tier === 'S') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
        osc.start(now); osc.stop(now + 1);
    } else if(tier === 'A' || tier === 'B') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
};

window.fireConfetti = (tier) => {
    if(typeof confetti !== 'function') return;
    if(tier === 'SS') {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#ef4444', '#000000', '#ffffff'], zIndex: 1000 });
    } else if(tier === 'S') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#facc15', '#ffffff'], zIndex: 1000 });
    }
};
