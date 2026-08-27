const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

// ============ KONFIGÜRASYON ============
const CONFIG = {
    JWT_SECRET: 'pragmatic-casino-2026-super-secret-key',
    SESSION_SECRET: 'session-ultra-secret-2026',
    PORT: process.env.PORT || 3000,
    INITIAL_BALANCE: 100000,
    VIP_THRESHOLDS: [0, 10000, 50000, 100000, 500000, 1000000],
    VIP_NAMES: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite'],
    MAX_BET: 100000,
    MIN_BET: 1,
    RTP: 0.96 // Return to Player oranı
};

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.static('public'));
app.use(session({
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, 
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
    }
}));

// ============ VERİTABANI ============
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'data', 'transactions.json');
const BONUSES_FILE = path.join(__dirname, 'data', 'bonuses.json');

// Veritabanı işlemleri
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(USERS_FILE, JSON.stringify({}));
        }
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch { return {}; }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadTransactions() {
    try {
        if (!fs.existsSync(TRANSACTIONS_FILE)) {
            fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify({}));
        }
        return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE));
    } catch { return {}; }
}

function saveTransactions(transactions) {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
}

// ============ OYUN MOTORU ============
class GameEngine {
    
    // === SLOT MACHINE (Pragmatic Play Style) ===
    static spinSlots(bet) {
        const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰', '🔔', '💰'];
        const reels = [];
        const result = [];
        
        // 5 makaralı, 3 sıralı slot
        for (let reel = 0; reel < 5; reel++) {
            const spin = [];
            for (let row = 0; row < 3; row++) {
                spin.push(symbols[Math.floor(Math.random() * symbols.length)]);
            }
            reels.push(spin);
        }
        
        // Kazanç hesaplama (gelişmiş algoritma)
        let win = 0;
        let freeSpins = 0;
        let bonusGame = false;
        let multipliers = [];
        
        // Yatay kazanç kontrolü
        for (let row = 0; row < 3; row++) {
            const rowSymbols = reels.map(reel => reel[row]);
            const counts = {};
            rowSymbols.forEach(s => counts[s] = (counts[s] || 0) + 1);
            
            for (const [symbol, count] of Object.entries(counts)) {
                if (count >= 3) {
                    const multiplier = getSymbolMultiplier(symbol, count);
                    win += bet * multiplier;
                    multipliers.push(multiplier);
                }
            }
        }
        
        // Scatter kontrolü (free spin)
        const scatterCount = reels.flat().filter(s => s === '🎰').length;
        if (scatterCount >= 3) {
            freeSpins = scatterCount * 5;
            bonusGame = true;
        }
        
        // Jackpot kontrolü
        if (reels.flat().every(s => s === '7️⃣')) {
            win += bet * 500;
        }
        
        // RTP (Return to Player) uygulaması
        if (win > 0 && Math.random() < CONFIG.RTP) {
            win = Math.floor(win * 1.1);
        }
        
        return {
            reels,
            win: Math.floor(win),
            freeSpins,
            bonusGame,
            multipliers,
            isJackpot: win > bet * 100
        };
    }
    
    // === DICE GAME (Gelişmiş Zar) ===
    static rollDice(bet, prediction) {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;
        
        let win = 0;
        let multiplier = 0;
        let winCondition = '';
        
        // Tahmin sistemleri
        const predictions = {
            'even': { condition: total % 2 === 0, mult: 2 },
            'odd': { condition: total % 2 === 1, mult: 2 },
            'over7': { condition: total > 7, mult: 1.8 },
            'under7': { condition: total < 7, mult: 1.8 },
            'seven': { condition: total === 7, mult: 5 },
            'double': { condition: dice1 === dice2, mult: 6 },
            'triple': { condition: dice1 === dice2 && dice1 === 6, mult: 10 },
            'small': { condition: total >= 2 && total <= 6, mult: 1.5 },
            'big': { condition: total >= 8 && total <= 12, mult: 1.5 },
            'exact_2': { condition: total === 2, mult: 15 },
            'exact_3': { condition: total === 3, mult: 12 },
            'exact_4': { condition: total === 4, mult: 10 },
            'exact_5': { condition: total === 5, mult: 8 },
            'exact_6': { condition: total === 6, mult: 7 },
            'exact_7': { condition: total === 7, mult: 6 },
            'exact_8': { condition: total === 8, mult: 7 },
            'exact_9': { condition: total === 9, mult: 8 },
            'exact_10': { condition: total === 10, mult: 10 },
            'exact_11': { condition: total === 11, mult: 12 },
            'exact_12': { condition: total === 12, mult: 15 }
        };
        
        const pred = predictions[prediction];
        if (pred && pred.condition) {
            multiplier = pred.mult;
            win = bet * multiplier;
            winCondition = prediction;
        }
        
        return {
            dice1,
            dice2,
            total,
            win: Math.floor(win),
            multiplier,
            winCondition,
            isWin: win > 0
        };
    }
    
