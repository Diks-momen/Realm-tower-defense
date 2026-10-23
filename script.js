"use strict";
// ===============================
// REALM DEFENSE 2D  (revisi)
// Semua logika game ada di file ini.
// ===============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const MAX_WAVE = 10;
const SAVE_KEY = "realmDefense2D.save.v1";
const METEOR_COOLDOWN = 35;

const $ = id => document.getElementById(id);
const ui = {
  health: $("health"), gold: $("gold"), wave: $("wave"), best: $("best"),
  overlay: $("overlay"), overlayTitle: $("overlayTitle"), overlayText: $("overlayText"),
  startBtn: $("startBtn"), waveBtn: $("waveBtn"), upgradeBtn: $("upgradeBtn"), sellBtn: $("sellBtn"),
  pauseBtn: $("pauseBtn"), speedBtn: $("speedBtn"), restartBtn: $("restartBtn"),
  meteorBtn: $("meteorBtn"), soundBtn: $("soundBtn"),
  selectionInfo: $("selectionInfo"), message: $("message"),
  wavePreview: $("wavePreview"), waveFill: $("waveFill"), towerGrid: $("towerGrid"),
  overlayLobbyBtn: $("overlayLobbyBtn"), lobbyBtn: $("lobbyBtn")
};

// ---------- Simpan progres (localStorage, aman jika diblokir) ----------
const GAME_VERSION = "4.1";
// ---------- Event Halloween ----------
// Ubah tanggal di sini untuk memperpanjang / mengganti periode event. EVENT_FORCE_ON = true -> event selalu aktif.
const EVENT = { id: "halloween", name: "Halloween", start: "2026-10-23", end: "2026-11-07" };
const EVENT_FORCE_ON = false;
const PULL_COST = 10, PULL10_COST = 90;
function eventActive() {
  if (EVENT_FORCE_ON) return true;
  const now = Date.now();
  return now >= new Date(EVENT.start + "T00:00:00").getTime() && now <= new Date(EVENT.end + "T23:59:59").getTime();
}
function eventDaysLeft() { return Math.max(0, Math.ceil((new Date(EVENT.end + "T23:59:59").getTime() - Date.now()) / 86400000)); }
const rarities = {
  common:   { name: "Common",   color: "#b8c2cc", weight: 55,  refund: 2 },
  uncommon: { name: "Uncommon", color: "#5fd27a", weight: 28,  refund: 4 },
  rare:     { name: "Rare",     color: "#4aa3ff", weight: 11.5, refund: 8 },
  legend:   { name: "Legend",   color: "#ffb020", weight: 4.2, refund: 20 },
  mythical: { name: "Mythical", color: "#ff4fd8", weight: 1.1, refund: 50 },
  secret:   { name: "Secret",   color: "#ff3b3b", weight: 0.2, refund: 150 }
};
const rarityOrder = Object.keys(rarities);

// Tambahkan entri baru di PALING ATAS setiap ada pembaruan, lalu ubah GAME_VERSION.
const patchNotes = [
  {
    version: "4.1", date: "23 Okt 2026", title: "Balance Pass & Gua Kristal",
    sections: [
      { label: "⚖️ Balance semua unit", items: [
        "Archer lebih murah DPS awal yang sehat: damage 18 → 17, interval 0,70 → 0,72 detik.",
        "Cannon, Ice, Magic, Tesla, Sniper, Flame, Ballista, Mortar, Hexer, dan unit Gacha disetel ulang agar tidak ada satu unit yang unggul di semua situasi.",
        "Totem dan Bulan Darah diturunkan buff-nya; Mine dibuat lebih konsisten; BARACK lebih murah tetapi pasukannya sedikit lebih rapuh.",
        "Unit multi-target tetap kuat melawan gerombolan, tetapi damage per target diturunkan agar Sniper, Magic, dan Archer tetap punya peran jelas."
      ]},
      { label: "🌿 Unit baru", items: ["Druid (145 🪙 / 75 💎): penembak alam hybrid dengan jangkauan panjang, bisa menyerang darat dan udara, tetapi tanpa tembus armor."] },
      { label: "💎 Map baru", items: ["Gua Kristal (★★★★): jalur memutar panjang dengan banyak tikungan. Musuh +75% HP, hadiah 💎 ×2,0, dan gelombang udara mulai wave 4."] }
    ]
  },
  {
    version: "4.0", date: "23 Okt 2026", title: "Event Halloween 🎃",
    sections: [
      { label: "🗺️ Map event", items: ["🎃 Lembah Hantu (★★★): map bertema Halloween, jalur tangga berliku. Lebih banyak musuh terbang 🦇 sejak wave 2. Musuh +35% HP, hadiah 💎 ×1,3. Hanya tersedia selama event."] },
      { label: "🎃 Halloween Coin", items: ["Mata uang khusus event. Didapat dari bermain di Lembah Hantu: 2 coin per wave selesai, +20 jika menang. Kamu mendapat 20 coin gratis di awal.", "Dipakai untuk gacha di tab 🎃 Gacha."] },
      { label: "🎰 Gacha unit", items: [
        "Tarik ×1 = 10 🎃, tarik ×10 = 90 🎃 (hemat 10).",
        "6 tingkat rarity (peluang dasar): Common 55%, Uncommon 28%, Rare 11,5%, Legend 4,2%, Mythical 1,1%, dan Secret 0,2%.",
        "Pity: tarikan ke-10 tanpa Rare pasti Rare+. Legend+ dijamin dalam 40 tarikan, Mythical+ dalam 120 tarikan.",
        "Unit duplikat dikembalikan jadi coin (Common 2 hingga Secret 150)."] },
      { label: "🧰 Unit gacha baru (maks Lv 3)", items: [
        "Common: 🎃 Labu Meledak, 🕯️ Lilin Api.",
        "Uncommon: 👻 Hantu (tembus armor), 🕸️ Jaring Laba-laba (aura perlambat).",
        "Rare: 🪦 Kuburan (memanggil zombie), 🧙 Penyihir (kolam racun + perlambat).",
        "Legend: 🧛 Vampir (menyerang banyak musuh sekaligus).",
        "Mythical: 💀 Malaikat Maut (mengeksekusi musuh berHP rendah).",
        "Secret: ??? Temukan sendiri 🤫"] },
      { label: "🛠️ Lain-lain", items: ["Event berlangsung sampai 7 Nov 2026. Unit yang sudah didapat tetap bisa dipakai setelah event berakhir."] }
    ]
  },
  {
    version: "3.0", date: "23 Okt 2026", title: "Gunung Berapi, Mortar & Hexer",
    sections: [
      { label: "🗺️ Map baru", items: ["🌋 Gunung Berapi (★★★★): jalur zig-zag panjang dengan kolam lava. Musuh +60% HP, hadiah 💎 ×1,8."] },
      { label: "🧰 Unit baru (maks Lv 3)", items: [
        "🧨 Mortar (75 💎): artileri jarak jauh dengan ledakan AOE besar (radius 55/62/70). Hanya mengenai musuh darat.",
        "🔮 Hexer (65 💎): menandai musuh sehingga menerima +20/30/40% damage dari semua sumber selama 3,5 detik. Lv 3 menyebarkan kutukan ke 2 musuh di dekatnya."] },
      { label: "⚖️ Balance", items: [
        "Archer: kecepatan tembak 0,65 → 0,70 detik (sedikit lebih lambat).", "Cannon: damage 38 → 42.", "Magic: damage 28 → 30.", "Tesla: damage 24 → 27.",
        "Sniper: damage 72 → 80, jangkauan 245 → 235.", "Totem Lv 1: bonus damage 15% → 18%.",
        "Mine Lv 3: gold per wave 85 → 80.", "BARACK: HP Ksatria 92 → 100.",
        "Meteor: jeda 40 → 35 detik.", "Bos: hadiah gold 40 → 45.", "Bonus gems saat menang: 25 → 30."] },
      { label: "🛠️ Lain-lain", items: ["Tab Patch Note di lobby, lengkap dengan badge BARU."] }
    ]
  },
  {
    version: "2.1", date: "23 Okt 2026", title: "Flame jadi AOE",
    sections: [{ label: "⚖️ Balance", items: ["🔥 Flame kini menyerang SEMUA musuh darat dalam jangkauan sekaligus dan membakar mereka.", "Damage per semburan diturunkan: 7/12/19 → 5/9/14 agar seimbang."] }]
  },
  {
    version: "2.0", date: "22 Okt 2026", title: "Lobby, Toko & Map",
    sections: [
      { label: "🏠 Lobby", items: ["Pilih map: Hutan, Padang Pasir, Gerbang Kerajaan.", "Bawa maksimal 5 unit (slot). Awalnya hanya Archer yang terbuka.", "Toko: beli unit permanen dengan 💎 yang didapat dari menyelesaikan wave."] },
      { label: "🧰 Unit baru (maks Lv 3)", items: ["🔥 Flame, 🔱 Ballista, 🗿 Totem, ⛏️ Mine."] },
      { label: "⚖️ Balance", items: ["Padang Pasir: musuh +30% HP. Gerbang Kerajaan: musuh +50% HP."] }
    ]
  },
  {
    version: "1.1", date: "22 Okt 2026", title: "Revisi besar",
    sections: [
      { label: "🐞 Perbaikan bug", items: ["Ice tidak lagi membekukan terus-menerus: kini memperlambat, dan membeku 1,2 detik tiap 4 tembakan.", "Musuh sekarang melawan pasukan BARACK, dan pasukan menjaga titik kumpul.", "Tower tidak bisa lagi dipasang menimpa pohon, kolam, atau markas.", "Target tower dipilih dari jarak tempuh asli musuh."] },
      { label: "✨ Fitur baru", items: ["Musuh baru: Lari, Tank, Terbang, dan Bos.", "Skill Meteor, efek suara, rekor tersimpan, pratinjau jangkauan, pintasan keyboard."] }
    ]
  },
  {
    version: "1.0", date: "—", title: "Versi awal",
    sections: [{ label: "🎮 Isi game", items: ["8 tower, 10 wave, dan BARACK dengan pasukan."] }]
  }
];

const defaultSave = { bestWave: 0, wins: 0, muted: false, gems: 30, owned: ["archer"], loadout: ["archer"], map: "forest", mapBest: {}, seenPatch: "", coins: 20, gacha: { pRare: 0, pLegend: 0, pMyth: 0, pulls: 0 }, seenEvent: false };
function loadSave() {
  try { return Object.assign({}, defaultSave, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); }
  catch (e) { return Object.assign({}, defaultSave); }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* abaikan */ } }
const save = loadSave();

