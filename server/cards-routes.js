'use strict';

const express = require('express');
const dbBridge = require('./db-bridge');

const router = express.Router();

/** Used when DB is empty or unavailable */
const FALLBACK_CARDS = [
  { id: '1', name: 'Albus Dumbledore', power: 10, attack: 9, defense: 9, cost: 10, side: 'good', faction: 'order', description: 'Headmaster; greatest living wizard.', imageUrl: '/assets/img-cards/Albus Dumbledore.jpg' },
  { id: '2', name: 'Harry Potter', power: 9, attack: 8, defense: 7, cost: 8, side: 'good', faction: 'order', description: 'The Boy Who Lived; strong in defence and nerve.', imageUrl: '/assets/img-cards/harry potter.jpg' },
  { id: '3', name: 'Hermione Granger', power: 8, attack: 7, defense: 8, cost: 7, side: 'good', faction: 'order', description: 'Brightest witch of her age.', imageUrl: '/assets/img-cards/hermione granger.jpg' },
  { id: '4', name: 'Minerva McGonagall', power: 8, attack: 6, defense: 9, cost: 7, side: 'good', faction: 'order', description: 'Transfiguration mistress; strict and formidable.', imageUrl: '/assets/img-cards/Minerva McGonagall.jpg' },
  { id: '5', name: 'Sirius Black', power: 8, attack: 8, defense: 6, cost: 6, side: 'good', faction: 'order', description: 'Animagus and loyal Order member.', imageUrl: '/assets/img-cards/Sirius Black.jpg' },
  { id: '6', name: 'Severus Snape', power: 7, attack: 7, defense: 7, cost: 6, side: 'good', faction: 'order', description: 'Master of occlumency and potions.', imageUrl: '/assets/img-cards/Severus Snape.jpg' },
  { id: '7', name: 'Remus Lupin', power: 7, attack: 6, defense: 7, cost: 5, side: 'good', faction: 'order', description: 'Defence Against the Dark Arts; werewolf.', imageUrl: '/assets/img-cards/Remus Lupin.jpg' },
  { id: '8', name: 'Alastor Moody', power: 7, attack: 8, defense: 5, cost: 6, side: 'good', faction: 'order', description: 'Auror; constant vigilance.', imageUrl: '/assets/img-cards/Alastor Moody.jpg' },
  { id: '9', name: 'Molly Weasley', power: 6, attack: 5, defense: 7, cost: 4, side: 'good', faction: 'order', description: 'Matriarch; fierce protector of her family.', imageUrl: '/assets/img-cards/Molly Weasley.jpg' },
  { id: '10', name: 'Kingsley Shacklebolt', power: 6, attack: 6, defense: 6, cost: 5, side: 'good', faction: 'order', description: 'Senior Auror; calm under pressure.', imageUrl: '/assets/img-cards/Kingsley Shacklebolt.jpg' },
  { id: '11', name: 'Lord Voldemort', power: 10, attack: 10, defense: 8, cost: 10, side: 'evil', faction: 'death_eaters', description: 'Dark Lord; peak magical power.', imageUrl: '/assets/img-cards/Lord Voldemort.jpg' },
  { id: '12', name: 'Bellatrix Lestrange', power: 9, attack: 9, defense: 6, cost: 8, side: 'evil', faction: 'death_eaters', description: 'Fanatically loyal; deadly duellist.', imageUrl: '/assets/img-cards/Bellatrix Lestrange.jpg' },
  { id: '13', name: 'Tom Marvolo Riddle', power: 9, attack: 8, defense: 7, cost: 8, side: 'evil', faction: 'death_eaters', description: 'Young Voldemort; brilliant and ruthless.', imageUrl: '/assets/img-cards/Tom Marvolo Riddle.jpg' },
  { id: '14', name: 'Lucius Malfoy', power: 7, attack: 6, defense: 6, cost: 5, side: 'evil', faction: 'death_eaters', description: 'Death Eater; influence and cruelty.', imageUrl: '/assets/img-cards/Lucius Malfoy.jpg' },
  { id: '15', name: 'Fenrir Greyback', power: 7, attack: 8, defense: 5, cost: 5, side: 'evil', faction: 'death_eaters', description: 'Savage werewolf.', imageUrl: '/assets/img-cards/Fenrir Greyback.jpg' },
  { id: '16', name: 'Dolores Umbridge', power: 6, attack: 5, defense: 7, cost: 5, side: 'evil', faction: 'death_eaters', description: 'Ministry enforcer; sadistic control.', imageUrl: '/assets/img-cards/Dolores Umbridge.jpg' },
  { id: '17', name: 'Barty Crouch Jr', power: 7, attack: 7, defense: 5, cost: 6, side: 'evil', faction: 'death_eaters', description: 'Impersonator; unforgivable curses.', imageUrl: '/assets/img-cards/Barty Crouch Jr.jpg' },
  { id: '18', name: 'Antonin Dolohov', power: 7, attack: 7, defense: 6, cost: 5, side: 'evil', faction: 'death_eaters', description: 'Death Eater; brutal duellist.', imageUrl: '/assets/img-cards/Antonin Dolohov.jpg' },
  { id: '19', name: 'Peter Pettigrew', power: 4, attack: 3, defense: 4, cost: 3, side: 'evil', faction: 'death_eaters', description: 'Cowardly betrayer.', imageUrl: '/assets/img-cards/Peter Pettigrew.jpg' },
  { id: '20', name: 'Narcissa Malfoy', power: 6, attack: 5, defense: 6, cost: 4, side: 'evil', faction: 'death_eaters', description: 'Protects her family above all.', imageUrl: '/assets/img-cards/Narcissa Malfoy.jpg' }
];

function withEncodedImages(cards) {
  return cards.map((c) => {
    const imageUrl = dbBridge.encodeAssetPath(c.imageUrl || c.image_url) || c.imageUrl;
    return {
      ...c,
      alias: c.alias || c.name,
      avatar: c.avatar || imageUrl,
      imageUrl
    };
  });
}

router.get('/', async (_req, res) => {
  try {
    const cards = await dbBridge.getAllCatalogCards();
    const list = cards.length ? cards : FALLBACK_CARDS;
    res.json({ cards: withEncodedImages(list) });
  } catch (err) {
    console.warn('[cards] API error:', err.message);
    res.json({ cards: withEncodedImages(FALLBACK_CARDS) });
  }
});

module.exports = router;
