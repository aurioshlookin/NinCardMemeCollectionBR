import { doc, getDoc, collection, serverTimestamp, runTransaction } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js)";
import { db } from './firebase-config.js';

let currentOfferQty = 1;
let currentReqQty = 1;

window.updateTradeLimitsUI = () => {
    if(!window.appState.currentUser) return;
    const today = new Date().toDateString();
    
    const tradesToday = window.appState.userData.lastTradeDate === today ? (window.appState.userData.tradesToday || 0) : 0;
    const hasActiveTrade = window.appState.allOpenTrades.some(t => t.fromUserId === window.appState.currentUser.uid);
    
    document.getElementById('trade-limit-count').innerText = tradesToday;
    
    const blocker = document.getElementById('trade-form-blocker');
    if (tradesToday >= 1) {
        blocker.classList.remove('hidden');
        document.getElementById('trade-form-blocker-msg').innerText = "Você já concluiu uma troca hoje. Volte amanhã à 00:00!";
    } else if (hasActiveTrade) {
        blocker.classList.remove('hidden');
        document.getElementById('trade-form-blocker-msg').innerText = "Você já tem uma oferta ativa no mural. Cancele-a antes de criar outra.";
    } else {
        blocker.classList.add('hidden');
    }
};

window.updateTradeOptions = () => {
    const offerSelect = document.getElementById('trade-offer');
    if(!offerSelect) return;
    const currentOffer = offerSelect.value;
    offerSelect.innerHTML = '<option value="">Selecione uma carta repetida...</option>';

    window.appState.cardDatabase.forEach(card => {
        const totalQty = window.appState.userData.inventory[card.id] || 0;
        if (totalQty > 1) {
            const tradableQty = totalQty - 1; 
            offerSelect.innerHTML += `<option value="${card.id}">${card.name} (Rank ${card.tier}) - Disponíveis: ${tradableQty}</option>`;
        }
    });
    offerSelect.value = currentOffer;
    window.updateRequestTierOptions(); 
};

window.updateRequestTierOptions = () => {
    const offerId = document.getElementById('trade-offer').value;
    const reqTierSelect = document.getElementById('trade-request-tier');
    const offerPreview = document.getElementById('trade-offer-preview');
    
    if (offerId) {
        const offerCard = window.appState.cardDatabase.find(c => c.id === offerId);
        offerPreview.src = window.appState.GITHUB_RAW_URL + offerCard.img;
        offerPreview.classList.remove('hidden');
        
        const currentReqTier = reqTierSelect.value;
        reqTierSelect.innerHTML = '<option value="">Selecione a Raridade desejada...</option>';
        reqTierSelect.disabled = false;
        
        const offerVal = window.appState.TIER_VALUES[offerCard.tier];
        
        Object.keys(window.appState.TIER_VALUES).forEach(tier => {
            if (window.appState.TIER_VALUES[tier] <= offerVal) {
                reqTierSelect.innerHTML += `<option value="${tier}">Cartas Rank ${tier}</option>`;
            }
        });
        reqTierSelect.value = currentReqTier;
    } else {
        offerPreview.classList.add('hidden');
        reqTierSelect.innerHTML = '<option value="">Primeiro selecione o que vai oferecer...</option>';
        reqTierSelect.disabled = true;
    }
    window.updateTradeRatio(); 
};

document.getElementById('trade-offer').addEventListener('change', window.updateRequestTierOptions);
document.getElementById('trade-request-tier').addEventListener('change', () => window.updateTradeRatio());

window.updateTradeRatio = () => {
    const offerId = document.getElementById('trade-offer').value;
    const reqTier = document.getElementById('trade-request-tier').value;
    const infoEl = document.getElementById('trade-ratio-info');

    if(!offerId || !reqTier) {
        infoEl.innerText = "";
        currentOfferQty = 1; currentReqQty = 1;
        return;
    }

    const offerCard = window.appState.cardDatabase.find(c => c.id === offerId);
    const offerVal = window.appState.TIER_VALUES[offerCard.tier];
    const reqVal = window.appState.TIER_VALUES[reqTier];

    currentOfferQty = 1; 
    currentReqQty = (offerVal - reqVal) + 1; 

    infoEl.innerText = `Você dá 1x [${offerCard.tier}] ⇄ O outro jogador escolherá ${currentReqQty}x [${reqTier}] que você não tem para te enviar.`;
};