    // === BLACKJACK (Tam Sürüm) ===
    static playBlackjack(bet, playerHand, dealerHand, action) {
        const deck = this.generateDeck();
        let playerCards = playerHand || [];
        let dealerCards = dealerHand || [];
        
        // Yeni oyun
        if (playerCards.length === 0) {
            playerCards = [deck.pop(), deck.pop()];
            dealerCards = [deck.pop(), deck.pop()];
        }
        
        // Oyuncu hamlesi
        if (action === 'hit') {
            playerCards.push(deck.pop());
        } else if (action === 'double') {
            playerCards.push(deck.pop());
            action = 'stand';
        }
        
        const playerScore = this.calculateBlackjackScore(playerCards);
        const dealerScore = this.calculateBlackjackScore(dealerCards);
        
        let win = 0;
        let gameStatus = 'playing';
        let message = '';
        
        // Dealer oyunu
        if (action === 'stand') {
            while (this.calculateBlackjackScore(dealerCards) < 17) {
                dealerCards.push(deck.pop());
            }
            
            const finalDealerScore = this.calculateBlackjackScore(dealerCards);
            
            if (playerScore > 21) {
                win = -bet;
                gameStatus = 'lose';
                message = 'Bust! Kaybettin.';
            } else if (finalDealerScore > 21) {
                win = bet * 1.5;
                gameStatus = 'win';
                message = 'Dealer bust! Kazandın!';
            } else if (playerScore > finalDealerScore) {
                win = bet * 1.5;
                gameStatus = 'win';
                message = 'Kazandın!';
            } else if (playerScore === finalDealerScore) {
                win = 0;
                gameStatus = 'push';
                message = 'Berabere!';
            } else {
                win = -bet;
                gameStatus = 'lose';
                message = 'Dealer kazandı.';
            }
        }
        
        return {
            playerCards,
            dealerCards,
            playerScore,
            dealerScore: this.calculateBlackjackScore(dealerCards),
            win: Math.floor(win),
            gameStatus,
            message,
            canHit: playerScore < 21 && action !== 'stand'
        };
    }
    
    // === WHEEL OF FORTUNE (Çarkıfelek) ===
    static spinWheel(bet, prediction) {
        const segments = [
            { value: 1, color: '#ff4444', label: '1x' },
            { value: 2, color: '#4444ff', label: '2x' },
            { value: 3, color: '#44ff44', label: '3x' },
            { value: 5, color: '#ff44ff', label: '5x' },
            { value: 10, color: '#ffff44', label: '10x' },
            { value: 20, color: '#44ffff', label: '20x' },
            { value: 50, color: '#ff8800', label: '50x' },
            { value: 100, color: '#ff0088', label: '100x' },
            { value: 0, color: '#444444', label: 'LOSE' },
            { value: 0, color: '#444444', label: 'LOSE' },
            { value: 0, color: '#444444', label: 'LOSE' },
            { value: 0, color: '#444444', label: 'LOSE' },
            { value: 5, color: '#44ff44', label: '5x' },
            { value: 10, color: '#ffff44', label: '10x' },
            { value: 2, color: '#4444ff', label: '2x' },
            { value: 3, color: '#ff44ff', label: '3x' }
        ];
        
        const result = segments[Math.floor(Math.random() * segments.length)];
        let win = 0;
        let isJackpot = false;
        
        if (result.value > 0) {
            win = bet * result.value;
            if (result.value >= 100) isJackpot = true;
        }
        
        // Tahmin bonusu
        if (prediction === result.value) {
            win = bet * (result.value * 2);
        }
        
        return {
            result,
            win: Math.floor(win),
            isJackpot,
            segmentIndex: segments.indexOf(result)
        };
    }
    
    // Yardımcı fonksiyonlar
    static generateDeck() {
        const deck = [];
        const values = [2,3,4,5,6,7,8,9,10,10,10,10,11];
        for (let i = 0; i < 6; i++) {
            deck.push(...values);
        }
        return deck.sort(() => Math.random() - 0.5);
    }
    
    static calculateBlackjackScore(cards) {
        let score = cards.reduce((a, b) => a + b, 0);
        let aces = cards.filter(c => c === 11).length;
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }
}

