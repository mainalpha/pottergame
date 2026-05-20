const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../client/js/socket-client.js');
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('function showClashCards');
const end = s.indexOf('function setBattleAvatars');
const fixed = `function showClashCards(playedCards) {
  const left = document.getElementById('clash-slot-left');
  const right = document.getElementById('clash-slot-right');
  if (!left || !right || !playedCards) return;
  const ids = Object.keys(playedCards);
  const render = (slot, card) => {
    const c = Array.isArray(card) ? card[0] : card;
    if (!c) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML = '<div class="clash-card"><span class="clash-card-name">' + c.name +
      '</span><span class="clash-card-power">P ' + c.power + '</span></div>';
  };
  render(left, playedCards[ids[0]]);
  render(right, playedCards[ids[1]]);
}

`;
s = s.slice(0, start) + fixed + s.slice(end);
fs.writeFileSync(p, s);
console.log('Fixed showClashCards');
