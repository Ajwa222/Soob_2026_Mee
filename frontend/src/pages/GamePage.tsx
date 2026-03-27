/**
 * Game page — "Feed Simba" idle/clicker game (disabled, not routed in App.tsx).
 *
 * An RPG-style idle game where the user taps to attack monsters, earns coins,
 * buys food to level up Simba (Kitten → Cub → Young Lion → King Lion),
 * hires companion heroes, collects equipment, and prestiges for permanent perks.
 * Features: boss battles, chest drops, fusion crafting, daily rewards, leaderboard.
 *
 * This is an engagement/retention feature — purely client-side with localStorage persistence.
 */
// @ts-nocheck — This entire page is disabled (commented out in App.tsx routes)
import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
// All icons now use GameIcon (PNG fantasy icons) — no more lucide-react
import { useLang } from '../context/LanguageContext';
import SarSymbol from '../components/SarSymbol';

// ═══════════════════════════════════════════════════════════════
// GAME ICON — PNG icon component using Raven Fantasy Icons
// ═══════════════════════════════════════════════════════════════

const ICON_MAP = {
  // Food
  milk: 'food-milk', meat: 'food-meat', feast: 'food-feast', fish: 'food-fish', fruit: 'food-fruit',
  bread: 'food-feast', drumstick: 'food-meat', royal: 'food-royal',
  // Equipment (default/slot icons)
  helmet: 'helm-iron', armor: 'armor-iron', cape: 'cape-white', boots: 'boots-gold', weapon: 'weapon-sword',
  // Stats
  sword: 'weapon-sword', bolt: 'bolt', burst: 'bomb', 'coin-stack': 'perk-coins',
  // Perks
  fist: 'perk-fist', gift: 'gift-box', rocket: 'rocket',
  // Abilities
  anger: 'ability-rage', coins: 'coin', robot: 'spellbook',
  // UI
  coin: 'coin', gem: 'gem', chest: 'chest', 'gift-box': 'gift-box',
  lock: 'lock', star: 'star', check: 'check', 'x-mark': 'x-mark',
  fire: 'fire', skull: 'skull', wall: 'anvil', crown: 'crown',
  // Achievements
  target: 'shield', building: 'building', tower: 'mountain', volcano: 'crystal-red',
  shield: 'shield', refresh: 'portal', 'medal-star': 'trophy', clap: 'thumbsup',
  castle: 'crown', paw: 'heart', sparkle: 'star', flag: 'crystal',
  // Medals
  'medal-gold': 'medal-gold', 'medal-silver': 'medal-silver', 'medal-bronze': 'medal-bronze',
  // Extra equipment icons
  'helm-iron': 'helm-iron', 'helm-bucket': 'helm-bucket', 'helm-bronze': 'helm-bronze', 'helm-gold': 'helm-gold',
  'helm-shadow': 'helm-shadow', 'helm-demon': 'helm-demon',
  'armor-leather': 'armor-leather', 'armor-iron': 'armor-iron', 'armor-guard': 'armor-guard', 'armor-plate': 'armor-plate',
  'armor-winged': 'armor-winged', 'armor-frost': 'armor-frost',
  'cape-white': 'cape-white', 'cape-wing': 'cape-wing', 'cape-red': 'cape-red', 'cape-hood': 'cape-hood',
  'boots-brown': 'boots-brown', 'boots-gold': 'boots-gold', 'boots-flame': 'boots-flame',
  'weapon-dagger': 'weapon-dagger', 'weapon-sword': 'weapon-sword', 'weapon-axe': 'weapon-axe',
  'weapon-firesword': 'weapon-firesword', 'weapon-bow': 'weapon-bow', 'weapon-spear': 'weapon-spear',
  'weapon-hammer': 'weapon-hammer', 'weapon-greatsword': 'weapon-greatsword',
  'weapon-crystalstaff': 'weapon-crystalstaff', 'weapon-fireclaw': 'weapon-fireclaw',
  'shield-wood': 'shield-wood', 'shield-iron': 'shield-iron', 'shield-steel': 'shield-steel', 'shield-crystal': 'shield-crystal',
  'ring-ruby': 'ring-ruby', 'ring-pearl': 'ring-pearl',
  'amulet-purple': 'amulet-purple', 'amulet-ruby': 'amulet-ruby', 'amulet-teal': 'amulet-teal',
  // Misc
  book: 'book', scroll: 'scroll', emerald: 'emerald', diamond: 'diamond',
  ghost: 'ghost', slime: 'slime', bomb: 'bomb', lamp: 'lamp',
  'chest-wood': 'chest-wood', orbs: 'orbs', portal: 'portal',
};

// Equipment icons that vary by rarity (Common, Rare, Epic, Legendary, Mythic, Godly)
const EQUIP_ICONS = {
  helmet: ['helm-iron', 'helm-bucket', 'helm-bronze', 'helm-gold', 'helm-shadow', 'helm-demon'],
  armor:  ['armor-leather', 'armor-iron', 'armor-guard', 'armor-plate', 'armor-winged', 'armor-frost'],
  cape:   ['cape-white', 'cape-white', 'cape-wing', 'cape-red', 'cape-hood', 'cape-red'],
  boots:  ['boots-brown', 'boots-brown', 'boots-gold', 'boots-gold', 'boots-flame', 'boots-flame'],
  weapon: ['weapon-dagger', 'weapon-sword', 'weapon-axe', 'weapon-firesword', 'weapon-crystalstaff', 'weapon-fireclaw'],
  shield: ['shield-wood', 'shield-iron', 'shield-steel', 'shield-crystal', 'shield-crystal', 'shield-crystal'],
  ring:   ['ring-pearl', 'ring-pearl', 'ring-ruby', 'ring-ruby', 'ring-ruby', 'ring-ruby'],
  amulet: ['amulet-purple', 'amulet-purple', 'amulet-teal', 'amulet-ruby', 'amulet-ruby', 'amulet-ruby'],
};

function GameIcon({ name, size = 16, style }) {
  // arrow-down stays as simple SVG (directional indicator)
  if (name === 'arrow-down') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,...style}}>
        <path d="M12 4v12m-5-5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (name === 'arrow-up') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,...style}}>
        <path d="M12 20V8m-5 5l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (name === 'arrow-left') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,...style}}>
        <path d="M19 12H7m5-5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (name === 'arrow-right') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,...style}}>
        <path d="M5 12h12m-5-5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  const file = ICON_MAP[name] || name;
  return (
    <img src={`/icons/${file}.png`} alt="" width={size} height={size}
      style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,imageRendering:'pixelated',...style}} />
  );
}

// Helper to get equipment icon by slot + rarity
function EquipIcon({ slot, rarity = 0, size = 14, style }) {
  const icons = EQUIP_ICONS[slot];
  const file = icons ? icons[Math.min(rarity, icons.length - 1)] : ICON_MAP[slot] || slot;
  return (
    <img src={`/icons/${file}.png`} alt="" width={size} height={size}
      style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,imageRendering:'pixelated',...style}} />
  );
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const COMPANIONS = [
  { id: 'stc', nameKey: 'eagle', color: '#8B6914', accent: '#D4A017', baseCost: 25, baseDps: 1 },
  { id: 'mobily', nameKey: 'wolf', color: '#607D8B', accent: '#90A4AE', baseCost: 100, baseDps: 3 },
  { id: 'zain', nameKey: 'panther', color: '#37474F', accent: '#78909C', baseCost: 400, baseDps: 10 },
  { id: 'virgin', nameKey: 'phoenix', color: '#E65100', accent: '#FF9800', baseCost: 1500, baseDps: 30 },
  { id: 'jawwy', nameKey: 'tiger', color: '#E65100', accent: '#FFB74D', baseCost: 5000, baseDps: 80 },
  { id: 'lebara', nameKey: 'dragon', color: '#1B5E20', accent: '#66BB6A', baseCost: 20000, baseDps: 200 },
  { id: 'yaqoot', nameKey: 'griffin', color: '#6A1B9A', accent: '#CE93D8', baseCost: 75000, baseDps: 500 },
  { id: 'salam', nameKey: 'thunderbird', color: '#0D47A1', accent: '#42A5F5', baseCost: 300000, baseDps: 1500 },
];

const FOODS = [
  { id: 'milk', icon: 'milk', nameKey: 'foodMilk', baseCost: 15, power: 3 },
  { id: 'fish', icon: 'fish', nameKey: 'foodFish', baseCost: 50, power: 8 },
  { id: 'meat', icon: 'meat', nameKey: 'foodMeat', baseCost: 100, power: 15 },
  { id: 'fruit', icon: 'fruit', nameKey: 'foodFruit', baseCost: 250, power: 40 },
  { id: 'feast', icon: 'feast', nameKey: 'foodFeast', baseCost: 500, power: 80 },
  { id: 'royal', icon: 'crown', nameKey: 'foodRoyal', baseCost: 2500, power: 400 },
];

const BOSS_TYPES = [
  { nameEn: 'Sand Crawler', nameAr: '\u0632\u0627\u062D\u0641 \u0627\u0644\u0631\u0645\u0627\u0644', body: '#C2742F', light: '#E8A66A', accent: '#7A3B10', eyes: '#FF3333', glow: '#FF6B3540', trait: null },
  { nameEn: 'Sea Lurker', nameAr: '\u0643\u0627\u0645\u0646 \u0627\u0644\u0628\u062D\u0631', body: '#1E88E5', light: '#64B5F6', accent: '#0D47A1', eyes: '#FFEB3B', glow: '#2196F340', trait: 'regen' },
  { nameEn: 'Sand Golem', nameAr: '\u062C\u0648\u0644\u0645 \u0627\u0644\u0631\u0645\u0627\u0644', body: '#E6A817', light: '#FFD54F', accent: '#BF6900', eyes: '#FF1744', glow: '#FFB30040', trait: 'armor' },
  { nameEn: 'Oil Blob', nameAr: '\u0643\u062A\u0644\u0629 \u0627\u0644\u0646\u0641\u0637', body: '#37474F', light: '#607D8B', accent: '#1B3A20', eyes: '#76FF03', glow: '#76FF0340', trait: 'dodge' },
  { nameEn: 'Fire Djinn', nameAr: '\u062C\u0646\u064A \u0627\u0644\u0646\u0627\u0631', body: '#D32F2F', light: '#FF8A80', accent: '#8B0000', eyes: '#FDD835', glow: '#FF572240', trait: 'enrage' },
  { nameEn: 'Rock Troll', nameAr: '\u062A\u0631\u0648\u0644 \u0627\u0644\u0635\u062E\u0648\u0631', body: '#546E7A', light: '#90A4AE', accent: '#263238', eyes: '#FF6E40', glow: '#FF6E4040', trait: 'tough' },
  { nameEn: 'Frost Yeti', nameAr: '\u064A\u062A\u064A \u0627\u0644\u062B\u0644\u062C', body: '#81D4FA', light: '#E1F5FE', accent: '#01579B', eyes: '#F50057', glow: '#E1F5FE50', trait: 'slow' },
  { nameEn: 'Mecha Drone', nameAr: '\u062F\u0631\u0648\u0646 \u0622\u0644\u064A', body: '#607D8B', light: '#B0BEC5', accent: '#00838F', eyes: '#00E676', glow: '#00E67640', trait: 'shield' },
  { nameEn: 'Dust Wraith', nameAr: '\u0634\u0628\u062D \u0627\u0644\u0631\u0645\u0627\u0644', body: '#C9A96E', light: '#E8D5A8', accent: '#8B7340', eyes: '#FF4444', glow: '#C9A96E40', trait: null },
  { nameEn: 'Lava Serpent', nameAr: '\u0623\u0641\u0639\u0649 \u0627\u0644\u062D\u0645\u0645', body: '#D84315', light: '#FF8A65', accent: '#BF360C', eyes: '#FFEB3B', glow: '#FF572240', trait: 'enrage' },
  { nameEn: 'Storm Hawk', nameAr: '\u0635\u0642\u0631 \u0627\u0644\u0639\u0627\u0635\u0641\u0629', body: '#546E7A', light: '#90A4AE', accent: '#37474F', eyes: '#64B5F6', glow: '#64B5F640', trait: 'dodge' },
  { nameEn: 'Iron Scorpion', nameAr: '\u0639\u0642\u0631\u0628 \u062D\u062F\u064A\u062F\u064A', body: '#424242', light: '#757575', accent: '#212121', eyes: '#F44336', glow: '#F4433640', trait: 'armor' },
];

const CITY_THEMES = [
  { skyTop: '#7EC8E3', skyBot: '#D4ECFA', ground: '#D2B48C', groundDk: '#A0522D', darkSky: '#0F1A2E', darkSkyBot: '#1A2540' },
  { skyTop: '#4BABDE', skyBot: '#B8DFF5', ground: '#F0DEB0', groundDk: '#C4A870', darkSky: '#0D1528', darkSkyBot: '#162038' },
  { skyTop: '#F0C850', skyBot: '#FFF3D0', ground: '#C8B8A0', groundDk: '#9A876E', darkSky: '#1A1508', darkSkyBot: '#2A2010' },
  { skyTop: '#708898', skyBot: '#A8BCC8', ground: '#5A4035', groundDk: '#3E2C22', darkSky: '#0A0E14', darkSkyBot: '#141C28' },
  { skyTop: '#70BB78', skyBot: '#C0E8C4', ground: '#8D6E63', groundDk: '#5D4037', darkSky: '#0A1A0E', darkSkyBot: '#142818' },
  { skyTop: '#5BA060', skyBot: '#A8D8AC', ground: '#6D4C41', groundDk: '#4E342E', darkSky: '#0A180C', darkSkyBot: '#142414' },
  { skyTop: '#4A9EDF', skyBot: '#98C8F0', ground: '#887860', groundDk: '#5C5038', darkSky: '#0C1428', darkSkyBot: '#142040' },
  { skyTop: '#7040E0', skyBot: '#B090F0', ground: '#3A4550', groundDk: '#242E38', darkSky: '#100830', darkSkyBot: '#1A1048' },
];

const CITIES_EN = ['Riyadh', 'Jeddah', 'Makkah', 'Dammam', 'Madinah', 'Abha', 'Tabuk', 'NEOM'];
const CITIES_AR = ['\u0627\u0644\u0631\u064A\u0627\u0636', '\u062C\u062F\u0629', '\u0645\u0643\u0629', '\u0627\u0644\u062F\u0645\u0627\u0645', '\u0627\u0644\u0645\u062F\u064A\u0646\u0629', '\u0623\u0628\u0647\u0627', '\u062A\u0628\u0648\u0643', '\u0646\u064A\u0648\u0645'];

const SIMBA_STAGES = [
  { threshold: 0, nameKey: 'simbaKitten', size: 60, hasMane: false, hasCrown: false },
  { threshold: 100, nameKey: 'simbaCub', size: 68, hasMane: false, hasCrown: false },
  { threshold: 500, nameKey: 'simbaYoungLion', size: 78, hasMane: true, hasCrown: false },
  { threshold: 2000, nameKey: 'simbaKingLion', size: 90, hasMane: true, hasCrown: true },
];

const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#FFB300', '#FFCA28'];
const CRIT_COLORS = ['#FFFFFF', '#FFD700', '#FFF9C4', '#FFECB3'];
const KILL_COLORS = ['#4F0D7F', '#0099E5', '#8DC63F', '#E60000', '#FF611F', '#00AEEF', '#FFD700', '#FF4081'];

const CLOTHING_SLOTS = ['helmet', 'armor', 'cape', 'boots', 'weapon', 'shield', 'ring', 'amulet'];
const SLOT_ICONS = { helmet: 'helmet', armor: 'armor', cape: 'cape', boots: 'boots', weapon: 'weapon', shield: 'shield', ring: 'ring-pearl', amulet: 'amulet-purple' };
const RARITY_INFO = [
  { color: '#9E9E9E', nameEn: 'Common', nameAr: '\u0639\u0627\u062F\u064A' },
  { color: '#42A5F5', nameEn: 'Rare', nameAr: '\u0646\u0627\u062F\u0631' },
  { color: '#AB47BC', nameEn: 'Epic', nameAr: '\u0645\u0644\u062D\u0645\u064A' },
  { color: '#FFA726', nameEn: 'Legendary', nameAr: '\u0623\u0633\u0637\u0648\u0631\u064A' },
  { color: '#FF1744', nameEn: 'Mythic', nameAr: '\u0623\u0633\u0637\u0648\u0631\u064A\u0651' },
  { color: '#FFD700', nameEn: 'Godly', nameAr: '\u0625\u0644\u0647\u064A\u0651' },
];
const PREFIX_EN = [['Iron','Leather','Copper','Wooden'],['Steel','Silver','Enchanted','Mystic'],['Dragon','Phoenix','Crystal','Shadow'],['Divine','Mythic','Celestial','Eternal'],['Abyssal','Infernal','Doomforge','Bloodbound'],['Godslayer','Primordial','Omniscient','Transcendent']];
const PREFIX_AR = [['\u062D\u062F\u064A\u062F\u064A','\u062C\u0644\u062F\u064A','\u0646\u062D\u0627\u0633\u064A','\u062E\u0634\u0628\u064A'],['\u0641\u0648\u0644\u0627\u0630\u064A','\u0641\u0636\u064A','\u0645\u0633\u062D\u0648\u0631','\u063A\u0627\u0645\u0636'],['\u062A\u0646\u064A\u0646\u064A','\u0639\u0646\u0642\u0627\u0626\u064A','\u0628\u0644\u0648\u0631\u064A','\u0638\u0644\u064A'],['\u0625\u0644\u0647\u064A','\u0623\u0633\u0637\u0648\u0631\u064A','\u0633\u0645\u0627\u0648\u064A','\u0623\u0628\u062F\u064A'],['\u0647\u0627\u0648\u064A','\u062C\u0647\u0646\u0645\u064A','\u0645\u062F\u0645\u0631','\u062F\u0645\u0648\u064A'],['\u0642\u0627\u062A\u0644 \u0627\u0644\u0622\u0644\u0647\u0629','\u0623\u0632\u0644\u064A','\u0639\u0644\u064A\u0645','\u0645\u062A\u0639\u0627\u0644\u064D']];
const SLOT_NAME_EN = { helmet: 'Helmet', armor: 'Armor', cape: 'Cape', boots: 'Boots', weapon: 'Weapon', shield: 'Shield', ring: 'Ring', amulet: 'Amulet' };
const SLOT_NAME_AR = { helmet: '\u062E\u0648\u0630\u0629', armor: '\u062F\u0631\u0639', cape: '\u0631\u062F\u0627\u0621', boots: '\u062D\u0630\u0627\u0621', weapon: '\u0633\u0644\u0627\u062D', shield: '\u062F\u0631\u0639\u064A\u0629', ring: '\u062E\u0627\u062A\u0645', amulet: '\u062A\u0645\u064A\u0645\u0629' };
const STAT_ICONS = { tapDmg: 'sword', dpsMult: 'bolt', critChance: 'burst', coinBonus: 'coin-stack' };
const STAT_LABEL_EN = { tapDmg: 'Tap', dpsMult: 'DPS', critChance: 'Crit', coinBonus: 'Coins' };
const STAT_LABEL_AR = { tapDmg: '\u0636\u0631\u0628', dpsMult: '\u0636\u0631\u0631', critChance: '\u062D\u0631\u062C', coinBonus: '\u0639\u0645\u0644\u0627\u062A' };