// ---------- Data tower & musuh ----------
const towerTypes = {
  archer: { name: "Archer", cost: 50, gem: 0, range: 125, damage: 17, rate: 0.72, color: "#f7c66a", icon: "🏹", air: true, desc: "Murah & cepat" },
  cannon: { name: "Cannon", cost: 80, gem: 25, range: 105, damage: 44, rate: 1.3, color: "#aeb9c9", icon: "💣", air: false, desc: "Damage area • hanya darat" },
  ice: { name: "Ice", cost: 90, gem: 35, range: 120, damage: 8, rate: 0.9, color: "#81e5ff", icon: "❄️", air: true, desc: "Memperlambat • membeku tiap 4 tembakan" },
  poison: { name: "Poison", cost: 100, gem: 40, range: 130, damage: 13, rate: 0.9, color: "#a7e36b", icon: "☠️", air: false, pierce: true, desc: "Racun bertahap • hanya darat" },
  magic: { name: "Magic", cost: 110, gem: 50, range: 165, damage: 28, rate: 0.95, color: "#d3a2ff", icon: "✨", air: true, pierce: true, desc: "Jangkauan jauh • tembus armor" },
  sniper: { name: "Sniper", cost: 125, gem: 60, range: 235, damage: 88, rate: 2.05, color: "#ffce73", icon: "🎯", air: true, desc: "Jarak jauh, damage tinggi" },
  tesla: { name: "Tesla", cost: 140, gem: 70, range: 145, damage: 25, rate: 1.2, color: "#7ce7ff", icon: "⚡", air: true, desc: "Listrik memantul ke musuh sekitar" },
  barrack: { name: "BARACK", cost: 280, gem: 80, range: 0, damage: 0, rate: 8, color: "#c79b63", icon: "🏰", air: false, rally: true, maxLevel: 3, desc: "Spawner pasukan • upgrade Lv. 1–3" },
  // ---- Unit baru: semua maksimal Lv. 3 dengan stat per level ----
  flame: {
    name: "Flame", cost: 100, gem: 55, range: 85, damage: 5, rate: 0.3, color: "#ff8a3d", icon: "🔥", air: false, maxLevel: 3,
    levels: [{ damage: 5, range: 85, rate: 0.3 }, { damage: 8, range: 92, rate: 0.28 }, { damage: 12, range: 100, rate: 0.25 }],
    desc: "Ledakan api AOE ke semua musuh darat di sekitar + membakar"
  },
  ballista: {
    name: "Ballista", cost: 130, gem: 70, range: 200, damage: 55, rate: 1.7, color: "#e8d9a8", icon: "🔱", air: true, maxLevel: 3,
    levels: [{ damage: 50, range: 200, rate: 1.75 }, { damage: 78, range: 215, rate: 1.6 }, { damage: 115, range: 230, rate: 1.45, pierce: true }],
    desc: "Panah tembus semua musuh dalam satu garis"
  },
  totem: {
    name: "Totem", cost: 120, gem: 100, range: 110, damage: 0, rate: 0, color: "#8fd6a5", icon: "🗿", air: false, maxLevel: 3, support: true,
    levels: [{ range: 110, dmgBuff: 0.15, rateBuff: 0 }, { range: 130, dmgBuff: 0.22, rateBuff: 0.05 }, { range: 150, dmgBuff: 0.3, rateBuff: 0.1 }],
    desc: "Aura: tower di sekitarnya lebih kuat"
  },
  mine: {
    name: "Mine", cost: 150, gem: 90, range: 0, damage: 0, rate: 0, color: "#ffd166", icon: "⛏️", air: false, maxLevel: 3, income: true,
    levels: [{ income: 32 }, { income: 54 }, { income: 76 }],
    desc: "Menghasilkan gold di akhir tiap wave"
  },
  mortar: {
    name: "Mortar", cost: 135, gem: 75, range: 190, damage: 80, rate: 2.3, color: "#b9a27a", icon: "🧨", air: false, maxLevel: 3,
    levels: [{ damage: 72, range: 190, rate: 2.4, splash: 55 }, { damage: 110, range: 205, rate: 2.2, splash: 62 }, { damage: 155, range: 220, rate: 2, splash: 70 }],
    desc: "Artileri jarak jauh, ledakan AOE besar • hanya darat"
  },
  hexer: {
    name: "Hexer", cost: 95, gem: 65, range: 150, damage: 6, rate: 1.0, color: "#c58bff", icon: "🔮", air: true, maxLevel: 3, debuff: true,
    levels: [{ damage: 6, range: 150, rate: 1.0, amp: 0.18 }, { damage: 10, range: 160, rate: 0.92, amp: 0.27 }, { damage: 15, range: 175, rate: 0.82, amp: 0.36, spread: true }],
    desc: "Kutukan: musuh terkena damage ekstra dari semua sumber"
  },
  // ================== UNIT GACHA HALLOWEEN (maks Lv 3) ==================
  pumpkin: {
    name: "Labu Meledak", gacha: true, rarity: "common", cost: 80, range: 120, damage: 30, rate: 1.5, color: "#ff9a2e", icon: "🎃", air: false, maxLevel: 3,
    levels: [{ damage: 28, range: 120, rate: 1.5, splash: 42 }, { damage: 44, range: 128, rate: 1.4, splash: 48 }, { damage: 64, range: 136, rate: 1.3, splash: 54 }],
    desc: "Melempar labu yang meledak kecil • hanya darat",
    note: "⚔ 30 • ◎ 120 • Ledakan 42 / 48 / 54"
  },
  candle: {
    name: "Lilin Api", gacha: true, rarity: "common", cost: 60, range: 110, damage: 10, rate: 0.55, color: "#ffd27a", icon: "🕯️", air: true, maxLevel: 3,
    levels: [{ damage: 9, range: 110, rate: 0.58, burn: 3 }, { damage: 14, range: 118, rate: 0.53, burn: 5 }, { damage: 21, range: 126, rate: 0.48, burn: 8 }],
    desc: "Tembakan cepat yang membakar target",
    note: "⚔ 10 • ◎ 110 • Bakar 3 / 5 / 8 per detik"
  },
  ghost: {
    name: "Hantu", gacha: true, rarity: "uncommon", cost: 120, range: 150, damage: 26, rate: 0.8, color: "#cfe3ff", icon: "👻", air: true, pierce: true, maxLevel: 3,
    levels: [{ damage: 24, range: 150, rate: 0.82 }, { damage: 37, range: 160, rate: 0.77 }, { damage: 55, range: 170, rate: 0.72 }],
    desc: "Serangan roh menembus armor • bisa kena udara",
    note: "⚔ 26 • ◎ 150 • Tembus armor"
  },
  web: {
    name: "Jaring Laba-laba", gacha: true, rarity: "uncommon", cost: 100, range: 100, damage: 0, rate: 0, color: "#e6e6ee", icon: "🕸️", air: false, maxLevel: 3, support: true,
    levels: [{ range: 100, slow: 0.68 }, { range: 115, slow: 0.58 }, { range: 130, slow: 0.49 }],
    desc: "Aura memperlambat semua musuh di sekitar (darat & udara)",
    note: "Aura ◎ 100 / 115 / 130 • Perlambat 35% / 45% / 55%",
    info: lv => `Aura radius ${lv.range} • musuh melambat ${Math.round((1 - lv.slow) * 100)}% (darat & udara)`
  },
  graveyard: {
    name: "Kuburan", gacha: true, rarity: "rare", cost: 190, range: 0, damage: 0, rate: 0, color: "#7fae6b", icon: "🪦", air: false, maxLevel: 3, rally: true,
    levels: [{ zombies: 2, hp: 120, dmg: 12, respawn: 7 }, { zombies: 3, hp: 150, dmg: 15, respawn: 6 }, { zombies: 4, hp: 190, dmg: 20, respawn: 5 }],
    desc: "Membangkitkan zombie yang menahan jalan musuh",
    note: "Zombie 2 / 3 / 4 • HP 130 → 210",
    info: lv => `Zombie maks ${lv.zombies} • HP ${lv.hp} • damage ${lv.dmg} • bangkit tiap ${lv.respawn} dtk`
  },
  witch: {
    name: "Penyihir", gacha: true, rarity: "rare", cost: 170, range: 140, damage: 20, rate: 1.0, color: "#b44cff", icon: "🧙", air: false, maxLevel: 3,
    levels: [{ damage: 18, range: 140, rate: 1.02, pool: 50, slow: 0.7, dps: 6 }, { damage: 29, range: 150, rate: 0.97, pool: 56, slow: 0.6, dps: 10 }, { damage: 42, range: 160, rate: 0.92, pool: 62, slow: 0.5, dps: 15 }],
    desc: "Ramuan: kolam racun yang memperlambat • hanya darat",
    note: "⚔ 20 • ◎ 140 • Kolam racun + perlambat",
    info: lv => `Damage ${lv.damage} • kolam ${lv.dps}/dtk + melambat ${Math.round((1 - lv.slow) * 100)}% • radius ${lv.pool}`
  },
  vampire: {
    name: "Vampir", gacha: true, rarity: "legend", cost: 230, range: 170, damage: 70, rate: 1.1, color: "#d1304a", icon: "🧛", air: true, maxLevel: 3,
    levels: [{ damage: 64, range: 170, rate: 1.12, targets: 3 }, { damage: 98, range: 180, rate: 1.02, targets: 4 }, { damage: 145, range: 190, rate: 0.92, targets: 5 }],
    desc: "Kawanan kelelawar menyerang banyak musuh sekaligus",
    note: "⚔ 70 • ◎ 170 • Hingga 3 / 4 / 5 target",
    info: lv => `Damage ${lv.damage} ke hingga ${lv.targets} musuh sekaligus • Jangkauan ${lv.range}`
  },
  reaper: {
    name: "Malaikat Maut", gacha: true, rarity: "mythical", cost: 320, range: 200, damage: 90, rate: 1.3, color: "#8b8fa8", icon: "💀", air: true, pierce: true, maxLevel: 3,
    levels: [{ damage: 85, range: 200, rate: 1.35, exec: 0.2 }, { damage: 130, range: 215, rate: 1.25, exec: 0.27 }, { damage: 195, range: 230, rate: 1.15, exec: 0.35 }],
    desc: "Mengeksekusi musuh dengan HP rendah (bos butuh HP lebih rendah lagi)",
    note: "⚔ 90 • ◎ 200 • Eksekusi < 20% / 27% / 35% HP",
    info: lv => `Damage ${lv.damage} (tembus armor) • Eksekusi musuh < ${Math.round(lv.exec * 100)}% HP • Jangkauan ${lv.range}`
  },
  druid: {
    name: "Druid", cost: 145, gem: 75, range: 155, damage: 22, rate: 1.05, color: "#72d18b", icon: "🌿", air: true, maxLevel: 3,
    levels: [{ damage: 22, range: 155, rate: 1.05 }, { damage: 35, range: 170, rate: 0.95 }, { damage: 52, range: 185, rate: 0.85, pierce: true }],
    desc: "Penembak alam seimbang untuk darat & udara; Lv 3 menembus armor",
    note: "⚔ 22 • ◎ 155 • Darat & udara"
  },
  bloodmoon: {
    name: "Bulan Darah", gacha: true, rarity: "secret", cost: 450, range: 0, damage: 0, rate: 0, color: "#e0364a", icon: "🌕", air: false, maxLevel: 3, support: true, unique: true,
    levels: [{ dmgBuff: 0.16, rateBuff: 0.04, nova: 60, novaEvery: 9 }, { dmgBuff: 0.24, rateBuff: 0.07, nova: 110, novaEvery: 8 }, { dmgBuff: 0.32, rateBuff: 0.1, nova: 180, novaEvery: 7 }],
    desc: "Buff SEMUA tower + sambaran bulan ke seluruh musuh • maks 1 per game",
    note: "Buff global +20% / 30% / 40% damage • Nova 60 / 110 / 180",
    info: lv => `Buff semua tower +${Math.round(lv.dmgBuff * 100)}% damage, +${Math.round(lv.rateBuff * 100)}% kecepatan • Nova ${lv.nova} damage tiap ${lv.novaEvery} dtk`
  }
};
const towerKeys = Object.keys(towerTypes);
const shopKeys = towerKeys.filter(k => !towerTypes[k].gacha);
const gachaKeys = towerKeys.filter(k => towerTypes[k].gacha);

const enemyTypes = {
  slime:  { label: "Slime",  icon: "🟢", hp: 1,   speed: 48, reward: 8,  radius: 11, color: "#79d68a", armor: 0,    dmg: 5 },
  runner: { label: "Lari",   icon: "💨", hp: 0.55, speed: 84, reward: 7,  radius: 9,  color: "#7ad7f0", armor: 0,    dmg: 4, evasive: true },
  tank:   { label: "Tank",   icon: "🛡️", hp: 2.3, speed: 34, reward: 15, radius: 15, color: "#f2a65a", armor: 0.3,  dmg: 12 },
  flyer:  { label: "Terbang", icon: "🦇", hp: 0.8, speed: 56, reward: 10, radius: 10, color: "#c9a7ff", armor: 0,    dmg: 0, flying: true },
  boss:   { label: "Bos",    icon: "👑", hp: 6,   speed: 27, reward: 45, radius: 19, color: "#e66a91", armor: 0.25, dmg: 25, boss: true }
};

// ---------- Peta ----------
// Koordinat mengikuti ukuran canvas 900 x 520.
const mapDefs = {
  forest: {
    id: "forest", name: "Hutan", icon: "🌲", stars: 1, hpMult: 1, gemMult: 1,
    desc: "Jalur berkelok klasik di antara pepohonan. Cocok untuk pemula.",
    theme: { bg: "#78bd66", spotA: "#69ae5d", spotB: "#8acb73", edge: "#6a9a55", road: "#d7bd7a", dash: "#e8d39a", water: "#52c5dc", rim: "#4b8b53", base: "house" },
    path: [{ x: -20, y: 105 }, { x: 155, y: 105 }, { x: 155, y: 205 }, { x: 340, y: 205 }, { x: 340, y: 120 }, { x: 535, y: 120 }, { x: 535, y: 325 }, { x: 720, y: 325 }, { x: 720, y: 245 }, { x: 856, y: 245 }],
    obstacles: [
      { x: 785, y: 78, r: 48, name: "kolam", kind: "pond" },
      { x: 65, y: 370, r: 24, name: "pohon", kind: "tree" }, { x: 825, y: 420, r: 24, name: "pohon", kind: "tree" },
      { x: 65, y: 245, r: 24, name: "pohon", kind: "tree" }, { x: 845, y: 155, r: 24, name: "pohon", kind: "tree" }
    ]
  },
  desert: {
    id: "desert", name: "Padang Pasir", icon: "🏜️", stars: 2, hpMult: 1.3, gemMult: 1.25,
    desc: "Jalur panjang bersiku di antara kaktus dan oasis. Musuh sedikit lebih tangguh.",
    theme: { bg: "#e6c885", spotA: "#d8b673", spotB: "#f0d79d", edge: "#b98a4a", road: "#c99a5b", dash: "#dfbb82", water: "#3fb7cf", rim: "#7aa65a", base: "house" },
    path: [{ x: -20, y: 420 }, { x: 200, y: 420 }, { x: 200, y: 140 }, { x: 430, y: 140 }, { x: 430, y: 380 }, { x: 650, y: 380 }, { x: 650, y: 150 }, { x: 856, y: 150 }],
    obstacles: [
      { x: 90, y: 200, r: 40, name: "oasis", kind: "pond" },
      { x: 320, y: 300, r: 22, name: "kaktus", kind: "cactus" }, { x: 540, y: 220, r: 22, name: "kaktus", kind: "cactus" },
      { x: 780, y: 300, r: 22, name: "kaktus", kind: "cactus" }, { x: 90, y: 330, r: 22, name: "kaktus", kind: "cactus" },
      { x: 330, y: 470, r: 20, name: "batu", kind: "rock" }, { x: 760, y: 450, r: 20, name: "batu", kind: "rock" }, { x: 700, y: 50, r: 20, name: "batu", kind: "rock" }
    ]
  },
  castle: {
    id: "castle", name: "Gerbang Kerajaan", icon: "🏰", stars: 3, hpMult: 1.5, gemMult: 1.5,
    desc: "Lorong sempit di halaman kastil. Ruang tower terbatas, musuh paling tangguh.",
    theme: { bg: "#8d929b", spotA: "#80858e", spotB: "#9ba1aa", edge: "#5a5f69", road: "#c4b394", dash: "#dacfb3", water: "#5cb8d6", rim: "#5d6470", base: "gate" },
    path: [{ x: -20, y: 70 }, { x: 700, y: 70 }, { x: 700, y: 190 }, { x: 160, y: 190 }, { x: 160, y: 310 }, { x: 700, y: 310 }, { x: 700, y: 440 }, { x: 856, y: 440 }],
    obstacles: [
      { x: 430, y: 410, r: 34, name: "air mancur", kind: "pond" },
      { x: 60, y: 130, r: 20, name: "pilar", kind: "pillar" }, { x: 60, y: 400, r: 20, name: "pilar", kind: "pillar" },
      { x: 300, y: 480, r: 20, name: "pilar", kind: "pillar" }, { x: 560, y: 480, r: 20, name: "pilar", kind: "pillar" },
      { x: 800, y: 300, r: 20, name: "pilar", kind: "pillar" }, { x: 800, y: 150, r: 20, name: "pilar", kind: "pillar" }
    ]
  }
};
mapDefs.volcano = {
  id: "volcano", name: "Gunung Berapi", icon: "🌋", stars: 4, hpMult: 1.6, gemMult: 1.8,
  desc: "Zig-zag panjang di tanah vulkanik. Musuh paling tangguh, hadiah terbesar.",
  theme: { bg: "#3d2c2a", spotA: "#4b3532", spotB: "#2f2220", edge: "#d0521c", road: "#5e4b43", dash: "#8c7468", water: "#ff7a1a", rim: "#7a2e12", shine: "#ffd27a77", rockA: "#2e2523", rockB: "#4f403b", base: "gate" },
  path: [{ x: -20, y: 260 }, { x: 130, y: 260 }, { x: 130, y: 90 }, { x: 330, y: 90 }, { x: 330, y: 430 }, { x: 520, y: 430 }, { x: 520, y: 150 }, { x: 700, y: 150 }, { x: 700, y: 380 }, { x: 856, y: 380 }],
  obstacles: [
    { x: 230, y: 300, r: 36, name: "kolam lava", kind: "pond" }, { x: 610, y: 330, r: 36, name: "kolam lava", kind: "pond" },
    { x: 60, y: 420, r: 20, name: "batu", kind: "rock" }, { x: 230, y: 480, r: 20, name: "batu", kind: "rock" },
    { x: 430, y: 260, r: 20, name: "batu", kind: "rock" }, { x: 620, y: 60, r: 20, name: "batu", kind: "rock" },
    { x: 780, y: 230, r: 20, name: "batu", kind: "rock" }, { x: 800, y: 475, r: 20, name: "batu", kind: "rock" }
  ]
};
mapDefs.crystal = {
  id: "crystal", name: "Gua Kristal", icon: "💎", stars: 4, hpMult: 1.75, gemMult: 2.0, flyFrom: 4, flyW: 0.18,
  desc: "Gua bercahaya dengan jalur memutar panjang. Musuh sangat kuat, tetapi hadiahnya besar.",
  theme: { bg: "#182d45", spotA: "#1e405c", spotB: "#243a63", edge: "#3a6b8a", road: "#6b718f", dash: "#b0c5df", water: "#45e0e5", rim: "#296b84", shine: "#d6ffff99", rockA: "#49607d", rockB: "#82a7c7", base: "gate" },
  path: [{ x: -20, y: 110 }, { x: 180, y: 110 }, { x: 180, y: 410 }, { x: 370, y: 410 }, { x: 370, y: 90 }, { x: 570, y: 90 }, { x: 570, y: 430 }, { x: 760, y: 430 }, { x: 760, y: 250 }, { x: 856, y: 250 }],
  obstacles: [
    { x: 75, y: 300, r: 25, name: "kristal", kind: "rock" }, { x: 270, y: 210, r: 30, name: "kristal", kind: "rock" },
    { x: 470, y: 270, r: 28, name: "kristal", kind: "rock" }, { x: 680, y: 150, r: 26, name: "kristal", kind: "rock" },
    { x: 820, y: 380, r: 28, name: "danau kristal", kind: "pond" }, { x: 90, y: 475, r: 20, name: "batu", kind: "rock" },
    { x: 480, y: 485, r: 20, name: "batu", kind: "rock" }
  ]
};
mapDefs.halloween = {
  id: "halloween", event: true, name: "Lembah Hantu", icon: "🎃", stars: 3, hpMult: 1.35, gemMult: 1.3, flyFrom: 2, flyW: 0.22,
  desc: "EVENT HALLOWEEN: jalur tangga berliku di pemakaman berkabut. Banyak kelelawar! Hadiah Halloween Coin 🎃.",
  theme: { bg: "#2b2040", spotA: "#35274d", spotB: "#221833", edge: "#4c2f6e", road: "#74647f", dash: "#a698b4", water: "#74ff74", rim: "#2f6b34", shine: "#ccffcc77", base: "gate" },
  path: [{ x: -20, y: 430 }, { x: 140, y: 430 }, { x: 140, y: 250 }, { x: 300, y: 250 }, { x: 300, y: 100 }, { x: 460, y: 100 }, { x: 460, y: 420 }, { x: 620, y: 420 }, { x: 620, y: 180 }, { x: 760, y: 180 }, { x: 760, y: 300 }, { x: 856, y: 300 }],
  obstacles: [
    { x: 60, y: 300, r: 18, name: "batu nisan", kind: "tomb" }, { x: 220, y: 350, r: 18, name: "batu nisan", kind: "tomb" },
    { x: 540, y: 60, r: 18, name: "batu nisan", kind: "tomb" }, { x: 240, y: 485, r: 18, name: "batu nisan", kind: "tomb" }, { x: 800, y: 470, r: 18, name: "batu nisan", kind: "tomb" },
    { x: 220, y: 170, r: 24, name: "pohon mati", kind: "deadtree" }, { x: 380, y: 250, r: 24, name: "pohon mati", kind: "deadtree" }, { x: 700, y: 400, r: 24, name: "pohon mati", kind: "deadtree" },
    { x: 380, y: 370, r: 18, name: "labu", kind: "pumpkin" }, { x: 60, y: 120, r: 18, name: "labu", kind: "pumpkin" }, { x: 830, y: 120, r: 18, name: "labu", kind: "pumpkin" }, { x: 60, y: 490, r: 18, name: "labu", kind: "pumpkin" },
    { x: 540, y: 300, r: 34, name: "kuali beracun", kind: "pond" }
  ]
};
const mapKeys = Object.keys(mapDefs);
const PATH_HALF_WIDTH = 38;
let map, path, BASE, PATH_LENGTH, FLY_LENGTH, obstacles;
function setMap(id) {
  map = mapDefs[id] || mapDefs.forest;
  path = map.path;
  BASE = path[path.length - 1];
  PATH_LENGTH = path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0);
  FLY_LENGTH = Math.hypot(BASE.x - path[0].x, BASE.y - path[0].y);
  obstacles = map.obstacles.concat([{ x: BASE.x, y: BASE.y - 27, r: 44, name: "markas", kind: "base" }]);
  bgCache = null;
}