document.getElementById('trade-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-create-trade');
    const offerId = document.getElementById('trade-offer').value;
    const reqTier = document.getElementById('trade-request-tier').value;

    if(!offerId || !reqTier) return window.showMessage("Selecione a carta e a raridade desejada!");
    if((window.appState.userData.inventory[offerId] || 0) <= currentOfferQty) {
        return window.showMessage("Você não possui cartas suficientes para criar a oferta e manter 1 cópia.");
    }

    const today = new Date().toDateString();
    const tradesToday = window.appState.userData.lastTradeDate === today ? (window.appState.userData.tradesToday || 0) : 0;
    if (tradesToday >= 1) return window.showMessage("Você já concluiu sua troca diária.");

    btn.disabled = true;
    btn.innerText = "Publicando...";

    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", window.appState.currentUser.uid);
            const userSnap = await transaction.get(userRef);
            let inv = userSnap.data().inventory || {};

            if((inv[offerId] || 0) <= currentOfferQty) throw "Cartas insuficientes no inventário.";

            inv[offerId] -= currentOfferQty; 
            transaction.update(userRef, { inventory: inv });

            const newTradeRef = doc(collection(db, "trades"));
            transaction.set(newTradeRef, {
                fromUserId: window.appState.currentUser.uid,
                fromUserName: window.appState.currentUser.displayName,
                offerCardId: offerId,
                offerQuantity: currentOfferQty,
                requestTier: reqTier,
                requestQuantity: currentReqQty,
                status: 'open',
                timestamp: serverTimestamp()
            });
        });

        window.showMessage("Sua oferta foi para o Mural! Suas cartas foram separadas com sucesso.");
        document.getElementById('trade-offer').value = "";
        window.updateRequestTierOptions();
    } catch (err) {
        window.showMessage("Erro ao publicar: " + err);
    } finally {
        btn.disabled = false;
        btn.innerText = "Publicar Oferta no Mural";
    }
});

window.renderTradeBoard = () => {
    const myTradesList = document.getElementById('my-trades-list');
    const globalGrid = document.getElementById('global-trades-grid');
    
    myTradesList.innerHTML = '';
    globalGrid.innerHTML = '';

    let myTradesCount = 0;
    let globalTradesCount = 0;

    window.appState.allOpenTrades.sort((a,b) => b.timestamp - a.timestamp).forEach(trade => {
        const offerCard = window.appState.cardDatabase.find(c => c.id === trade.offerCardId);
        if(!offerCard) return;

        const isMyTrade = trade.fromUserId === window.appState.currentUser.uid;

        if (isMyTrade) {
            myTradesCount++;
            myTradesList.innerHTML += `
                <div class="bg-gray-900 p-3 rounded border border-gray-600 flex justify-between items-center text-sm">
                    <div class="flex items-center gap-2">
                        <span class="text-red-400 font-bold">- ${trade.offerQuantity || 1}x ${offerCard.name}</span>
                        <span class="text-gray-500">por</span>
                        <span class="text-green-400 font-bold">+ ${trade.requestQuantity}x Rank ${trade.requestTier}</span>
                    </div>
                    <button onclick="window.cancelTrade('${trade.id}')" class="text-gray-400 hover:text-red-500 transition" title="Cancelar Oferta">✖</button>
                </div>
            `;
        } 
        
        globalTradesCount++;
        let actionBtnHTML = '';

        if (isMyTrade) {
            actionBtnHTML = `<button onclick="window.cancelTrade('${trade.id}')" class="w-full py-2 font-bold text-sm transition bg-red-600 hover:bg-red-500 text-white">Cancelar Minha Oferta</button>`;
        } else {
            actionBtnHTML = `<button onclick="window.openAcceptTradeModal('${trade.id}', '${trade.fromUserId}', '${offerCard.id}', '${trade.requestTier}', ${trade.requestQuantity})" class="w-full py-2 font-bold text-sm transition bg-green-600 hover:bg-green-500 text-white">Aceitar Troca</button>`;
        }

        globalGrid.innerHTML += `
            <div class="bg-gray-900 rounded-xl border ${isMyTrade ? 'border-green-500 shadow-md shadow-green-900/50' : 'border-gray-600'} overflow-hidden flex flex-col">
                <div class="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center gap-2">
                    <img src="[https://api.dicebear.com/7.x/pixel-art/svg?seed=$](https://api.dicebear.com/7.x/pixel-art/svg?seed=$){trade.fromUserName}" class="w-6 h-6 rounded-full bg-gray-700 border border-gray-500">
                    <span class="font-bold text-sm ${isMyTrade ? 'text-green-400' : 'text-gray-200'}">${trade.fromUserName} ${isMyTrade ? '(Você)' : ''}</span>
                </div>
                <div class="p-3 flex justify-between items-center gap-2 flex-grow">
                    <div class="w-16 h-20 bg-gray-800 rounded border border-gray-600 flex flex-col justify-center items-center relative overflow-hidden" title="${offerCard.name}">
                        <span class="absolute top-0 left-0 bg-gray-900 text-white text-[8px] px-1 font-bold z-10 border-b border-r border-gray-500">R.${offerCard.tier}</span>
                        <span class="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] px-1 font-bold rounded-tl z-10">${trade.offerQuantity || 1}x</span>
                        <img src="${window.appState.GITHUB_RAW_URL + offerCard.img}" class="w-full h-full object-cover">
                    </div>
                    <span class="text-gray-500 text-[10px] font-bold text-center leading-tight">PEDE EM<br>TROCA</span>
                    <div class="w-16 h-20 bg-gray-800 rounded border-2 border-green-500/50 border-dashed flex flex-col justify-center items-center relative overflow-hidden">
                         <span class="text-xl font-bold text-green-500/50">?</span>
                         <span class="absolute top-0 left-0 bg-gray-900 text-green-400 text-[8px] px-1 font-bold border-b border-r border-green-500/50">R.${trade.requestTier}</span>
                         <span class="absolute bottom-0 right-0 bg-green-600 text-white text-[10px] px-1 font-bold rounded-tl z-10">${trade.requestQuantity}x</span>
                    </div>
                </div>
                ${actionBtnHTML}
            </div>
        `;
    });

    if(myTradesCount === 0) myTradesList.innerHTML = '<p class="text-sm text-gray-500">Nenhuma oferta ativa no momento.</p>';
    if(globalTradesCount === 0) globalGrid.innerHTML = '<div class="p-8 text-center text-gray-400 w-full col-span-full">Nenhuma oferta no Mural.</div>';
};

