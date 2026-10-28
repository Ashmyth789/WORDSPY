const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const html = fs.readFileSync(path.join(__dirname, 'index.html'));
const WORDS = {
  Food: ["Biryani", "Samosa", "Dosa", "Idli", "Vada pav", "Pani puri", "Butter chicken", "Paneer tikka", "Chole bhature", "Jalebi", "Gulab jamun", "Rasgulla", "Masala chai", "Lassi", "Pav bhaji", "Dhokla", "Poha", "Upma", "Paratha", "Rajma chawal", "Khichdi", "Naan", "Pakora", "Kulfi", "Momos", "Bhel puri", "Rasmalai", "Maggi", "Filter coffee", "Thali"],
  Animals: ["Bengal tiger", "Indian elephant", "Peacock", "King cobra", "Camel", "Cow", "Buffalo", "Monkey", "Leopard", "Rhino", "Mongoose", "Parrot", "Sparrow", "Crow", "Kingfisher", "Snow leopard", "Asiatic lion", "Goat", "Stray dog", "Squirrel", "Donkey", "Horse", "Pigeon", "Bat", "Lizard", "Cat", "Owl", "Bull", "Turtle", "Gangetic dolphin"],
  Places: ["Taj Mahal", "Red Fort", "India Gate", "Gateway of India", "Marine Drive", "Goa beach", "Kerala backwaters", "Varanasi ghat", "Golden Temple", "Jaipur palace", "Ladakh", "Rishikesh", "Ajanta caves", "Charminar", "Mysore Palace", "Railway station", "Local train", "Cricket stadium", "Mandir", "Chai tapri", "Sabzi mandi", "Bollywood studio", "Hill station", "Dhaba", "Wedding hall", "Metro station", "Bus stand", "Kumbh Mela", "Lotus Temple", "Hawa Mahal"],
  Objects: ["Pressure cooker", "Chappal", "Dupatta", "Diya", "Agarbatti", "Tiffin box", "Steel glass", "Hand fan", "Umbrella", "Sewing machine", "Bindi", "Kurta", "Saree", "Turban", "Cricket bat", "Auto rickshaw", "Bicycle", "Ceiling fan", "Matka", "Tabla", "Sitar", "Kite", "Bangles", "Thermos", "Remote control", "Rolling pin", "Newspaper", "Padlock", "Mosquito net", "Gas cylinder"],
  Jobs: ["Chaiwala", "Auto driver", "Dabbawala", "Cricketer", "Bollywood actor", "Doctor", "Engineer", "Teacher", "Farmer", "Tailor", "Barber", "Sabziwala", "Pandit", "Policeman", "Postman", "Shopkeeper", "Cook", "Mechanic", "Carpenter", "Electrician", "Plumber", "Judge", "Lawyer", "Astronaut", "Pilot", "Singer", "Photographer", "Journalist", "Watchman", "Milkman"],
  Activities: ["Cricket", "Kite flying", "Holi", "Garba", "Bhangra", "Yoga", "Kabaddi", "Carrom", "Ludo", "Antakshari", "Baraat", "Bargaining", "Train journey", "Pilgrimage", "Rakhi", "Diwali", "Rangoli", "Meditation", "Chess", "Kho-kho", "Trekking", "Camping", "Rafting", "Swimming", "Rowing", "Dandiya", "Bollywood dance", "Wedding shopping", "Road trip", "Gully cricket"]
};
const PAIRS = {
  Food: [["Tea", "Coffee"], ["Biryani", "Pulao"], ["Samosa", "Kachori"], ["Dosa", "Uttapam"], ["Idli", "Dhokla"], ["Gulab jamun", "Rasgulla"], ["Jalebi", "Imarti"], ["Naan", "Roti"], ["Paratha", "Puri"], ["Lassi", "Chaas"], ["Pav bhaji", "Vada pav"], ["Pani puri", "Bhel puri"], ["Kulfi", "Ice cream"], ["Maggi", "Noodles"], ["Poha", "Upma"]],
  Animals: [["Tiger", "Lion"], ["Cow", "Buffalo"], ["Crow", "Raven"], ["Peacock", "Parrot"], ["Leopard", "Cheetah"], ["Cobra", "Python"], ["Sparrow", "Pigeon"], ["Monkey", "Langur"], ["Camel", "Horse"], ["Goat", "Sheep"], ["Rabbit", "Squirrel"], ["Elephant", "Rhino"], ["Frog", "Toad"], ["Crocodile", "Alligator"]],
  Places: [["Taj Mahal", "Red Fort"], ["Goa", "Kerala"], ["Temple", "Palace"], ["Railway station", "Bus stand"], ["Metro", "Local train"], ["School", "College"], ["Beach", "Lake"], ["Mall", "Sabzi mandi"], ["Hospital", "Clinic"], ["Mountain", "Hill station"], ["Cinema", "Theatre"], ["Delhi", "Mumbai"], ["Dhaba", "Restaurant"], ["Library", "Bookstore"]],
  Objects: [["Pen", "Pencil"], ["Chappal", "Shoes"], ["Saree", "Lehenga"], ["Kurta", "Shirt"], ["Diya", "Candle"], ["Fan", "AC"], ["Pressure cooker", "Kadhai"], ["Steel glass", "Cup"], ["Bicycle", "Scooter"], ["Tabla", "Dholak"], ["Sitar", "Guitar"], ["Bangles", "Rings"], ["Watch", "Clock"], ["Cricket bat", "Hockey stick"], ["Kite", "Balloon"]],
  Jobs: [["Doctor", "Nurse"], ["Chef", "Baker"], ["Teacher", "Professor"], ["Judge", "Lawyer"], ["Barber", "Tailor"], ["Plumber", "Electrician"], ["Auto driver", "Taxi driver"], ["Postman", "Courier boy"], ["Singer", "Actor"], ["Pilot", "Astronaut"], ["Farmer", "Gardener"], ["Policeman", "Soldier"], ["Chaiwala", "Waiter"], ["Carpenter", "Mechanic"]],
  Activities: [["Cricket", "Baseball"], ["Holi", "Diwali"], ["Garba", "Bhangra"], ["Yoga", "Meditation"], ["Cooking", "Baking"], ["Ludo", "Carrom"], ["Kho-kho", "Kabaddi"], ["Swimming", "Diving"], ["Camping", "Trekking"], ["Chess", "Carrom"], ["Painting", "Rangoli"], ["Singing", "Dancing"], ["Antakshari", "Karaoke"], ["Rafting", "Boating"]]
};
const rand = a => a[Math.floor(Math.random() * a.length)];
const rooms = new Map();

