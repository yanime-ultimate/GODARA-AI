const API_KEY = "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";
const MISTRAL_KEY = "GdnrPwwFysJjXifVjUB8uXjpNlhRxhdN";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

let currentUser = localStorage.getItem('godara_user') || null;
let currentChatId = Date.now();
let allSessions = currentUser ? JSON.parse(localStorage.getItem(`sessions_${currentUser}`)) || {} : {};
let imgBuffer = null;

const authOverlay = document.getElementById('auth-overlay');
const appInterface = document.getElementById('app-interface');
const authBtn = document.getElementById('authBtn');

// --- 1. AUTHENTICATION ---
authBtn.onclick = () => {
    const user = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();
    const db = JSON.parse(localStorage.getItem('godara_database')) || {};

    if (!user || !pass) return alert("All fields are required!");

    if (authBtn.textContent === "Sign In") {
        if (db[user] === pass) {
            login(user);
        } else {
            alert("Invalid Username or Password!");
        }
    } else {
        if (db[user]) {
            alert("Username already exists!");
        } else {
            db[user] = pass;
            localStorage.setItem('godara_database', JSON.stringify(db));
            alert("Account created successfully! Please Sign In.");
            authBtn.textContent = "Sign In";
        }
    }
};

function login(user) {
    localStorage.setItem('godara_user', user);
    currentUser = user;
    allSessions = JSON.parse(localStorage.getItem(`sessions_${user}`)) || {};
    authOverlay.style.display = 'none';
    appInterface.style.display = 'flex';
    updateSidebar();
    appendMessage(`System Online. Welcome back, ${user}.`, 'ai');
}

document.getElementById('logoutBtn').onclick = () => {
    if (confirm("Logout?")) {
        localStorage.removeItem('godara_user');
        location.reload();
    }
};

// --- 2. VISION & ART ---
document.getElementById('cam-input').onchange = (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        imgBuffer = f.target.result;
        document.getElementById('preview-img').src = imgBuffer;
        document.getElementById('vision-preview').style.display = 'flex';
    };
    reader.readAsDataURL(e.target.files[0]);
};

function clearVision() {
    imgBuffer = null;
    document.getElementById('vision-preview').style.display = 'none';
    document.getElementById('cam-input').value = "";
}

// --- 3. CORE LOGIC ---
async function handleSend() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text && !imgBuffer) return;

    appendMessage(text, 'user', imgBuffer);
    const savedImg = imgBuffer;
    input.value = "";
    clearVision();

    if (savedImg) {
        processVision(text, savedImg);
    } else if (/\b(draw|generate|image|paint)\b/i.test(text)) {
        processArt(text);
    } else {
        processBrain(text);
    }
}

async function processBrain(text) {
    const b = appendMessage("", 'ai');
    b.innerHTML = `<span class="task-badge">BRAIN</span><div class="loading-pulse"></div>`;
    try {
        const r = await fetch(GROQ_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "system", content: "You are Godara AI."}, {role: "user", content: text}]
            })
        });
        const d = await r.json();
        const aiText = d.choices[0].message.content;
        b.innerHTML = `<span class="task-badge">REPLY</span><br>`;
        typeEffect(b, aiText);
        saveMem(text, aiText);
    } catch { b.textContent = "Brain link failed. Please check internet."; }
}

// --- 4. HELPERS ---
function appendMessage(t, s, img = null) {
    const div = document.createElement('div');
    div.className = `message ${s}`;
    if (img) {
        const i = document.createElement('img');
        i.src = img;
        div.appendChild(i);
    }
    if (t) {
        const span = document.createElement('span');
        span.textContent = t;
        div.appendChild(span);
    }
    const win = document.getElementById('chat-window');
    win.appendChild(div);
    win.scrollTop = win.scrollHeight;
    return div;
}

function typeEffect(el, txt) {
    let i = 0;
    const interval = setInterval(() => {
        if (i < txt.length) {
            el.innerHTML += txt.charAt(i++);
            document.getElementById('chat-window').scrollTop = 99999;
        } else {
            clearInterval(interval);
        }
    }, 10);
}

function saveMem(u, a) {
    if (!allSessions[currentChatId]) allSessions[currentChatId] = { title: u.slice(0,25), msgs: [] };
    allSessions[currentChatId].msgs.push({ u, a });
    localStorage.setItem(`sessions_${currentUser}`, JSON.stringify(allSessions));
}

function updateSidebar() {
    const list = document.getElementById('history-list');
    list.innerHTML = "";
    Object.keys(allSessions).reverse().forEach(id => {
        const item = document.createElement('div');
        item.style = "padding:12px; background:rgba(255,255,255,0.05); margin-top:8px; border-radius:10px; cursor:pointer;";
        item.textContent = allSessions[id].title;
        item.onclick = () => {
            currentChatId = id;
            document.getElementById('chat-window').innerHTML = "";
            allSessions[id].msgs.forEach(m => { appendMessage(m.u, 'user'); appendMessage(m.a, 'ai'); });
            document.getElementById('sidebar').classList.remove('open');
        };
        list.appendChild(item);
    });
}

// EVENT LISTENERS
document.getElementById('sendBtn').onclick = handleSend;
document.getElementById('userInput').onkeypress = (e) => { if(e.key === 'Enter') handleSend(); };
document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
document.getElementById('overlay').onclick = () => document.getElementById('sidebar').classList.remove('open');
document.getElementById('togglePass').onclick = () => {
    const p = document.getElementById('password');
    p.type = p.type === "password" ? "text" : "password";
};

window.onload = () => {
    const user = localStorage.getItem('godara_user');
    if (user) login(user);
};
    