window.cancelTrade = (tradeId) => {
    window.showMessage("Deseja cancelar esta oferta e recuperar suas cartas?", true, async () => {
        try {
            await runTransaction(db, async (transaction) => {
                const tradeRef = doc(db, "trades", tradeId);
                const tradeSnap = await transaction.get(tradeRef);
                if (!tradeSnap.exists() || tradeSnap.data().status !== 'open') throw "Esta oferta não está mais disponível.";
                
                const tradeData = tradeSnap.data();
                if (tradeData.fromUserId !== window.appState.currentUser.uid) throw "Você não é o dono desta oferta.";

                const userRef = doc(db, "users", window.appState.currentUser.uid);
                const userSnap = await transaction.get(userRef);
                let inv = userSnap.data().inventory || {};

                inv[tradeData.offerCardId] = (inv[tradeData.offerCardId] || 0) + (tradeData.offerQuantity || 1);

                transaction.update(userRef, { inventory: inv });
                transaction.update(tradeRef, { status: 'cancelled' });
            });
            window.showMessage("Oferta cancelada e cartas devolvidas ao seu álbum!");
        } catch (e) {
            window.showMessage("Erro ao cancelar: " + e);
        }
    });
};

window.openAcceptTradeModal = async (tradeId, fromUserId, offerId, reqTier, reqQty) => {
    try {
        const today = new Date().toDateString();
        const tradesToday = window.appState.userData.lastTradeDate === today ? (window.appState.userData.tradesToday || 0) : 0;
        if (tradesToday >= 1) return window.showMessage("Você já atingiu seu limite diário de trocas hoje (1/dia).");

        const userASnap = await getDoc(doc(db, "users", fromUserId));
        if(!userASnap.exists()) throw "O criador da oferta não foi encontrado.";
        const invA = userASnap.data().inventory || {};

        let validCardsForB = [];
        let totalSupplyable = 0;

        window.appState.cardDatabase.forEach(c => {
            if (c.tier === reqTier && (invA[c.id] || 0) === 0) {
                const myQty = window.appState.userData.inventory[c.id] || 0;
                if (myQty > 0) {
                    validCardsForB.push({ ...c, myQty });
                    totalSupplyable += myQty;
                }
            }
        });

        if (totalSupplyable < reqQty) {
            return window.showMessage(`Você não possui as cartas necessárias. O jogador pede ${reqQty}x cartas Rank ${reqTier} que ele ainda não tenha no álbum.`);
        }

        window.currentTradeAccept = { tradeId, fromUserId, offerId, reqTier, reqQty, selectedIds: [] };
        
        const grid = document.getElementById('trade-accept-grid');
        grid.innerHTML = '';
        
        validCardsForB.forEach(c => {
            for(let i=0; i < c.myQty; i++) {
                const instanceId = `${c.id}_${i}`; 
                grid.innerHTML += `
                    <div id="accept-card-${instanceId}" onclick="window.toggleAcceptCard('${c.id}', '${instanceId}')" class="cursor-pointer border-2 border-transparent p-1 rounded bg-gray-800 flex flex-col items-center transition relative">
                        <img src="${window.appState.GITHUB_RAW_URL + c.img}" class="w-16 h-20 object-cover pointer-events-none rounded border border-gray-600">
                        <span class="text-[9px] mt-1 text-center font-bold truncate w-full text-white pointer-events-none">${c.name}</span>
                        <div id="check-${instanceId}" class="absolute inset-0 bg-green-500/50 hidden items-center justify-center pointer-events-none rounded">
                            <span class="text-white text-2xl font-black">✓</span>
                        </div>
                    </div>
                `;
            }
        });

        document.getElementById('btn-confirm-accept').disabled = true;
        document.getElementById('btn-confirm-accept').onclick = () => window.confirmAcceptTrade();
        document.getElementById('trade-accept-modal').classList.remove('hidden');

    } catch (e) {
        window.showMessage("Erro ao preparar troca: " + e);
    }
};