function getSymbolMultiplier(symbol, count) {
    const multipliers = {
        '7️⃣': { 3: 10, 4: 25, 5: 100 },
        '🎰': { 3: 8, 4: 20, 5: 50 },
        '💎': { 3: 5, 4: 15, 5: 30 },
        '💰': { 3: 4, 4: 12, 5: 25 },
        '⭐': { 3: 3, 4: 10, 5: 20 },
        '🔔': { 3: 2.5, 4: 8, 5: 15 },
        '🍇': { 3: 2, 4: 6, 5: 12 },
        '🍊': { 3: 1.5, 4: 5, 5: 10 },
        '🍒': { 3: 1, 4: 3, 5: 8 },
        '🍋': { 3: 1, 4: 3, 5: 8 }
    };
    return multipliers[symbol]?.[count] || 0;
}

// ============ ROUTES ============
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    const users = loadUsers();
    
    if (!username || username.length < 3) {
        return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı!' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı!' });
    }
    if (users[username]) {
        return res.status(400).json({ error: 'Kullanıcı adı zaten alınmış!' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = {
        password: hashedPassword,
        email: email || '',
        balance: CONFIG.INITIAL_BALANCE,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        joinedDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        vipLevel: 1,
        vipPoints: 0,
        achievements: [],
        bonus: 0,
        bonusWagered: 0,
        referralCode: generateReferralCode(username),
        referredBy: null,
        dailyBonusClaimed: null,
        weeklyBonusClaimed: null
    };
    
    saveUsers(users);
    res.json({ success: true, message: 'Kayıt başarılı! Hoş geldin!' });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    
    if (!users[username]) {
        return res.status(401).json({ error: 'Kullanıcı bulunamadı!' });
    }
    
    const valid = await bcrypt.compare(password, users[username].password);
    if (!valid) {
        return res.status(401).json({ error: 'Hatalı şifre!' });
    }
    
    users[username].lastLogin = new Date().toISOString();
    saveUsers(users);
    
    const token = jwt.sign({ username }, CONFIG.JWT_SECRET, { expiresIn: '7d' });
    req.session.user = username;
    
    res.json({
        success: true,
        token,
        username,
        balance: users[username].balance,
        vipLevel: users[username].vipLevel,
        gamesPlayed: users[username].gamesPlayed
    });
});

app.get('/api/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Oturum gerekli!' });
    }
    
    const users = loadUsers();
    const user = users[req.session.user];
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı!' });
    }
    
    res.json({
        username: req.session.user,
        balance: user.balance,
        vipLevel: user.vipLevel,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        totalWagered: user.totalWagered,
        totalWon: user.totalWon,
        vipPoints: user.vipPoints,
        joinedDate: user.joinedDate,
        achievements: user.achievements
    });
});

app.post('/api/daily-bonus', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Oturum gerekli!' });
    }
    
    const users = loadUsers();
    const user = users[req.session.user];
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı!' });
    }
    
    const today = new Date().toDateString();
    if (user.dailyBonusClaimed === today) {
        return res.status(400).json({ error: 'Günlük bonus zaten alındı!' });
    }
    
    const bonus = 1000 + (user.vipLevel * 500);
    user.balance += bonus;
    user.dailyBonusClaimed = today;
    user.bonus += bonus;
    
    saveUsers(users);
    res.json({ success: true, bonus, newBalance: user.balance });
});

// ============ SOCKET.IO ============
io.use((socket, next) => {
    const session = socket.request.session;
    if (session && session.user) {
        next();
    } else {
        next(new Error('Oturum gerekli!'));
    }
});