// ---------- State ----------
let health, gold, wave, towers, enemies, bullets, friendlyUnits, poisonPuddles, fx, meteors;
let selectedType, selectedTower, hover, meteorArmed, meteorCooldown;
let waveActive, paused, gameOver, speed, spawnQueue, spawnTimer, lastTime, animationId;
let wavePlans, kills, baseFlash, moonFlash, lastCoins = 0, totalGoldEarned, loadout = ["archer"], runRewarded = false;

function resetGame() {
  health = 10; gold = 160; wave = 0; kills = 0; totalGoldEarned = 0;
  towers = []; enemies = []; bullets = []; friendlyUnits = []; poisonPuddles = []; fx = []; meteors = [];
  selectedType = loadout[0]; selectedTower = null; hover = null; runRewarded = false;
  meteorArmed = false; meteorCooldown = 12; baseFlash = 0; moonFlash = 0;
  waveActive = false; paused = false; gameOver = false; speed = 1;
  spawnQueue = []; spawnTimer = 0; lastTime = 0;
  wavePlans = Array.from({ length: MAX_WAVE }, (_, i) => buildWavePlan(i + 1));
  document.querySelectorAll(".tower-btn").forEach(b => b.classList.toggle("selected", b.dataset.tower === selectedType));
  ui.overlay.classList.remove("hidden");
  ui.overlayTitle.textContent = `${map.icon} ${map.name}`;
  const best = save.mapBest[map.id];
  ui.overlayText.textContent = (best ? `Rekormu di sini: ${best >= MAX_WAVE ? "menang!" : "wave " + best}. ` : "") + "Pasang tower di rumput, lalu mulai wave pertama.";
  ui.startBtn.textContent = "Mulai permainan";
  ui.pauseBtn.textContent = "⏸ Jeda";
  ui.message.textContent = "Tips: Ice memperlambat musuh, Cannon & Poison tidak bisa kena musuh terbang 🦇, BARACK dibatasi 2 regu aktif.";
  ui.canvasWrap && ui.canvasWrap.classList.remove("armed");
  updateUI();
  draw();
}

// ---------- Helper ----------
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function setText(el, value) { value = String(value); if (el.textContent !== value) el.textContent = value; }
function setHTML(el, value) { if (el.dataset.last !== value) { el.dataset.last = value; el.innerHTML = value; } }
function maxLevel(tower) { return towerTypes[tower.type].maxLevel || 5; }
function upgradeCost(tower) {
  if (!tower || tower.level >= maxLevel(tower)) return Infinity;
  return Math.round(towerTypes[tower.type].cost * tower.level * 0.7);
}
function sellValue(tower) { return Math.floor(tower.spent * 0.65); }
function levelData(tower) { const t = towerTypes[tower.type]; return t.levels ? t.levels[tower.level - 1] : null; }
// Aura Totem: tower di dalam jangkauan mendapat bonus damage / kecepatan.
function towerBuff(tower) {
  let d = 0, r = 0;
  for (const o of towers) {
    if (o === tower) continue;
    if (o.type === "totem") {
      const lv = levelData(o);
      if (distance(o, tower) <= lv.range) { d = Math.max(d, lv.dmgBuff); r = Math.max(r, lv.rateBuff); }
    } else if (o.type === "bloodmoon") { // buff global
      const lv = levelData(o);
      d = Math.max(d, lv.dmgBuff); r = Math.max(r, lv.rateBuff);
    }
  }
  return { d, r };
}
function baseDamage(tower) {
  const lv = levelData(tower);
  return lv ? lv.damage : Math.round(towerTypes[tower.type].damage * (1 + (tower.level - 1) * 0.6));
}
function towerDamage(tower) { return Math.round(baseDamage(tower) * (1 + towerBuff(tower).d)); }
function towerRange(tower) {
  const lv = levelData(tower);
  return lv ? (lv.range || 0) : Math.round(towerTypes[tower.type].range * (1 + (tower.level - 1) * 0.05));
}
function towerRate(tower) {
  const lv = levelData(tower);
  const base = lv ? lv.rate : towerTypes[tower.type].rate * (1 - (tower.level - 1) * 0.05);
  return base / (1 + towerBuff(tower).r);
}
function barrackRoster(level) {
  if (level === 1) return "3 Ksatria";
  if (level === 2) return "4 Ksatria + 2 Pemanah";
  return "4 Ksatria + 2 Pemanah Elite + 1 Gladiator";
}

function segmentPoint(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}
function nearestPathPoint(x, y) {
  let best = null, bestD = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const p = segmentPoint(x, y, path[i], path[i + 1]);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
function pointOnPath(x, y) {
  const p = nearestPathPoint(x, y);
  return Math.hypot(x - p.x, y - p.y) < PATH_HALF_WIDTH;
}
function canPlace(p) {
  if (p.x < 22 || p.x > W - 22 || p.y < 22 || p.y > H - 22) return "Terlalu dekat tepi peta.";
  if (pointOnPath(p.x, p.y)) return "Tower tidak bisa dipasang di jalan. Cari area rumput!";
  const ob = obstacles.find(o => distance(o, p) < o.r + 16);
  if (ob) return `Ada ${ob.name} di sini. Pilih tempat lain.`;
  if (towers.some(t => distance(t, p) < 42)) return "Terlalu dekat dengan tower lain. Beri sedikit jarak.";
  return null;
}
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  };
}

// ---------- Suara sederhana (WebAudio) ----------
let audioCtx = null;
const lastSfx = {};
function sfx(name) {
  if (save.muted) return;
  const now = Date.now();
  if (lastSfx[name] && now - lastSfx[name] < 70) return;
  lastSfx[name] = now;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const presets = {
      place:   [[520, 0.08], [700, 0.1]],
      upgrade: [[600, 0.07], [800, 0.07], [1000, 0.1]],
      sell:    [[500, 0.07], [350, 0.1]],
      shoot:   [[300, 0.04]],
      kill:    [[700, 0.05]],
      leak:    [[160, 0.25]],
      wave:    [[330, 0.1], [440, 0.12]],
      meteor:  [[120, 0.4]],
      win:     [[523, 0.12], [659, 0.12], [784, 0.25]],
      lose:    [[300, 0.2], [200, 0.2], [120, 0.35]],
      error:   [[180, 0.1]]
    }[name] || [];
    let t = audioCtx.currentTime;
    for (const [freq, dur] of presets) {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = name === "leak" || name === "meteor" || name === "lose" ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(name === "shoot" ? 0.015 : 0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur);
      t += dur * 0.85;
    }
  } catch (e) { /* suara opsional */ }
}

// ---------- Efek visual ----------
function addText(x, y, text, color = "#fff", size = 13) {
  if (fx.length > 160) return;
  fx.push({ k: "text", x, y, text, color, size, life: 0.85, max: 0.85 });
}
function addRing(x, y, r, color, life = 0.35) { fx.push({ k: "ring", x, y, r, color, life, max: life }); }
function addZap(a, b, color, life = 0.14) { fx.push({ k: "zap", x: a.x, y: a.y, x2: b.x, y2: b.y, color, life, max: life }); }
function addBurst(x, y, color, n = 8) {
  for (let i = 0; i < n && fx.length < 220; i++) {
    const ang = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
    fx.push({ k: "spark", x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, color, life: 0.5, max: 0.5 });
  }
}
function updateFx(step) {
  for (const f of fx) {
    f.life -= step;
    if (f.k === "text") f.y -= 24 * step;
    if (f.k === "spark") { f.x += f.vx * step; f.y += f.vy * step; f.vy += 160 * step; }
  }
  fx = fx.filter(f => f.life > 0);
}

// ---------- Wave ----------
function baseHp(n) { return 30 + n * 8 + n * n * 2.6; }

function buildWavePlan(n) {
  const total = 6 + n * 2;
  const tankW = n >= 4 ? 0.18 : 0, flyW = n >= (map.flyFrom || 3) ? (map.flyW || 0.16) : 0, runW = n >= 2 ? 0.2 : 0;
  const plan = [];
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    if (r < tankW) plan.push("tank");
    else if (r < tankW + flyW) plan.push("flyer");
    else if (r < tankW + flyW + runW) plan.push("runner");
    else plan.push("slime");
  }
  if (n === 5 || n >= 7) plan[total - 1] = "boss";
  if (n === 10) plan[Math.floor(total / 2)] = "boss";
  return plan;
}
function countPlan(plan) {
  const counts = {};
  plan.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  return counts;
}
function planText(plan) {
  const counts = countPlan(plan);
  return Object.keys(enemyTypes).filter(k => counts[k]).map(k => `<span class="chip" title="${enemyTypes[k].label}">${enemyTypes[k].icon} ×${counts[k]}</span>`).join(" ");
}

function beginWave() {
  if (waveActive || gameOver || wave >= MAX_WAVE) return;
  wave++;
  waveActive = true;
  spawnQueue = wavePlans[wave - 1].slice();
  spawnTimer = 0;
  ui.message.textContent = `Wave ${wave} dimulai! Bersiap menghadapi ${spawnQueue.length} musuh.`;
  ui.overlay.classList.add("hidden");
  sfx("wave");
  updateUI();
}

function spawnEnemy(typeKey) {
  const t = enemyTypes[typeKey];
  const maxHp = Math.round(baseHp(wave) * t.hp * map.hpMult);
  enemies.push({
    type: typeKey, flying: !!t.flying, evasive: !!t.evasive, boss: !!t.boss,
    x: path[0].x, y: path[0].y, pathIndex: 0, dist: 0, progress: 0,
    total: t.flying ? FLY_LENGTH : PATH_LENGTH,
    hp: maxHp, maxHp, armor: t.armor, dmg: t.dmg,
    speed: t.speed + wave * (t.boss ? 0.6 : 1.5),
    reward: t.reward, radius: t.radius, color: t.color,
    slowTimer: 0, slowFactor: 1, freezeTimer: 0, poisonTimer: 0, poisonDamage: 0, burnTimer: 0, burnDps: 0, hexTimer: 0, hexAmp: 0,
    attackCd: 0, attackFlash: 0, hitFlash: 0, t: Math.random() * 6
  });
}