window.toggleAcceptCard = (cardId, instanceId) => {
    const state = window.currentTradeAccept;
    const el = document.getElementById(`accept-card-${instanceId}`);
    const check = document.getElementById(`check-${instanceId}`);
    
    const selectedIndex = state.selectedIds.findIndex(item => item.instanceId === instanceId);

    if (selectedIndex > -1) {
        state.selectedIds.splice(selectedIndex, 1);
        el.classList.remove('border-green-400');
        el.classList.add('border-transparent');
        check.classList.remove('flex');
        check.classList.add('hidden');
    } else {
        if (state.selectedIds.length >= state.reqQty) return;
        
        state.selectedIds.push({ cardId, instanceId });
        el.classList.remove('border-transparent');
        el.classList.add('border-green-400');
        check.classList.remove('hidden');
        check.classList.add('flex');
    }

    document.getElementById('btn-confirm-accept').disabled = (state.selectedIds.length !== state.reqQty);
};

window.confirmAcceptTrade = async () => {
    const state = window.currentTradeAccept;
    const finalCardsToSend = state.selectedIds.map(item => item.cardId);

    const btn = document.getElementById('btn-confirm-accept');
    btn.disabled = true;
    btn.innerText = "Processando Troca...";

    try {
        await runTransaction(db, async (transaction) => {
            const tradeRef = doc(db, "trades", state.tradeId);
            const userARef = doc(db, "users", state.fromUserId); 
            const userBRef = doc(db, "users", window.appState.currentUser.uid); 

            const tradeSnap = await transaction.get(tradeRef);
            if (!tradeSnap.exists() || tradeSnap.data().status !== 'open') throw "A troca já foi fechada por outra pessoa.";

            const userASnap = await transaction.get(userARef);
            const userBSnap = await transaction.get(userBRef);

            let invA = userASnap.data().inventory || {};
            let invB = userBSnap.data().inventory || {};

            const offQty = tradeSnap.data().offerQuantity || 1;

            const today = new Date().toDateString();
            let tradesA = userASnap.data().lastTradeDate === today ? (userASnap.data().tradesToday || 0) : 0;
            let tradesB = userBSnap.data().lastTradeDate === today ? (userBSnap.data().tradesToday || 0) : 0;
            
            if (tradesA >= 1) throw "O criador da oferta já atingiu o limite de trocas de hoje.";
            if (tradesB >= 1) throw "Você atingiu seu limite diário de trocas.";

            finalCardsToSend.forEach(id => {
                if((invB[id] || 0) < 1) throw "Inventário insuficiente! Alguém já usou essa carta.";
                invB[id]--;
                invA[id] = (invA[id] || 0) + 1;
            });

            invB[state.offerId] = (invB[state.offerId] || 0) + offQty;

            transaction.update(userARef, { inventory: invA, tradesToday: 1, lastTradeDate: today });
            transaction.update(userBRef, { inventory: invB, tradesToday: 1, lastTradeDate: today });
            transaction.update(tradeRef, { status: 'completed', acceptedBy: window.appState.currentUser.uid });
        });

        document.getElementById('trade-accept-modal').classList.add('hidden');
        window.showMessage("MUITO BEM! A troca foi realizada com sucesso.");
    } catch (e) {
        window.showMessage("Falha na transação. Você atualizou as Regras do Firebase conforme o tutorial?");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Envio";
    }
};