const PERKS = [
  { id: 'tapPower', icon: 'fist', baseCost: 3, maxLv: 20, per: 10, statKey: 'tapDmg' },
  { id: 'dpsBoost', icon: 'bolt', baseCost: 3, maxLv: 20, per: 10, statKey: 'dpsMult' },
  { id: 'critChance', icon: 'burst', baseCost: 5, maxLv: 10, per: 2, statKey: 'critChance' },
  { id: 'coinBonus', icon: 'coin-stack', baseCost: 2, maxLv: 20, per: 15, statKey: 'coinBonus' },
  { id: 'luckyDrops', icon: 'gift', baseCost: 8, maxLv: 5, per: 5, statKey: 'dropRate' },
  { id: 'headStart', icon: 'rocket', baseCost: 10, maxLv: 10, per: 5, statKey: 'headStart' },
  { id: 'bossGold', icon: 'crown', baseCost: 4, maxLv: 15, per: 20, statKey: 'bossGold' },
  { id: 'chestLuck', icon: 'chest', baseCost: 10, maxLv: 10, per: 5, statKey: 'chestLuck' },
  { id: 'doubleStrike', icon: 'fire', baseCost: 6, maxLv: 10, per: 3, statKey: 'doubleStrike' },
  { id: 'bossSlayer', icon: 'skull', baseCost: 5, maxLv: 15, per: 8, statKey: 'bossDmg' },
  { id: 'fuseBoost', icon: 'sparkle', baseCost: 8, maxLv: 10, per: 10, statKey: 'fuseBoost' },
  { id: 'tapFrenzy', icon: 'bomb', baseCost: 7, maxLv: 10, per: 5, statKey: 'tapFrenzy' },
];

// Chest tiers — rarer chests have better drop rates
const CHEST_TYPES = [
  { id: 'wooden',  nameEn: 'Wooden Chest',  nameAr: 'صندوق خشبي',    color: '#8B6914', glow: '#D4A840', icon: 'chest-wood', minRarity: 0, rarityBoost: 0, weight: 55 },
  { id: 'silver',  nameEn: 'Silver Chest',  nameAr: 'صندوق فضي',     color: '#C0C0C0', glow: '#E8E8E8', icon: 'chest',      minRarity: 1, rarityBoost: 0.08, weight: 25 },
  { id: 'golden',  nameEn: 'Golden Chest',  nameAr: 'صندوق ذهبي',    color: '#FFD700', glow: '#FFF176', icon: 'chest',      minRarity: 1, rarityBoost: 0.18, weight: 12 },
  { id: 'diamond', nameEn: 'Diamond Chest', nameAr: 'صندوق ماسي',    color: '#00E5FF', glow: '#80DEEA', icon: 'diamond',    minRarity: 2, rarityBoost: 0.35, weight: 6 },
  { id: 'mythic',  nameEn: 'Mythic Chest',  nameAr: 'صندوق أسطوري',  color: '#FF1744', glow: '#FF5252', icon: 'crystal-red', minRarity: 3, rarityBoost: 0.55, weight: 2 },
];

function rollChestType(chestLuckPerk) {
  const luckBonus = (chestLuckPerk || 0) / 100; // each level = +5% shift toward rare chests
  const types = CHEST_TYPES.map((ct, i) => ({ ...ct, w: ct.weight * (i > 0 ? (1 + luckBonus * i * 2) : Math.max(0.2, 1 - luckBonus * 3)) }));
  const total = types.reduce((s, t) => s + t.w, 0);
  let roll = Math.random() * total;
  for (const t of types) { roll -= t.w; if (roll <= 0) return t; }
  return types[0];
}

const ABILITIES = [
  { id: 'powerStrike', icon: 'anger', duration: 5000, cooldown: 60000, mult: 10 },
  { id: 'goldRush', icon: 'coins', duration: 2500, cooldown: 90000, mult: 5 },
  { id: 'autoTap', icon: 'robot', duration: 15000, cooldown: 120000, tps: 10 },
];

const ACHIEVEMENTS = [
  { id: 'firstBlood', key: 'achFirstBlood', check: s => s.totalBossKills >= 1, reward: { coins: 50 }, icon: 'fist' },
  { id: 'bossHunter', key: 'achBossHunter', check: s => s.totalBossKills >= 50, reward: { coins: 500 }, icon: 'target' },
  { id: 'bossSlayer', key: 'achBossSlayer', check: s => s.totalBossKills >= 500, reward: { gems: 5 }, icon: 'skull' },
  { id: 'floor10', key: 'achFloor10', check: s => s.highestFloor >= 10, reward: { coins: 200 }, icon: 'building' },
  { id: 'floor25', key: 'achFloor25', check: s => s.highestFloor >= 25, reward: { coins: 1000 }, icon: 'tower' },
  { id: 'floor50', key: 'achFloor50', check: s => s.highestFloor >= 50, reward: { gems: 3 }, icon: 'volcano' },
  { id: 'floor100', key: 'achFloor100', check: s => s.highestFloor >= 100, reward: { gems: 10 }, icon: 'crown' },
  { id: 'floor200', key: 'achFloor200', check: s => s.highestFloor >= 200, reward: { gems: 20 }, icon: 'castle' },
  { id: 'gearedUp', key: 'achGearedUp', check: s => Object.values(s.equipped).filter(Boolean).length >= 1, reward: { coins: 100 }, icon: 'shield' },
  { id: 'fullyEquipped', key: 'achFullyEquipped', check: s => Object.values(s.equipped).filter(Boolean).length >= 8, reward: { gems: 2 }, icon: 'gem' },
  { id: 'newBeginning', key: 'achNewBeginning', check: s => s.prestigeCount >= 1, reward: { gems: 3 }, icon: 'refresh' },
  { id: 'veteran', key: 'achVeteran', check: s => s.prestigeCount >= 5, reward: { gems: 10 }, icon: 'medal-star' },
  { id: 'tapMaster', key: 'achTapMaster', check: s => s.totalTaps >= 2500, reward: { coins: 2000 }, icon: 'clap' },
  { id: 'richKing', key: 'achRichKing', check: s => s.totalCoins >= 250000, reward: { gems: 5 }, icon: 'coin-stack' },
  { id: 'collector', key: 'achCollector', check: s => s.inventory.length >= 10, reward: { coins: 5000 }, icon: 'chest' },
  { id: 'tapLegend', key: 'achTapLegend', check: s => s.totalTaps >= 25000, reward: { gems: 15 }, icon: 'fire' },
];

const DAILY_REWARDS = [
  { coins: 100 }, { coins: 250 }, { coins: 500 }, { coins: 1000 },
  { chest: true }, { coins: 2500 }, { gems: 3 },
];

const WALL_FLOORS = [25, 50, 75, 100];
const LS_KEY = 'simba-game';
const LS_LB_KEY = 'simba-leaderboard';

// ═══════════════════════════════════════════════════════════════
// SFX (Web Audio API)
// ═══════════════════════════════════════════════════════════════

let _actx = null;
function getAudioCtx() {
  if (!_actx) try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  return _actx;
}
function playSfx(type) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime;
  switch (type) {
    case 'tap': o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(200, t+0.08); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.08); o.type='square'; break;
    case 'crit': o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(400, t+0.15); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.15); o.type='sawtooth'; break;
    case 'kill': o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(800, t+0.1); o.frequency.exponentialRampToValueAtTime(200, t+0.3); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.3); o.type='triangle'; break;
    case 'chest': o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(1200, t+0.2); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.25); o.type='sine'; break;
    case 'coin': o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(1600, t+0.05); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.06); o.type='sine'; break;
    case 'buy': o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(700, t+0.06); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.08); o.type='triangle'; break;
    case 'achieve': o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(1000, t+0.15); o.frequency.exponentialRampToValueAtTime(1200, t+0.3); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.35); o.type='sine'; break;
    case 'reelTick': o.frequency.setValueAtTime(1000, t); o.frequency.exponentialRampToValueAtTime(800, t+0.03); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.04); o.type='square'; break;
    case 'reelStart': o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(800, t+0.2); o.frequency.exponentialRampToValueAtTime(1200, t+0.35); g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.4); o.type='sawtooth'; break;
    case 'mythicReveal': o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(80, t+0.15); o.frequency.exponentialRampToValueAtTime(600, t+0.35); o.frequency.exponentialRampToValueAtTime(900, t+0.5); g.gain.setValueAtTime(0.1, t); g.gain.setValueAtTime(0.12, t+0.15); g.gain.exponentialRampToValueAtTime(0.001, t+0.55); o.type='sawtooth'; break;
    case 'godlyReveal': o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(600, t+0.1); o.frequency.exponentialRampToValueAtTime(900, t+0.2); o.frequency.exponentialRampToValueAtTime(1200, t+0.3); o.frequency.exponentialRampToValueAtTime(1600, t+0.45); g.gain.setValueAtTime(0.08, t); g.gain.setValueAtTime(0.1, t+0.2); g.gain.exponentialRampToValueAtTime(0.001, t+0.5); o.type='sine'; break;
    default: o.frequency.setValueAtTime(440, t); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.05); break;
  }
  o.start(t); o.stop(t + 0.4);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return n.toLocaleString();
}

const upgradeCost = (base, lv) => Math.floor(base * Math.pow(1.18, lv));
const foodCost = (baseCost, bought) => Math.floor(baseCost * Math.pow(1.1, bought));
const perkCost = (baseCost, lv) => Math.floor(baseCost * (lv + 1));

const floorBossType = (f) => (f - 1) % 12;
const floorCityIdx = (f) => Math.floor((f - 1) / 10) % 8;
const floorIsBig = (f) => f > 1 && f % 10 === 0;
const floorIsWall = (f) => WALL_FLOORS.includes(f);
const getBossHP = (floor) => Math.floor(15 * Math.pow(1.45, floor - 1) * (floorIsBig(floor) ? 5 : 1) * (floorIsWall(floor) ? 3 : 1));
const getBossReward = (maxHP, floor, coinMult) => Math.floor(maxHP * ((floorIsBig(floor) || floorIsWall(floor)) ? 1.0 : 0.5) * coinMult);
const heroBaseDPS = (lvs) => COMPANIONS.reduce((s, c) => s + ((lvs[c.id] || 0) > 0 ? c.baseDps * lvs[c.id] : 0), 0);

function getEquipBonus(equipped) {
  const b = { tapDmg: 0, dpsMult: 0, critChance: 0, coinBonus: 0 };
  Object.values(equipped).forEach(item => { if (item) b[item.statType] += item.value; });
  return b;
}
function getPerkBonus(perks) {
  const b = { tapDmg: 0, dpsMult: 0, critChance: 0, coinBonus: 0, dropRate: 0, headStart: 0, bossGold: 0, chestLuck: 0, doubleStrike: 0, bossDmg: 0, fuseBoost: 0, tapFrenzy: 0 };
  PERKS.forEach(p => { const lv = perks[p.id] || 0; if (lv > 0) b[p.statKey] += p.per * lv; });
  return b;
}
function calcTapDmg(simbaPower, equipB, perkB) {
  const base = Math.max(1, Math.floor(1 + simbaPower / 10));
  return Math.max(1, Math.floor(base * (1 + (equipB.tapDmg + perkB.tapDmg) / 100)));
}
function calcDPS(carrierLevels, equipB, perkB) {
  return Math.floor(heroBaseDPS(carrierLevels) * (1 + (equipB.dpsMult + perkB.dpsMult) / 100));
}
function calcCritChance(equipB, perkB) { return Math.min(0.5, 0.1 + (equipB.critChance + perkB.critChance) / 100); }
function calcCoinMult(equipB, perkB) { return 1 + (equipB.coinBonus + perkB.coinBonus) / 100; }
function calcDropRate(perkB) { return Math.min(0.5, 0.15 + (perkB.dropRate || 0) / 100); }
function calcTapCoinGain(tapDmg, coinMult) { return Math.max(1, Math.ceil(tapDmg * 0.1 * coinMult)); }

function generateItem(floor, lang, chestType) {
  const ct = chestType || CHEST_TYPES[0];
  const slot = CLOTHING_SLOTS[Math.floor(Math.random() * CLOTHING_SLOTS.length)];
  const roll = Math.random(), floorBonus = Math.min(floor * 0.003, 0.3);
  const boost = ct.rarityBoost;
  let rarity;
  if (roll < 0.002 + floorBonus * 0.01 + boost * 0.15) rarity = 5;       // Godly
  else if (roll < 0.01 + floorBonus * 0.04 + boost * 0.25) rarity = 4;    // Mythic
  else if (roll < 0.03 + floorBonus * 0.1 + boost * 0.4) rarity = 3;      // Legendary
  else if (roll < 0.11 + floorBonus * 0.3 + boost * 0.6) rarity = 2;      // Epic
  else if (roll < 0.36 + floorBonus + boost) rarity = 1;                   // Rare
  else rarity = 0;                                                          // Common
  rarity = Math.max(rarity, ct.minRarity); // enforce minimum rarity
  const statTypes = ['tapDmg', 'dpsMult', 'critChance', 'coinBonus'];
  const statType = statTypes[Math.floor(Math.random() * statTypes.length)];
  const rarityMults = [1, 2, 4, 8, 16, 32];
  const baseValue = statType === 'critChance' ? 1 + Math.floor(floor * 0.08) : 3 + Math.floor(floor * 0.3);
  const value = Math.floor(baseValue * rarityMults[rarity]);
  const pi = Math.floor(Math.random() * 4);
  return { id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, slot, rarity, statType, value, prefixIdx: pi };
}
function itemName(item, lang) {
  return `${(lang === 'ar' ? PREFIX_AR : PREFIX_EN)[item.rarity][item.prefixIdx]} ${(lang === 'ar' ? SLOT_NAME_AR : SLOT_NAME_EN)[item.slot]}`;
}
function getSimbaStage(power) {
  for (let i = SIMBA_STAGES.length - 1; i >= 0; i--)
    if (power >= SIMBA_STAGES[i].threshold) return { ...SIMBA_STAGES[i], index: i };
  return { ...SIMBA_STAGES[0], index: 0 };
}
function getBossTrait(floor) {
  const bt = BOSS_TYPES[floorBossType(floor)];
  if (!bt.trait || floor <= 3) return null;
  return bt.trait;
}

function generateReelItems(realItem, count, realIndex) {
  const items = [];
  // Guarantee one Godly and one Mythic teaser appear somewhere before the landing zone
  const godlySlot = 3 + Math.floor(Math.random() * Math.min(6, realIndex - 4));
  const mythicSlot = godlySlot + 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    if (i === realIndex) {
      items.push(realItem);
    } else {
      const slot = CLOTHING_SLOTS[Math.floor(Math.random() * CLOTHING_SLOTS.length)];
      let rarity;
      if (i === godlySlot) { rarity = 5; }
      else if (i === mythicSlot) { rarity = 4; }
      else {
        // Show all rarities so the player sees what's possible
        const roll = Math.random();
        if (roll < 0.02) rarity = 5;       // Godly teasers
        else if (roll < 0.06) rarity = 4;  // Mythic teasers
        else if (roll < 0.12) rarity = 3;  // Legendary
        else if (roll < 0.25) rarity = 2;  // Epic
        else if (roll < 0.50) rarity = 1;  // Rare
        else rarity = 0;                    // Common
      }
      items.push({ slot, rarity, id: `reel_${i}` });
    }
  }
  return items;
}

// ═══════════════════════════════════════════════════════════════
// JUICE: Particles, Shake, Floats
// ═══════════════════════════════════════════════════════════════

