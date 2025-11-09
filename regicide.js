const SUITS = ['hearts','diamonds','clubs','spades'];
const NUMBER_RANKS = Array.from({length:9}, (_,i)=>String(i+2));
const MAX_HAND_SOLO = 8;

// Helpers
function cardValue(rank){ if(rank==='A') return 1; if(rank==='J') return 10; if(rank==='Q') return 15; if(rank==='K') return 20; return parseInt(rank,10);}
function suitSymbol(s){ return s==='hearts'?'♥':s==='diamonds'?'♦':s==='clubs'?'♣':'♠'; }
function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]] } return b;}

// Build decks
function buildCastle(){
  const kings = shuffle(SUITS.map(s=>({suit:s,rank:'K'})));
  const queens = shuffle(SUITS.map(s=>({suit:s,rank:'Q'})));
  const jacks = shuffle(SUITS.map(s=>({suit:s,rank:'J'})));
  return [...kings,...queens,...jacks];
}
function buildTavern(){
  const tav=[];
  for(const s of SUITS){
    for(const r of NUMBER_RANKS) tav.push({suit:s,rank:r});
  }
  for(let i=0;i<4;i++) tav.push({suit:SUITS[i%4],rank:'A',animal:true});
  return shuffle(tav);
}

// Face stats
function faceStats(card){
  if(!card) return null;
  if(card.rank==='J') return {attack:10, health:20};
  if(card.rank==='Q') return {attack:15, health:30};
  if(card.rank==='K') return {attack:20, health:40};
  return null;
}

// Game state
const G = {
  castle: [],
  tavern: [],
  discard: [],
  hand: [],
  inPlay: [],       
  enemy: null,
  damageOnEnemy: 0,
  spadeShield: 0,
  jokers: 2,
  log: [],
  selectedIndices: new Set(),
  gameOver: false,
  phase: 'player-turn',
  jokerPlayable: true,
  jokerUsedLastTurn: false
};

// Track discard modal
let discardModal = null;

// UI refs
const el = {
  castleCount: document.getElementById('castle-count'),
  tavernCount: document.getElementById('tavern-count'),
  discardCount: document.getElementById('discard-count'),
  enemyCard: document.getElementById('enemy-card'),
  handContainer: document.getElementById('hand'),
  handCount: document.getElementById('hand-count'),
  playBtn: document.getElementById('play-selected'),
  yieldBtn: document.getElementById('yield-btn'),
  flipJokerBtn: document.getElementById('flip-joker'),
  log: document.getElementById('log'),
  clearLog: document.getElementById('clear-log')
};

// Initialize
function startSolo(){
  G.castle = buildCastle();
  G.tavern = buildTavern();
  G.discard = [];
  G.hand = [];
  G.inPlay = [];
  G.enemy = G.castle.pop();
  G.damageOnEnemy = 0;
  G.spadeShield = 0;
  G.jokers = 2;
  G.log = [];
  G.selectedIndices = new Set();
  G.gameOver = false;
  G.phase = 'player-turn';
  G.jokerPlayable = true;
  G.jokerUsedLastTurn = false;

  for (let i = 0; i < MAX_HAND_SOLO; i++) {
    if (G.tavern.length) G.hand.push(G.tavern.shift());
  }

  el.playBtn.disabled = false;
  el.yieldBtn.disabled = false;
  el.flipJokerBtn.disabled = G.jokers<=0 || G.gameOver || G.hand.length===0 || !G.jokerPlayable || G.jokerUsedLastTurn;


  addLog(`Game started. Facing ${G.enemy.rank}${suitSymbol(G.enemy.suit)}.`);
  renderAll();
}

// Called when a full turn completes
function startNextTurn(){
  G.jokerPlayable = true;
  G.jokerUsedLastTurn = false;
  G.phase = 'player-turn';
  renderAll();
}