// ---------- Damage ----------
function damageEnemy(e, amount, opts = {}) {
  if (e.hp <= 0) return;
  const real = amount * (e.hexTimer > 0 ? 1 + e.hexAmp : 1) * (1 - (opts.pierce ? 0 : e.armor));
  e.hp -= real;
  if (!opts.dot) e.hitFlash = 0.1;
  if (!opts.dot && real >= 20) addText(e.x + (Math.random() * 10 - 5), e.y - e.radius - 10, Math.round(real), "#fff3b0", 12);
}
function enemyTargetable(e, air) { return e.hp > 0 && (air || !e.flying); }

// ---------- BARACK ----------
function spawnBarrackSquad(barrack) {
  const livingSquads = new Set(friendlyUnits.filter(u => u.barrackId === barrack.id).map(u => u.squadId));
  if (livingSquads.size >= 2) return;
  const level = barrack.level;
  const squadId = `${barrack.id}-${Date.now()}-${Math.random()}`;
  let slot = 0;
  const make = (kind, count, upgraded = false) => {
    for (let i = 0; i < count; i++, slot++) {
      const maxHp = kind === "gladiator" ? 180 : kind === "knight" ? 94 : upgraded ? 46 : 30;
      friendlyUnits.push({
        kind, upgraded, barrackId: barrack.id, squadId,
        x: barrack.x, y: barrack.y + 18,
        rally: barrack.rally,
        ox: ((slot % 3) - 1) * 16 + (Math.random() * 4 - 2), oy: (Math.floor(slot / 3) - 1) * 14 + (Math.random() * 4 - 2),
        hp: maxHp, maxHp,
        speed: kind === "gladiator" ? 40 : kind === "knight" ? 52 : upgraded ? 56 : 52,
        damage: kind === "gladiator" ? 34 : kind === "knight" ? 16 : upgraded ? 18 : 10,
        range: kind === "archer" ? (upgraded ? 145 : 120) : kind === "gladiator" ? 30 : 27,
        attackRate: kind === "gladiator" ? 0.8 : kind === "knight" ? 1.05 : upgraded ? 0.9 : 1.15,
        cooldown: Math.random() * 0.5, attackFlash: 0, hitFlash: 0, dead: false
      });
    }
  };
  make("knight", level >= 2 ? 4 : 3);
  if (level >= 2) make("archer", 2, level >= 3);
  if (level >= 3) make("gladiator", 1);
}

const LEASH = 105; // seberapa jauh pasukan mengejar musuh dari titik kumpul
function moveToward(unit, target, step) {
  const d = distance(unit, target);
  if (d < 1.5) return;
  const move = Math.min(d, unit.speed * step);
  unit.x += (target.x - unit.x) / d * move;
  unit.y += (target.y - unit.y) / d * move;
}

function updateFriendlyUnits(step) {
  for (const unit of friendlyUnits) {
    unit.cooldown -= step;
    unit.attackFlash = Math.max(0, unit.attackFlash - step);
    unit.hitFlash = Math.max(0, unit.hitFlash - step);
    const home = { x: unit.rally.x + unit.ox, y: unit.rally.y + unit.oy };
    if (unit.kind === "archer") {
      // Pemanah menembak dari belakang, boleh mengenai musuh terbang.
      const target = enemies.filter(e => e.hp > 0 && distance(unit, e) <= unit.range)
        .sort((a, b) => b.progress - a.progress)[0];
      if (target) {
        if (unit.cooldown <= 0) {
          damageEnemy(target, unit.damage);
          addZap(unit, target, "#f1e2b4", 0.1);
          unit.cooldown = unit.attackRate; unit.attackFlash = 0.12;
        }
      } else moveToward(unit, home, step);
    } else {
      // Petarung jarak dekat mengejar musuh darat di sekitar titik kumpul.
      const target = enemies.filter(e => e.hp > 0 && !e.flying && distance(e, unit.rally) <= LEASH)
        .sort((a, b) => distance(unit, a) - distance(unit, b))[0];
      if (target) {
        const reach = unit.range + target.radius;
        if (distance(unit, target) <= reach) {
          if (unit.cooldown <= 0) {
            damageEnemy(target, unit.damage);
            unit.cooldown = unit.attackRate; unit.attackFlash = 0.12;
          }
        } else moveToward(unit, target, step);
      } else moveToward(unit, home, step);
    }
  }
  friendlyUnits = friendlyUnits.filter(u => !u.dead && u.hp > 0);
}

// ---------- Musuh ----------
function engageRadius(enemy, unit) {
  return unit.kind === "archer" ? enemy.radius + 14 : enemy.radius + unit.range + 6;
}
function moveEnemy(e, amount) {
  if (e.flying) {
    const d = distance(e, BASE);
    const move = Math.min(d, amount);
    if (d > 0) { e.x += (BASE.x - e.x) / d * move; e.y += (BASE.y - e.y) / d * move; }
    e.dist += move;
  } else {
    let remaining = amount;
    while (remaining > 0 && e.pathIndex < path.length - 1) {
      const target = path[e.pathIndex + 1];
      const d = distance(e, target);
      if (d <= remaining) {
        e.x = target.x; e.y = target.y; e.pathIndex++;
        remaining -= d; e.dist += d;
      } else {
        e.x += (target.x - e.x) / d * remaining;
        e.y += (target.y - e.y) / d * remaining;
        e.dist += remaining; remaining = 0;
      }
    }
  }
  e.progress = Math.min(1, e.dist / e.total);
}
function enemyArrived(e) {
  return e.flying ? distance(e, BASE) < 2 : e.pathIndex >= path.length - 1;
}

function updateEnemies(step) {
  for (const e of enemies) {
    e.t += step;
    e.hitFlash = Math.max(0, e.hitFlash - step);
    e.attackFlash = Math.max(0, e.attackFlash - step);
    e.hexTimer = Math.max(0, e.hexTimer - step);
    e.freezeTimer = Math.max(0, e.freezeTimer - step);
    e.slowTimer = Math.max(0, e.slowTimer - step);
    e.attackCd -= step;
    if (e.hp <= 0 || e.freezeTimer > 0) continue;
    // Musuh darat berhenti dan melawan pasukan yang menghadang.
    if (!e.flying && !e.evasive) {
      const blocker = friendlyUnits.filter(u => u.hp > 0 && distance(u, e) <= engageRadius(e, u))
        .sort((a, b) => distance(a, e) - distance(b, e))[0];
      if (blocker) {
        if (e.attackCd <= 0) {
          blocker.hp -= e.dmg; blocker.hitFlash = 0.1;
          e.attackCd = 1; e.attackFlash = 0.15;
        }
        continue;
      }
    }
    moveEnemy(e, e.speed * (e.slowTimer > 0 ? e.slowFactor : 1) * step);
  }
}

// ---------- Tower ----------
function applyHex(target, amp) {
  target.hexAmp = Math.max(target.hexTimer > 0 ? target.hexAmp : 0, amp);
  target.hexTimer = 3.5;
}
function setSlow(e, factor, dur) {
  if (e.boss) factor = 1 - (1 - factor) * 0.5; // bos lebih tahan perlambatan
  if (e.slowTimer <= 0 || factor < e.slowFactor) e.slowFactor = factor;
  e.slowTimer = Math.max(e.slowTimer, dur);
}
function applySlow(target, level) {
  let factor = Math.max(0.3, 0.55 - 0.05 * (level - 1));
  if (target.boss) factor = 1 - (1 - factor) * 0.5; // bos lebih tahan perlambatan
  if (target.slowTimer <= 0 || factor < target.slowFactor) target.slowFactor = factor;
  target.slowTimer = Math.max(target.slowTimer, 2.2 + 0.2 * level);
}

function updateTowers(step) {
  for (const tower of towers) {
    tower.flash = Math.max(0, (tower.flash || 0) - step);
    if (tower.type === "graveyard") { updateGraveyard(tower, step); continue; }
    if (tower.type === "barrack") {
      tower.spawnCooldown -= step;
      if (tower.spawnCooldown <= 0) {
        spawnBarrackSquad(tower);
        tower.spawnCooldown = Math.max(4.8, 6.8 - (tower.level - 1) * 0.75);
      }
      continue;
    }
    const stats = towerTypes[tower.type];
    if (tower.type === "web") applyWeb(tower);
    else if (tower.type === "bloodmoon") updateBloodMoon(tower, step);
    if (stats.support || stats.income) continue;
    tower.cooldown -= step;
    const range = towerRange(tower);
    const target = enemies.filter(e => enemyTargetable(e, stats.air) && distance(tower, e) <= range)
      .sort((a, b) => b.progress - a.progress)[0];
    if (target && tower.cooldown <= 0) {
      tower.shots = (tower.shots || 0) + 1;
      if (tower.type === "flame") { fireFlame(tower, target); continue; }
      if (tower.type === "vampire") { fireVampire(tower); continue; }
      if (tower.type === "reaper") { fireReaper(tower, target); continue; }
      if (tower.type === "ballista") { fireBallista(tower, target); continue; }
      bullets.push({
        x: tower.x, y: tower.y, target, damage: towerDamage(tower), level: tower.level,
        speed: bulletSpeeds[tower.type] || 360,
        lvData: levelData(tower),
        color: stats.color, type: tower.type, pierce: !!stats.pierce || !!(levelData(tower) && levelData(tower).pierce),
        freeze: tower.type === "ice" && tower.shots % 4 === 0
      });
      tower.cooldown = towerRate(tower);
      tower.flash = 0.1;
      if (tower.type === "cannon" || tower.type === "sniper") sfx("shoot");
    }
  }
}

const bulletSpeeds = { sniper: 620, cannon: 280, tesla: 500, mortar: 230, hexer: 420, pumpkin: 260, witch: 270, candle: 380 };

function applyWeb(tower) {
  const lv = levelData(tower);
  for (const e of enemies) if (e.hp > 0 && distance(tower, e) <= lv.range + e.radius) setSlow(e, lv.slow, 0.35);
}
function updateBloodMoon(tower, step) {
  const lv = levelData(tower);
  tower.novaTimer -= step;
  if (tower.novaTimer > 0) return;
  tower.novaTimer = lv.novaEvery;
  enemies.forEach(e => { if (e.hp > 0) damageEnemy(e, lv.nova, { pierce: true }); });
  moonFlash = 0.8;
  addRing(tower.x, tower.y, 380, "#ff3b5c", 0.7);
  addText(tower.x, tower.y - 32, "🌕 NOVA!", "#ff8a9c", 16);
  sfx("meteor");
}
function updateGraveyard(tower, step) {
  tower.spawnCooldown -= step;
  if (tower.spawnCooldown > 0) return;
  const lv = levelData(tower);
  const alive = friendlyUnits.filter(u => u.barrackId === tower.id).length;
  if (alive < lv.zombies) {
    friendlyUnits.push({
      kind: "zombie", upgraded: false, barrackId: tower.id, squadId: tower.id,
      x: tower.x, y: tower.y + 18, rally: tower.rally,
      ox: ((alive % 3) - 1) * 16 + (Math.random() * 4 - 2), oy: (Math.floor(alive / 3) - 0.5) * 14 + (Math.random() * 4 - 2),
      hp: lv.hp, maxHp: lv.hp, speed: 42, damage: lv.dmg, range: 26, attackRate: 1.2,
      cooldown: Math.random() * 0.5, attackFlash: 0, hitFlash: 0, dead: false
    });
  }
  tower.spawnCooldown = lv.respawn;
}
function fireVampire(tower) {
  const lv = levelData(tower), dmg = towerDamage(tower), range = towerRange(tower);
  enemies.filter(e => e.hp > 0 && distance(tower, e) <= range).sort((a, b) => b.progress - a.progress).slice(0, lv.targets)
    .forEach(e => { damageEnemy(e, dmg); addZap(tower, e, "#d1304a", 0.15); addBurst(e.x, e.y, "#d1304a", 2); });
  tower.cooldown = towerRate(tower);
  tower.flash = 0.1;
}
function fireReaper(tower, target) {
  const lv = levelData(tower), dmg = towerDamage(tower), range = towerRange(tower);
  const canExec = e => e.hp > 0 && distance(tower, e) <= range && e.hp / e.maxHp <= lv.exec * (e.boss ? 0.4 : 1);
  const victim = enemies.filter(canExec).sort((a, b) => b.progress - a.progress)[0] || target;
  if (canExec(victim)) { victim.hp = 0; addText(victim.x, victim.y - victim.radius - 14, "☠", "#ff5c7a", 20); }
  else damageEnemy(victim, dmg, { pierce: true });
  addZap(tower, victim, "#aab0d8", 0.2);
  addBurst(victim.x, victim.y, "#8b8fa8", 6);
  tower.cooldown = towerRate(tower);
  tower.flash = 0.1;
}
function fireFlame(tower, target) {
  // AOE: semburan api menyapu SEMUA musuh darat dalam jangkauan tower.
  const dmg = towerDamage(tower), range = towerRange(tower);
  let hit = 0;
  for (const e of enemies) {
    if (e.hp <= 0 || e.flying || distance(tower, e) > range + e.radius) continue;
    damageEnemy(e, dmg);
    e.burnTimer = Math.max(e.burnTimer, 2);
    e.burnDps = Math.max(e.burnDps, 2 + tower.level * 1.5);
    if (hit++ < 8) addBurst(e.x, e.y, "#ff8a3d", 1);
  }
  addRing(tower.x, tower.y, range, "#ff9a3d", 0.22);
  tower.cooldown = towerRate(tower);
  tower.flash = 0.12;
}
function fireBallista(tower, target) {
  const dmg = towerDamage(tower), lv = levelData(tower);
  const range = towerRange(tower) + 60;
  const dx = target.x - tower.x, dy = target.y - tower.y, len = Math.hypot(dx, dy) || 1;
  const end = { x: tower.x + dx / len * range, y: tower.y + dy / len * range };
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const q = segmentPoint(e.x, e.y, tower, end);
    if (Math.hypot(e.x - q.x, e.y - q.y) < e.radius + 7) damageEnemy(e, dmg, { pierce: !!lv.pierce });
  }
  addZap(tower, end, "#fff1c4", 0.2);
  tower.cooldown = towerRate(tower);
  tower.flash = 0.1;
  sfx("shoot");
}