io.on('connection', (socket) => {
    const username = socket.request.session.user;
    const users = loadUsers();
    
    if (!users[username]) {
        socket.disconnect();
        return;
    }
    
    // Kullanıcı odasına katıl
    socket.join(username);
    
    // Kullanıcı verilerini gönder
    socket.emit('userData', {
        username,
        balance: users[username].balance,
        vipLevel: users[username].vipLevel,
        gamesPlayed: users[username].gamesPlayed,
        gamesWon: users[username].gamesWon,
        totalWagered: users[username].totalWagered,
        totalWon: users[username].totalWon
    });
    
    // ===== SLOT OYUNU =====
    socket.on('playSlot', async (data) => {
        const { bet } = data;
        const user = users[username];
        
        if (!user) return;
        if (bet > user.balance) {
            socket.emit('error', 'Yetersiz bakiye!');
            return;
        }
        if (bet > CONFIG.MAX_BET) {
            socket.emit('error', `Maksimum bahis ${CONFIG.MAX_BET}`);
            return;
        }
        if (bet < CONFIG.MIN_BET) {
            socket.emit('error', `Minimum bahis ${CONFIG.MIN_BET}`);
            return;
        }
        
        user.balance -= bet;
        const result = GameEngine.spinSlots(bet);
        user.balance += result.win;
        user.totalWagered += bet;
        user.totalWon += result.win;
        user.gamesPlayed++;
        if (result.win > 0) user.gamesWon++;
        
        // VIP puanı
        user.vipPoints += Math.floor(bet / 100);
        user.vipLevel = calculateVIPLevel(user.vipPoints);
        
        saveUsers(users);
        
        socket.emit('slotResult', {
            ...result,
            newBalance: user.balance,
            winAmount: result.win,
            vipLevel: user.vipLevel,
            totalWagered: user.totalWagered,
            gamesPlayed: user.gamesPlayed
        });
        
        // Tüm kullanıcılara güncelleme
        io.emit('userUpdate', {
            username,
            balance: user.balance,
            vipLevel: user.vipLevel
        });
    });
    
    // ===== DICE OYUNU =====
    socket.on('playDice', async (data) => {
        const { bet, prediction } = data;
        const user = users[username];
        
        if (!user) return;
        if (bet > user.balance) {
            socket.emit('error', 'Yetersiz bakiye!');
            return;
        }
        
        user.balance -= bet;
        const result = GameEngine.rollDice(bet, prediction);
        user.balance += result.win;
        user.totalWagered += bet;
        user.totalWon += result.win;
        user.gamesPlayed++;
        if (result.win > 0) user.gamesWon++;
        
        user.vipPoints += Math.floor(bet / 100);
        user.vipLevel = calculateVIPLevel(user.vipPoints);
        
        saveUsers(users);
        
        socket.emit('diceResult', {
            ...result,
            newBalance: user.balance,
            winAmount: result.win,
            vipLevel: user.vipLevel
        });
    });
    
    // ===== BLACKJACK =====
    socket.on('playBlackjack', async (data) => {
        const { bet, playerHand, dealerHand, action } = data;
        const user = users[username];
        
        if (!user) return;
        if (bet > user.balance) {
            socket.emit('error', 'Yetersiz bakiye!');
            return;
        }
        
        user.balance -= bet;
        const result = GameEngine.playBlackjack(bet, playerHand, dealerHand, action);
        user.balance += result.win > 0 ? bet + result.win : 0;
        user.totalWagered += bet;
        user.totalWon += result.win > 0 ? result.win : 0;
        user.gamesPlayed++;
        if (result.gameStatus === 'win') user.gamesWon++;
        
        user.vipPoints += Math.floor(bet / 100);
        user.vipLevel = calculateVIPLevel(user.vipPoints);
        
        saveUsers(users);
        
        socket.emit('blackjackResult', {
            ...result,
            newBalance: user.balance,
            winAmount: result.win > 0 ? result.win : 0,
            vipLevel: user.vipLevel
        });
    });
    
    // ===== WHEEL OF FORTUNE =====
    socket.on('playWheel', async (data) => {
        const { bet, prediction } = data;
        const user = users[username];
        
        if (!user) return;
        if (bet > user.balance) {
            socket.emit('error', 'Yetersiz bakiye!');
            return;
        }
        
        user.balance -= bet;
        const result = GameEngine.spinWheel(bet, prediction);
        user.balance += result.win;
        user.totalWagered += bet;
        user.totalWon += result.win;
        user.gamesPlayed++;
        if (result.win > 0) user.gamesWon++;
        
        user.vipPoints += Math.floor(bet / 100);
        user.vipLevel = calculateVIPLevel(user.vipPoints);
        
        saveUsers(users);
        
        socket.emit('wheelResult', {
            ...result,
            newBalance: user.balance,
            winAmount: result.win,
            vipLevel: user.vipLevel
        });
    });
    
    // ===== ÇIKIŞ =====
    socket.on('disconnect', () => {
        console.log(`${username} ayrıldı`);
    });
});

// ============ YARDIMCI FONKSİYONLAR ============
function generateReferralCode(username) {
    return username.slice(0, 3) + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function calculateVIPLevel(points) {
    const levels = [
        { threshold: 0, level: 1 },
        { threshold: 1000, level: 2 },
        { threshold: 5000, level: 3 },
        { threshold: 20000, level: 4 },
        { threshold: 100000, level: 5 },
        { threshold: 500000, level: 6 }
    ];
    
    for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= levels[i].threshold) {
            return levels[i].level;
        }
    }
    return 1;
}

// ============ STATIC FILES ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/casino', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'casino.html'));
});

// ============ SERVER START ============
http.listen(CONFIG.PORT, () => {
    console.log(`🎰 PRAGMATIC SANAL CASINO`);
    console.log(`📍 http://localhost:${CONFIG.PORT}`);
    console.log(`⚡ RTP: ${CONFIG.RTP * 100}%`);
    console.log(`💎 VIP Seviyeleri: ${CONFIG.VIP_NAMES.join(', ')}`);
});