function spawnParticles(container, x, y, count, colors) {
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const size = 3 + Math.random() * 7;
    const clr = colors[Math.floor(Math.random() * colors.length)];
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const dist = 25 + Math.random() * 55;
    Object.assign(el.style, {
      position: 'absolute', width: `${size}px`, height: `${size}px`,
      borderRadius: '50%', background: clr, pointerEvents: 'none', zIndex: '30',
      boxShadow: `0 0 ${size}px ${clr}80`,
    });
    container.appendChild(el);
    el.animate([
      { transform: `translate(${x - size / 2}px, ${y - size / 2}px) scale(1)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(angle) * dist}px, ${y + Math.sin(angle) * dist - 20}px) scale(0)`, opacity: 0 },
    ], { duration: 350 + Math.random() * 350, easing: 'cubic-bezier(0, .9, .57, 1)', delay: Math.random() * 80 }).onfinish = () => el.remove();
  }
}
function floatDmg(container, x, y, text, isCrit) {
  if (!container) return;
  const el = document.createElement('div');
  el.textContent = text;
  const jitterX = (Math.random() - 0.5) * 40;
  Object.assign(el.style, {
    position: 'absolute', left: `${x + jitterX}px`, top: `${y}px`,
    pointerEvents: 'none', fontFamily: 'var(--font-heading)', fontWeight: '900',
    fontSize: isCrit ? '28px' : '20px', zIndex: '25',
    color: isCrit ? '#FFD700' : '#FFF',
    textShadow: isCrit ? '0 0 12px #FFD700, 0 0 24px #FF8C00, 0 2px 4px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.7), 0 0 8px rgba(255,255,255,0.3)',
    animation: `${isCrit ? 'dmgFloatCrit' : 'dmgFloat'} ${isCrit ? '1s' : '0.75s'} ease-out forwards`,
  });
  container.appendChild(el);
  setTimeout(() => el.remove(), isCrit ? 1050 : 800);
}
function fireCarrierProjectile(arena, color) {
  if (!arena) return;
  const el = document.createElement('div');
  const sz = 4 + Math.random() * 3;
  Object.assign(el.style, { position: 'absolute', width: `${sz}px`, height: `${sz}px`, borderRadius: '50%', background: color, pointerEvents: 'none', zIndex: '8', boxShadow: `0 0 ${sz + 3}px ${color}` });
  arena.appendChild(el);
  const aw = arena.clientWidth, ah = arena.clientHeight;
  const sx = 15 + Math.random() * 10, sy = ah * (0.55 + Math.random() * 0.15);
  const ex = aw * 0.62 + (Math.random() - 0.5) * 20, ey = ah * 0.35 + (Math.random() - 0.5) * 15;
  el.animate([
    { transform: `translate(${sx}px, ${sy}px) scale(1.3)`, opacity: 0.9 },
    { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 15}px) scale(1)`, opacity: 1, offset: 0.4 },
    { transform: `translate(${ex}px, ${ey}px) scale(0.3)`, opacity: 0 },
  ], { duration: 350 + Math.random() * 150, easing: 'ease-in' }).onfinish = () => el.remove();
}
function showMilestone(container, text) {
  if (!container) return;
  const el = document.createElement('div');
  el.textContent = text;
  Object.assign(el.style, {
    position: 'absolute', top: '0', left: '0', right: '0', zIndex: '35',
    textAlign: 'center', padding: '10px 16px', fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '15px',
    color: '#FFF', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.7), transparent)',
    animation: 'milestoneBanner 2.5s ease-in-out forwards', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  });
  container.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ═══════════════════════════════════════════════════════════════
// SVG CHARACTERS
// ═══════════════════════════════════════════════════════════════

function SimbaCharacter({ stageIdx }) {
  const s = SIMBA_STAGES[stageIdx] || SIMBA_STAGES[0];
  const sz = s.size;
  return (
    <svg width={sz} height={sz * 1.1} viewBox="0 0 100 110" style={{ overflow: 'visible', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
      <defs>
        <radialGradient id="sb_fur" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#FFDF6B" /><stop offset="100%" stopColor="#E8A317" /></radialGradient>
        <radialGradient id="sb_belly" cx="45%" cy="35%" r="55%"><stop offset="0%" stopColor="#FFF8E1" /><stop offset="100%" stopColor="#FFE082" /></radialGradient>
        <radialGradient id="sb_mane" cx="45%" cy="35%" r="60%"><stop offset="0%" stopColor="#C67C00" /><stop offset="100%" stopColor="#7A4400" /></radialGradient>
        <linearGradient id="sb_crown" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFE44D" /><stop offset="100%" stopColor="#FFB300" /></linearGradient>
      </defs>
      <path d="M18 72 Q6 55 12 40 Q15 33 20 38" stroke="#D4920A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="12" cy="38" rx="4" ry="5" fill={s.hasMane ? '#8B5400' : '#D4920A'} />
      <ellipse cx="34" cy="96" rx="9" ry="7" fill="#D4920A" /><ellipse cx="66" cy="96" rx="9" ry="7" fill="#D4920A" />
      <ellipse cx="34" cy="100" rx="7" ry="4" fill="#C67C00" /><ellipse cx="66" cy="100" rx="7" ry="4" fill="#C67C00" />
      <ellipse cx="50" cy="78" rx="26" ry="20" fill="url(#sb_fur)" />
      <ellipse cx="50" cy="82" rx="18" ry="13" fill="url(#sb_belly)" />
      <rect x="32" y="84" width="10" height="18" rx="5" fill="#E8A317" /><rect x="58" y="84" width="10" height="18" rx="5" fill="#E8A317" />
      <ellipse cx="37" cy="103" rx="6" ry="3.5" fill="#C67C00" /><ellipse cx="63" cy="103" rx="6" ry="3.5" fill="#C67C00" />
      {s.hasMane && <><circle cx="50" cy="48" r="30" fill="url(#sb_mane)" />
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
          <ellipse key={a} cx={50 + 27 * Math.cos(a * Math.PI / 180)} cy={48 + 27 * Math.sin(a * Math.PI / 180)}
            rx={8} ry={10} fill="#8B5400" opacity="0.7"
            transform={`rotate(${a}, ${50 + 27 * Math.cos(a * Math.PI / 180)}, ${48 + 27 * Math.sin(a * Math.PI / 180)})`} />
        ))}</>}
      {s.hasCrown && <g transform="translate(32, 2)">
        <polygon points="18,22 2,4 8,16 12,-2 18,13 24,-2 28,16 34,4 18,22" fill="url(#sb_crown)" stroke="#B8860B" strokeWidth="0.8" />
        <circle cx="12" cy="5" r="2.2" fill="#E53935" /><circle cx="18" cy="2" r="2.5" fill="#2979FF" /><circle cx="24" cy="5" r="2.2" fill="#43A047" />
      </g>}
      <ellipse cx="50" cy="48" rx="24" ry="22" fill="url(#sb_fur)" />
      <ellipse cx="30" cy="30" rx="9" ry="11" fill={s.hasMane ? '#A06000' : '#E8A317'} /><ellipse cx="70" cy="30" rx="9" ry="11" fill={s.hasMane ? '#A06000' : '#E8A317'} />
      <ellipse cx="30" cy="30" rx="5.5" ry="7" fill="#FFD6A0" /><ellipse cx="70" cy="30" rx="5.5" ry="7" fill="#FFD6A0" />
      <ellipse cx="50" cy="52" rx="16" ry="14" fill="url(#sb_belly)" />
      <ellipse cx="41" cy="44" rx="7" ry="7.5" fill="white" /><ellipse cx="59" cy="44" rx="7" ry="7.5" fill="white" />
      <circle cx="43" cy="45" r="4.5" fill="#2D1B00" /><circle cx="61" cy="45" r="4.5" fill="#2D1B00" />
      <circle cx="44.5" cy="43" r="2" fill="white" /><circle cx="62.5" cy="43" r="2" fill="white" />
      <ellipse cx="50" cy="53" rx="4.5" ry="3" fill="#6D3A00" /><ellipse cx="50" cy="52.2" rx="2.5" ry="1.2" fill="#9B5A1A" opacity="0.6" />
      <path d="M46 56 Q50 60 54 56" stroke="#6D3A00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M50 53.5 L50 56" stroke="#6D3A00" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28" y1="50" x2="39" y2="52" stroke="#C67C00" strokeWidth="0.8" opacity="0.5" />
      <line x1="27" y1="54" x2="39" y2="54" stroke="#C67C00" strokeWidth="0.8" opacity="0.5" />
      <line x1="61" y1="52" x2="72" y2="50" stroke="#C67C00" strokeWidth="0.8" opacity="0.5" />
      <line x1="61" y1="54" x2="73" y2="54" stroke="#C67C00" strokeWidth="0.8" opacity="0.5" />
      <circle cx="35" cy="54" r="4" fill="#FFB74D" opacity="0.3" /><circle cx="65" cy="54" r="4" fill="#FFB74D" opacity="0.3" />
    </svg>
  );
}

function BossCharacter({ typeIdx, isBig }) {
  const b = BOSS_TYPES[typeIdx] || BOSS_TYPES[0];
  const sc = isBig ? 1.25 : 1;
  const id = `b${typeIdx}_${isBig ? 'b' : 'n'}`;
  const w = 110 * sc, h = 110 * sc;
  const common = (<defs>
    <radialGradient id={`${id}_bd`} cx="35%" cy="28%" r="62%"><stop offset="0%" stopColor={b.light} /><stop offset="100%" stopColor={b.body} /></radialGradient>
    <radialGradient id={`${id}_bl`} cx="50%" cy="35%" r="50%"><stop offset="0%" stopColor={b.light} stopOpacity="0.6" /><stop offset="100%" stopColor={b.body} stopOpacity="0.15" /></radialGradient>
    <filter id={`${id}_gw`}><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    <filter id={`${id}_sh`}><feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.3" /></filter>
  </defs>);
  const bossSVGs = {
    0: (<>{common}<ellipse cx="55" cy="95" rx="32" ry="5" fill="rgba(0,0,0,0.08)" /><path d="M18 55 Q5 40 12 30 Q16 25 22 32 Z" fill={b.accent} /><path d="M92 55 Q105 40 98 30 Q94 25 88 32 Z" fill={b.accent} /><path d="M55 30 Q58 15 65 10 Q68 5 72 12" stroke={b.body} strokeWidth="5" fill="none" strokeLinecap="round" /><circle cx="73" cy="11" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><ellipse cx="55" cy="60" rx="35" ry="28" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="65" rx="22" ry="16" fill={`url(#${id}_bl)`} /><path d="M30 52 Q55 46 80 52" stroke={b.accent} strokeWidth="1.5" fill="none" opacity="0.4" /><ellipse cx="43" cy="50" rx="8" ry="9" fill="white" /><ellipse cx="67" cy="50" rx="8" ry="9" fill="white" /><circle cx="45" cy="51" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="69" cy="51" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="43.5" cy="49.5" r="2" fill="white" opacity="0.8" /><circle cx="67.5" cy="49.5" r="2" fill="white" opacity="0.8" />{[-18,-8,8,18].map((dx,i) => <line key={i} x1={55+dx} y1="78" x2={55+dx*1.8} y2="92" stroke={b.accent} strokeWidth="3" strokeLinecap="round" />)}</>),
    1: (<>{common}<ellipse cx="55" cy="95" rx="32" ry="5" fill="rgba(0,0,0,0.08)" />{[0,1,2,3,4,5].map(i => { const x=25+i*12; const sw=i%2?8:-8; return <path key={i} d={`M${x} 72 Q${x+sw} 85 ${x-sw} 98`} stroke={b.body} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />; })}<ellipse cx="55" cy="42" rx="32" ry="30" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="58" rx="28" ry="18" fill={`url(#${id}_bl)`} /><ellipse cx="42" cy="46" rx="10" ry="11" fill="white" /><ellipse cx="68" cy="46" rx="10" ry="11" fill="white" /><circle cx="44" cy="47" r="6.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="70" cy="47" r="6.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="42" cy="44.5" r="2.5" fill="white" opacity="0.85" /><circle cx="68" cy="44.5" r="2.5" fill="white" opacity="0.85" /><path d="M44 62 Q55 70 66 62" fill={b.accent} /></>),
    2: (<>{common}<ellipse cx="55" cy="97" rx="28" ry="5" fill="rgba(0,0,0,0.08)" /><rect x="10" y="50" width="16" height="30" rx="8" fill={b.accent} transform="rotate(-10 18 65)" /><rect x="84" y="50" width="16" height="30" rx="8" fill={b.accent} transform="rotate(10 92 65)" /><rect x="36" y="78" width="14" height="18" rx="7" fill={b.accent} /><rect x="60" y="78" width="14" height="18" rx="7" fill={b.accent} /><rect x="28" y="44" width="54" height="40" rx="12" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><rect x="36" y="52" width="38" height="25" rx="8" fill={`url(#${id}_bl)`} /><path d="M40 48 L44 56 L38 62" stroke={b.accent} strokeWidth="1.2" fill="none" opacity="0.5" /><rect x="32" y="18" width="46" height="32" rx="10" fill={`url(#${id}_bd)`} /><ellipse cx="44" cy="32" rx="7" ry="8" fill="white" /><ellipse cx="66" cy="32" rx="7" ry="8" fill="white" /><circle cx="45.5" cy="33" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="67.5" cy="33" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="44" cy="31" r="2" fill="white" opacity="0.8" /><circle cx="66" cy="31" r="2" fill="white" opacity="0.8" /><path d="M42 42 L48 45 L55 42 L62 45 L68 42" stroke={b.accent} strokeWidth="2" fill="none" strokeLinecap="round" /></>),
    3: (<>{common}<ellipse cx="55" cy="95" rx="36" ry="5" fill="rgba(0,0,0,0.08)" />{[22,40,72,85].map((x,i) => <ellipse key={i} cx={x} cy={82+i*3} rx="6" ry="10" fill={b.body} opacity="0.6" />)}<path d="M15 70 Q10 40 30 25 Q50 12 75 25 Q95 40 90 70 Q85 90 55 88 Q25 90 15 70Z" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><path d="M38 75 Q40 85 38 92" stroke={b.light} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" /><ellipse cx="38" cy="45" rx="11" ry="12" fill="white" /><ellipse cx="68" cy="48" rx="9" ry="10" fill="white" /><circle cx="40" cy="46" r="7" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="70" cy="49" r="5.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="38" cy="43.5" r="2.8" fill="white" opacity="0.85" /><circle cx="68" cy="46.5" r="2.2" fill="white" opacity="0.85" /><path d="M34 62 Q52 75 70 62" fill={b.accent} opacity="0.9" /><path d="M40 62 L43 67 L46 62" fill={b.light} opacity="0.7" /><path d="M54 63 L57 68 L60 63" fill={b.light} opacity="0.7" /></>),
    4: (<>{common}<path d="M30 20 Q25 5 35 10 Q28 -2 40 8" fill={b.light} opacity="0.5" /><path d="M70 15 Q80 0 75 12 Q82 2 72 14" fill={b.light} opacity="0.5" /><path d="M50 10 Q48 -5 55 5 Q52 -8 58 8" fill="#FDD835" opacity="0.6" /><path d="M25 88 Q15 55 25 35 Q35 15 55 12 Q75 15 85 35 Q95 55 85 88 Q70 95 55 92 Q40 95 25 88Z" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><path d="M35 82 Q30 55 40 40 Q50 30 60 40 Q70 55 65 82 Q55 88 45 85Z" fill={`url(#${id}_bl)`} /><ellipse cx="42" cy="48" rx="9" ry="10" fill="white" /><ellipse cx="66" cy="48" rx="9" ry="10" fill="white" /><circle cx="44" cy="49" r="6" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="68" cy="49" r="6" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="42.5" cy="47" r="2.2" fill="white" opacity="0.85" /><circle cx="66.5" cy="47" r="2.2" fill="white" opacity="0.85" /><line x1="34" y1="37" x2="47" y2="39" stroke={b.accent} strokeWidth="3.5" strokeLinecap="round" /><line x1="76" y1="37" x2="63" y2="39" stroke={b.accent} strokeWidth="3.5" strokeLinecap="round" /><path d="M38 66 Q55 78 72 66" fill={b.accent} /><polygon points="44,66 46,72 48,66" fill="#FDD835" /><polygon points="52,67 55,74 58,67" fill="#FDD835" /><polygon points="62,66 64,72 66,66" fill="#FDD835" /></>),
    5: (<>{common}<ellipse cx="55" cy="97" rx="30" ry="5" fill="rgba(0,0,0,0.08)" /><path d="M30 22 Q22 2 28 8 L35 25" fill={b.accent} /><path d="M80 22 Q88 2 82 8 L75 25" fill={b.accent} /><ellipse cx="14" cy="62" rx="12" ry="16" fill={b.body} transform="rotate(-15 14 62)" /><ellipse cx="96" cy="62" rx="12" ry="16" fill={b.body} transform="rotate(15 96 62)" /><circle cx="10" cy="76" r="8" fill={b.accent} /><circle cx="100" cy="76" r="8" fill={b.accent} /><rect x="34" y="82" width="15" height="14" rx="7" fill={b.accent} /><rect x="61" y="82" width="15" height="14" rx="7" fill={b.accent} /><ellipse cx="55" cy="60" rx="32" ry="30" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="65" rx="20" ry="18" fill={`url(#${id}_bl)`} /><ellipse cx="55" cy="32" rx="24" ry="20" fill={`url(#${id}_bd)`} /><path d="M34 28 Q55 20 76 28" stroke={b.accent} strokeWidth="5" fill="none" strokeLinecap="round" /><ellipse cx="44" cy="34" rx="7" ry="8" fill="white" /><ellipse cx="66" cy="34" rx="7" ry="8" fill="white" /><circle cx="45.5" cy="35" r="4.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="67.5" cy="35" r="4.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="44" cy="33" r="1.8" fill="white" opacity="0.8" /><circle cx="66" cy="33" r="1.8" fill="white" opacity="0.8" /><path d="M38 44 Q55 56 72 44" fill={b.accent} /><polygon points="44,44 46,50 48,44" fill="white" /><polygon points="55,45 55,52 57,45" fill="white" /><polygon points="62,44 64,50 66,44" fill="white" /></>),
    6: (<>{common}<ellipse cx="55" cy="97" rx="30" ry="5" fill="rgba(0,0,0,0.08)" />{[35,45,55,65,75].map((x,i) => <ellipse key={i} cx={x} cy={14+(i%2)*3} rx="6" ry="9" fill={b.light} opacity="0.7" />)}<ellipse cx="16" cy="58" rx="14" ry="18" fill={b.light} /><ellipse cx="94" cy="58" rx="14" ry="18" fill={b.light} /><ellipse cx="55" cy="58" rx="35" ry="34" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="62" rx="22" ry="22" fill={`url(#${id}_bl)`} />{[28,40,55,70,82].map((x,i) => <ellipse key={i} cx={x} cy={85} rx="5" ry="7" fill={b.light} opacity="0.5" />)}<ellipse cx="42" cy="44" rx="9" ry="10" fill="white" /><ellipse cx="68" cy="44" rx="9" ry="10" fill="white" /><circle cx="44" cy="45" r="6" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="70" cy="45" r="6" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="42.5" cy="42.5" r="2.5" fill="white" opacity="0.85" /><circle cx="68.5" cy="42.5" r="2.5" fill="white" opacity="0.85" /><ellipse cx="55" cy="55" rx="5" ry="3.5" fill={b.accent} /><path d="M45 62 Q55 68 65 62" stroke={b.accent} strokeWidth="2" fill="none" strokeLinecap="round" /><polygon points="20,28 23,18 26,28" fill="#B3E5FC" opacity="0.7" /><polygon points="82,25 85,15 88,25" fill="#B3E5FC" opacity="0.7" /></>),
    7: (<>{common}<ellipse cx="55" cy="97" rx="28" ry="5" fill="rgba(0,0,0,0.08)" /><line x1="55" y1="16" x2="55" y2="4" stroke={b.accent} strokeWidth="2.5" /><circle cx="55" cy="3" r="4" fill={b.eyes} filter={`url(#${id}_gw)`} /><rect x="6" y="42" width="18" height="26" rx="4" fill={b.accent} /><rect x="86" y="42" width="18" height="26" rx="4" fill={b.accent} /><rect x="9" y="46" width="12" height="4" rx="2" fill={b.eyes} opacity="0.4" /><rect x="89" y="46" width="12" height="4" rx="2" fill={b.eyes} opacity="0.4" /><rect x="38" y="80" width="10" height="14" rx="3" fill={b.accent} /><rect x="62" y="80" width="10" height="14" rx="3" fill={b.accent} /><rect x="35" y="92" width="16" height="5" rx="2.5" fill={b.body} /><rect x="59" y="92" width="16" height="5" rx="2.5" fill={b.body} /><rect x="26" y="40" width="58" height="42" rx="10" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><rect x="34" y="48" width="42" height="26" rx="6" fill={`url(#${id}_bl)`} /><circle cx="55" cy="62" r="3" fill={b.eyes} filter={`url(#${id}_gw)`} /><rect x="32" y="16" width="46" height="28" rx="8" fill={`url(#${id}_bd)`} /><rect x="36" y="24" width="38" height="12" rx="6" fill={b.accent} opacity="0.5" /><circle cx="44" cy="30" r="5.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="66" cy="30" r="5.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="42.5" cy="28.5" r="2" fill="white" opacity="0.7" /><circle cx="64.5" cy="28.5" r="2" fill="white" opacity="0.7" />{[42,48,54,60,66].map(x => <line key={x} x1={x} y1="38" x2={x} y2="42" stroke={b.accent} strokeWidth="1.5" opacity="0.5" />)}</>),
    8: (<>{common}<ellipse cx="55" cy="97" rx="30" ry="5" fill="rgba(0,0,0,0.08)" /><path d="M20 70 Q10 50 20 35 Q30 20 55 18 Q80 20 90 35 Q100 50 90 70 Q80 90 55 92 Q30 90 20 70Z" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} opacity="0.85" /><path d="M30 65 Q40 80 55 82 Q70 80 80 65" fill={`url(#${id}_bl)`} opacity="0.4" /><ellipse cx="42" cy="48" rx="8" ry="9" fill="white" opacity="0.6" /><ellipse cx="68" cy="48" rx="8" ry="9" fill="white" opacity="0.6" /><circle cx="44" cy="49" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="70" cy="49" r="5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="42.5" cy="47" r="2" fill="white" opacity="0.8" /><circle cx="68.5" cy="47" r="2" fill="white" opacity="0.8" /><path d="M45 62 Q55 68 65 62" stroke={b.accent} strokeWidth="2" fill="none" strokeLinecap="round" />{[35,45,55,65,75].map((x,i)=><path key={i} d={`M${x} 25 Q${x} 15 ${x+5} 12`} stroke={b.light} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />)}</>),
    9: (<>{common}<ellipse cx="55" cy="97" rx="32" ry="5" fill="rgba(0,0,0,0.08)" />{[0,1,2,3,4,5,6].map(i=>{const x=20+i*10,sw=i%2?6:-6;return <path key={i} d={`M${x} 68 Q${x+sw} 80 ${x-sw} 95`} stroke={b.body} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7" />;})}<ellipse cx="55" cy="40" rx="30" ry="26" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="50" rx="20" ry="14" fill={`url(#${id}_bl)`} /><path d="M30 28 Q55 18 80 28" stroke={b.accent} strokeWidth="4" fill="none" strokeLinecap="round" /><ellipse cx="42" cy="38" rx="8" ry="9" fill="white" /><ellipse cx="68" cy="38" rx="8" ry="9" fill="white" /><circle cx="44" cy="39" r="5.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="70" cy="39" r="5.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="42.5" cy="37" r="2.2" fill="white" opacity="0.85" /><circle cx="68.5" cy="37" r="2.2" fill="white" opacity="0.85" /><path d="M42 54 Q55 62 68 54" fill={b.accent} /><polygon points="48,54 50,60 52,54" fill="#FDD835" /><polygon points="58,54 60,60 62,54" fill="#FDD835" />{[40,50,60,70].map((x,i)=><path key={i} d={`M${x} 20 Q${x+(i%2?3:-3)} 10 ${x+6} 8`} stroke="#FDD835" strokeWidth="1.5" fill="none" opacity="0.5" />)}</>),
    10: (<>{common}<ellipse cx="55" cy="97" rx="28" ry="5" fill="rgba(0,0,0,0.08)" /><path d="M10 16 L0 22 L12 24" fill={b.accent} /><path d="M100 16 L110 22 L98 24" fill={b.accent} /><path d="M8 22 L-2 30 L14 28" fill={b.body} opacity="0.6" /><path d="M102 22 L112 30 L96 28" fill={b.body} opacity="0.6" /><ellipse cx="55" cy="55" rx="30" ry="28" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="60" rx="18" ry="16" fill={`url(#${id}_bl)`} /><ellipse cx="55" cy="30" rx="22" ry="18" fill={`url(#${id}_bd)`} /><path d="M38 22 Q55 14 72 22" stroke={b.accent} strokeWidth="4" fill="none" strokeLinecap="round" /><ellipse cx="44" cy="30" rx="7" ry="8" fill="white" /><ellipse cx="66" cy="30" rx="7" ry="8" fill="white" /><circle cx="45.5" cy="31" r="4.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="67.5" cy="31" r="4.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="44" cy="29" r="1.8" fill="white" opacity="0.8" /><circle cx="66" cy="29" r="1.8" fill="white" opacity="0.8" /><path d="M46 40 L55 46 L64 40" stroke={b.accent} strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M28 78 Q38 90 48 80" stroke={b.accent} strokeWidth="3" fill="none" /><path d="M82 78 Q72 90 62 80" stroke={b.accent} strokeWidth="3" fill="none" />{[35,45,65,75].map((x,i)=><path key={i} d={`M${x} ${70+i*2} L${x} ${85+i*2}`} stroke={b.accent} strokeWidth="3" strokeLinecap="round" />)}</>),
    11: (<>{common}<ellipse cx="55" cy="97" rx="30" ry="5" fill="rgba(0,0,0,0.08)" /><path d="M90 65 Q100 60 105 50 Q108 45 100 48 Q95 42 88 46" fill={b.accent} /><path d="M90 65 Q95 62 98 56" stroke={b.eyes} strokeWidth="1.5" fill="none" opacity="0.5" /><ellipse cx="15" cy="60" rx="12" ry="8" fill={b.body} transform="rotate(-20 15 60)" /><ellipse cx="95" cy="60" rx="12" ry="8" fill={b.body} transform="rotate(20 95 60)" /><path d="M8 56 L3 50" stroke={b.accent} strokeWidth="3" strokeLinecap="round" /><path d="M102 56 L107 50" stroke={b.accent} strokeWidth="3" strokeLinecap="round" /><circle cx="3" cy="49" r="3" fill={b.eyes} opacity="0.6" /><circle cx="107" cy="49" r="3" fill={b.eyes} opacity="0.6" /><ellipse cx="55" cy="58" rx="32" ry="28" fill={`url(#${id}_bd)`} filter={`url(#${id}_sh)`} /><ellipse cx="55" cy="62" rx="20" ry="16" fill={`url(#${id}_bl)`} />{[38,46,54,62,70].map((x,i)=><rect key={i} x={x} y="36" width="4" height="6" rx="2" fill={b.accent} opacity="0.5" />)}<ellipse cx="55" cy="40" rx="22" ry="16" fill={`url(#${id}_bd)`} /><ellipse cx="44" cy="42" rx="7" ry="8" fill="white" /><ellipse cx="66" cy="42" rx="7" ry="8" fill="white" /><circle cx="45" cy="43" r="4.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="67" cy="43" r="4.5" fill={b.eyes} filter={`url(#${id}_gw)`} /><circle cx="43.5" cy="41" r="1.8" fill="white" opacity="0.8" /><circle cx="65.5" cy="41" r="1.8" fill="white" opacity="0.8" /><path d="M44 54 Q55 60 66 54" fill={b.accent} />{[30,40,50,60,70,80].map((x,i)=><rect key={i} x={x-2} y={72+i%2*3} width="4" height="16" rx="2" fill={b.accent} opacity="0.7" />)}</>),
  };
  return (
    <svg width={w} height={h} viewBox="0 0 110 110" style={{ overflow: 'visible', filter: `drop-shadow(0 4px 10px rgba(0,0,0,0.35)) drop-shadow(0 0 14px ${b.glow})` }}>
      {bossSVGs[typeIdx] || bossSVGs[0]}
    </svg>
  );
}

function CompanionAnimal({ companion, size = 28 }) {
  const c = companion;
  const s = size;
  const designs = {
    eagle: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 4px ${c.color}60)` }}>
        <defs><radialGradient id="ea_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#D4A017" /><stop offset="100%" stopColor="#8B6914" /></radialGradient></defs>
        <path d="M20 6 L12 16 L6 14 L14 22 L20 18 L26 22 L34 14 L28 16 Z" fill="#5D4037" opacity="0.6" />
        <path d="M8 12 L2 18 L10 22" fill="#795548" />
        <path d="M32 12 L38 18 L30 22" fill="#795548" />
        <ellipse cx="20" cy="24" rx="10" ry="9" fill="url(#ea_b)" />
        <ellipse cx="20" cy="27" rx="7" ry="5" fill="#FFF8E1" />
        <ellipse cx="20" cy="16" rx="8" ry="7" fill="url(#ea_b)" />
        <circle cx="16" cy="15" r="2.5" fill="white" /><circle cx="24" cy="15" r="2.5" fill="white" />
        <circle cx="16.5" cy="15.5" r="1.5" fill="#1A1A1A" /><circle cx="24.5" cy="15.5" r="1.5" fill="#1A1A1A" />
        <circle cx="16" cy="14.5" r="0.6" fill="white" /><circle cx="24" cy="14.5" r="0.6" fill="white" />
        <path d="M18 18 L20 21 L22 18" fill="#FF8F00" stroke="#E65100" strokeWidth="0.5" />
        <path d="M16 11 L14 8" stroke="#5D4037" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M24 11 L26 8" stroke="#5D4037" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    wolf: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 4px ${c.color}60)` }}>
        <defs><radialGradient id="wf_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#90A4AE" /><stop offset="100%" stopColor="#546E7A" /></radialGradient></defs>
        <polygon points="12,10 8,2 14,12" fill="#455A64" /><polygon points="28,10 32,2 26,12" fill="#455A64" />
        <polygon points="12,10 10,4 15,13" fill="#CFD8DC" />
        <polygon points="28,10 30,4 25,13" fill="#CFD8DC" />
        <ellipse cx="20" cy="24" rx="11" ry="10" fill="url(#wf_b)" />
        <ellipse cx="20" cy="27" rx="7" ry="5" fill="#CFD8DC" />
        <ellipse cx="20" cy="16" rx="9" ry="8" fill="url(#wf_b)" />
        <ellipse cx="20" cy="20" rx="5" ry="4" fill="#CFD8DC" />
        <circle cx="16" cy="14" r="2.5" fill="white" /><circle cx="24" cy="14" r="2.5" fill="white" />
        <circle cx="16.5" cy="14.5" r="1.8" fill="#FFB300" /><circle cx="24.5" cy="14.5" r="1.8" fill="#FFB300" />
        <circle cx="16.5" cy="14" r="0.8" fill="#1A1A1A" /><circle cx="24.5" cy="14" r="0.8" fill="#1A1A1A" />
        <ellipse cx="20" cy="19" rx="2.5" ry="1.5" fill="#37474F" />
        <path d="M18 21 Q20 23 22 21" stroke="#37474F" strokeWidth="0.8" fill="none" />
        <path d="M14 32 Q20 38 26 32" stroke="#78909C" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
    panther: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 4px ${c.color}60)` }}>
        <defs><radialGradient id="pt_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#455A64" /><stop offset="100%" stopColor="#1C1C1C" /></radialGradient></defs>
        <polygon points="11,12 9,4 15,13" fill="#263238" /><polygon points="29,12 31,4 25,13" fill="#263238" />
        <ellipse cx="20" cy="24" rx="11" ry="10" fill="url(#pt_b)" />
        <ellipse cx="20" cy="16" rx="9" ry="8" fill="url(#pt_b)" />
        <circle cx="16" cy="14" r="3" fill="#FFEB3B" opacity="0.9" /><circle cx="24" cy="14" r="3" fill="#FFEB3B" opacity="0.9" />
        <circle cx="16" cy="14.2" r="1.5" fill="#1A1A1A" /><circle cx="24" cy="14.2" r="1.5" fill="#1A1A1A" />
        <circle cx="15.5" cy="13.5" r="0.6" fill="white" /><circle cx="23.5" cy="13.5" r="0.6" fill="white" />
        <ellipse cx="20" cy="18.5" rx="2" ry="1.2" fill="#E91E63" />
        <path d="M17 20 Q20 22 23 20" stroke="#263238" strokeWidth="0.7" fill="none" />
        <line x1="12" y1="17" x2="6" y2="16" stroke="#455A64" strokeWidth="0.6" />
        <line x1="12" y1="19" x2="6" y2="20" stroke="#455A64" strokeWidth="0.6" />
        <line x1="28" y1="17" x2="34" y2="16" stroke="#455A64" strokeWidth="0.6" />
        <line x1="28" y1="19" x2="34" y2="20" stroke="#455A64" strokeWidth="0.6" />
        <path d="M14 32 Q20 37 26 32" stroke="#37474F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
    phoenix: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 6px #FF630060)` }}>
        <defs>
          <radialGradient id="ph_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#FFAB40" /><stop offset="100%" stopColor="#E65100" /></radialGradient>
          <radialGradient id="ph_g" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.6" /><stop offset="100%" stopColor="#FF6D00" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="20" cy="20" r="16" fill="url(#ph_g)" />
        <path d="M18 5 L20 0 L22 5" fill="#FDD835" opacity="0.7" />
        <path d="M14 7 L11 2 L16 8" fill="#FFB300" opacity="0.6" />
        <path d="M26 7 L29 2 L24 8" fill="#FFB300" opacity="0.6" />
        <path d="M6 14 L0 16 L8 20" fill="#FF8F00" /><path d="M34 14 L40 16 L32 20" fill="#FF8F00" />
        <path d="M8 18 L3 22 L10 22" fill="#FF6D00" opacity="0.7" />
        <path d="M32 18 L37 22 L30 22" fill="#FF6D00" opacity="0.7" />
        <ellipse cx="20" cy="24" rx="10" ry="9" fill="url(#ph_b)" />
        <ellipse cx="20" cy="26" rx="6" ry="5" fill="#FFF8E1" opacity="0.6" />
        <ellipse cx="20" cy="16" rx="8" ry="7" fill="url(#ph_b)" />
        <circle cx="16" cy="15" r="2.5" fill="white" /><circle cx="24" cy="15" r="2.5" fill="white" />
        <circle cx="16.5" cy="15.5" r="1.6" fill="#D32F2F" /><circle cx="24.5" cy="15.5" r="1.6" fill="#D32F2F" />
        <circle cx="16" cy="15" r="0.5" fill="white" /><circle cx="24" cy="15" r="0.5" fill="white" />
        <path d="M18 19 L20 22 L22 19" fill="#FFD600" stroke="#E65100" strokeWidth="0.4" />
        <path d="M12 32 Q20 40 28 32" stroke="#E65100" strokeWidth="1" fill="#FF8F00" opacity="0.5" />
      </svg>
    ),
    tiger: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 4px ${c.color}60)` }}>
        <defs><radialGradient id="tg_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#FFB74D" /><stop offset="100%" stopColor="#E65100" /></radialGradient></defs>
        <polygon points="11,12 8,4 15,13" fill="#E65100" /><polygon points="29,12 32,4 25,13" fill="#E65100" />
        <polygon points="11,12 9,6 14,13" fill="#FFF8E1" />
        <polygon points="29,12 31,6 26,13" fill="#FFF8E1" />
        <ellipse cx="20" cy="24" rx="11" ry="10" fill="url(#tg_b)" />
        <ellipse cx="20" cy="26" rx="7" ry="5" fill="#FFF8E1" />
        <ellipse cx="20" cy="16" rx="9" ry="8" fill="url(#tg_b)" />
        <ellipse cx="20" cy="19" rx="5" ry="3.5" fill="white" />
        <path d="M14 12 L18 14" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 12 L22 14" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 10 L20 12 L22 10" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <circle cx="16" cy="14.5" r="2.5" fill="white" /><circle cx="24" cy="14.5" r="2.5" fill="white" />
        <circle cx="16.5" cy="15" r="1.6" fill="#2E7D32" /><circle cx="24.5" cy="15" r="1.6" fill="#2E7D32" />
        <circle cx="16.5" cy="14.5" r="0.6" fill="#1A1A1A" /><circle cx="24.5" cy="14.5" r="0.6" fill="#1A1A1A" />
        <ellipse cx="20" cy="18.5" rx="2" ry="1.3" fill="#E91E63" />
        <path d="M17 20 Q20 22 23 20" stroke="#BF360C" strokeWidth="0.7" fill="none" />
        <path d="M14 32 Q20 38 26 32" stroke="#BF360C" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
    dragon: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 6px #1B5E2060)` }}>
        <defs><radialGradient id="dr_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#66BB6A" /><stop offset="100%" stopColor="#1B5E20" /></radialGradient></defs>
        <polygon points="10,14 4,6 14,14" fill="#2E7D32" /><polygon points="30,14 36,6 26,14" fill="#2E7D32" />
        <path d="M14 6 L12 0 L16 8" fill="#4CAF50" opacity="0.6" />
        <path d="M26 6 L28 0 L24 8" fill="#4CAF50" opacity="0.6" />
        <path d="M6 16 L0 20 L8 22" fill="#388E3C" /><path d="M34 16 L40 20 L32 22" fill="#388E3C" />
        <ellipse cx="20" cy="24" rx="12" ry="10" fill="url(#dr_b)" />
        <ellipse cx="20" cy="26" rx="7" ry="6" fill="#A5D6A7" opacity="0.5" />
        <ellipse cx="20" cy="16" rx="9" ry="8" fill="url(#dr_b)" />
        {[14,17,20,23,26].map(x => <path key={x} d={`M${x} 9 L${x+1} 5 L${x+2} 9`} fill="#FDD835" opacity="0.7" />)}
        <circle cx="15" cy="14" r="3" fill="#FFEB3B" /><circle cx="25" cy="14" r="3" fill="#FFEB3B" />
        <ellipse cx="15.3" cy="14.5" rx="1.5" ry="2" fill="#1A1A1A" /><ellipse cx="25.3" cy="14.5" rx="1.5" ry="2" fill="#1A1A1A" />
        <circle cx="14.8" cy="13.5" r="0.6" fill="white" /><circle cx="24.8" cy="13.5" r="0.6" fill="white" />
        <ellipse cx="20" cy="20" rx="4" ry="2.5" fill="#1B5E20" />
        <path d="M17 22 L16 24" stroke="#FF5722" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M23 22 L24 24" stroke="#FF5722" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M14 32 Q20 40 26 32" stroke="#2E7D32" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
    griffin: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 6px #6A1B9A50)` }}>
        <defs><radialGradient id="gr_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#CE93D8" /><stop offset="100%" stopColor="#6A1B9A" /></radialGradient></defs>
        <path d="M8 14 L0 18 L10 20" fill="#8E24AA" /><path d="M32 14 L40 18 L30 20" fill="#8E24AA" />
        <path d="M6 18 L1 24 L10 22" fill="#7B1FA2" opacity="0.6" />
        <path d="M34 18 L39 24 L30 22" fill="#7B1FA2" opacity="0.6" />
        <ellipse cx="20" cy="24" rx="11" ry="10" fill="url(#gr_b)" />
        <ellipse cx="20" cy="26" rx="7" ry="5" fill="#E1BEE7" opacity="0.5" />
        <ellipse cx="20" cy="16" rx="9" ry="8" fill="url(#gr_b)" />
        <path d="M16 8 L14 3 L18 9" fill="#AB47BC" /><path d="M24 8 L26 3 L22 9" fill="#AB47BC" />
        <circle cx="16" cy="14" r="2.8" fill="white" /><circle cx="24" cy="14" r="2.8" fill="white" />
        <circle cx="16.5" cy="14.5" r="1.8" fill="#FF6F00" /><circle cx="24.5" cy="14.5" r="1.8" fill="#FF6F00" />
        <circle cx="16.5" cy="14" r="0.7" fill="#1A1A1A" /><circle cx="24.5" cy="14" r="0.7" fill="#1A1A1A" />
        <path d="M18 19 L20 22 L22 19" fill="#FFB300" stroke="#E65100" strokeWidth="0.4" />
        <circle cx="20" cy="4" r="2.5" fill="#FDD835" opacity="0.6" />
        <path d="M12 32 Q20 38 28 32" stroke="#6A1B9A" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
    thunderbird: (
      <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible', filter: `drop-shadow(0 2px 6px #0D47A160)` }}>
        <defs>
          <radialGradient id="tb_b" cx="40%" cy="30%" r="60%"><stop offset="0%" stopColor="#42A5F5" /><stop offset="100%" stopColor="#0D47A1" /></radialGradient>
          <radialGradient id="tb_g" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#BBDEFB" stopOpacity="0.4" /><stop offset="100%" stopColor="#1565C0" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="20" cy="20" r="16" fill="url(#tb_g)" />
        <path d="M6 14 L-2 16 L8 20" fill="#1565C0" /><path d="M34 14 L42 16 L32 20" fill="#1565C0" />
        <path d="M4 18 L-2 24 L10 22" fill="#0D47A1" opacity="0.6" />
        <path d="M36 18 L42 24 L30 22" fill="#0D47A1" opacity="0.6" />
        <ellipse cx="20" cy="24" rx="11" ry="10" fill="url(#tb_b)" />
        <ellipse cx="20" cy="26" rx="7" ry="5" fill="#BBDEFB" opacity="0.4" />
        <ellipse cx="20" cy="16" rx="9" ry="8" fill="url(#tb_b)" />
        <path d="M18 5 L17 0 L20 6" fill="#FDD835" /><path d="M22 5 L23 0 L20 6" fill="#FDD835" />
        <path d="M20 6 L19 2 L21 2 Z" fill="#FFD600" />
        <circle cx="15.5" cy="14" r="3" fill="white" /><circle cx="24.5" cy="14" r="3" fill="white" />
        <circle cx="16" cy="14.5" r="2" fill="#FDD835" /><circle cx="25" cy="14.5" r="2" fill="#FDD835" />
        <circle cx="16" cy="14" r="0.8" fill="#1A1A1A" /><circle cx="25" cy="14" r="0.8" fill="#1A1A1A" />
        <path d="M18 19 L20 22 L22 19" fill="#FDD835" stroke="#F9A825" strokeWidth="0.4" />
        <path d="M16 28 L14 32 L17 30" stroke="#FDD835" strokeWidth="0.8" fill="#FDD835" opacity="0.6" />
        <path d="M24 28 L26 32 L23 30" stroke="#FDD835" strokeWidth="0.8" fill="#FDD835" opacity="0.6" />
      </svg>
    ),
  };
  return designs[c.nameKey] || designs.eagle;
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const defaults = {
  coins: 0, totalCoins: 0, totalTaps: 0, simbaPower: 0,
  carrierLevels: {}, prestigeCount: 0,
  floor: 1, bossHP: 0, bossMaxHP: 0, totalBossKills: 0,
  highestFloor: 1, lastSaved: Date.now(),
  inventory: [], equipped: {},
  prestigeGems: 0, perks: {},
  foodBought: {}, achievements: {},
  dailyDay: 0, dailyLastClaim: 0,
  tutStep: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { const hp = getBossHP(1); return { ...defaults, bossHP: hp, bossMaxHP: hp }; }
    const s = { ...defaults, ...JSON.parse(raw) };
    if (s.cityIndex !== undefined && !s._migrated) {
      s.floor = Math.max(1, (s.cityIndex || 0) * 5 + (s.bossNum || 0) + 1);
      s.highestFloor = s.floor; s._migrated = true;
    }
    if (!s.floor || s.floor < 1) s.floor = 1;
    if (s.bossMaxHP === 0) { s.bossHP = getBossHP(s.floor); s.bossMaxHP = getBossHP(s.floor); }
    if (!Array.isArray(s.inventory)) s.inventory = [];
    if (!s.equipped || typeof s.equipped !== 'object') s.equipped = {};
    if (!s.perks || typeof s.perks !== 'object') s.perks = {};
    if (!s.foodBought || typeof s.foodBought !== 'object') s.foodBought = {};
    if (!s.achievements || typeof s.achievements !== 'object') s.achievements = {};
    return s;
  } catch { const hp = getBossHP(1); return { ...defaults, bossHP: hp, bossMaxHP: hp }; }
}