function updateBullets(step) {
  for (const bullet of bullets) {
    if (!bullet.target || bullet.target.hp <= 0) { bullet.dead = true; continue; }
    const target = bullet.target;
    const d = distance(bullet, target);
    const move = bullet.speed * step;
    if (d > move + target.radius) {
      bullet.x += (target.x - bullet.x) / d * move;
      bullet.y += (target.y - bullet.y) / d * move;
      continue;
    }
    if (bullet.type === "mortar" || bullet.type === "pumpkin") {
      const r = bullet.lvData.splash;
      enemies.forEach(e => {
        if (e.hp <= 0 || e.flying) return;
        const d = distance(e, target);
        if (d < r + e.radius) damageEnemy(e, bullet.damage * (d <= r * 0.45 ? 1 : 0.7));
      });
      addRing(target.x, target.y, r, "#ffd08a", 0.35);
      addBurst(target.x, target.y, "#e0a458", 10);
      sfx("meteor");
      bullet.dead = true; continue;
    }
    if (bullet.type === "witch") {
      const lv = bullet.lvData;
      damageEnemy(target, bullet.damage);
      poisonPuddles.push({ x: target.x, y: target.y, radius: lv.pool, timer: 3, damage: lv.dps, slow: lv.slow, color: "#b44cff" });
      addRing(target.x, target.y, lv.pool, "#b44cff", 0.3);
      bullet.dead = true; continue;
    }
    if (bullet.type === "hexer") {
      const lv = bullet.lvData;
      damageEnemy(target, bullet.damage);
      applyHex(target, lv.amp);
      addRing(target.x, target.y, target.radius + 10, "#c58bff", 0.3);
      if (lv.spread) {
        enemies.filter(e => e !== target && e.hp > 0 && distance(e, target) < 85)
          .sort((a, b) => distance(a, target) - distance(b, target)).slice(0, 2)
          .forEach(e => { applyHex(e, lv.amp * 0.6); addZap(target, e, "#c58bff", 0.2); });
      }
      bullet.dead = true; continue;
    }
    damageEnemy(target, bullet.damage, { pierce: bullet.pierce });
    if (bullet.lvData && bullet.lvData.burn) {
      target.burnTimer = Math.max(target.burnTimer, 2);
      target.burnDps = Math.max(target.burnDps, bullet.lvData.burn);
    }
    if (bullet.type === "ice") {
      applySlow(target, bullet.level);
      if (bullet.freeze && !target.boss) {
        target.freezeTimer = 1.2;
        addText(target.x, target.y - target.radius - 16, "❄", "#d9f8ff", 14);
      }
    }
    if (bullet.type === "poison") {
      target.poisonTimer = 3.2;
      target.poisonDamage = Math.max(target.poisonDamage, bullet.damage * 0.5);
      poisonPuddles.push({ x: target.x, y: target.y, radius: 44 + bullet.level * 4, timer: 2, damage: 3.5 * (1 + (bullet.level - 1) * 0.35) });
    }
    if (bullet.type === "tesla") {
      // Sambaran listrik memantul ke maksimal 2 musuh lain yang berdekatan.
      const nearby = enemies.filter(e => e !== target && e.hp > 0 && distance(e, target) < 72)
        .sort((a, b) => distance(a, target) - distance(b, target)).slice(0, 2);
      nearby.forEach((e, i) => {
        damageEnemy(e, bullet.damage * (i === 0 ? 0.65 : 0.4));
        addZap(i === 0 ? target : nearby[0], e, "#9ff1ff", 0.18);
      });
    }
    if (bullet.type === "cannon") {
      const r = 48 + bullet.level * 3;
      enemies.forEach(e => { if (e !== target && !e.flying && distance(e, target) < r) damageEnemy(e, bullet.damage * 0.45); });
      addRing(target.x, target.y, r, "#ffd08a", 0.3);
    }
    bullet.dead = true;
  }
  bullets = bullets.filter(b => !b.dead);
}

function updatePoison(step) {
  for (const puddle of poisonPuddles) {
    puddle.timer -= step;
    for (const enemy of enemies) {
      if (enemy.hp > 0 && !enemy.flying && distance(puddle, enemy) <= puddle.radius) {
        damageEnemy(enemy, puddle.damage * step, { pierce: true, dot: true });
        if (puddle.slow) setSlow(enemy, puddle.slow, 0.4);
        else {
          enemy.poisonTimer = Math.max(enemy.poisonTimer, 0.5);
          enemy.poisonDamage = Math.max(enemy.poisonDamage, 1.5);
        }
      }
    }
  }
  poisonPuddles = poisonPuddles.filter(p => p.timer > 0);
  for (const e of enemies) {
    if (e.burnTimer > 0 && e.hp > 0) {
      damageEnemy(e, e.burnDps * step, { pierce: true, dot: true });
      e.burnTimer = Math.max(0, e.burnTimer - step);
    }
    if (e.poisonTimer > 0 && e.hp > 0) {
      damageEnemy(e, e.poisonDamage * step, { pierce: true, dot: true });
      e.poisonTimer = Math.max(0, e.poisonTimer - step);
    }
  }
}

// ---------- Skill Meteor ----------
function meteorDamage() { return 110 + wave * 14; }
function castMeteor(p) {
  meteorArmed = false;
  ui.canvasWrap && ui.canvasWrap.classList.remove("armed");
  if (!waveActive || meteorCooldown > 0 || gameOver) return;
  meteors.push({ x: p.x, y: p.y, t: 0.55, max: 0.55, radius: 78 });
  meteorCooldown = METEOR_COOLDOWN;
  ui.message.textContent = "Meteor meluncur!";
  sfx("meteor");
  updateUI(); draw();
}
function updateMeteors(step) {
  for (const m of meteors) {
    m.t -= step;
    if (m.t > 0) continue;
    enemies.forEach(e => { if (e.hp > 0 && distance(e, m) <= m.radius) damageEnemy(e, meteorDamage()); });
    addRing(m.x, m.y, m.radius, "#ff9b54", 0.5);
    addBurst(m.x, m.y, "#ffb347", 18);
    m.done = true;
  }
  meteors = meteors.filter(m => !m.done);
}

// ---------- Update utama ----------
function update(dt) {
  if (paused || gameOver) return;
  const step = dt * speed;
  baseFlash = Math.max(0, baseFlash - step);
  moonFlash = Math.max(0, moonFlash - step);
  meteorCooldown = Math.max(0, meteorCooldown - step);

  if (waveActive && spawnQueue.length > 0) {
    spawnTimer -= step;
    if (spawnTimer <= 0) {
      spawnEnemy(spawnQueue.shift());
      spawnTimer = Math.max(0.38, 0.9 - wave * 0.035);
    }
  }

  updateEnemies(step);
  updateTowers(step);
  updateFriendlyUnits(step);
  updateBullets(step);
  updatePoison(step);
  updateMeteors(step);
  updateFx(step);

  for (const e of enemies) {
    if (e.hp <= 0) {
      e.dead = true; kills++;
      gold += e.reward; totalGoldEarned += e.reward;
      addText(e.x, e.y - e.radius - 6, `+${e.reward}`, "#ffd166", 13);
      addBurst(e.x, e.y, e.color, e.boss ? 16 : 7);
      sfx("kill");
    } else if (enemyArrived(e)) {
      e.dead = true;
      health--; baseFlash = 0.6;
      sfx("leak");
      if (health <= 0) { endGame(false); break; }
    }
  }
  enemies = enemies.filter(e => !e.dead);

  if (!gameOver && waveActive && spawnQueue.length === 0 && enemies.length === 0) {
    waveActive = false;
    if (wave >= MAX_WAVE) endGame(true);
    else {
      let bonus = 20 + wave * 3, mineGold = 0;
      towers.filter(t => t.type === "mine").forEach(t => {
        const inc = levelData(t).income; mineGold += inc;
        addText(t.x, t.y - 22, `+${inc}`, "#ffd166", 14);
      });
      gold += bonus + mineGold; totalGoldEarned += bonus + mineGold;
      if (wave > save.bestWave) { save.bestWave = wave; writeSave(); }
      ui.message.textContent = `Wave ${wave} selesai! Bonus ${bonus} gold${mineGold ? ` + ${mineGold} dari Mine` : ""}. Mulai wave berikutnya saat siap.`;
    }
  }
  updateUI();
}

function grantReward(cleared, reached, won) {
  if (runRewarded) return 0;
  runRewarded = true;
  const gems = Math.round((cleared * 3 + (won ? 30 : 0)) * map.gemMult);
  save.gems += gems;
  lastCoins = map.event ? Math.round(cleared * 2 + (won ? 20 : 0)) : 0;
  save.coins += lastCoins;
  if (reached > (save.mapBest[map.id] || 0)) save.mapBest[map.id] = reached;
  writeSave();
  return gems;
}

function endGame(won) {
  if (gameOver) return;
  gameOver = true; waveActive = false; meteorArmed = false;
  ui.canvasWrap && ui.canvasWrap.classList.remove("armed");
  const reached = won ? MAX_WAVE : wave;
  if (reached > save.bestWave) save.bestWave = reached;
  if (won) save.wins++;
  const gems = grantReward(won ? MAX_WAVE : Math.max(0, wave - 1), reached, won);
  ui.overlay.classList.remove("hidden");
  ui.overlayTitle.textContent = won ? "🏆 Kamu Menang!" : "💥 Markas Jatuh!";
  ui.overlayText.textContent = (won
    ? `Semua ${MAX_WAVE} wave di ${map.name} berhasil dilewati. Pertahananmu solid!`
    : `Kamu bertahan sampai wave ${wave}. Coba atur posisi tower dan upgrade lebih awal.`)
    + ` Musuh dikalahkan: ${kills}. Hadiah: +${gems} 💎${lastCoins ? ` +${lastCoins} 🎃` : ""}`;
  ui.startBtn.textContent = "Main lagi";
  ui.message.textContent = won ? "Selamat! Kamu menyelesaikan game." : "Game over. Tekan Main lagi untuk mencoba ulang.";
  sfx(won ? "win" : "lose");
  updateUI();
}

// ---------- UI ----------
function updateUI() {
  setText(ui.health, health);
  setText(ui.gold, gold);
  setText(ui.wave, `${wave} / ${MAX_WAVE}`);
  const mb = save.mapBest[map.id] || 0;
  setText(ui.best, mb >= MAX_WAVE ? "Menang ✔" : mb ? `Wave ${mb}` : "-");
  ui.waveBtn.disabled = waveActive || gameOver || wave >= MAX_WAVE;
  ui.pauseBtn.disabled = !waveActive || gameOver;
  ui.speedBtn.disabled = gameOver;
  setText(ui.speedBtn, `⏩ Kecepatan x${speed}`);
  ui.meteorBtn.disabled = !waveActive || gameOver || meteorCooldown > 0;
  setText(ui.meteorBtn, meteorArmed ? "☄️ Pilih lokasi… (Esc batal)" : meteorCooldown > 0 ? `☄️ Meteor • ${Math.ceil(meteorCooldown)}d` : "☄️ Meteor (M)");
  ui.soundBtn.textContent = save.muted ? "🔇" : "🔊";
  ui.soundBtn.setAttribute("aria-label", save.muted ? "Suara mati" : "Suara menyala");

  const hasTower = Boolean(selectedTower);
  const cost = upgradeCost(selectedTower);
  ui.upgradeBtn.disabled = !hasTower || gameOver || cost === Infinity || gold < cost;
  setText(ui.upgradeBtn, hasTower && cost !== Infinity ? `⬆ Upgrade (${cost}🪙)` : "⬆ Upgrade");
  ui.sellBtn.disabled = !hasTower || gameOver;
  setText(ui.sellBtn, hasTower ? `💰 Jual (${sellValue(selectedTower)}🪙)` : "💰 Jual");

  if (selectedTower && selectedTower.type === "barrack") {
    const next = selectedTower.level < 3 ? `Upgrade ${cost} gold` : "Level maksimum";
    setHTML(ui.selectionInfo, `<b>BARACK • Level ${selectedTower.level}</b><br>Squad: ${barrackRoster(selectedTower.level)}<br>${next}`);
  } else if (selectedTower) {
    const t = towerTypes[selectedTower.type];
    const lv = levelData(selectedTower);
    const next = selectedTower.level < maxLevel(selectedTower) ? `Upgrade ${cost} gold` : "Level maksimum";
    let detail;
    if (t.info) detail = t.info(lv);
    else if (t.income) detail = `Menghasilkan +${lv.income} gold tiap wave selesai`;
    else if (t.support) detail = `Aura radius ${lv.range} • +${Math.round(lv.dmgBuff * 100)}% damage${lv.rateBuff ? ` • +${Math.round(lv.rateBuff * 100)}% kecepatan` : ""}`;
    else {
      const dps = (towerDamage(selectedTower) / towerRate(selectedTower)).toFixed(0);
      const buff = towerBuff(selectedTower);
      detail = `Damage ${towerDamage(selectedTower)}${buff.d ? " (aura)" : ""} • Jangkauan ${towerRange(selectedTower)} • ~${dps} DPS`;
      if (lv && lv.burn) detail += ` • Bakar ${lv.burn}/dtk`;
      if (lv && lv.splash) detail += ` • Ledakan ${lv.splash}`;
      if (lv && lv.amp) detail += ` • Kutukan +${Math.round(lv.amp * 100)}% damage diterima${lv.spread ? " (menyebar)" : ""}`;
    }
    setHTML(ui.selectionInfo, `<b>${t.name} • Level ${selectedTower.level}/${maxLevel(selectedTower)}</b><br>${detail}<br>${next}`);
  } else {
    setHTML(ui.selectionInfo, "Belum ada tower dipilih.");
  }

  if (waveActive) {
    const plan = wavePlans[wave - 1];
    const left = enemies.length + spawnQueue.length;
    setHTML(ui.wavePreview, `<b>Wave ${wave} berlangsung</b> • sisa ${left} musuh`);
    ui.waveFill.style.width = `${Math.round((1 - left / plan.length) * 100)}%`;
  } else if (!gameOver && wave < MAX_WAVE) {
    const plan = wavePlans[wave];
    const hasFlyer = plan.includes("flyer");
    setHTML(ui.wavePreview, `<b>Wave ${wave + 1} berikutnya:</b> ${planText(plan)}${hasFlyer ? '<br><small>🦇 hanya bisa dilukai Archer, Ice, Magic, Sniper, Tesla, Meteor & pemanah BARACK.</small>' : ""}`);
    ui.waveFill.style.width = "0%";
  } else {
    setHTML(ui.wavePreview, gameOver ? "Permainan selesai." : "Semua wave selesai.");
  }
}