// Render
function renderAll(){
  el.castleCount.textContent=G.castle.length;
  el.tavernCount.textContent=G.tavern.length;
  el.discardCount.textContent=G.discard.length;
  el.handCount.textContent=`Hand: ${G.hand.length}`;

  const e=G.enemy;
  if(e){
    const stats=faceStats(e);
    const effectiveAttack=Math.max(0,stats.attack-G.spadeShield);
    const enemyColor = (e.suit === 'hearts' || e.suit === 'diamonds') ? '#cc241d' : '#458588';

    el.enemyCard.innerHTML=`
      <div class="text-sm muted">Current Enemy</div>
      <div class="mt-2 bg-[#504945] text-[#ebdbb2]">
        <div class="text-xl font-bold" style="color:${enemyColor};">${e.rank} ${suitSymbol(e.suit)}</div>
        <div class="mt-1 text-lg">
          <span class="mr-4">⚔️ Attack: <strong>${effectiveAttack}</strong></span>
          <span>❤️ Health: <strong>${Math.max(0,stats.health-G.damageOnEnemy)}</strong></span>
        </div>
    </div>
`;
  } else {
    el.enemyCard.innerHTML=`<div class="p-3">No enemy.</div>`;
  }

  // Hand
  el.handContainer.innerHTML='';
  G.hand.forEach((c,idx)=>{
    const d=document.createElement('div');
    d.className='card';
    d.style.background='#d5c4a1';
    d.style.color=(c.suit==='hearts'||c.suit==='diamonds')?'#cc241d':'#458588';
    if(G.selectedIndices.has(idx)) d.classList.add('selected');

    const rank=document.createElement('div'); rank.className='rank'; rank.textContent=c.rank;
    const suit=document.createElement('div'); suit.className='suit '+c.suit; suit.innerHTML=suitSymbol(c.suit);

    d.appendChild(rank); d.appendChild(suit);
    d.title=`${c.rank} of ${c.suit}`;
    d.addEventListener('click',()=>{ toggleSelect(idx); });

    el.handContainer.appendChild(d);
  });

  // Log
  el.log.innerHTML=G.log.map(l=>`<div class="mb-1">${l}</div>`).join('');

  // Joker button
  el.flipJokerBtn.textContent=`Joker (${G.jokers} left)`;
  el.flipJokerBtn.disabled = G.jokers<=0 || G.gameOver || G.hand.length===0 || !G.jokerPlayable || G.jokerUsedLastTurn;
}

// Selection
function toggleSelect(idx){
  if(G.selectedIndices.has(idx)) G.selectedIndices.delete(idx);
  else G.selectedIndices.add(idx);
  renderAll();
}

// Log
function addLog(msg){
  G.log.unshift(`${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} — ${msg}`);
  if(G.log.length>200) G.log.length=200;
}