function save(s) { localStorage.setItem(LS_KEY, JSON.stringify({ ...s, lastSaved: Date.now() })); }

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_LB_KEY)) || []; } catch { return []; }
}
function saveLeaderboard(lb) { localStorage.setItem(LS_LB_KEY, JSON.stringify(lb)); }
function addLeaderboardEntry(name, floor, bossKills, prestiges) {
  const lb = loadLeaderboard();
  const existing = lb.findIndex(e => e.name === name);
  if (existing >= 0) {
    if (floor > lb[existing].floor) {
      lb[existing] = { name, floor, bossKills, prestiges, date: Date.now() };
    } else return lb;
  } else {
    lb.push({ name, floor, bossKills, prestiges, date: Date.now() });
  }
  lb.sort((a, b) => b.floor - a.floor || b.bossKills - a.bossKills);
  const top = lb.slice(0, 20);
  saveLeaderboard(top);
  return top;
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...state, ...action.payload };
    case 'TAP': {
      if (state.bossHP <= 0) return state;
      return { ...state, bossHP: Math.max(0, state.bossHP - action.damage),
        coins: state.coins + action.coinGain, totalCoins: state.totalCoins + action.coinGain,
        totalTaps: state.totalTaps + 1, tutStep: Math.max(state.tutStep, 1) };
    }
    case 'HERO_TICK': {
      if (state.bossHP <= 0) return state;
      const cg = action.damage * 0.08;
      return { ...state, bossHP: Math.max(0, state.bossHP - action.damage), coins: state.coins + cg, totalCoins: state.totalCoins + cg };
    }
    case 'BOSS_REGEN': {
      if (state.bossHP <= 0 || state.bossHP >= state.bossMaxHP) return state;
      const regen = Math.floor(state.bossMaxHP * 0.01);
      return { ...state, bossHP: Math.min(state.bossMaxHP, state.bossHP + regen) };
    }
    case 'BOSS_KILLED': {
      const rw = action.reward;
      const nextFloor = state.floor + 1;
      const hp = getBossHP(nextFloor);
      return { ...state, coins: state.coins + rw, totalCoins: state.totalCoins + rw,
        floor: nextFloor, bossHP: hp, bossMaxHP: hp,
        highestFloor: Math.max(state.highestFloor, nextFloor),
        totalBossKills: state.totalBossKills + 1 };
    }
    case 'BUY_FOOD': {
      const f = action.food;
      const bought = state.foodBought[f.id] || 0;
      const cost = foodCost(f.baseCost, bought);
      if (state.coins < cost) return state;
      return { ...state, coins: state.coins - cost, simbaPower: state.simbaPower + f.power,
        foodBought: { ...state.foodBought, [f.id]: bought + 1 }, tutStep: Math.max(state.tutStep, 2) };
    }
    case 'UPGRADE_CARRIER': {
      const c = action.carrier; const lv = state.carrierLevels[c.id] || 0;
      const cost = upgradeCost(c.baseCost, lv); if (state.coins < cost) return state;
      return { ...state, coins: state.coins - cost, carrierLevels: { ...state.carrierLevels, [c.id]: lv + 1 },
        tutStep: Math.max(state.tutStep, 3) };
    }
    case 'COLLECT_ITEM': return { ...state, inventory: [...state.inventory, action.item] };
    case 'EQUIP_ITEM': {
      const item = action.item; const old = state.equipped[item.slot];
      const newInv = state.inventory.filter(i => i.id !== item.id);
      if (old) newInv.push(old);
      return { ...state, inventory: newInv, equipped: { ...state.equipped, [item.slot]: item } };
    }
    case 'UNEQUIP_ITEM': {
      const item = state.equipped[action.slot]; if (!item) return state;
      return { ...state, inventory: [...state.inventory, item], equipped: { ...state.equipped, [action.slot]: null } };
    }
    case 'SELL_ITEM': {
      const item = action.item;
      const sv = Math.floor(5 * (item.rarity + 1) * (1 + item.value * 0.1));
      return { ...state, inventory: state.inventory.filter(i => i.id !== item.id), coins: state.coins + sv };
    }
    case 'FUSE_ITEMS': {
      const { ids, newItem } = action;
      return { ...state, inventory: [...state.inventory.filter(i => !ids.includes(i.id)), newItem] };
    }
    case 'BUY_PERK': {
      const p = action.perk; const lv = state.perks[p.id] || 0;
      if (lv >= p.maxLv) return state;
      const cost = perkCost(p.baseCost, lv);
      if (state.prestigeGems < cost) return state;
      return { ...state, prestigeGems: state.prestigeGems - cost, perks: { ...state.perks, [p.id]: lv + 1 } };
    }
    case 'PRESTIGE': {
      const gems = Math.max(1, Math.floor(state.floor / 5));
      const headStartLv = state.perks.headStart || 0;
      const startFloor = Math.max(1, headStartLv * 5 + 1);
      const hp = getBossHP(startFloor);
      return { ...state, coins: 0, simbaPower: 0, carrierLevels: {}, foodBought: {},
        floor: startFloor, bossHP: hp, bossMaxHP: hp,
        prestigeCount: state.prestigeCount + 1, prestigeGems: state.prestigeGems + gems };
    }
    case 'CLAIM_ACHIEVEMENT': {
      const a = action.achievement;
      if (state.achievements[a.id]) return state;
      let s = { ...state, achievements: { ...state.achievements, [a.id]: true } };
      if (a.reward.coins) { s.coins += a.reward.coins; s.totalCoins += a.reward.coins; }
      if (a.reward.gems) s.prestigeGems += a.reward.gems;
      return s;
    }
    case 'CLAIM_DAILY': {
      const day = state.dailyDay % 7;
      const rw = DAILY_REWARDS[day];
      let s = { ...state, dailyDay: state.dailyDay + 1, dailyLastClaim: Date.now() };
      if (rw.coins) { s.coins += rw.coins; s.totalCoins += rw.coins; }
      if (rw.gems) s.prestigeGems += rw.gems;
      return s;
    }
    case 'ADD_OFFLINE': return { ...state, coins: state.coins + action.amount, totalCoins: state.totalCoins + action.amount };
    case 'GOLDEN': return { ...state, coins: state.coins + action.amount, totalCoins: state.totalCoins + action.amount };
    default: return state;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function GamePage() {
  const { t, lang, theme, setTheme } = useLang();

  /* Auto dark mode for game page */
  useEffect(() => {
    setTheme('dark');
    return () => setTheme('light');
  }, [setTheme]);
  const [screen, setScreen] = useState('menu');
  const [state, dispatch] = useReducer(reducer, null, load);
  const [activeTab, setActiveTab] = useState('food');
  const [showStats, setShowStats] = useState(false);
  const [showPrestige, setShowPrestige] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [offlineAmt, setOfflineAmt] = useState(0);
  const [isDying, setIsDying] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [isAtk, setIsAtk] = useState(false);
  const [bossKey, setBossKey] = useState(0);
  const [golden, setGolden] = useState(null);
  const [pendingChest, setPendingChest] = useState(null);
  const [pendingChestType, setPendingChestType] = useState(null); // CHEST_TYPES entry
  const [revealingChest, setRevealingChest] = useState(false);
  const [rollPhase, setRollPhase] = useState(null); // null | 'rolling' | 'stopped' | 'revealed'
  const [reelItems, setReelItems] = useState(null); // array of reel items for gacha scroll
  const [tapChestCount, setTapChestCount] = useState(0); // taps toward free chest (resets at 250)
  const [equipSlotFilter, setEquipSlotFilter] = useState(null); // null = all, or a slot name
  const [showDaily, setShowDaily] = useState(false);
  const [abilitiesActive, setAbilitiesActive] = useState({});
  const [abilitiesCooldown, setAbilitiesCooldown] = useState({});
  const [achToast, setAchToast] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('simba-player-name') || '');
  const [lbData, setLbData] = useState(loadLeaderboard);
  const [lbNameInput, setLbNameInput] = useState('');

  const arenaRef = useRef(null);
  const stRef = useRef(state);
  const comboRef = useRef(0);
  const comboTimer = useRef(null);
  const autoTapRef = useRef(null);

  useEffect(() => { stRef.current = state; }, [state]);

  // Derived stats
  const equipB = getEquipBonus(state.equipped);
  const perkB = getPerkBonus(state.perks);
  const psMult = abilitiesActive.powerStrike ? 10 : 1;
  const grMult = abilitiesActive.goldRush ? 5 : 1;
  const td = calcTapDmg(state.simbaPower, equipB, perkB) * psMult;
  const dps = calcDPS(state.carrierLevels, equipB, perkB) * (abilitiesActive.powerStrike ? 3 : 1);
  const critChance = calcCritChance(equipB, perkB);
  const coinMult = calcCoinMult(equipB, perkB) * grMult;
  const dropRate = calcDropRate(perkB);
  const ss = getSimbaStage(state.simbaPower);
  const cities = lang === 'ar' ? CITIES_AR : CITIES_EN;
  const curCityIdx = floorCityIdx(state.floor);
  const curBossType = floorBossType(state.floor);
  const isBig = floorIsBig(state.floor);
  const isWall = floorIsWall(state.floor);
  const bt = BOSS_TYPES[curBossType] || BOSS_TYPES[0];
  const ct = CITY_THEMES[curCityIdx] || CITY_THEMES[0];
  const dk = theme === 'dark';
  const activeCarriers = COMPANIONS.filter(c => (state.carrierLevels[c.id] || 0) > 0);
  const potentialGems = Math.max(1, Math.floor(state.floor / 5));
  const bossTrait = getBossTrait(state.floor);
  const slowActive = bossTrait === 'slow';

  // Load + offline + daily check
  useEffect(() => {
    const s = load();
    dispatch({ type: 'LOAD', payload: s });
    if (s.lastSaved && s.totalCoins > 0) {
      const secs = Math.min((Date.now() - s.lastSaved) / 1000, 14400);
      const eB = getEquipBonus(s.equipped || {}); const pB = getPerkBonus(s.perks || {});
      const d = calcDPS(s.carrierLevels || {}, eB, pB);
      if (d > 0 && secs > 30) { const earned = Math.floor(d * secs * 0.5); if (earned > 0) setOfflineAmt(earned); }
    }
    // Daily reward check
    const lastClaim = s.dailyLastClaim || 0;
    const now = Date.now();
    const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
    if (hoursSince >= 20) setShowDaily(true);
  }, []);

  // Auto-save
  useEffect(() => {
    const id = setInterval(() => save(stRef.current), 5000);
    return () => { clearInterval(id); save(stRef.current); };
  }, []);

  // Auto-update leaderboard when highest floor changes
  useEffect(() => {
    if (playerName && state.highestFloor > 1) {
      const updated = addLeaderboardEntry(playerName, state.highestFloor, state.totalBossKills, state.prestigeCount);
      setLbData(updated);
    }
  }, [state.highestFloor]);

  // Hero DPS tick (with slow trait)
  useEffect(() => {
    if (dps <= 0 || screen !== 'playing') return;
    const interval = slowActive ? 300 : 200;
    const id = setInterval(() => dispatch({ type: 'HERO_TICK', damage: dps / 5 }), interval);
    return () => clearInterval(id);
  }, [dps, screen, slowActive]);

  // Boss regen trait
  useEffect(() => {
    if (screen !== 'playing' || bossTrait !== 'regen') return;
    const id = setInterval(() => dispatch({ type: 'BOSS_REGEN' }), 1000);
    return () => clearInterval(id);
  }, [screen, bossTrait, state.floor]);

  // Carrier attack visual
  const hasDps = dps > 0;
  useEffect(() => {
    if (!hasDps || screen !== 'playing') return;
    const id = setInterval(() => {
      const arena = arenaRef.current; const st = stRef.current;
      if (!arena || st.bossHP <= 0) return;
      const active = COMPANIONS.filter(c => (st.carrierLevels[c.id] || 0) > 0);
      if (active.length === 0) return;
      const c = active[Math.floor(Math.random() * active.length)];
      fireCarrierProjectile(arena, c.color);
    }, 700);
    return () => clearInterval(id);
  }, [hasDps, screen]);

  // Auto-tap ability
  useEffect(() => {
    if (!abilitiesActive.autoTap || screen !== 'playing') {
      if (autoTapRef.current) { clearInterval(autoTapRef.current); autoTapRef.current = null; }
      return;
    }
    autoTapRef.current = setInterval(() => {
      const st = stRef.current;
      if (st.bossHP <= 0) return;
      const eB = getEquipBonus(st.equipped); const pB = getPerkBonus(st.perks);
      const dmg = calcTapDmg(st.simbaPower, eB, pB);
      const cm = calcCoinMult(eB, pB);
      dispatch({ type: 'TAP', damage: dmg, coinGain: calcTapCoinGain(dmg, cm) });
    }, 100);
    return () => { clearInterval(autoTapRef.current); autoTapRef.current = null; };
  }, [abilitiesActive.autoTap, screen]);

  // Boss death + chest drop
  useEffect(() => {
    if (state.bossHP > 0 || state.bossMaxHP === 0 || isDying) return;
    setIsDying(true);
    playSfx('kill');
    const arena = arenaRef.current;
    const currentFloor = stRef.current.floor;
    const currentCoinMult = coinMult;
    const rw = Math.floor(getBossReward(state.bossMaxHP, currentFloor, currentCoinMult) * (1 + perkB.bossGold / 100));
    if (arena) {
      const r = arena.getBoundingClientRect();
      const bx = r.width * 0.62, by = r.height * 0.35;
      spawnParticles(arena, bx, by, 35, KILL_COLORS);
      floatDmg(arena, bx, by - 20, `+${fmt(rw)} SAR`, true);
    }
    const shouldDrop = (floorIsBig(currentFloor) || floorIsWall(currentFloor)) || Math.random() < dropRate;
    const droppedChestType = shouldDrop ? rollChestType(perkB.chestLuck) : null;
    setTimeout(() => {
      const prevCityIdx = floorCityIdx(stRef.current.floor);
      dispatch({ type: 'BOSS_KILLED', reward: rw });
      setIsDying(false); setBossKey(k => k + 1);
      if (shouldDrop && droppedChestType) {
        setTimeout(() => { playSfx('chest'); setPendingChestType(droppedChestType); setPendingChest(generateItem(currentFloor, lang, droppedChestType)); }, 400);
      }
      setTimeout(() => {
        const newCityIdx = floorCityIdx(stRef.current.floor);
        if (newCityIdx !== prevCityIdx && arena) showMilestone(arena, `★ ${cities[newCityIdx]}!`);
      }, 600);
    }, 700);
  }, [state.bossHP, state.bossMaxHP, isDying]); // eslint-disable-line

  // Achievement checker
  useEffect(() => {
    if (screen !== 'playing') return;
    for (const a of ACHIEVEMENTS) {
      if (!state.achievements[a.id] && a.check(state)) {
        playSfx('achieve');
        setAchToast(a);
        setTimeout(() => setAchToast(prev => prev?.id === a.id ? null : prev), 3000);
        break;
      }
    }
  }, [state.totalBossKills, state.highestFloor, state.totalTaps, state.prestigeCount, state.equipped, screen]); // eslint-disable-line

  // Golden coin event
  useEffect(() => {
    if (screen !== 'playing') return;
    let timeout;
    const schedule = () => {
      timeout = setTimeout(() => {
        setGolden({ x: 15 + Math.random() * 55, y: 10 + Math.random() * 40, ts: Date.now() });
        setTimeout(() => setGolden(g => g && Date.now() - g.ts > 8000 ? null : g), 2500);
        schedule();
      }, 25000 + Math.random() * 50000);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [screen]);

  // Ability activation
  const activateAbility = useCallback((ab) => {
    if (abilitiesCooldown[ab.id] || abilitiesActive[ab.id]) return;
    setAbilitiesActive(p => ({ ...p, [ab.id]: true }));
    setTimeout(() => {
      setAbilitiesActive(p => ({ ...p, [ab.id]: false }));
      setAbilitiesCooldown(p => ({ ...p, [ab.id]: true }));
      setTimeout(() => setAbilitiesCooldown(p => ({ ...p, [ab.id]: false })), ab.cooldown);
    }, ab.duration);
  }, [abilitiesCooldown, abilitiesActive]);

  // Tap handler
  const handleTap = useCallback((e) => {
    const st = stRef.current;
    if (isDying || st.bossHP <= 0) return;
    const eB = getEquipBonus(st.equipped); const pB = getPerkBonus(st.perks);
    const cc = calcCritChance(eB, pB);
    const isCrit = Math.random() < cc;
    const psActive = abilitiesActive.powerStrike;
    const grActive = abilitiesActive.goldRush;
    const baseDmg = calcTapDmg(st.simbaPower, eB, pB) * (psActive ? 10 : 1);
    const trait = getBossTrait(st.floor);

    // Dodge trait
    if (trait === 'dodge' && Math.random() < 0.2) {
      const arena = arenaRef.current;
      if (arena) { const r = arena.getBoundingClientRect(); floatDmg(arena, r.width * 0.62, r.height * 0.35 - 10, t('game.dodged'), false); }
      playSfx('tap');
      return;
    }

    let dmg = isCrit ? baseDmg * 3 : baseDmg;
    // Boss Slayer perk: +% damage to bosses
    if (pB.bossDmg > 0) dmg = Math.floor(dmg * (1 + pB.bossDmg / 100));
    // Double Strike perk: chance for 2x damage
    if (pB.doubleStrike > 0 && Math.random() < pB.doubleStrike / 100) dmg *= 2;
    // Armor trait: -30% dmg
    if (trait === 'armor') dmg = Math.floor(dmg * 0.7);
    // Enrage trait: boss does nothing extra but below 30% HP boss has visual indicator
    // Shield trait: -80% dmg while HP > 85%
    if (trait === 'shield' && st.bossHP > st.bossMaxHP * 0.85) dmg = Math.max(1, Math.floor(dmg * 0.2));

    const cm = calcCoinMult(eB, pB) * (grActive ? 5 : 1);
    const coinGain = calcTapCoinGain(dmg, cm);
    dispatch({ type: 'TAP', damage: dmg, coinGain });
    playSfx(isCrit ? 'crit' : 'tap');

    // Tap chest progress — lucky hits give bonus taps (tapFrenzy perk boosts chances)
    const frenzyBoost = pB.tapFrenzy / 100; // each level = +5%
    const luckyRoll = Math.random();
    let tapBonus;
    if (luckyRoll < 0.02 + frenzyBoost * 0.5) tapBonus = 30;       // ~2%
    else if (luckyRoll < 0.05 + frenzyBoost * 0.8) tapBonus = 20;   // ~3%
    else if (luckyRoll < 0.10 + frenzyBoost * 1.2) tapBonus = 10;   // ~5%
    else if (luckyRoll < 0.20 + frenzyBoost * 1.5) tapBonus = 5;    // ~10%
    else if (luckyRoll < 0.35 + frenzyBoost * 1.5) tapBonus = 3;    // ~15%
    else if (luckyRoll < 0.55 + frenzyBoost) tapBonus = 2;           // ~20%
    else tapBonus = 1;
    setTapChestCount(c => Math.min(c + tapBonus, 250));

    comboRef.current++;
    clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => { comboRef.current = 0; }, 400);

    const arena = arenaRef.current;
    if (!arena) return;
    const r = arena.getBoundingClientRect();
    const bx = r.width * 0.62, by = r.height * 0.35;
    spawnParticles(arena, bx + (Math.random() - 0.5) * 30, by + (Math.random() - 0.5) * 20, isCrit ? 22 : 10, isCrit ? CRIT_COLORS : PARTICLE_COLORS);
    floatDmg(arena, bx, by - 10, isCrit ? `CRIT ${fmt(dmg)}` : `${fmt(dmg)}`, isCrit);

    // Lucky chest hit effects
    if (tapBonus >= 3) {
      const clr = tapBonus >= 20 ? '#FFD700' : tapBonus >= 10 ? '#FFA726' : tapBonus >= 5 ? '#D4A840' : '#B8860B';
      const sz = tapBonus >= 20 ? '32px' : tapBonus >= 10 ? '26px' : tapBonus >= 5 ? '20px' : '16px';

      // Floating bonus number
      const el = document.createElement('div');
      el.textContent = tapBonus >= 10 ? `🔥 +${tapBonus} 🔥` : `+${tapBonus}`;
      Object.assign(el.style, {
        position: 'absolute', left: '50%', bottom: '18px', zIndex: '25',
        fontFamily: 'var(--font-heading)', fontWeight: '900', fontSize: sz, color: clr,
        textShadow: `0 0 12px ${clr}, 0 0 24px ${clr}80, 0 2px 4px rgba(0,0,0,0.7)`,
        pointerEvents: 'none', animation: 'dmgFloat 1s ease-out forwards',
      });
      arena.appendChild(el);
      setTimeout(() => el.remove(), 1050);

      // Particles burst from progress bar area
      if (tapBonus >= 5) {
        spawnParticles(arena, r.width / 2, r.height - 30, tapBonus >= 20 ? 30 : tapBonus >= 10 ? 18 : 10,
          [clr, '#FFF', '#FFD700', '#FFA000']);
      }

      // Screen flash for big hits
      if (tapBonus >= 10) {
        const flash = document.createElement('div');
        Object.assign(flash.style, {
          position: 'absolute', inset: '0', zIndex: '20', pointerEvents: 'none', borderRadius: 'inherit',
          background: tapBonus >= 20 ? 'radial-gradient(circle, rgba(255,215,0,0.4), transparent)' : 'radial-gradient(circle, rgba(255,167,38,0.3), transparent)',
          animation: 'fadeIn 0.05s ease-out forwards',
        });
        arena.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; flash.style.transition = 'opacity 0.3s'; }, 100);
        setTimeout(() => flash.remove(), 450);
      }

      // "LUCKY!" text for 10+
      if (tapBonus >= 10) {
        const lucky = document.createElement('div');
        lucky.textContent = tapBonus >= 20 ? 'JACKPOT!' : 'LUCKY!';
        Object.assign(lucky.style, {
          position: 'absolute', left: '50%', bottom: '50px', zIndex: '26',
          fontFamily: 'var(--font-heading)', fontWeight: '900',
          fontSize: tapBonus >= 20 ? '28px' : '22px', color: '#FFF',
          textShadow: `0 0 16px ${clr}, 0 0 32px ${clr}, 0 2px 6px rgba(0,0,0,0.8)`,
          pointerEvents: 'none', letterSpacing: '0.15em',
          animation: 'comboScale 1s ease-out forwards',
        });
        arena.appendChild(lucky);
        setTimeout(() => lucky.remove(), 1050);
        playSfx('achieve');
      }
    }
    // removed screen shake

    if (comboRef.current >= 8 && comboRef.current % 5 === 0) {
      const cel = document.createElement('div');
      cel.textContent = `${comboRef.current}x`;
      Object.assign(cel.style, {
        position: 'absolute', left: '50%', top: '50%', zIndex: '32',
        fontFamily: 'var(--font-heading)', fontWeight: '900', fontSize: '36px',
        color: '#FFD700', textShadow: '0 0 20px #FF8C00, 0 0 40px #FF6D00, 0 2px 4px rgba(0,0,0,0.5)',
        pointerEvents: 'none', animation: 'comboScale 0.8s ease-out forwards',
      });
      arena.appendChild(cel);
      setTimeout(() => cel.remove(), 850);
    }
    setIsAtk(true); setIsHit(true);
    setTimeout(() => setIsAtk(false), 250);
    setTimeout(() => setIsHit(false), 300);
  }, [isDying, abilitiesActive]); // eslint-disable-line

  const handleGolden = useCallback((e) => {
    e.stopPropagation();
    if (!golden) return;
    const st = stRef.current;
    const eB = getEquipBonus(st.equipped); const pB = getPerkBonus(st.perks);
    const cm = calcCoinMult(eB, pB);
    const amount = Math.max(50, Math.floor(st.bossMaxHP * 2 * cm));
    dispatch({ type: 'GOLDEN', amount });
    playSfx('coin');
    const arena = arenaRef.current;
    if (arena) {
      const r = arena.getBoundingClientRect();
      const gx = r.width * golden.x / 100, gy = r.height * golden.y / 100;
      spawnParticles(arena, gx, gy, 50, ['#FFD700', '#FFC107', '#FFAB00', '#FFE082', '#FFF9C4']);
      floatDmg(arena, gx, gy - 20, `+${fmt(amount)} SAR!`, true);
      // removed screen shake
    }
    setGolden(null);
  }, [golden]);

  const handleOpenChest = () => {
    setRevealingChest(true);
    setRollPhase('rolling');
    playSfx('chest');
    // Generate reel items
    const reelArr = generateReelItems(pendingChest, 40, 34);
    setReelItems(reelArr);
    playSfx('reelStart');
    // Determine timing based on rarity
    const scrollDur = pendingChest.rarity >= 4 ? 9000 : 7000;
    const pauseDur = pendingChest.rarity >= 4 ? 2000 : pendingChest.rarity >= 2 ? 1000 : 500;
    // Stop after scroll duration
    setTimeout(() => {
      setRollPhase('stopped');
      playSfx('reelTick');
    }, scrollDur);
    // Reveal after pause
    setTimeout(() => {
      setReelItems(null);
      setRollPhase('revealed');
      if (pendingChest.rarity >= 4) playSfx(pendingChest.rarity >= 5 ? 'godlyReveal' : 'mythicReveal');
      else playSfx(pendingChest.rarity >= 2 ? 'achieve' : 'coin');
      // Particle burst on reveal
      const arena = arenaRef.current;
      if (arena) {
        const r = arena.getBoundingClientRect();
        const cx = r.width / 2, cy = r.height / 2;
        const rarityColor = RARITY_INFO[pendingChest.rarity].color;
        spawnParticles(arena, cx, cy, pendingChest.rarity >= 4 ? 40 : 20, [rarityColor, '#FFD700', '#FFF', rarityColor + 'CC']);
      }
    }, scrollDur + pauseDur);
  };
  const handleChestEquip = () => { if (pendingChest) dispatch({ type: 'EQUIP_ITEM', item: pendingChest }); setPendingChest(null); setPendingChestType(null); setRevealingChest(false); setRollPhase(null); setReelItems(null); };
  const handleChestCollect = () => { if (pendingChest) dispatch({ type: 'COLLECT_ITEM', item: pendingChest }); setPendingChest(null); setPendingChestType(null); setRevealingChest(false); setRollPhase(null); setReelItems(null); };
  const handleBuyChest = () => {
    if (tapChestCount < 250 || revealingChest || pendingChest) return;
    setTapChestCount(0);
    const ct = rollChestType(perkB.chestLuck);
    const item = generateItem(state.floor, lang, ct);
    setPendingChestType(ct);
    setPendingChest(item);
    playSfx('chest');
  };
  const collectOffline = () => { dispatch({ type: 'ADD_OFFLINE', amount: offlineAmt }); setOfflineAmt(0); };

  const saveScore = useCallback((name) => {
    if (!name.trim()) return;
    const trimmed = name.trim().slice(0, 20);
    localStorage.setItem('simba-player-name', trimmed);
    setPlayerName(trimmed);
    const updated = addLeaderboardEntry(trimmed, state.highestFloor, state.totalBossKills, state.prestigeCount);
    setLbData(updated);
  }, [state.highestFloor, state.totalBossKills, state.prestigeCount]);

  // Fusion: find 3 items of same rarity
  const fusionGroups = {};
  state.inventory.forEach(item => {
    const key = item.rarity;
    if (!fusionGroups[key]) fusionGroups[key] = [];
    fusionGroups[key].push(item);
  });
  const fusionAvailable = Object.entries(fusionGroups).find(([r, items]) => items.length >= 3 && parseInt(r) < 5);

  const handleFuse = () => {
    if (!fusionAvailable) return;
    const [rarityStr, items] = fusionAvailable;
    const rarity = parseInt(rarityStr);
    const toFuse = items.slice(0, 3);
    const ids = toFuse.map(i => i.id);
    const newItem = generateItem(state.floor, lang);
    newItem.rarity = rarity + 1;
    const rarityMults = [1, 2, 4, 8, 16, 32];
    const baseValue = newItem.statType === 'critChance' ? 1 + Math.floor(state.floor * 0.08) : 3 + Math.floor(state.floor * 0.3);
    newItem.value = Math.floor(baseValue * rarityMults[newItem.rarity] * (1 + perkB.fuseBoost / 100));
    dispatch({ type: 'FUSE_ITEMS', ids, newItem });
    playSfx('chest');
  };

  const backArrow = lang === 'ar' ? 'arrow-right' : 'arrow-left';

  // ── MENU ──
  if (screen === 'menu') {
    const has = state.totalCoins > 0;
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto px-5 py-10 safe-pb" style={{ animation: 'fadeUp 0.4s ease-out' }}>
        <h1 className="text-3xl font-heading font-bold text-text-primary">{t('game.title')}</h1>
        <p className="text-text-secondary text-center">{t('game.subtitle')}</p>
        <div className="relative w-52 h-52 rounded-2xl overflow-hidden border-2 border-border/40 shadow-xl"
          style={{ background: `linear-gradient(180deg, ${dk ? ct.darkSky : ct.skyTop}, ${dk ? ct.darkSkyBot : ct.skyBot})` }}>
          <div className="absolute bottom-0 inset-x-0 h-16 rounded-t-[60%]" style={{ background: `linear-gradient(180deg, ${ct.ground}, ${ct.groundDk})` }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'simbaIdle 3s ease-in-out infinite' }}>
            <SimbaCharacter stageIdx={ss.index} />
          </div>
        </div>
        {has && (
          <div className="text-center text-sm text-text-secondary">
            <span className="font-semibold">{t(`game.${ss.nameKey}`)}</span>
            {' \u2022 '}{t('game.floor')} {state.floor}
            {' \u2022 '}{fmt(state.totalBossKills)} {t('game.bossKills')}
            {state.prestigeGems > 0 && <span className="text-purple-500 font-bold flex items-center gap-0.5"> {'\u2022'} <GameIcon name="gem" size={14} />{state.prestigeGems}</span>}
          </div>
        )}
        <button onClick={() => setScreen('playing')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-heading font-bold text-lg shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all btn-press">
          {has ? t('game.continue') : t('game.play')}
        </button>
        <button onClick={() => { setLbData(loadLeaderboard()); setShowLeaderboard(true); }}
          className="w-full py-3 rounded-2xl bg-surface border-2 border-border/40 text-text-primary font-heading font-bold text-base shadow-sm hover:border-primary/40 transition-all btn-press flex items-center justify-center gap-2">
          <GameIcon name="crown" size={18} />{t('game.leaderboard')}
        </button>
        {!has && <p className="text-center text-sm text-text-tertiary max-w-[280px]">
          {lang === 'ar' ? '\u0627\u0637\u0642 \u0639\u0644\u0649 \u0627\u0644\u0648\u062D\u0648\u0634 \u2022 \u0627\u062C\u0645\u0639 \u0639\u0645\u0644\u0627\u062A \u2022 \u0643\u0628\u0651\u0631 \u0633\u064A\u0645\u0628\u0627 \u2022 \u0627\u0641\u062A\u062D \u0623\u0628\u0637\u0627\u0644'
            : 'Tap monsters \u2022 Collect coins \u2022 Grow Simba \u2022 Climb floors'}
        </p>}

        {/* Leaderboard overlay (from menu) */}
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLeaderboard(false)} style={{ animation: 'fadeIn 0.2s' }}>
            <div className="bg-surface rounded-2xl p-5 mx-4 max-w-sm w-full shadow-2xl border border-border/40 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()} style={{ animation: 'scaleIn 0.25s' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2"><GameIcon name="crown" size={18} />{t('game.leaderboard')}</h3>
                <button onClick={() => setShowLeaderboard(false)} className="text-text-tertiary hover:text-text-primary"><GameIcon name="x-mark" size={20} /></button>
              </div>

              {/* Save score input */}
              <div className="flex gap-2 mb-3">
                <input type="text" maxLength={20} value={lbNameInput || playerName}
                  onChange={e => setLbNameInput(e.target.value)}
                  placeholder={lang === 'ar' ? '\u0627\u0633\u0645\u0643...' : 'Your name...'}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-alt border border-border/40 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-primary/50" />
                <button onClick={() => { saveScore(lbNameInput || playerName); setLbNameInput(''); }}
                  disabled={!(lbNameInput || playerName).trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm btn-press disabled:opacity-40">
                  {t('game.lbSave')}
                </button>
              </div>

              {/* Leaderboard table */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {lbData.length === 0 ? (
                  <div className="text-center py-8 text-text-tertiary text-sm">{t('game.lbEmpty')}</div>
                ) : (
                  <div className="space-y-1.5">
                    {lbData.map((entry, i) => {
                      const isMe = entry.name === playerName;
                      const medal = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : null;
                      return (
                        <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${isMe ? 'bg-amber-500/10 border-amber-400/40' : 'bg-surface-alt/60 border-border/20'}`}>
                          <span className="w-7 text-center font-black text-sm">
                            {medal ? <GameIcon name={medal} size={18} /> : <span className="text-text-tertiary">{i + 1}</span>}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'}`}>{entry.name}</div>
                            <div className="text-[10px] text-text-tertiary">
                              {fmt(entry.bossKills)} {t('game.bossKills')}
                              {entry.prestiges > 0 && ` \u2022 ${entry.prestiges}x ${t('game.prestige')}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-black ${i === 0 ? 'text-amber-500' : i < 3 ? 'text-primary' : 'text-text-primary'}`}>
                              {t('game.floor')} {entry.floor}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PLAY ──
  const hpPct = state.bossMaxHP > 0 ? Math.max(0, state.bossHP / state.bossMaxHP * 100) : 0;
  const bn = lang === 'ar' ? bt.nameAr : bt.nameEn;
  const enraged = bossTrait === 'enrage' && hpPct < 30;

  return (
    <div className="flex flex-col game-safe-pb relative" style={{ height: 'calc(100dvh - 60px)' }}>
      {/* Daily reward overlay */}
      {showDaily && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" style={{ animation: 'fadeIn 0.3s' }}>
          <div className="bg-surface rounded-2xl p-6 mx-4 max-w-xs w-full text-center shadow-2xl border border-border/40" style={{ animation: 'dailyPop 0.4s ease-out' }}>
            <div className="text-4xl mb-3"><GameIcon name="gift-box" size={48} color="#F59E0B" /></div>
            <h3 className="font-heading font-bold text-lg mb-2">{t('game.dailyReward')}</h3>
            <div className="flex justify-center gap-1.5 mb-4">
              {DAILY_REWARDS.map((rw, i) => {
                const isToday = i === (state.dailyDay % 7);
                const isPast = i < (state.dailyDay % 7);
                return (
                  <div key={i} className={`w-9 h-12 rounded-lg flex flex-col items-center justify-center text-[9px] border-2 ${isToday ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30' : isPast ? 'border-success/40 bg-success/10' : 'border-border/40 bg-surface-alt'}`}>
                    <span className="font-bold">{t('game.dailyStreak')}{i + 1}</span>
                    <span className="flex items-center justify-center gap-0.5">{rw.coins ? fmt(rw.coins) : rw.gems ? <><GameIcon name="gem" size={9} />{rw.gems}</> : <GameIcon name="chest" size={9} />}</span>
                    {isPast && <span className="text-success"><GameIcon name="check" size={9} /></span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => { dispatch({ type: 'CLAIM_DAILY' }); setShowDaily(false); playSfx('coin'); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold btn-press">
              {t('game.dailyClaim')}
            </button>
          </div>
        </div>
      )}

      {/* Offline overlay */}
      {offlineAmt > 0 && !showDaily && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" style={{ animation: 'fadeIn 0.3s' }}>
          <div className="bg-surface rounded-2xl p-6 mx-4 max-w-xs w-full text-center shadow-2xl border border-border/40" style={{ animation: 'scaleIn 0.3s' }}>
            <div className="text-4xl mb-3"><GameIcon name="coin" size={48} color="#F59E0B" /></div>
            <p className="text-text-secondary text-sm">{t('game.offlineEarnings')}</p>
            <p className="text-2xl font-heading font-black text-amber-500 my-2">{fmt(offlineAmt)} <SarSymbol /></p>
            <p className="text-text-tertiary text-xs mb-4">{t('game.whileAway')}</p>
            <button onClick={collectOffline} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold btn-press">
              {t('game.collect')}
            </button>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {showStats && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" onClick={() => setShowStats(false)} style={{ animation: 'fadeIn 0.2s' }}>
          <div className="bg-surface rounded-2xl p-5 mx-4 max-w-xs w-full shadow-2xl border border-border/40" onClick={e => e.stopPropagation()} style={{ animation: 'scaleIn 0.25s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{t('game.stats')}</h3>
              <button onClick={() => setShowStats(false)} className="text-text-tertiary hover:text-text-primary"><GameIcon name="x-mark" size={20} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {[[t('game.floor'), state.floor], [t('game.highestFloor'), state.highestFloor],
                [t('game.totalCoins'), `${fmt(state.totalCoins)} ${t('game.coins')}`],
                [t('game.totalTaps'), fmt(state.totalTaps)], [t('game.bossKills'), fmt(state.totalBossKills)],
                [t('game.tapDamage'), fmt(td)], [t('game.dps'), fmt(dps)],
                [t('game.gems'), state.prestigeGems], [t('game.journeys'), state.prestigeCount],
              ].map(([l, v], i) => (
                <div key={i} className="flex justify-between"><span className="text-text-secondary">{l}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
            {state.floor >= 30 && <button onClick={() => { setShowStats(false); setShowPrestige(true); }}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 btn-press">
              <GameIcon name="portal" size={16} />{t('game.newJourney')}</button>}
          </div>
        </div>
      )}

      {/* Prestige run summary overlay */}
      {showPrestige && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" style={{ animation: 'fadeIn 0.2s' }}>
          <div className="bg-surface rounded-2xl p-5 mx-4 max-w-xs w-full text-center shadow-2xl border border-border/40" style={{ animation: 'scaleIn 0.25s' }}>
            <div className="text-3xl mb-2"><GameIcon name="sparkle" size={36} color="#1FA9FF" /></div>
            <h3 className="font-heading font-bold text-lg mb-3">{t('game.runSummary')}</h3>
            <div className="space-y-2 text-sm bg-surface-alt rounded-xl p-3 mb-4">
              {[[t('game.runFloor'), state.floor], [t('game.runBosses'), state.totalBossKills],
                [t('game.runCoins'), fmt(state.totalCoins)],
              ].map(([l, v], i) => (
                <div key={i} className="flex justify-between"><span className="text-text-secondary">{l}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mb-3 text-lg">
              <span className="text-purple-500 font-black flex items-center gap-1"><GameIcon name="gem" size={18} /> +{potentialGems}</span>
              <span className="text-text-tertiary text-sm">{t('game.runGems')}</span>
            </div>
            <p className="text-xs text-text-tertiary mb-4">{t('game.newJourneyDesc')}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowPrestige(false)} className="flex-1 py-3 rounded-xl bg-surface-alt text-text-secondary font-semibold text-sm btn-press">{t('game.cancel')}</button>
              <button onClick={() => { if (playerName) saveScore(playerName); dispatch({ type: 'PRESTIGE' }); setShowPrestige(false); setBossKey(k => k + 1); }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold text-sm btn-press">{t('game.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Achievements overlay */}
      {showAchievements && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" onClick={() => setShowAchievements(false)} style={{ animation: 'fadeIn 0.2s' }}>
          <div className="bg-surface rounded-2xl p-4 mx-4 max-w-sm w-full shadow-2xl border border-border/40 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ animation: 'scaleIn 0.25s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2"><GameIcon name="trophy" size={18} />{t('game.achievements')}</h3>
              <button onClick={() => setShowAchievements(false)} className="text-text-tertiary hover:text-text-primary"><GameIcon name="x-mark" size={20} /></button>
            </div>
            <div className="space-y-2">
              {ACHIEVEMENTS.map(a => {
                const done = a.check(state);
                const claimed = state.achievements[a.id];
                return (
                  <div key={a.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${done ? 'bg-surface border-success/30' : 'bg-surface-alt border-border/30 opacity-50'}`}>
                    <span className="text-2xl"><GameIcon name={a.icon} size={24} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">{t(`game.${a.key}`)}</div>
                      <div className="text-[10px] text-text-tertiary">
                        {t('game.achReward')}: {a.reward.coins ? `${fmt(a.reward.coins)} ${t('game.coins')}` : <><GameIcon name="gem" size={10} />{a.reward.gems}</>}
                      </div>
                    </div>
                    {done && !claimed && (
                      <button onClick={() => { dispatch({ type: 'CLAIM_ACHIEVEMENT', achievement: a }); playSfx('achieve'); }}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold btn-press">
                        {t('game.achClaim')}
                      </button>
                    )}
                    {claimed && <span className="text-[10px] font-bold text-success flex items-center gap-0.5"><GameIcon name="check" size={10} /> {t('game.achClaimed')}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard overlay (play screen) */}
      {showLeaderboard && screen === 'playing' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" onClick={() => setShowLeaderboard(false)} style={{ animation: 'fadeIn 0.2s' }}>
          <div className="bg-surface rounded-2xl p-5 mx-4 max-w-sm w-full shadow-2xl border border-border/40 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()} style={{ animation: 'scaleIn 0.25s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2"><GameIcon name="crown" size={18} />{t('game.leaderboard')}</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-text-tertiary hover:text-text-primary"><GameIcon name="x-mark" size={20} /></button>
            </div>
            <div className="flex gap-2 mb-3">
              <input type="text" maxLength={20} value={lbNameInput || playerName}
                onChange={e => setLbNameInput(e.target.value)}
                placeholder={lang === 'ar' ? '\u0627\u0633\u0645\u0643...' : 'Your name...'}
                className="flex-1 px-3 py-2 rounded-xl bg-surface-alt border border-border/40 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-primary/50" />
              <button onClick={() => { saveScore(lbNameInput || playerName); setLbNameInput(''); }}
                disabled={!(lbNameInput || playerName).trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm btn-press disabled:opacity-40">
                {t('game.lbSave')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {lbData.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary text-sm">{t('game.lbEmpty')}</div>
              ) : (
                <div className="space-y-1.5">
                  {lbData.map((entry, i) => {
                    const isMe = entry.name === playerName;
                    const medal = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : null;
                    return (
                      <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${isMe ? 'bg-amber-500/10 border-amber-400/40' : 'bg-surface-alt/60 border-border/20'}`}>
                        <span className="w-7 text-center font-black text-sm">
                          {medal ? <GameIcon name={medal} size={18} /> : <span className="text-text-tertiary">{i + 1}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'}`}>{entry.name}</div>
                          <div className="text-[10px] text-text-tertiary">
                            {fmt(entry.bossKills)} {t('game.bossKills')}
                            {entry.prestiges > 0 && ` \u2022 ${entry.prestiges}x ${t('game.prestige')}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${i === 0 ? 'text-amber-500' : i < 3 ? 'text-primary' : 'text-text-primary'}`}>
                            {t('game.floor')} {entry.floor}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chest roll + reveal overlay */}
      {revealingChest && pendingChest && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
          style={{ animation: pendingChest.rarity >= 2 && rollPhase === 'revealed' ? `fadeIn 0.2s, bgColorPulse 2s ease-in-out` : 'fadeIn 0.2s',
            '--pulse-color': RARITY_INFO[pendingChest.rarity].color }}>

          {/* Gacha reel phase */}
          {(rollPhase === 'rolling' || rollPhase === 'stopped') && reelItems && (
            <div className="bg-surface rounded-2xl p-4 mx-4 max-w-sm w-full text-center shadow-2xl border-2" style={{ animation: 'scaleIn 0.3s', borderColor: (pendingChestType || CHEST_TYPES[0]).color + '60' }}>
              <p className="text-xs font-bold mb-3 tracking-widest uppercase" style={{ color: (pendingChestType || CHEST_TYPES[0]).color }}>
                {lang === 'ar' ? (pendingChestType || CHEST_TYPES[0]).nameAr : (pendingChestType || CHEST_TYPES[0]).nameEn}
              </p>
              {/* Reel container */}
              <div className="relative overflow-hidden rounded-xl" style={{ height: 100 }}>
                {/* Center indicator line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] z-20 rounded-full"
                  style={{ background: '#FFD700', boxShadow: '0 0 8px #FFD700, 0 0 16px #FFD70080' }} />
                {/* Left/right gradient fades */}
                <div className="absolute inset-y-0 left-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-surface), transparent)' }} />
                <div className="absolute inset-y-0 right-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--color-surface), transparent)' }} />
                {/* Scrolling strip — each item is 72px wide + 8px gap = 80px per slot */}
                <div className="flex items-center gap-2 absolute top-0 bottom-0"
                  style={{
                    animation: rollPhase === 'rolling'
                      ? `reelScroll ${pendingChest.rarity >= 4 ? '9s' : '7s'} cubic-bezier(0.05, 0.95, 0.15, 1) forwards`
                      : 'none',
                    '--reel-end': `-${34 * 80 + 36}px`,
                    left: '50%',
                    transform: rollPhase === 'stopped' ? `translateX(-${34 * 80 + 36}px)` : undefined,
                  }}>
                  {reelItems.map((item, i) => {
                    const ri = RARITY_INFO[item.rarity] || RARITY_INFO[0];
                    const isLanded = rollPhase === 'stopped' && i === 34;
                    return (
                      <div key={i} className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border-2"
                        style={{
                          width: 72, height: 88,
                          borderColor: ri.color + (isLanded ? 'FF' : '60'),
                          background: `linear-gradient(135deg, ${ri.color}20, ${ri.color}08)`,
                          animation: isLanded ? 'reelLandPulse 0.8s ease-in-out infinite' : undefined,
                          boxShadow: isLanded ? `0 0 20px ${ri.color}60` : undefined,
                        }}>
                        <EquipIcon slot={item.slot} rarity={item.rarity} size={28} />
                        <span className="text-[8px] font-bold mt-0.5" style={{ color: ri.color }}>
                          {lang === 'ar' ? ri.nameAr : ri.nameEn}
                        </span>
                        <span className="text-[7px] text-text-tertiary" style={{ opacity: 0.7 }}>
                          {(lang === 'ar' ? SLOT_NAME_AR : SLOT_NAME_EN)[item.slot]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Rarity dots */}
              <div className="mt-3 flex justify-center gap-1">
                {RARITY_INFO.map((ri, r) => (
                  <div key={r} className="w-2 h-2 rounded-full transition-all duration-75"
                    style={{ background: ri.color, opacity: 0.3 }} />
                ))}
              </div>
            </div>
          )}

          {/* Revealed phase */}
          {rollPhase === 'revealed' && (() => {
            const ri = RARITY_INFO[pendingChest.rarity];
            const isHighRarity = pendingChest.rarity >= 2;
            const isMythicPlus = pendingChest.rarity >= 4;
            const isGodly = pendingChest.rarity >= 5;
            const equipped = state.equipped[pendingChest.slot];
            const diff = equipped ? pendingChest.value - equipped.value : null;
            return (
              <div className="bg-surface rounded-2xl p-5 mx-4 max-w-xs w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}
                style={{
                  animation: `revealZoom 0.6s ease-out${isHighRarity ? ', screenShake 0.4s ease-out' : ''}${isMythicPlus ? ', lightningBorder 1.5s ease-in-out infinite' : ''}`,
                  borderWidth: 2, borderColor: ri.color,
                  '--lightning-color': ri.color,
                }}>
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl" style={{ animation: 'sparkleReveal 0.8s ease-out' }} />
                  <div className="mb-3 relative z-10 flex justify-center"
                    style={{
                      filter: `drop-shadow(0 0 16px ${ri.color})`,
                      animation: isGodly ? 'rainbowShift 3s linear infinite' : undefined,
                    }}>
                    <EquipIcon slot={pendingChest.slot} rarity={pendingChest.rarity} size={56} />
                  </div>
                </div>
                <div className="font-bold mb-1 tracking-wider"
                  style={{
                    color: ri.color,
                    fontSize: isMythicPlus ? '14px' : '12px',
                    animation: 'rarityTextIn 0.5s ease-out',
                    textShadow: isMythicPlus ? `0 0 12px ${ri.color}80` : undefined,
                  }}>
                  {isHighRarity && <GameIcon name="star" size={10} />} {lang === 'ar' ? ri.nameAr : ri.nameEn} {isHighRarity && <GameIcon name="star" size={10} />}
                </div>
                <div className="font-heading font-bold text-lg text-text-primary mb-1">{itemName(pendingChest, lang)}</div>
                <div className="text-sm mb-4">
                  <span className="text-text-secondary flex items-center justify-center gap-0.5">
                    <GameIcon name={STAT_ICONS[pendingChest.statType]} size={12} /> +{pendingChest.value}%
                  </span>
                  <span className="text-text-tertiary">{(lang === 'ar' ? STAT_LABEL_AR : STAT_LABEL_EN)[pendingChest.statType]}</span>
                </div>
                {equipped && (
                  <div className="text-[10px] mb-3 bg-surface-alt rounded-lg p-2">
                    <div className="text-text-tertiary">{t('game.replaces')}: {itemName(equipped, lang)}</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <GameIcon name={STAT_ICONS[equipped.statType]} size={10} />
                      <span className="text-text-tertiary">+{equipped.value}%</span>
                      <span className="mx-1">{'\u2192'}</span>
                      <span className="text-text-secondary font-bold">+{pendingChest.value}%</span>
                      {diff !== null && equipped.statType === pendingChest.statType && (
                        <span className={`font-bold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-400' : 'text-text-tertiary'}`}>
                          ({diff > 0 ? '+' : ''}{diff}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleChestCollect} className="flex-1 py-3 rounded-xl bg-surface-alt text-text-secondary font-semibold text-sm btn-press">{t('game.collectItem')}</button>
                  <button onClick={handleChestEquip} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm btn-press"
                    style={{ background: `linear-gradient(135deg, ${ri.color}, ${ri.color}CC)` }}>
                    {t('game.equipItem')}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Achievement toast */}
      {achToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-surface rounded-xl px-4 py-2.5 shadow-xl border border-success/40 flex items-center gap-2"
          style={{ animation: 'achievePop 0.4s ease-out' }}>
          <span className="text-xl"><GameIcon name={achToast.icon} size={20} /></span>
          <div>
            <div className="text-xs font-bold text-success">{t('game.achievements')}</div>
            <div className="text-sm font-bold">{t(`game.${achToast.key}`)}</div>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-surface/90 backdrop-blur-sm z-10">
        <button onClick={() => { save(stRef.current); setScreen('menu'); }}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"><GameIcon name={backArrow} size={16} /></button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-sm">
            <span className="font-black text-amber-600 dark:text-amber-400">{fmt(state.coins)}</span>
            <SarSymbol className="text-amber-600/50 dark:text-amber-400/50 text-xs font-semibold" />
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-alt text-[11px] text-text-secondary">
            <span className="font-bold flex items-center gap-0.5"><GameIcon name="sword" size={11} />{fmt(td)}</span>
            {dps > 0 && <><span className="text-border mx-0.5">|</span><GameIcon name="bolt" size={10} /><span>{fmt(dps)}{t('game.perSec')}</span></>}
          </div>
          {state.prestigeGems > 0 && (
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-purple-500/10 text-[11px]">
              <span className="text-purple-500 font-bold flex items-center gap-0.5"><GameIcon name="gem" size={12} />{state.prestigeGems}</span>
            </div>
          )}
          <button onClick={() => setShowAchievements(true)} className="w-7 h-7 rounded-lg bg-surface-alt flex items-center justify-center text-text-tertiary hover:text-text-primary"><GameIcon name="trophy" size={14} /></button>
          <button onClick={() => { setLbData(loadLeaderboard()); setShowLeaderboard(true); }} className="w-7 h-7 rounded-lg bg-surface-alt flex items-center justify-center text-text-tertiary hover:text-text-primary"><GameIcon name="crown" size={14} /></button>
          <button onClick={() => setShowStats(true)} className="w-7 h-7 rounded-lg bg-surface-alt flex items-center justify-center text-text-tertiary hover:text-text-primary"><GameIcon name="scroll" size={14} /></button>
          {/* Prestige button — locked/unlocked */}
          {state.floor >= 30 ? (
            <button onClick={() => setShowPrestige(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg btn-press text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6dcbca, #1FA9FF)', animation: 'abilityReady 2s ease-in-out infinite' }}>
              <GameIcon name="portal" size={11} />{t('game.prestige')}
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-alt opacity-40 cursor-default text-[10px] font-bold text-text-tertiary">
              <GameIcon name="lock" size={11} />{t('game.prestige')}
              <span className="text-[8px]">({state.floor}/30)</span>
            </div>
          )}
        </div>
      </div>

      {/* Floor bar */}
      <div className="shrink-0 px-3 py-1 flex items-center justify-between bg-surface/50 backdrop-blur-sm border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${isBig || isWall ? 'text-red-500 animate-pulse' : 'text-text-primary'}`}>
            {t('game.floor')} {state.floor}
          </span>
          <span className="text-[10px] text-text-tertiary">{cities[curCityIdx]}</span>
        </div>
        <div className="flex items-center gap-2">
          {bossTrait && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ animation: 'traitBadge 0.3s ease-out', background: enraged ? '#EF444440' : `${bt.body}30`, color: enraged ? '#EF4444' : bt.body }}>
              {t(`game.trait${bossTrait.charAt(0).toUpperCase() + bossTrait.slice(1)}`)}
              {enraged && <GameIcon name="fire" size={10} />}
            </span>
          )}
          <span className="text-[11px] text-text-secondary font-semibold">
            {isWall ? <><GameIcon name="wall" size={12} /> {t('game.wallBoss')}</> : isBig ? <><GameIcon name="skull" size={12} /> {t('game.bigBoss')}</> : bn}
          </span>
        </div>
      </div>

      {/* ARENA */}
      <div ref={arenaRef} className="flex-1 relative overflow-hidden select-none touch-none cursor-pointer"
        onPointerDown={handleTap} style={{ WebkitTapHighlightColor: 'transparent' }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${dk ? ct.darkSky : ct.skyTop} 0%, ${dk ? ct.darkSkyBot : ct.skyBot} 60%, ${ct.ground} 100%)` }} />
        {dk && [12,28,45,62,78,35,55,18,70,88].map((l, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{ width: `${1 + Math.random()}px`, height: `${1 + Math.random()}px`, left: `${l}%`, top: `${3 + i * 4}%`, opacity: 0.3 + Math.random() * 0.4 }} />
        ))}
        {[{ l: '8%', t: '8%', w: 70, h: 22, d: 14, o: dk ? 0.06 : 0.45 },
          { l: '55%', t: '14%', w: 50, h: 18, d: 20, o: dk ? 0.04 : 0.35 },
          { l: '30%', t: '4%', w: 40, h: 14, d: 10, o: dk ? 0.03 : 0.3 }].map((c, i) => (
          <div key={i} className="absolute rounded-full" style={{ left: c.l, top: c.t, width: c.w, height: c.h, opacity: c.o,
            background: dk ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)',
            animation: `cloudDrift ${c.d}s ease-in-out infinite alternate${i % 2 ? '-reverse' : ''}` }} />
        ))}
        <div className="absolute bottom-0 inset-x-0 h-[28%]" style={{ background: `linear-gradient(180deg, ${ct.ground}, ${ct.groundDk})` }}>
          <div className="absolute top-1 inset-x-4 h-px opacity-15" style={{ background: 'rgba(255,255,255,0.3)' }} />
        </div>

        {/* Animal Companions */}
        {activeCarriers.length > 0 && (
          <div className="absolute left-1 bottom-[30%] z-[4] flex flex-col-reverse gap-1" style={{ pointerEvents: 'none' }}>
            {activeCarriers.map((c, i) => {
              const lv = state.carrierLevels[c.id]; const sz = Math.min(30, 18 + lv * 1.5);
              return (
                <div key={c.id} style={{ animation: `float ${2 + i * 0.3}s ease-in-out ${i * 0.15}s infinite` }}>
                  <CompanionAnimal companion={c} size={sz} />
                </div>
              );
            })}
          </div>
        )}

        {/* Ability buttons */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5" style={{ pointerEvents: 'auto' }}
          onPointerDown={e => e.stopPropagation()}>
          {ABILITIES.map(ab => {
            const isActive = abilitiesActive[ab.id];
            const onCd = abilitiesCooldown[ab.id];
            const ready = !isActive && !onCd;
            return (
              <button key={ab.id} onClick={() => activateAbility(ab)} disabled={!ready}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 transition-all ${isActive ? 'border-amber-400 bg-amber-500/20' : ready ? 'border-primary/50 bg-surface/80 hover:bg-surface' : 'border-border/30 bg-surface-alt/60 opacity-40'}`}
                style={{ animation: isActive ? 'abilityActive 0.6s ease-in-out infinite' : ready ? 'abilityReady 2s ease-in-out infinite' : 'none' }}>
                <GameIcon name={ab.icon} size={18} />
              </button>
            );
          })}
        </div>

        {/* Simba */}
        <div className="absolute bottom-[27%] left-[8%] z-[5]"
          style={{ animation: isAtk ? 'simbaAttack 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'simbaIdle 3s ease-in-out infinite' }}>
          <SimbaCharacter stageIdx={ss.index} />
        </div>

        {/* Boss */}
        <div key={bossKey} className="absolute bottom-[24%] right-[6%] z-[5] flex flex-col items-center"
          style={{ animation: isDying ? 'bossDeath 0.7s ease-out forwards' : 'bossEnter 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ animation: !isDying ? (isHit ? 'bossHit 0.3s ease-out' : 'bossIdle 3s ease-in-out infinite') : 'none',
            filter: enraged ? 'brightness(1.3) saturate(1.5)' : 'none' }}>
            <BossCharacter typeIdx={curBossType} isBig={isBig} />
          </div>
          <div className="mt-1.5 w-28 h-3 rounded-full overflow-hidden border border-white/20"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="h-full rounded-full transition-all duration-100 ease-out"
              style={{ width: `${hpPct}%`,
                background: hpPct > 50 ? 'linear-gradient(90deg, #43A047, #66BB6A)' : hpPct > 25 ? 'linear-gradient(90deg, #EF6C00, #FFA726)' : 'linear-gradient(90deg, #C62828, #EF5350)',
                boxShadow: `0 0 6px ${hpPct > 50 ? '#66BB6A60' : hpPct > 25 ? '#FFA72660' : '#EF535060'}` }} />
          </div>
          <div className="mt-0.5 text-center">
            <div className="text-[11px] font-bold text-white drop-shadow-lg">{bn}</div>
            <div className="text-[9px] text-white/60 font-semibold">{fmt(Math.max(0, state.bossHP))}/{fmt(state.bossMaxHP)}</div>
          </div>
        </div>

        {/* Pending Chest */}
        {pendingChest && !revealingChest && (() => {
          const ct = pendingChestType || CHEST_TYPES[0];
          return (
          <div className="absolute z-20 cursor-pointer flex flex-col items-center" onPointerDown={(e) => { e.stopPropagation(); handleOpenChest(); }}
            style={{ left: '50%', top: '22%', transform: 'translateX(-50%)', animation: 'chestBounce 0.5s ease-out, chestGlow 1.5s ease-in-out 0.5s infinite' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${ct.color}, ${ct.glow}, ${ct.color})`, border: `2px solid ${ct.glow}`,
                boxShadow: `0 0 15px ${ct.color}80, inset 0 -3px 6px rgba(0,0,0,0.3)` }}>
              <GameIcon name={ct.icon} size={28} />
            </div>
            <span className="text-[8px] font-bold mt-1 px-1.5 py-0.5 rounded-full"
              style={{ color: ct.glow, background: 'rgba(0,0,0,0.6)', textShadow: `0 0 6px ${ct.color}` }}>
              {lang === 'ar' ? ct.nameAr : ct.nameEn}
            </span>
          </div>
          );
        })()}

        {/* Golden coin */}
        {golden && (
          <div className="absolute z-20 cursor-pointer" onPointerDown={handleGolden}
            style={{ left: `${golden.x}%`, top: `${golden.y}%`, animation: 'goldenFloat 1.5s ease-in-out infinite' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'radial-gradient(circle at 35% 30%, #FFF9C4, #FFD700, #E6A800)',
                border: '2px solid #B8860B', animation: 'goldenPulse 1.2s ease-in-out infinite' }}><GameIcon name="coin" size={24} color="#FFD700" /></div>
          </div>
        )}

        {/* Tap Chest — progress bar + open button */}
        {!pendingChest && !revealingChest && (
          <div className="absolute z-15 bottom-3 left-1/2 -translate-x-1/2"
            onPointerDown={(e) => { e.stopPropagation(); if (tapChestCount >= 250) handleBuyChest(); }}>
            <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: tapChestCount >= 250 ? '1px solid #FFD70080' : '1px solid transparent' }}>
              <div className="flex items-center gap-2">
                <GameIcon name="chest" size={18} style={{ filter: tapChestCount >= 250 ? 'drop-shadow(0 0 6px #FFD700)' : undefined }} />
                <div className="relative w-28 h-2.5 rounded-full overflow-hidden bg-white/15">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.min(100, (tapChestCount / 250) * 100)}%`,
                      background: tapChestCount >= 250 ? 'linear-gradient(90deg, #FFD700, #FFA000)' : 'linear-gradient(90deg, #8B6914, #D4A840)',
                      boxShadow: tapChestCount >= 250 ? '0 0 10px #FFD700' : 'none',
                    }} />
                </div>
                <span className="text-[11px] font-black text-white/80 tabular-nums" style={{ minWidth: 48, textAlign: 'right' }}>
                  {Math.min(tapChestCount, 250)}/250
                </span>
              </div>
              {tapChestCount >= 250 && (
                <span className="text-[11px] font-bold text-amber-400 cursor-pointer"
                  style={{ animation: 'pulseAffordable 1.5s ease-in-out infinite, float 1s ease-in-out infinite' }}>
                  {t('game.openChest')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tutorial hints */}
        {state.tutStep === 0 && state.totalTaps < 3 && (
          <div className="absolute bottom-[10%] inset-x-0 text-center">
            <span className="text-sm font-bold text-white/60 drop-shadow animate-pulse">{t('game.tutTap')}</span>
          </div>
        )}
        {state.tutStep === 1 && state.simbaPower === 0 && (
          <div className="absolute bottom-[10%] inset-x-0 text-center">
            <span className="text-sm font-bold text-white/60 drop-shadow animate-pulse flex items-center justify-center gap-1"><GameIcon name="arrow-down" size={14} /> {t('game.tutFood')}</span>
          </div>
        )}
        {state.tutStep === 2 && activeCarriers.length === 0 && state.coins >= 25 && (
          <div className="absolute bottom-[10%] inset-x-0 text-center">
            <span className="text-sm font-bold text-white/60 drop-shadow animate-pulse flex items-center justify-center gap-1"><GameIcon name="arrow-down" size={14} /> {t('game.tutHeroes')}</span>
          </div>
        )}
      </div>

      {/* SHOP */}
      <div className="shrink-0 border-t border-border/40 bg-surface">
        <div className="flex px-2 pt-1.5 gap-0.5">{['food', 'heroes', 'equip', 'perks'].map(tab => {
          const hasAffordable = tab === 'food' ? FOODS.some(f => state.coins >= foodCost(f.baseCost, state.foodBought[f.id] || 0))
            : tab === 'heroes' ? COMPANIONS.some(c => state.coins >= upgradeCost(c.baseCost, state.carrierLevels[c.id] || 0))
            : tab === 'perks' ? PERKS.some(p => (state.perks[p.id] || 0) < p.maxLv && state.prestigeGems >= perkCost(p.baseCost, state.perks[p.id] || 0))
            : false;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all
                ${activeTab === tab ? 'bg-surface-alt text-primary shadow-sm' : 'text-text-tertiary'}`}
              style={hasAffordable && activeTab !== tab ? { animation: 'pulseAffordable 2s ease-in-out infinite' } : {}}>
              <span className="flex items-center justify-center gap-0.5">
                {tab === 'food' ? <><GameIcon name="feast" size={11} /> {t('game.food')}</> :
                 tab === 'heroes' ? <><GameIcon name="paw" size={11} /> {t('game.heroes')}</> :
                 tab === 'equip' ? <><GameIcon name="armor" size={11} /> {t('game.equip')}</> :
                 <><GameIcon name="gem" size={11} /> {t('game.perks')}</>}
              </span>
            </button>
          );
        })}</div>

        <div className="px-3 py-2" style={{ maxHeight: 180, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {/* Food tab */}
          {activeTab === 'food' && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {FOODS.map(f => {
                const bought = state.foodBought[f.id] || 0;
                const cost = foodCost(f.baseCost, bought);
                const ok = state.coins >= cost;
                return (
                  <button key={f.id} disabled={!ok} onClick={e => { e.stopPropagation(); dispatch({ type: 'BUY_FOOD', food: f }); playSfx('buy'); }}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all btn-press
                      ${ok ? 'bg-surface border-amber-400/40 hover:border-amber-400/60 shadow-sm' : 'bg-surface-alt border-border/30 opacity-40'}`}
                    style={ok ? { animation: 'pulseAffordable 2s ease-in-out infinite' } : {}}>
                    <GameIcon name={f.icon} size={18} />
                    <span className="text-[10px] font-bold text-text-primary leading-tight">{t(`game.${f.nameKey}`)}</span>
                    <span className="text-[8px] text-success font-semibold">+{f.power}</span>
                    <span className={`text-[10px] font-bold ${ok ? 'text-amber-600 dark:text-amber-400' : 'text-text-tertiary'}`}>{fmt(cost)}</span>
                  </button>);
              })}
            </div>
          )}

          {/* Heroes tab */}
          {activeTab === 'heroes' && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {COMPANIONS.map(c => {
                const lv = state.carrierLevels[c.id] || 0;
                const cost = upgradeCost(c.baseCost, lv);
                const ok = state.coins >= cost;
                const cdps = lv > 0 ? Math.floor(c.baseDps * lv * (1 + (equipB.dpsMult + perkB.dpsMult) / 100)) : 0;
                return (
                  <button key={c.id} disabled={!ok} onClick={e => { e.stopPropagation(); dispatch({ type: 'UPGRADE_CARRIER', carrier: c }); playSfx('buy'); }}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border transition-all btn-press
                      ${ok ? 'bg-surface border-primary/30 hover:border-primary/50 shadow-sm' : 'bg-surface-alt border-border/30 opacity-40'}`}
                    style={ok ? { animation: 'pulseAffordable 2s ease-in-out infinite' } : {}}>
                    <div className="relative">
                      {lv > 0 ? <CompanionAnimal companion={c} size={24} /> :
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${c.color}30`, color: c.color }}>{t(`game.companion_${c.nameKey}`).charAt(0)}</div>}
                      {lv > 0 && <span className="absolute -top-1 -right-1 bg-primary text-white text-[7px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{lv}</span>}
                    </div>
                    <span className="text-[10px] font-bold text-text-primary leading-tight">{t(`game.companion_${c.nameKey}`)}</span>
                    {lv > 0 && <span className="text-[8px] text-text-tertiary leading-tight">{fmt(cdps)} dps</span>}
                    <span className={`text-[9px] font-bold ${ok ? 'text-amber-600 dark:text-amber-400' : 'text-text-tertiary'}`}>
                      {lv === 0 ? t('game.unlock') : <GameIcon name="arrow-up" size={9} />} {fmt(cost)}</span>
                  </button>);
              })}
            </div>
          )}

          {/* Equip tab */}
          {activeTab === 'equip' && (() => {
            const slotNames = lang === 'ar' ? SLOT_NAME_AR : SLOT_NAME_EN;
            const slotItems = equipSlotFilter ? [...state.inventory.filter(i => i.slot === equipSlotFilter)].sort((a, b) => b.rarity - a.rarity || b.value - a.value) : [];
            const EquipSlotBtn = ({ slot }) => {
              const item = state.equipped[slot];
              const isSelected = equipSlotFilter === slot;
              const count = state.inventory.filter(i => i.slot === slot).length;
              return (
                <button onClick={e => { e.stopPropagation(); setEquipSlotFilter(isSelected ? null : slot); }}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 transition-all
                    ${isSelected ? 'border-amber-400 bg-amber-500/12 scale-105' : item ? 'border-transparent' : 'border-dashed border-border/30'}`}
                  style={{ width: 56, height: 56, ...(item && !isSelected ? { borderColor: RARITY_INFO[item.rarity].color + '50', background: `linear-gradient(160deg, ${RARITY_INFO[item.rarity].color}10, ${RARITY_INFO[item.rarity].color}05)` } : {}) }}>
                  {item ? (
                    <EquipIcon slot={item.slot} rarity={item.rarity} size={22} />
                  ) : (
                    <GameIcon name={SLOT_ICONS[slot]} size={18} style={{ opacity: 0.2 }} />
                  )}
                  <span className="text-[6.5px] font-bold mt-0.5 leading-tight" style={item ? { color: RARITY_INFO[item.rarity].color } : { color: 'var(--color-text-tertiary)' }}>
                    {slotNames[slot]}
                  </span>
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[12px] h-[12px] rounded-full bg-accent text-white text-[6px] font-bold flex items-center justify-center px-0.5">{count}</span>
                  )}
                </button>
              );
            };
            return (
            <div className="relative">
              {/* Character equipment layout — body shape */}
              <div className="relative rounded-xl bg-surface-alt/40 border border-border/20 py-2 px-1">
                <div className="flex justify-center mb-1"><EquipSlotBtn slot="helmet" /></div>
                <div className="flex justify-center items-center gap-1.5 mb-1">
                  <EquipSlotBtn slot="weapon" />
                  <EquipSlotBtn slot="armor" />
                  <EquipSlotBtn slot="shield" />
                </div>
                <div className="flex justify-center items-center gap-1.5 mb-1">
                  <EquipSlotBtn slot="ring" />
                  <EquipSlotBtn slot="cape" />
                  <EquipSlotBtn slot="amulet" />
                </div>
                <div className="flex justify-center"><EquipSlotBtn slot="boots" /></div>

                {/* Fusion button inline */}
                {fusionAvailable && (
                  <button onClick={(e) => { e.stopPropagation(); handleFuse(); }}
                    className="w-full mt-2 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold btn-press flex items-center justify-center gap-1"
                    style={{ animation: 'pulseAffordable 2s ease-in-out infinite' }}>
                    <GameIcon name="sparkle" size={10} /> {t('game.fusionBtn')} ({RARITY_INFO[parseInt(fusionAvailable[0])].nameEn} {'\u2192'} {RARITY_INFO[parseInt(fusionAvailable[0]) + 1].nameEn})
                  </button>
                )}
              </div>

              {/* Slot popup overlay — appears on top when a slot is selected */}
              {equipSlotFilter && (
                <div className="absolute inset-0 z-10 flex items-center justify-center" onClick={e => { e.stopPropagation(); setEquipSlotFilter(null); }}>
                  <div className="absolute inset-0 bg-black/50 rounded-xl" />
                  <div className="relative bg-surface rounded-xl border-2 border-amber-400/60 shadow-2xl p-2 mx-2 w-full max-h-full overflow-y-auto" style={{ animation: 'scaleIn 0.15s ease-out' }}
                    onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-text-primary flex items-center gap-1">
                        <GameIcon name={SLOT_ICONS[equipSlotFilter]} size={14} /> {slotNames[equipSlotFilter]}
                      </span>
                      <button onClick={e => { e.stopPropagation(); setEquipSlotFilter(null); }}
                        className="w-5 h-5 rounded-full bg-border/30 text-text-tertiary text-[10px] font-bold flex items-center justify-center hover:bg-border/50">{'\u2715'}</button>
                    </div>

                    {/* Currently equipped */}
                    {state.equipped[equipSlotFilter] && (() => {
                      const eq = state.equipped[equipSlotFilter];
                      return (
                        <div className="flex items-center gap-2 p-1.5 rounded-lg border mb-2"
                          style={{ borderColor: RARITY_INFO[eq.rarity].color + '60', background: `${RARITY_INFO[eq.rarity].color}08` }}>
                          <EquipIcon slot={eq.slot} rarity={eq.rarity} size={24} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-bold truncate" style={{ color: RARITY_INFO[eq.rarity].color }}>{itemName(eq, lang)}</div>
                            <span className="text-[8px] text-text-secondary flex items-center gap-0.5">
                              <GameIcon name={STAT_ICONS[eq.statType]} size={8} />+{eq.value}%
                            </span>
                          </div>
                          <span className="text-[7px] font-bold text-text-tertiary uppercase">{t('game.equipped')}</span>
                        </div>
                      );
                    })()}

                    {/* Available items for this slot */}
                    {slotItems.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {slotItems.map(item => {
                          const equipped = state.equipped[item.slot];
                          const isBetter = equipped && item.statType === equipped.statType && item.value > equipped.value;
                          return (
                          <div key={item.id} className="relative group">
                            <button onClick={e => { e.stopPropagation(); dispatch({ type: 'EQUIP_ITEM', item }); setEquipSlotFilter(null); }}
                              className="w-full flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all btn-press bg-surface"
                              style={{ borderColor: RARITY_INFO[item.rarity].color + '50' }}>
                              <EquipIcon slot={item.slot} rarity={item.rarity} size={24} />
                              <span className="text-[7px] font-bold leading-tight text-center" style={{ color: RARITY_INFO[item.rarity].color }}>
                                {itemName(item, lang)}
                              </span>
                              <span className="text-[8px] text-text-secondary flex items-center gap-0.5">
                                <GameIcon name={STAT_ICONS[item.statType]} size={7} />+{item.value}%
                              </span>
                            </button>
                            {isBetter && <div className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-green-500 text-white text-[7px] font-bold flex items-center justify-center shadow-sm">{'\u2191'}</div>}
                            <button onClick={e => { e.stopPropagation(); dispatch({ type: 'SELL_ITEM', item }); }}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              style={{ lineHeight: 1 }}>{'\u00D7'}</button>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-[10px] text-text-tertiary py-2">{t('game.noItemsSlot')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* Perks tab */}
          {activeTab === 'perks' && (
            <div>
              <div className="flex items-center justify-center gap-1 mb-2 text-sm">
                <span className="text-purple-500 font-bold flex items-center gap-1"><GameIcon name="gem" size={14} /> {state.prestigeGems}</span>
                <span className="text-text-tertiary text-[10px]">{t('game.gems')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PERKS.map(p => {
                  const lv = state.perks[p.id] || 0;
                  const cost = perkCost(p.baseCost, lv);
                  const maxed = lv >= p.maxLv;
                  const ok = !maxed && state.prestigeGems >= cost;
                  return (
                    <button key={p.id} disabled={!ok && !maxed} onClick={e => { e.stopPropagation(); if (ok) { dispatch({ type: 'BUY_PERK', perk: p }); playSfx('buy'); } }}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all btn-press
                        ${maxed ? 'bg-surface border-amber-400/40 opacity-70' :
                          ok ? 'bg-surface border-purple-400/40 hover:border-purple-400/60 shadow-sm' : 'bg-surface-alt border-border/30 opacity-40'}`}>
                      <GameIcon name={p.icon} size={18} />
                      <span className="text-[9px] font-bold text-text-primary leading-tight">{t(`game.${p.id}`)}</span>
                      {lv > 0 && <span className="text-[8px] text-success font-semibold">+{p.per * lv}%</span>}
                      <span className="text-[8px] text-text-tertiary">{lv}/{p.maxLv}</span>
                      {!maxed && <span className={`text-[9px] font-bold flex items-center gap-0.5 ${ok ? 'text-purple-500' : 'text-text-tertiary'}`}><GameIcon name="gem" size={9} />{cost}</span>}
                      {maxed && <span className="text-[8px] font-bold text-amber-500">{t('game.maxLevel')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