function unitStatText(key) {
  const t = towerTypes[key], max = t.maxLevel || 5;
  let main;
  if (t.note) main = t.note;
  else if (t.income) main = `Gold/wave: ${t.levels.map(l => "+" + l.income).join(" / ")}`;
  else if (t.support) main = `Aura: ${t.levels.map(l => "+" + Math.round(l.dmgBuff * 100) + "%").join(" / ")} damage`;
  else if (t.rally) main = "Pasukan: 3 → 7 prajurit";
  else if (t.debuff) main = `⚔ ${t.damage} • ◎ ${t.range} • Kutukan ${t.levels.map(l => "+" + Math.round(l.amp * 100) + "%").join(" / ")}`;
  else if (t.levels && t.levels[0].splash) main = `⚔ ${t.damage} • ◎ ${t.range} • Ledakan ${t.levels.map(l => l.splash).join(" / ")}`;
  else main = `⚔ ${t.damage} • ◎ ${t.range}`;
  return `${main} • Maks Lv ${max}`;
}
function buildTowerButtons() {
  ui.towerGrid.innerHTML = loadout.map((key, i) => {
    const t = towerTypes[key];
    return `<button class="tower-btn${key === loadout[0] ? " selected" : ""}${t.gacha ? " gacha" : ""}"${t.gacha ? ` style="--rar:${rarities[t.rarity].color}"` : ""} data-tower="${key}" title="Tombol ${i + 1}">
      <span class="tower-icon">${t.icon}</span>
      <span><b>${t.name}</b><small>${t.desc}</small><small class="stat-line">${unitStatText(key)}</small></span>
      <strong>${t.cost} 🪙</strong></button>`;
  }).join("");
  ui.towerGrid.querySelectorAll(".tower-btn").forEach(button => button.addEventListener("click", () => selectType(button.dataset.tower)));
}
function selectType(key) {
  selectedType = key;
  selectedTower = null;
  meteorArmed = false;
  document.querySelectorAll(".tower-btn").forEach(b => b.classList.toggle("selected", b.dataset.tower === key));
  updateUI(); draw();
}

// ---------- Input ----------
canvas.addEventListener("pointerdown", event => {
  if (gameOver) return;
  const p = canvasPoint(event);
  if (meteorArmed) { castMeteor(p); return; }
  // Jika menyentuh tower yang sudah ada, pilih tower tersebut.
  const found = [...towers].reverse().find(t => distance(t, p) < 22);
  if (found) {
    selectedTower = found;
    updateUI(); draw();
    return;
  }
  selectedTower = null;
  const type = towerTypes[selectedType];
  const problem = canPlace(p);
  if (problem) {
    ui.message.textContent = problem; sfx("error");
  } else if (type.unique && towers.some(t => t.type === selectedType)) {
    ui.message.textContent = `${type.name} hanya boleh 1 per permainan.`; sfx("error");
  } else if (gold < type.cost) {
    ui.message.textContent = "Gold belum cukup untuk membeli tower ini."; sfx("error");
  } else {
    const tower = { id: `tower-${Date.now()}-${Math.random()}`, x: p.x, y: p.y, type: selectedType, level: 1, cooldown: 0, spawnCooldown: 1.2, spent: type.cost, shots: 0, flash: 0 };
    if (type.rally) tower.rally = nearestPathPoint(p.x, p.y);
    tower.novaTimer = 3;
    towers.push(tower);
    gold -= type.cost;
    ui.message.textContent = `${type.name} berhasil dipasang!`;
    sfx("place");
  }
  updateUI(); draw();
});
canvas.addEventListener("pointermove", event => {
  hover = event.pointerType === "mouse" ? canvasPoint(event) : null;
  if (!animationId || paused) draw();
});
canvas.addEventListener("pointerleave", () => { hover = null; if (!animationId || paused) draw(); });

ui.startBtn.addEventListener("click", () => {
  if (gameOver) {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    resetGame();
    loop(0);
    return;
  }
  ui.overlay.classList.add("hidden");
  if (wave === 0) beginWave();
  if (!animationId) loop(0);
});
ui.waveBtn.addEventListener("click", () => { beginWave(); if (!animationId && !gameOver) loop(0); });
function togglePause() {
  if (ui.pauseBtn.disabled) return;
  paused = !paused;
  ui.pauseBtn.textContent = paused ? "▶ Lanjut" : "⏸ Jeda";
  if (!paused && !animationId) loop(0);
  draw();
}
ui.pauseBtn.addEventListener("click", togglePause);
function cycleSpeed() { if (gameOver) return; speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; updateUI(); }
ui.speedBtn.addEventListener("click", cycleSpeed);
function doUpgrade() {
  if (!selectedTower || gameOver) return;
  const cost = upgradeCost(selectedTower);
  if (cost === Infinity) {
    ui.message.textContent = selectedTower.type === "barrack" ? "BARACK sudah mencapai level maksimum." : "Tower sudah mencapai level maksimum.";
    return;
  }
  if (gold < cost) { ui.message.textContent = "Gold belum cukup untuk upgrade."; sfx("error"); return; }
  gold -= cost;
  selectedTower.level++;
  selectedTower.spent += cost;
  addRing(selectedTower.x, selectedTower.y, 30, "#ffd166", 0.4);
  ui.message.textContent = `${towerTypes[selectedTower.type].name} naik ke level ${selectedTower.level}!`;
  sfx("upgrade");
  updateUI(); draw();
}
ui.upgradeBtn.addEventListener("click", doUpgrade);
function doSell() {
  if (!selectedTower || gameOver) return;
  gold += sellValue(selectedTower);
  const sold = selectedTower;
  towers = towers.filter(t => t !== sold);
  friendlyUnits = friendlyUnits.filter(u => u.barrackId !== sold.id); // pasukan ikut hilang
  selectedTower = null;
  ui.message.textContent = "Tower dijual. Sebagian gold dikembalikan.";
  sfx("sell");
  updateUI(); draw();
}
ui.sellBtn.addEventListener("click", doSell);
function armMeteor() {
  if (ui.meteorBtn.disabled) return;
  meteorArmed = !meteorArmed;
  selectedTower = null;
  ui.canvasWrap && ui.canvasWrap.classList.toggle("armed", meteorArmed);
  ui.message.textContent = meteorArmed ? "Ketuk peta untuk menjatuhkan Meteor." : "Meteor dibatalkan.";
  updateUI(); draw();
}
ui.meteorBtn.addEventListener("click", armMeteor);
ui.soundBtn.addEventListener("click", () => { save.muted = !save.muted; writeSave(); updateUI(); });
ui.restartBtn.addEventListener("click", () => {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  resetGame();
  loop(0);
});

// Pintasan keyboard
document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!L.lobby.hidden || !ui.overlay.classList.contains("hidden")) return;
  const key = event.key.toLowerCase();
  const num = parseInt(key, 10);
  if (num >= 1 && num <= loadout.length) selectType(loadout[num - 1]);
  else if (key === "n") { if (!ui.waveBtn.disabled) ui.waveBtn.click(); }
  else if (key === "p") togglePause();
  else if (key === "f") cycleSpeed();
  else if (key === "u") doUpgrade();
  else if (key === "s" || key === "delete") doSell();
  else if (key === "m") armMeteor();
  else if (key === "escape") {
    selectedTower = null; meteorArmed = false;
    ui.canvasWrap && ui.canvasWrap.classList.remove("armed");
    updateUI(); draw();
  } else return;
  event.preventDefault();
});