// End game
function endGame(message){
  if(discardModal){
    document.body.removeChild(discardModal);
    discardModal = null;
  }

  G.enemy = null;
  G.gameOver = true;
  renderAll();
  addLog(message);

  el.playBtn.disabled = true;
  el.yieldBtn.disabled = true;
  el.flipJokerBtn.disabled = true;

  const overlay = document.createElement('div');
  overlay.style.position='fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width='100%';
  overlay.style.height='100%';
  overlay.style.background = 'rgba(29, 32, 33, 0.96)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.color = '#ebdbb2';
  overlay.style.textAlign = 'center';
  overlay.style.fontFamily = 'serif';

  const box = document.createElement('div');
  box.style.background = '#282828';
  box.style.padding = '30px 50px';
  box.style.borderRadius = '12px';
  box.style.boxShadow = '0 0 25px rgba(0,0,0,0.6)';
  box.innerHTML = `
    <h1 style="font-size:2rem; margin-bottom:0.5rem;">${message}</h1>
    <p style="opacity:0.8;">Click anywhere or press Enter to start a new game</p>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function dismiss(){
    document.body.removeChild(overlay);
    window.removeEventListener('keydown', keyHandler);
    startSolo();
  }

  overlay.addEventListener('click', dismiss);
  function keyHandler(e){ if(e.key==='Enter' || e.key===' ') dismiss(); }
  window.addEventListener('keydown', keyHandler);
}

// Play selected
function playSelected(){
  if(G.gameOver) return;
  if(!G.enemy){ addLog('No enemy.'); return; }
  const selected=Array.from(G.selectedIndices).sort((a,b)=>a-b);
  if(selected.length===0){ addLog('No cards selected.'); return; }

  const cards=selected.map(i=>G.hand[i]);
  const aces=cards.filter(c=>c.rank==='A');

  if(aces.length>0){
    if(cards.length!==2){ addLog('Animal companion must be paired with one other card.'); return; }
    performPlay(cards,selected);
    return;
  }

  if(cards.length===1 || (cards.length>=2 && cards.length<=4 && new Set(cards.map(c=>c.rank)).size===1 && cards.reduce((s,c)=>s+cardValue(c.rank),0)<=10)){
    performPlay(cards,selected);
    return;
  }

  addLog('Invalid selection.');
}

// Perform play (replace existing performPlay)
function performPlay(cards, selectedIndices) {
  const enemy = G.enemy;
  if (!enemy) return;

  const enemySuit = enemy.suit; // the suit that can nullify effects
  // 1) Compute base total (A = 1, face values as defined)
  let baseTotal = 0;
  for (const c of cards) {
    baseTotal += (c.rank === 'A') ? 1 : cardValue(c.rank);
  }

  // 2) Determine if any Clubs are present (clubs double) — but only if enemy is NOT a club
  const clubPresent = cards.some(c => c.suit === 'clubs');
  const clubsEffective = clubPresent && (enemySuit !== 'clubs');

  // 3) Final total damage: double base if clubs are effective
  const totalDamage = clubsEffective ? baseTotal * 2 : baseTotal;

  // 4) Determine which suit effects apply (use totalDamage for each effect,
  //    but skip a suit completely if enemy has that suit)
  let heartsEffect = 0, diamondsEffect = 0, spadesEffect = 0;
  for (const c of cards) {
    if (c.suit === 'hearts' && enemySuit !== 'hearts') heartsEffect = totalDamage;
    if (c.suit === 'diamonds' && enemySuit !== 'diamonds') diamondsEffect = totalDamage;
    if (c.suit === 'spades' && enemySuit !== 'spades') spadesEffect = totalDamage;
    // note: if multiple cards of same suit are present we still use the same totalDamage
    // because rules state the total attack value is used for suit effects
  }

  // 5) Move played cards to inPlay (they don't go to discard until enemy dies)
  const toRemove = Array.from(selectedIndices).sort((a, b) => b - a);
  const playedCards = [];
  for (const idx of toRemove) {
    playedCards.push(G.hand.splice(idx, 1)[0]);
  }
  G.inPlay.push(...playedCards);
  G.selectedIndices.clear();

  // 6) Log what was played (cards, total, suits, club doubling info)
  const playedText = playedCards.map(c => `${c.rank}${suitSymbol(c.suit)}`).join(', ');
  const clubNote = clubPresent ? (clubsEffective ? ' (Clubs doubled total)' : ' (Clubs blocked by enemy immunity)') : '';
  addLog(`Played: ${playedText} — Total attack value: ${baseTotal}${clubPresent ? ' → ' + totalDamage : ''}${clubNote}`);

  // 7) Apply Hearts: return up to heartsEffect cards from discard to bottom of Tavern
  if (heartsEffect > 0) {
    if (G.discard.length > 0) {
      const takeCount = Math.min(heartsEffect, G.discard.length);
      // take from top of discard (end of array) to preserve discard ordering
      const take = G.discard.splice(-takeCount, takeCount);
      G.tavern.push(...take);
      addLog(`Hearts: Returned ${take.length} card(s) from discard to bottom of Tavern.`);
    } else {
      addLog('Hearts: No cards in discard to return.');
    }
  }

  // 8) Apply Diamonds: draw up to diamondsEffect cards (respecting MAX_HAND_SOLO)
  if (diamondsEffect > 0) {
    let drawn = 0;
    for (let i = 0; i < diamondsEffect; i++) {
      if (G.hand.length >= MAX_HAND_SOLO) break;
      if (G.tavern.length === 0) break;
      G.hand.push(G.tavern.shift());
      drawn++;
    }
    addLog(`Diamonds: Drew ${drawn} card(s).`);
  }

  // 9) Apply Spades: add shield equal to spadesEffect
  if (spadesEffect > 0) {
    G.spadeShield += spadesEffect;
    addLog(`Spades: Added shield ${spadesEffect}. Total shield now ${G.spadeShield}.`);
  }

  // 10) Deal damage to enemy and log
  G.damageOnEnemy += totalDamage;
  const stats = faceStats(enemy);
  addLog(`Dealt ${totalDamage} damage to enemy (${Math.min(G.damageOnEnemy, stats.health)}/${stats.health}).`);

  // 11) Check defeat
  if (G.damageOnEnemy >= stats.health) {
    // perfect?
    if (G.damageOnEnemy === stats.health) {
      G.tavern.unshift(enemy);
      addLog(`Perfect defeat! ${enemy.rank}${suitSymbol(enemy.suit)} added to top of Tavern.`);
    } else {
      G.discard.unshift(enemy);
      addLog(`${enemy.rank}${suitSymbol(enemy.suit)} defeated and sent to discard pile.`);
    }

    // After enemy dies, move all inPlay cards (including those just played) to discard
    if (G.inPlay.length > 0) {
      // keep same order — put entire inPlay array on top of discard
      G.discard.unshift(...G.inPlay.splice(0));
    }

    // Next enemy or win
    if (G.castle.length === 0) {
      endGame('All Royals defeated — YOU WIN! 🎉');
      return;
    } else {
      G.enemy = G.castle.pop();
      G.damageOnEnemy = 0;
      G.spadeShield = 0;
      addLog(`Next enemy: ${G.enemy.rank}${suitSymbol(G.enemy.suit)}.`);
      renderAll();
      return;
    }
  }

  // 12) Enemy survives → proceed to enemy attack
  renderAll();
  enemyAttack();
}


// Enemy attack modal - cards shown large
function showDiscardModal(attackValue){
  if(G.gameOver || !G.enemy) return;
  if(discardModal){ document.body.removeChild(discardModal); discardModal=null; }

  const modal = document.createElement('div'); discardModal=modal;
  modal.style.position='fixed';
  modal.style.top='0';
  modal.style.left='0';
  modal.style.width='100%';
  modal.style.height='100%';
  modal.style.background='rgba(29,32,33,0.85)';
  modal.style.display='flex';
  modal.style.alignItems='center';
  modal.style.justifyContent='center';
  modal.style.zIndex='9999';
  modal.style.overflow='auto';

  const box=document.createElement('div');
  box.style.background='#282828';
  box.style.color='#ebdbb2';
  box.style.padding='20px';
  box.style.borderRadius='12px';
  box.style.maxHeight='90%';
  box.style.width='90%';
  box.style.maxWidth='700px';
  box.style.display='flex';
  box.style.flexDirection='column';
  box.style.gap='12px';

  const header=document.createElement('div');
  header.innerHTML=`<h3 style="font-size:1.5rem; font-weight:700; margin-bottom:8px;">Enemy attacks ${attackValue}</h3>
                      <p style="margin-bottom:4px;">Select cards to discard to survive. Total required: <strong>${attackValue}</strong></p>`;
  box.appendChild(header);

  const form=document.createElement('div'); form.style.display='flex'; form.style.flexWrap='wrap'; form.style.gap='12px';

  G.hand.forEach((c, idx)=>{
    const cardDiv=document.createElement('div');
    cardDiv.className='card';
    cardDiv.style.width='96px';
    cardDiv.style.height='132px';
    cardDiv.style.fontSize='1.25rem';
    cardDiv.style.display='flex';
    cardDiv.style.flexDirection='column';
    cardDiv.style.alignItems='center';
    cardDiv.style.justifyContent='center';
    cardDiv.style.cursor='pointer';
    cardDiv.style.userSelect='none';
    cardDiv.style.transition='transform .08s ease, box-shadow .08s ease';
    cardDiv.dataset.idx=idx;

    cardDiv.style.background = '#d5c4a1'; // same as hand cards
    cardDiv.style.color = (c.suit==='hearts'||c.suit==='diamonds') ? '#cc241d' : '#458588';


    const rankDiv=document.createElement('div'); rankDiv.className='rank'; rankDiv.textContent=c.rank;
    const suitDiv=document.createElement('div'); suitDiv.className='suit '+c.suit; suitDiv.innerHTML=suitSymbol(c.suit);
    suitDiv.style.fontSize='1.25rem';
    suitDiv.style.marginTop='6px';
    suitDiv.style.color=(c.suit==='hearts'||c.suit==='diamonds')?'#cc241d':'#458588';

    cardDiv.appendChild(rankDiv); cardDiv.appendChild(suitDiv);

    cardDiv.addEventListener('click',()=>{
      if(cardDiv.classList.contains('selected')) cardDiv.classList.remove('selected');
      else cardDiv.classList.add('selected');
      updateSelected();
    });

    form.appendChild(cardDiv);
  });
  box.appendChild(form);

  const infoDiv=document.createElement('div');
  infoDiv.id='selected-info';
  infoDiv.style.marginTop='8px';
  infoDiv.style.fontSize='1rem';
  infoDiv.textContent='Selected: None (Total: 0)';
  box.appendChild(infoDiv);

  const discardBtn=document.createElement('button');
  discardBtn.textContent='Discard Selected';
  discardBtn.style.background='#b8bb26';
  discardBtn.style.color='#282828';
  discardBtn.style.padding='8px 16px';
  discardBtn.style.fontWeight='700';
  discardBtn.style.border='none';
  discardBtn.style.borderRadius='6px';
  discardBtn.style.cursor='pointer';
  discardBtn.addEventListener('click', ()=>{
    const selectedCards = Array.from(form.querySelectorAll('.card.selected')).map(c=>parseInt(c.dataset.idx));
    const total = selectedCards.reduce((s,i)=>s+cardValue(G.hand[i].rank),0);
    const maxPossible = G.hand.reduce((s,c)=>s+cardValue(c.rank),0);

    if(total<attackValue && maxPossible<attackValue){
      document.body.removeChild(modal); discardModal=null; 
      handlePlayerDefeat(`You could not discard enough cards to survive the enemy attack of ${attackValue}.`);
      return;
    }

    if(total<attackValue){
      alert(`Total discard not enough. Selected total: ${total}, required: ${attackValue}`);
      return;
    }

    // Move to discard
    const toRemove = selectedCards.sort((a,b)=>b-a);
    for(const idx of toRemove){
      G.discard.unshift(G.hand.splice(idx,1)[0]);
    }

    document.body.removeChild(modal); discardModal=null;
    renderAll();
    startNextTurn();
  });
  box.appendChild(discardBtn);

  modal.appendChild(box);
  document.body.appendChild(modal);

  function updateSelected(){
    const selectedCards = Array.from(form.querySelectorAll('.card.selected'));
    const total = selectedCards.reduce((s,c)=>s+cardValue(G.hand[parseInt(c.dataset.idx)].rank),0);
    infoDiv.textContent = `Selected: ${selectedCards.length} (Total: ${total})`;
  }
}

// Enemy attacks
function enemyAttack(){
  if(!G.enemy) return;
  const stats = faceStats(G.enemy);
  const attackValue = Math.max(0, stats.attack - G.spadeShield);
  if(attackValue===0){
    addLog('Enemy attack blocked by shield.');
    startNextTurn();
    return;
  }
  showDiscardModal(attackValue);
}

// Player forfeit
function yieldGame(){
  endGame('You forfeited the game.');
}

// Flip Joker
function flipJoker(){
  if(G.gameOver) return; 
  if(G.jokers <= 0){ addLog('No jokers left.'); return; }
  if(G.hand.length === 0){ addLog('Cannot flip a Joker with empty hand.'); alert('Cannot flip a Joker with empty hand!'); return; }
  if(!G.jokerPlayable){ addLog('You already flipped a Joker this turn!'); alert('You already flipped a Joker this turn!'); return; }
  if(G.jokerUsedLastTurn){ addLog('Cannot flip Jokers two turns in a row!'); alert('Cannot flip Jokers two turns in a row!'); return; }

  while(G.hand.length) G.discard.unshift(G.hand.pop());
  for(let i=0;i<MAX_HAND_SOLO;i++){ if(G.tavern.length===0) break; G.hand.push(G.tavern.shift()); }

  G.jokers--; G.jokerPlayable=false; G.jokerUsedLastTurn=true;
  addLog(`🃏 Joker flipped: discarded hand and refilled to ${G.hand.length} cards. Jokers left: ${G.jokers}.`);
  renderAll();
}


// Clear log
el.clearLog.addEventListener('click', ()=>{G.log=[]; renderAll();});

// Buttons
el.playBtn.addEventListener('click', playSelected);
el.yieldBtn.addEventListener('click', yieldGame);
el.flipJokerBtn.addEventListener('click', flipJoker);

// Start game
startSolo();