const server = http.createServer((req, res) => {
  if (req.url === '/health') return res.end('ok');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
const wss = new WebSocketServer({ server });

function send(p, obj) { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(obj)); }

function broadcast(r) {
  const list = [...r.players].map(([k, v]) => ({ name: v.name, on: !!v.ws, host: k === r.host }));
  for (const [k, p] of r.players) {
    let role = null;
    if (r.phase !== 'lobby') role = !r.dealt.has(k) ? 'waiting' : (k === r.imp && r.mode !== 'similar' ? 'imposter' : 'word');
    send(p, {
      t: 'state', code: r.code, host: k === r.host, phase: r.phase, round: r.round, players: list,
      role, cats: Object.keys(WORDS),
      cat: role && role !== 'waiting' ? r.cat : null,
      word: role === 'word' ? (k === r.imp ? r.word2 : r.word) : null,
      starter: r.phase === 'lobby' ? null : r.starter,
      reveal: r.phase === 'revealed' ? { imp: r.players.get(r.imp)?.name, word: r.word, word2: r.mode === 'similar' ? r.word2 : null } : null
    });
  }
}

function deal(r, cat, mode) {
  const conn = [...r.players].filter(([, v]) => v.ws).map(([k]) => k);
  if (conn.length < 3) return;
  const c = WORDS[cat] ? cat : rand(Object.keys(WORDS));
  r.cat = c; r.mode = mode === 'similar' ? 'similar' : 'classic';
  if (r.mode === 'similar') {
    let pp = PAIRS[c].filter(p => !r.used.includes(p[0]));
    if (!pp.length) { r.used = []; pp = PAIRS[c]; }
    const orig = rand(pp); r.used.push(orig[0]);
    const pr = Math.random() < 0.5 ? orig : [orig[1], orig[0]];
    r.word = pr[0]; r.word2 = pr[1]; // group gets word, imposter gets word2
  } else {
    let pool = WORDS[c].filter(w => !r.used.includes(w));
    if (!pool.length) { r.used = []; pool = WORDS[c]; }
    r.word = rand(pool); r.used.push(r.word); r.word2 = null;
  }
  r.imp = rand(conn); r.dealt = new Set(conn);
  r.starter = r.players.get(rand(conn)).name;
  r.round++; r.phase = 'playing';
  broadcast(r);
}

wss.on('connection', ws => {
  let r = null, pid = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join') {
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code) return;
      pid = String(m.pid || '').slice(0, 40);
      const nm = String(m.name || 'Player').trim().slice(0, 20) || 'Player';
      r = rooms.get(code);
      if (!r) { r = { code, players: new Map(), host: null, phase: 'lobby', round: 0, used: [], dealt: new Set() }; rooms.set(code, r); }
      clearTimeout(r.timer);
      const p = r.players.get(pid);
      if (p) { if (p.ws && p.ws !== ws) p.ws.close(); p.ws = ws; p.name = nm; }
      else r.players.set(pid, { name: nm, ws });
      if (!r.host || !r.players.get(r.host)?.ws) r.host = pid;
      return broadcast(r);
    }
    if (!r || pid !== r.host) return; // only the host can run the game
    if (m.t === 'start') deal(r, m.cat, m.mode);
    else if (m.t === 'reveal' && r.phase === 'playing') { r.phase = 'revealed'; broadcast(r); }
    else if (m.t === 'lobby') { r.phase = 'lobby'; broadcast(r); }
  });

  ws.on('close', () => {
    if (!r) return;
    const p = r.players.get(pid);
    if (!p || p.ws !== ws) return;
    p.ws = null;
    if (r.phase === 'lobby') r.players.delete(pid);
    if (r.host === pid) { const n = [...r.players].find(([, v]) => v.ws); if (n) r.host = n[0]; }
    if (![...r.players.values()].some(v => v.ws)) r.timer = setTimeout(() => rooms.delete(r.code), 3600000);
    broadcast(r);
  });
});

setInterval(() => { wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('WordSpy running on port ' + PORT));