// ---------- Gambar ----------
function strokePath(c) { c.beginPath(); c.moveTo(path[0].x, path[0].y); path.slice(1).forEach(p => c.lineTo(p.x, p.y)); c.stroke(); }
function drawObstacle(c, o, th) {
  const { x, y } = o;
  if (o.kind === "tree") {
    c.fillStyle = "#4b8a4b"; c.beginPath(); c.arc(x, y + 7, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2f854f"; c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#46a963"; c.beginPath(); c.arc(x - 5, y - 6, 12, 0, Math.PI * 2); c.fill();
  } else if (o.kind === "pond") {
    const rx = o.r + 7, ry = o.r * 0.75;
    c.fillStyle = th.rim; c.beginPath(); c.ellipse(x, y + 2, rx, ry, -.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = th.water; c.beginPath(); c.ellipse(x, y - 2, rx - 6, ry - 6, -.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = th.shine || "#ffffff55"; c.beginPath(); c.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.25, ry * 0.12, -.2, 0, Math.PI * 2); c.fill();
  } else if (o.kind === "cactus") {
    c.fillStyle = "#00000022"; c.beginPath(); c.ellipse(x, y + 20, 16, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3e8e4e"; c.strokeStyle = "#2c6b39"; c.lineWidth = 2;
    const rr = (px, py, w, h) => { c.beginPath(); c.roundRect ? c.roundRect(px, py, w, h, 6) : c.rect(px, py, w, h); c.fill(); c.stroke(); };
    rr(x - 6, y - 22, 12, 44); rr(x - 18, y - 8, 8, 20); rr(x + 10, y - 14, 8, 20);
    c.fillRect(x - 14, y + 2, 10, 6); c.fillRect(x + 4, y - 4, 10, 6);
  } else if (o.kind === "rock") {
    c.fillStyle = "#00000022"; c.beginPath(); c.ellipse(x, y + 14, 22, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = th.rockA || "#9a8f7e"; c.beginPath(); c.ellipse(x, y + 2, 21, 15, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = th.rockB || "#b5aa97"; c.beginPath(); c.ellipse(x - 5, y - 3, 12, 8, -.3, 0, Math.PI * 2); c.fill();
  } else if (o.kind === "tomb") {
    c.fillStyle = "#0004"; c.beginPath(); c.ellipse(x, y + 17, 16, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#6f6a7c"; c.beginPath(); c.moveTo(x - 12, y + 16); c.lineTo(x - 12, y - 6); c.arc(x, y - 6, 12, Math.PI, 0); c.lineTo(x + 12, y + 16); c.closePath(); c.fill();
    c.strokeStyle = "#4a4658"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x, y + 6); c.moveTo(x - 5, y - 2); c.lineTo(x + 5, y - 2); c.stroke();
  } else if (o.kind === "deadtree") {
    c.strokeStyle = "#1d1426"; c.lineCap = "round"; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y + 20); c.lineTo(x, y - 6); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x - 16, y - 16); c.moveTo(x, y - 4); c.lineTo(x + 15, y - 20); c.moveTo(x - 10, y - 11); c.lineTo(x - 18, y - 12); c.stroke();
    c.lineCap = "round";
  } else if (o.kind === "pumpkin") {
    c.fillStyle = "#0004"; c.beginPath(); c.ellipse(x, y + 14, 15, 4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#f28c1e"; c.beginPath(); c.ellipse(x, y + 3, 16, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#d46f0f"; c.beginPath(); c.ellipse(x - 7, y + 3, 5, 12, 0, 0, Math.PI * 2); c.ellipse(x + 7, y + 3, 5, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3f7d2f"; c.fillRect(x - 2, y - 13, 4, 7);
    c.fillStyle = "#ffe17a"; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x - 3, y - 4); c.lineTo(x - 1, y + 1); c.fill(); c.beginPath(); c.moveTo(x + 7, y); c.lineTo(x + 3, y - 4); c.lineTo(x + 1, y + 1); c.fill();
    c.fillRect(x - 6, y + 7, 12, 3);
  } else if (o.kind === "pillar") {
    c.fillStyle = "#00000028"; c.beginPath(); c.ellipse(x, y + 20, 20, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#c9ccd3"; c.fillRect(x - 11, y - 18, 22, 38);
    c.fillStyle = "#aeb2ba"; c.fillRect(x + 3, y - 18, 8, 38);
    c.fillStyle = "#dfe2e8"; c.fillRect(x - 15, y - 24, 30, 8); c.fillRect(x - 15, y + 17, 30, 7);
  }
}
function drawBase(c, th) {
  c.save();
  c.translate(BASE.x - 856, BASE.y - 245);
  if (th.base === "gate") {
    c.fillStyle = "#6b7079"; c.fillRect(824, 176, 26, 58); c.fillRect(862, 176, 26, 58);
    c.fillStyle = "#aeb3bd"; c.fillRect(827, 180, 20, 54); c.fillRect(865, 180, 20, 54);
    for (const bx of [824, 832, 840, 862, 870, 878]) { c.fillStyle = "#6b7079"; c.fillRect(bx, 168, 8, 9); }
    c.fillStyle = "#6b7079"; c.fillRect(846, 196, 20, 38);
    c.fillStyle = "#3a2a20"; c.beginPath(); c.moveTo(849, 234); c.lineTo(849, 208); c.arc(856, 208, 7, Math.PI, 0); c.lineTo(863, 234); c.closePath(); c.fill();
    c.fillStyle = "#bd554d"; c.fillRect(853, 176, 6, 18); c.beginPath(); c.moveTo(853, 194); c.lineTo(856, 199); c.lineTo(859, 194); c.fill();
  } else {
    c.fillStyle = "#9b593b"; c.fillRect(835, 183, 42, 42);
    c.fillStyle = "#e8e4d4"; c.fillRect(842, 194, 28, 31);
    c.fillStyle = "#bd554d"; c.beginPath(); c.moveTo(829, 195); c.lineTo(856, 170); c.lineTo(883, 195); c.closePath(); c.fill();
    c.fillStyle = "#4d2e22"; c.fillRect(851, 208, 10, 17);
  }
  c.restore();
  c.fillStyle = "#fff"; c.font = "bold 12px system-ui"; c.textAlign = "center"; c.textBaseline = "alphabetic";
  c.strokeStyle = "#0006"; c.lineWidth = 3; c.strokeText("BASE", BASE.x, BASE.y + 25); c.fillText("BASE", BASE.x, BASE.y + 25);
}
function paintBackground(c) {
  const th = map.theme;
  c.fillStyle = th.bg; c.fillRect(0, 0, W, H);
  // Pola dasar
  if (map.id === "castle") {
    c.strokeStyle = "#00000018"; c.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y <= H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }
  for (let i = 0; i < 130; i++) {
    const x = (i * 97 + 23) % W, y = (i * 61 + 19) % H;
    if (!pointOnPath(x, y)) {
      c.fillStyle = i % 2 ? th.spotA : th.spotB;
      c.beginPath(); c.ellipse(x, y, map.id === "forest" ? 3 : 4, map.id === "forest" ? 6 : 3, -.3, 0, Math.PI * 2); c.fill();
    }
  }
  if (map.id === "halloween") {
    c.fillStyle = "#ffffffaa";
    for (let i = 0; i < 45; i++) { c.fillRect((i * 173 + 31) % W, (i * 97 + 11) % 200, 2, 2); }
    const g = c.createRadialGradient(790, 62, 10, 790, 62, 70);
    g.addColorStop(0, "#fff3b855"); g.addColorStop(1, "#fff3b800");
    c.fillStyle = g; c.beginPath(); c.arc(790, 62, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#f7e9a8"; c.beginPath(); c.arc(790, 62, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#e3d089"; c.beginPath(); c.arc(780, 54, 6, 0, Math.PI * 2); c.arc(800, 70, 4, 0, Math.PI * 2); c.fill();
  }
  obstacles.forEach(o => drawObstacle(c, o, th));
  // Jalan
  c.lineCap = "round"; c.lineJoin = "round";
  c.strokeStyle = th.edge; c.lineWidth = 74; strokePath(c);
  c.strokeStyle = th.road; c.lineWidth = 62; strokePath(c);
  c.strokeStyle = th.dash; c.lineWidth = 3; c.setLineDash([10, 12]); strokePath(c); c.setLineDash([]);
  drawBase(c, th);
}
let bgCache = null;
function drawBackground() {
  if (!bgCache) {
    try {
      bgCache = document.createElement("canvas");
      bgCache.width = W; bgCache.height = H;
      paintBackground(bgCache.getContext("2d"));
    } catch (e) { bgCache = null; paintBackground(ctx); return; }
  }
  ctx.drawImage(bgCache, 0, 0);
}

function drawTower(tower) {
  const stats = towerTypes[tower.type];
  ctx.textBaseline = "alphabetic";
  if (tower === selectedTower) {
    if (stats.rally) {
      ctx.beginPath(); ctx.arc(tower.rally.x, tower.rally.y, LEASH, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff14"; ctx.fill(); ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#ffd166"; ctx.font = "16px system-ui"; ctx.textAlign = "center"; ctx.fillText("🚩", tower.rally.x, tower.rally.y + 5);
    } else {
      ctx.beginPath(); ctx.arc(tower.x, tower.y, towerRange(tower), 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff18"; ctx.fill(); ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  if (tower.type === "barrack") {
    ctx.fillStyle = "#6c573f"; ctx.fillRect(tower.x - 17, tower.y - 12, 34, 30);
    ctx.fillStyle = "#d6b47a"; ctx.fillRect(tower.x - 12, tower.y - 7, 24, 25);
    ctx.fillStyle = "#7c4930"; ctx.beginPath(); ctx.moveTo(tower.x - 21, tower.y - 10); ctx.lineTo(tower.x, tower.y - 28); ctx.lineTo(tower.x + 21, tower.y - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4d2e22"; ctx.fillRect(tower.x - 5, tower.y + 5, 10, 13);
  } else if (tower.type === "graveyard") {
    ctx.fillStyle = "#3b4a35"; ctx.beginPath(); ctx.ellipse(tower.x, tower.y + 14, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a8795"; ctx.beginPath(); ctx.moveTo(tower.x - 11, tower.y + 14); ctx.lineTo(tower.x - 11, tower.y - 6); ctx.arc(tower.x, tower.y - 6, 11, Math.PI, 0); ctx.lineTo(tower.x + 11, tower.y + 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#575466"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tower.x, tower.y - 9); ctx.lineTo(tower.x, tower.y + 4); ctx.moveTo(tower.x - 5, tower.y - 3); ctx.lineTo(tower.x + 5, tower.y - 3); ctx.stroke();
  } else {
    ctx.fillStyle = "#6c573f"; ctx.beginPath(); ctx.arc(tower.x, tower.y + 5, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = stats.color; ctx.beginPath(); ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tower.level >= 5 ? "#ffd166" : "#253849"; ctx.lineWidth = 3; ctx.stroke();
    if (tower.flash > 0) {
      ctx.fillStyle = "#ffffff99"; ctx.beginPath(); ctx.arc(tower.x, tower.y, 15 + tower.flash * 40, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = "19px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(stats.icon, tower.x, tower.y + 1);
  }
  if ((tower.type === "totem" || tower.type === "web") && tower !== selectedTower) {
    ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = tower.type === "web" ? "#e6e6ee" : "#8fd6a5"; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.arc(tower.x, tower.y, towerRange(tower), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
  ctx.fillStyle = "#172338"; ctx.fillRect(tower.x - 14, tower.y + 20, 28, 13);
  ctx.fillStyle = "#fff"; ctx.font = "bold 10px system-ui"; ctx.fillText("Lv" + tower.level, tower.x, tower.y + 30);
}

function drawEnemy(e) {
  const bob = Math.sin(e.t * 8) * 1.5;
  const lift = e.flying ? 14 + Math.sin(e.t * 5) * 2 : 0;
  const cx = e.x, cy = e.y - lift + (e.flying ? 0 : bob * 0.4);
  ctx.fillStyle = "#0003"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, e.radius + 2, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (e.flying) {
    const flap = Math.sin(e.t * 18) * 6;
    ctx.fillStyle = "#8d6bd0";
    ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx - 20, cy - 8 - flap); ctx.lineTo(cx - 12, cy + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 20, cy - 8 - flap); ctx.lineTo(cx + 12, cy + 6); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = e.color;
  ctx.beginPath(); ctx.ellipse(cx, cy, e.radius * (1 + bob * 0.02), e.radius * (1 - bob * 0.03), 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = e.armor >= 0.3 ? "#6b7280" : "#2a4a3c"; ctx.lineWidth = e.armor >= 0.3 ? 4 : 2; ctx.stroke();
  if (e.hitFlash > 0) { ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); ctx.arc(cx, cy, e.radius, 0, Math.PI * 2); ctx.fill(); }
  if (e.slowTimer > 0 && e.freezeTimer <= 0) {
    ctx.strokeStyle = "#8be3ff"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, e.radius + 3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (e.freezeTimer > 0) {
    ctx.fillStyle = "#bdf1ff88"; ctx.beginPath(); ctx.arc(cx, cy, e.radius + 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#9beeff"; ctx.lineWidth = 3; ctx.stroke();
  }
  if (e.hexTimer > 0) {
    ctx.strokeStyle = "#c58bff"; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, e.radius + 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (e.burnTimer > 0) { ctx.fillStyle = "#ff8a3d"; ctx.beginPath(); ctx.arc(cx - e.radius * 0.6, cy - e.radius * 0.6, 3, 0, Math.PI * 2); ctx.fill(); }
  if (e.poisonTimer > 0) { ctx.fillStyle = "#8be04a"; ctx.beginPath(); ctx.arc(cx + e.radius * 0.6, cy - e.radius * 0.6, 3, 0, Math.PI * 2); ctx.fill(); }
  // mata
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 2.6, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 2, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.type === "flyer" || e.boss ? "#c00" : "#122"; ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.1, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 2, 1.1, 0, Math.PI * 2); ctx.fill();
  if (e.boss) {
    ctx.fillStyle = "#ffd166"; ctx.beginPath();
    ctx.moveTo(cx - 10, cy - e.radius + 2); ctx.lineTo(cx - 10, cy - e.radius - 9); ctx.lineTo(cx - 4, cy - e.radius - 3);
    ctx.lineTo(cx, cy - e.radius - 11); ctx.lineTo(cx + 4, cy - e.radius - 3); ctx.lineTo(cx + 10, cy - e.radius - 9); ctx.lineTo(cx + 10, cy - e.radius + 2); ctx.closePath(); ctx.fill();
  }
  // bar nyawa
  const bw = e.boss ? 40 : 30, by = cy - e.radius - (e.boss ? 18 : 9);
  ctx.fillStyle = "#233"; ctx.fillRect(cx - bw / 2, by, bw, 4);
  ctx.fillStyle = "#ff5b63"; ctx.fillRect(cx - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), 4);
}

function drawFriendlyUnit(unit) {
  const colors = unit.kind === "zombie" ? "#7fae6b" : unit.kind === "gladiator" ? "#b64d46" : unit.kind === "knight" ? "#cbd5e1" : unit.upgraded ? "#f5d76e" : "#79b8e8";
  ctx.fillStyle = "#0003"; ctx.beginPath(); ctx.ellipse(unit.x, unit.y + 7, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors; ctx.beginPath(); ctx.arc(unit.x, unit.y, unit.kind === "gladiator" ? 10 : 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#293748"; ctx.lineWidth = 2; ctx.stroke();
  if (unit.hitFlash > 0) { ctx.fillStyle = "#ff000088"; ctx.beginPath(); ctx.arc(unit.x, unit.y, 8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#f2d0a1"; ctx.beginPath(); ctx.arc(unit.x, unit.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  if (unit.kind === "archer") {
    ctx.strokeStyle = unit.upgraded ? "#ffe17a" : "#6c472b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(unit.x + 7, unit.y, 5, -1.2, 1.2); ctx.stroke();
  } else {
    const swing = unit.attackFlash > 0 ? 6 : 0;
    ctx.strokeStyle = unit.kind === "gladiator" ? "#ffe0a3" : "#e5edf5"; ctx.lineWidth = unit.kind === "gladiator" ? 4 : 2.5;
    ctx.beginPath(); ctx.moveTo(unit.x + 4, unit.y - 4); ctx.lineTo(unit.x + 12 + swing, unit.y - 12 + swing); ctx.stroke();
  }
  ctx.fillStyle = "#263238"; ctx.fillRect(unit.x - 9, unit.y - 13, 18, 3);
  ctx.fillStyle = "#69e08b"; ctx.fillRect(unit.x - 9, unit.y - 13, 18 * Math.max(0, unit.hp / unit.maxHp), 3);
}

function drawFx() {
  for (const f of fx) {
    const a = Math.max(0, f.life / f.max);
    ctx.save(); ctx.globalAlpha = a;
    if (f.k === "text") {
      ctx.fillStyle = f.color; ctx.font = `bold ${f.size}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.strokeStyle = "#0008"; ctx.lineWidth = 3; ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
    } else if (f.k === "ring") {
      ctx.strokeStyle = f.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.15 - a * 0.4), 0, Math.PI * 2); ctx.stroke();
    } else if (f.k === "zap") {
      ctx.strokeStyle = f.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y);
      const mx = (f.x + f.x2) / 2 + (Math.random() * 10 - 5), my = (f.y + f.y2) / 2 + (Math.random() * 10 - 5);
      ctx.lineTo(mx, my); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    } else if (f.k === "spark") {
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawMeteors() {
  for (const m of meteors) {
    const k = 1 - m.t / m.max; // 0 -> 1
    ctx.save();
    ctx.strokeStyle = "#ff7a45"; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.globalAlpha = 0.5 + k * 0.4;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const rx = m.x + (1 - k) * 160, ry = m.y - (1 - k) * 320;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.arc(rx, ry, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff5a2a"; ctx.beginPath(); ctx.arc(rx, ry, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawHoverPreview() {
  if (!hover || gameOver || selectedTower || meteorArmed || !ui.overlay.classList.contains("hidden")) return;
  const type = towerTypes[selectedType];
  const problem = canPlace(hover);
  const ok = !problem && gold >= type.cost;
  ctx.save();
  if (type.range > 0) {
    ctx.beginPath(); ctx.arc(hover.x, hover.y, type.range, 0, Math.PI * 2);
    ctx.fillStyle = ok ? "#ffffff18" : "#ff5a5a18"; ctx.fill();
    ctx.strokeStyle = ok ? "#ffffff66" : "#ff7a7a99"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
  } else if (type.rally) {
    const rally = nearestPathPoint(hover.x, hover.y);
    ctx.beginPath(); ctx.arc(rally.x, rally.y, LEASH, 0, Math.PI * 2);
    ctx.fillStyle = ok ? "#ffffff12" : "#ff5a5a12"; ctx.fill();
    ctx.strokeStyle = ok ? "#ffffff55" : "#ff7a7a88"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = ok ? type.color : "#ff6b6b";
  ctx.beginPath(); ctx.arc(hover.x, hover.y, 15, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.font = "19px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
  ctx.fillText(type.icon, hover.x, hover.y + 1);
  ctx.restore();
}

function drawMeteorCursor() {
  if (!meteorArmed || !hover) return;
  ctx.save();
  ctx.strokeStyle = "#ff9b54"; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.arc(hover.x, hover.y, 78, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function draw() {
  drawBackground();
  poisonPuddles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0.2, Math.min(0.65, p.timer / 2 * 0.65));
    ctx.fillStyle = p.color || "#83e044";
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3c8c2d"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  });
  towers.forEach(drawTower);
  drawHoverPreview();
  friendlyUnits.forEach(drawFriendlyUnit);
  // musuh darat digambar dulu, lalu yang terbang di atasnya
  enemies.filter(e => !e.flying).forEach(drawEnemy);
  enemies.filter(e => e.flying).forEach(drawEnemy);
  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    if (b.type === "sniper") {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.target.y - b.y, b.target.x - b.x));
      ctx.fillRect(-9, -2, 18, 4); ctx.restore();
    } else if (b.type === "poison") {
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#eaffb7"; ctx.beginPath(); ctx.arc(b.x - 1, b.y - 1, 2, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === "tesla") {
      ctx.beginPath(); ctx.moveTo(b.x - 5, b.y - 4); ctx.lineTo(b.x + 1, b.y); ctx.lineTo(b.x - 2, b.y + 2); ctx.lineTo(b.x + 5, b.y + 5); ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.type === "cannon" ? 6 : b.type === "mortar" ? 7 : 4, 0, Math.PI * 2); ctx.fill();
    }
  });
  drawMeteors();
  drawMeteorCursor();
  drawFx();
  if (moonFlash > 0) { ctx.fillStyle = `rgba(255,60,90,${Math.min(0.3, moonFlash * 0.4)})`; ctx.fillRect(0, 0, W, H); }
  if (baseFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${Math.min(0.35, baseFlash * 0.5)})`; ctx.fillRect(0, 0, W, H); }
  // HUD kecil di kiri atas
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = "bold 15px system-ui";
  const hud = waveActive ? `WAVE ${wave}  •  sisa ${enemies.length + spawnQueue.length}` : gameOver && wave >= MAX_WAVE && health > 0 ? "SELESAI" : "SIAP";
  ctx.strokeStyle = "#000a"; ctx.lineWidth = 4; ctx.strokeText(hud, 16, 26);
  ctx.fillStyle = "#fff"; ctx.fillText(hud, 16, 26);
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  draw();
  if (!gameOver) animationId = requestAnimationFrame(loop);
  else animationId = null;
}

// ===============================
// LOBBY: pilih map, atur 5 slot pasukan, dan toko
// ===============================
const L = {
  lobby: $("lobby"), gameView: $("gameView"), gems: $("gems"), mapGrid: $("mapGrid"), slotRow: $("slotRow"),
  squadGrid: $("squadGrid"), shopGrid: $("shopGrid"), playBtn: $("playBtn"), summary: $("lobbySummary"), toast: $("lobbyToast"),
  tabs: document.querySelectorAll("[data-tab]"), panels: document.querySelectorAll("[data-panel]"),
  patchList: $("patchList"), patchBadge: $("patchBadge"), verTag: $("verTag"),
  gachaTab: $("gachaTab"), coinBadge: $("coinBadge"), coins: $("coins"), eventTimer: $("eventTimer"), pull1: $("pull1"), pull10: $("pull10"),
  pityInfo: $("pityInfo"), gachaResults: $("gachaResults"), gachaTable: $("gachaTable")
};
const MAX_SLOTS = 5;

function sanitizeSave() {
  save.owned = Array.from(new Set(["archer"].concat((save.owned || []).filter(k => towerTypes[k]))));
  save.loadout = Array.from(new Set((save.loadout || []).filter(k => save.owned.includes(k)))).slice(0, MAX_SLOTS);
  if (!save.loadout.length) save.loadout = ["archer"];
  if (!mapDefs[save.map] || (mapDefs[save.map].event && !eventActive())) save.map = "forest";
  if (typeof save.gems !== "number" || save.gems < 0) save.gems = 0;
  save.mapBest = Object.assign({}, save.mapBest);
  if (typeof save.coins !== "number" || save.coins < 0) save.coins = 0;
  save.gacha = Object.assign({ pRare: 0, pLegend: 0, pMyth: 0, pulls: 0 }, save.gacha);
}
function lobbyToast(text) {
  L.toast.textContent = text;
  clearTimeout(lobbyToast.t);
  lobbyToast.t = setTimeout(() => { L.toast.textContent = ""; }, 3500);
}

const thumbs = {};
function mapThumb(id) {
  if (thumbs[id]) return thumbs[id];
  const prev = map.id;
  setMap(id);
  const big = document.createElement("canvas"); big.width = W; big.height = H;
  paintBackground(big.getContext("2d"));
  const th = document.createElement("canvas"); th.width = 300; th.height = 173; th.className = "map-thumb";
  th.getContext("2d").drawImage(big, 0, 0, 300, 173);
  setMap(prev);
  thumbs[id] = th;
  return th;
}

function renderMaps() {
  L.mapGrid.innerHTML = "";
  mapKeys.forEach(id => {
    const m = mapDefs[id], best = save.mapBest[id] || 0, locked = m.event && !eventActive();
    const card = document.createElement("button");
    card.className = "map-card" + (save.map === id ? " selected" : "") + (m.event ? " event" : "") + (locked ? " locked" : "");
    card.dataset.map = id;
    card.appendChild(mapThumb(id));
    const info = document.createElement("div");
    info.className = "map-info";
    info.innerHTML = `<b>${m.icon} ${m.name}</b><span class="stars">${"★".repeat(m.stars)}${"☆".repeat(Math.max(0, 4 - m.stars))}</span>
      <p>${m.desc}</p>
      <small>${m.event ? (locked ? "🎃 Event berakhir • " : `🎃 EVENT (sisa ${eventDaysLeft()} hari) • Dapat Halloween Coin • `) : ""}Hadiah 💎 ×${m.gemMult} • ${best >= MAX_WAVE ? "Rekor: menang ✔" : best ? "Rekor: wave " + best : "Belum dimainkan"}</small>`;
    card.appendChild(info);
    L.mapGrid.appendChild(card);
  });
}

function rarityTag(t) { const r = rarities[t.rarity]; return ` <span class="rar-tag" style="--rar:${r.color}">${r.name}</span>`; }
function mysteryCard() {
  return `<div class="unit-card locked gacha" style="--rar:${rarities.secret.color}"><div class="unit-icon">❓</div>
    <div class="unit-body"><b>???</b> <span class="rar-tag" style="--rar:${rarities.secret.color}">Secret</span><small>Unit rahasia. Mungkin muncul di Gacha Halloween…</small></div></div>`;
}
function unitCard(key, mode) {
  const t = towerTypes[key];
  const owned = save.owned.includes(key), used = save.loadout.includes(key);
  let action;
  if (mode === "shop") {
    action = owned ? `<button class="chip-btn" disabled>✔ Dimiliki</button>`
      : `<button class="chip-btn buy" data-act="buy" data-key="${key}" ${save.gems < t.gem ? "disabled" : ""}>Beli ${t.gem} 💎</button>`;
  } else if (!owned) {
    action = t.gacha ? `<button class="chip-btn" data-act="gogacha">🎃 Dari Gacha</button>` : `<button class="chip-btn" data-act="goshop" data-key="${key}">🔒 Beli di Toko</button>`;
  } else {
    action = `<button class="chip-btn ${used ? "on" : ""}" data-act="toggle" data-key="${key}">${used ? "✔ Dipakai" : "Pakai"}</button>`;
  }
  return `<div class="unit-card${owned ? "" : " locked"}${used && mode === "squad" ? " used" : ""}${t.gacha ? " gacha" : ""}"${t.gacha ? ` style="--rar:${rarities[t.rarity].color}"` : ""}>
    <div class="unit-icon">${t.icon}</div>
    <div class="unit-body"><b>${t.name}</b>${t.gacha ? rarityTag(t) : ""}<small>${t.desc}</small><small class="stat-line">${unitStatText(key)}</small>
    <small class="stat-line">Harga di game: ${t.cost} 🪙</small></div>${action}</div>`;
}
function renderSquad() {
  const slots = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const key = save.loadout[i];
    slots.push(key
      ? `<button class="slot filled" data-act="toggle" data-key="${key}" title="Klik untuk melepas"><span>${towerTypes[key].icon}</span><small>${towerTypes[key].name}</small></button>`
      : `<div class="slot"><span>＋</span><small>Kosong</small></div>`);
  }
  L.slotRow.innerHTML = slots.join("");
  L.squadGrid.innerHTML = shopKeys.map(k => unitCard(k, "squad")).join("")
    + gachaKeys.map(k => (towerTypes[k].rarity === "secret" && !save.owned.includes(k)) ? mysteryCard() : unitCard(k, "squad")).join("");
}
function renderShop() { L.shopGrid.innerHTML = shopKeys.slice().sort((a, b) => towerTypes[a].gem - towerTypes[b].gem).map(k => unitCard(k, "shop")).join(""); }
// ---------- Gacha ----------
function rarityRank(r) { return rarityOrder.indexOf(r); }
function rollRarity() {
  const g = save.gacha;
  g.pRare++; g.pLegend++; g.pMyth++;
  let r = "common";
  if (g.pMyth >= 120) r = "mythical";
  else if (g.pLegend >= 40) r = "legend";
  else {
    const total = rarityOrder.reduce((sum, k) => sum + rarities[k].weight, 0);
    let x = Math.random() * total;
    for (const k of rarityOrder) { x -= rarities[k].weight; if (x < 0) { r = k; break; } }
  }
  if (g.pRare >= 10 && rarityRank(r) < rarityRank("rare")) r = "rare";
  if (rarityRank(r) >= 2) g.pRare = 0;
  if (rarityRank(r) >= 3) g.pLegend = 0;
  if (rarityRank(r) >= 4) g.pMyth = 0;
  return r;
}
function pullGacha(n) {
  if (!eventActive()) { lobbyToast("Event sudah berakhir."); return []; }
  const cost = n === 10 ? PULL10_COST : PULL_COST * n;
  if (save.coins < cost) { lobbyToast("Halloween Coin belum cukup. Main di Lembah Hantu untuk mendapatkannya."); return []; }
  save.coins -= cost;
  const results = [];
  for (let i = 0; i < n; i++) {
    const r = rollRarity();
    const pool = gachaKeys.filter(k => towerTypes[k].rarity === r);
    const key = pool[Math.floor(Math.random() * pool.length)];
    const dupe = save.owned.includes(key);
    if (dupe) save.coins += rarities[r].refund; else save.owned.push(key);
    save.gacha.pulls++;
    results.push({ key, r, dupe });
  }
  writeSave();
  renderLobby();
  showPullResults(results);
  const best = results.reduce((a, b) => (rarityRank(b.r) > rarityRank(a.r) ? b : a), results[0]);
  if (best.r === "secret") lobbyToast(`🌕 SECRET! Kamu mendapat ${towerTypes[best.key].name}!`);
  else if (rarityRank(best.r) >= 3) lobbyToast(`✨ ${rarities[best.r].name}: ${towerTypes[best.key].name}!`);
  return results;
}
function showPullResults(results) {
  L.gachaResults.innerHTML = results.map((x, i) => {
    const t = towerTypes[x.key], r = rarities[x.r];
    return `<div class="pull-card${x.r === "secret" ? " secret-glow" : ""}" style="--rar:${r.color};animation-delay:${i * 0.12}s">
      <div class="pc-icon">${t.icon}</div><b>${t.name}</b><small style="color:${r.color}">${r.name}</small>
      <em>${x.dupe ? `Duplikat +${r.refund} 🎃` : "✨ BARU!"}</em></div>`;
  }).join("");
}
function renderGacha() {
  const on = eventActive();
  L.gachaTab.hidden = !on; L.coinBadge.hidden = !on;
  setText(L.coins, save.coins);
  if (!on) return;
  setText(L.eventTimer, `Event ${EVENT.name} berakhir ${EVENT.end} • sisa ${eventDaysLeft()} hari`);
  L.pull1.disabled = save.coins < PULL_COST; L.pull10.disabled = save.coins < PULL10_COST;
  const g = save.gacha;
  setHTML(L.pityInfo, `Pity: <b>Rare+</b> dalam ${Math.max(1, 10 - g.pRare)} tarikan • <b>Legend+</b> dalam ${Math.max(1, 40 - g.pLegend)} • <b>Mythical+</b> dalam ${Math.max(1, 120 - g.pMyth)} • total tarikan: ${g.pulls}`);
  const total = rarityOrder.reduce((sum, k) => sum + rarities[k].weight, 0);
  setHTML(L.gachaTable, rarityOrder.map(rk => {
    const r = rarities[rk];
    const units = gachaKeys.filter(k => towerTypes[k].rarity === rk).map(k => {
      const owned = save.owned.includes(k), t = towerTypes[k];
      return rk === "secret" && !owned ? "❓ ???" : `${t.icon} ${t.name}${owned ? " ✔" : ""}`;
    }).join(", ");
    return `<div class="gt-row"><span class="gt-name" style="color:${r.color}">${r.name}</span><span class="gt-rate">${(r.weight / total * 100).toFixed(1).replace(".", ",")}%</span><span class="gt-units">${units}</span><span class="gt-refund">dupe +${r.refund}🎃</span></div>`;
  }).join(""));
}
function renderPatch() {
  L.patchList.innerHTML = patchNotes.map((p, i) => `<article class="patch${i === 0 ? " latest" : ""}">
    <header><span class="ver">v${p.version}</span><b>${p.title}</b>${i === 0 ? '<span class="new-tag">TERBARU</span>' : ""}<small>${p.date}</small></header>
    ${p.sections.map(sec => `<h4>${sec.label}</h4><ul>${sec.items.map(it => `<li>${it}</li>`).join("")}</ul>`).join("")}
  </article>`).join("");
  L.patchBadge.hidden = save.seenPatch === GAME_VERSION;
  if (L.verTag) L.verTag.textContent = `v${GAME_VERSION}`;
}
function renderLobby() {
  sanitizeSave();
  renderPatch();
  renderGacha();
  setText(L.gems, save.gems);
  renderMaps(); renderSquad(); renderShop();
  const m = mapDefs[save.map];
  L.summary.innerHTML = `<b>${m.icon} ${m.name}</b> • Pasukan: ${save.loadout.map(k => towerTypes[k].icon).join(" ")} (${save.loadout.length}/${MAX_SLOTS})`;
}

function toggleLoad(key) {
  if (save.loadout.includes(key)) {
    if (save.loadout.length <= 1) { lobbyToast("Minimal harus ada 1 unit di slot."); return; }
    save.loadout = save.loadout.filter(k => k !== key);
  } else if (save.loadout.length >= MAX_SLOTS) {
    lobbyToast(`Slot penuh (${MAX_SLOTS}). Lepas satu unit dulu.`); return;
  } else save.loadout.push(key);
  writeSave(); renderLobby();
}
function buyUnit(key) {
  const t = towerTypes[key];
  if (save.owned.includes(key)) return;
  if (save.gems < t.gem) { lobbyToast("Gems belum cukup. Menangkan wave untuk dapat 💎."); return; }
  save.gems -= t.gem;
  save.owned.push(key);
  let msg = `${t.name} dibeli!`;
  if (save.loadout.length < MAX_SLOTS) { save.loadout.push(key); msg += " Otomatis dipasang di slot."; }
  else msg += " Slot penuh, atur di tab Pasukan.";
  writeSave(); renderLobby(); lobbyToast(msg);
}
function switchTab(name) {
  if (name === "patch" && save.seenPatch !== GAME_VERSION) { save.seenPatch = GAME_VERSION; writeSave(); L.patchBadge.hidden = true; }
  L.tabs.forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  L.panels.forEach(p => { p.hidden = p.dataset.panel !== name; });
}
L.tabs.forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
L.mapGrid.addEventListener("click", e => {
  const card = e.target.closest("[data-map]");
  if (!card) return;
  const mid = card.dataset.map;
  if (mapDefs[mid].event && !eventActive()) { lobbyToast("Event sudah berakhir. Map ini tidak tersedia."); return; }
  save.map = mid; writeSave(); renderLobby();
});
function unitClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const key = b.dataset.key;
  if (b.dataset.act === "toggle") toggleLoad(key);
  else if (b.dataset.act === "buy") buyUnit(key);
  else if (b.dataset.act === "goshop") switchTab("shop");
  else if (b.dataset.act === "gogacha") { if (eventActive()) switchTab("gacha"); else lobbyToast("Event sudah berakhir."); }
}
L.squadGrid.addEventListener("click", unitClick);
L.slotRow.addEventListener("click", unitClick);
L.shopGrid.addEventListener("click", unitClick);

function showLobby() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  document.body.classList.add("in-lobby");
  L.lobby.hidden = false; L.gameView.hidden = true;
  renderLobby();
}
function startRun() {
  sanitizeSave();
  loadout = save.loadout.slice();
  setMap(save.map);
  buildTowerButtons();
  document.body.classList.remove("in-lobby");
  L.lobby.hidden = true; L.gameView.hidden = false;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  resetGame();
}
function exitToLobby() {
  if (wave > 0 && !gameOver && !runRewarded) {
    if (!window.confirm("Keluar ke lobby? Permainan ini berakhir, hadiah dihitung dari wave yang sudah selesai.")) return;
    const cleared = waveActive ? wave - 1 : wave;
    const gems = grantReward(cleared, wave, false);
    showLobby();
    lobbyToast(gems ? `+${gems} 💎${lastCoins ? ` +${lastCoins} 🎃` : ""} dari ${cleared} wave yang selesai.` : "");
    return;
  }
  showLobby();
}
L.pull1.addEventListener("click", () => pullGacha(1));
L.pull10.addEventListener("click", () => pullGacha(10));
L.playBtn.addEventListener("click", startRun);
ui.lobbyBtn.addEventListener("click", exitToLobby);
ui.overlayLobbyBtn.addEventListener("click", exitToLobby);

ui.canvasWrap = canvas.parentElement;
sanitizeSave();
setMap(save.map);
loadout = save.loadout.slice();
buildTowerButtons();
resetGame();
showLobby();
if (eventActive() && !save.seenEvent) {
  save.seenEvent = true; writeSave();
  lobbyToast(`🎃 Event ${EVENT.name} dimulai! Kamu mendapat ${save.coins} Halloween Coin gratis. Buka tab Gacha.`);
}
