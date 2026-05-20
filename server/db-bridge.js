'use strict';

const fs = require('fs');
const path = require('path');
const db = require('./db');

const IMG_CARDS_DIR = path.join(__dirname, '..', 'assets', 'img-cards');

let cardImageMap = null;
let dbCardsCache = null;

function buildCardImageMap() {
  if (cardImageMap) return cardImageMap;

  cardImageMap = new Map();
  if (!fs.existsSync(IMG_CARDS_DIR)) return cardImageMap;

  for (const file of fs.readdirSync(IMG_CARDS_DIR)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    const key = path.basename(file, path.extname(file)).toLowerCase();
    cardImageMap.set(key, `/assets/img-cards/${encodeURIComponent(file)}`);
  }

  return cardImageMap;
}

function encodeAssetPath(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return normalizedUrl
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function resolveCardImage(row) {
  const url = row.image_url;
  if (url && !url.includes('placeholder')) {
    return encodeAssetPath(url);
  }

  const map = buildCardImageMap();
  return map.get(String(row.name).toLowerCase()) || null;
}

function factionFromSide(side) {
  return side === 'evil' ? 'death_eaters' : 'order';
}

function mapCardRow(row) {
  const avatar = resolveCardImage(row);
  return {
    id: String(row.id),
    name: row.name,
    alias: row.alias || row.name,
    avatar,
    power: row.power,
    attack: row.attack,
    defense: row.defense,
    cost: row.cost,
    side: row.side,
    faction: factionFromSide(row.side),
    description: row.description,
    imageUrl: avatar
  };
}

async function loadDbCards() {
  if (dbCardsCache) return dbCardsCache;

  try {
    const rows = await db.getAllCards();
    dbCardsCache = rows.map(mapCardRow);
  } catch (err) {
    console.warn('[dbBridge] Failed to load cards from DB:', err.message);
    dbCardsCache = [];
  }

  return dbCardsCache;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dbBridge = {
  async fetchUser(userId) {
    const numericId = Number(userId);
    if (Number.isFinite(numericId) && numericId > 0) {
      const row = await db.getUserById(numericId);
      if (row) {
        return {
          id: String(row.id),
          username: row.username,
          avatar: row.avatar_url,
          faction: row.house === 'slytherin' ? 'death_eaters' : 'order',
          mmr: 1000 + (row.wins || 0) * 10 - (row.losses || 0) * 5
        };
      }
    }

    if (String(userId) === 'BOT_WIZARD') {
      return {
        id: 'BOT_WIZARD',
        username: 'Training Bot',
        avatar: '/assets/avatars/default.png',
        faction: 'death_eaters',
        mmr: 1000
      };
    }

    return {
      id: String(userId),
      username: `Wizard_${String(userId).substring(0, 4)}`,
      avatar: '/assets/avatars/default.png',
      faction: 'order',
      mmr: 1200
    };
  },

  async getPlayerDeck(userId, faction) {
    const allCards = await loadDbCards();
    const factionCards = allCards.filter((c) => c.faction === faction);

    let lockedIds = [];
    try {
      lockedIds = await db.getLockedCardIds(userId, 3);
    } catch (err) {
      console.warn('[dbBridge] Cooldown lookup failed, dealing without locks:', err.message);
    }

    const available = factionCards.filter((c) => !lockedIds.includes(String(c.id)));
    const pool = available.length >= 5 ? available : factionCards;
    return shuffle(pool);
  },

  async getCardsByFaction(faction) {
    const allCards = await loadDbCards();
    return allCards.filter((c) => c.faction === faction);
  },

  async getAllCatalogCards() {
    return loadDbCards();
  },

  async getLastUsedCards(userId, matchCount = 3) {
    try {
      const locked = await db.getLockedCardIds(userId, matchCount);
      return locked;
    } catch {
      return [];
    }
  },

  async recordCardUsage(userId, cardId, matchId) {
    try {
      await db.recordCardUsage(userId, cardId, matchId);
    } catch (err) {
      console.warn('[dbBridge] recordCardUsage:', err.message);
    }
  },

  async saveMatchResult({ matchId, mode, players, winnerId, loserId, hp }) {
    try {
      let dbMatchId = null;

      if (String(matchId).startsWith('db_')) {
        dbMatchId = parseInt(String(matchId).slice(3), 10);
      } else {
        dbMatchId = await db.createMatchRecord({ mode, playerIds: players, status: 'active' });
      }

      if (dbMatchId) {
        await db.completeMatch(dbMatchId, winnerId, loserId, hp);
      } else {
        await db.awardMatchStats(winnerId, loserId);
      }
      return true;
    } catch (error) {
      console.error('dbBridge.saveMatchResult Error:', error);
      return false;
    }
  }
};

dbBridge.encodeAssetPath = encodeAssetPath;

module.exports = dbBridge;
