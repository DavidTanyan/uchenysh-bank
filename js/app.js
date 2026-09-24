(function(){
  "use strict";

  var GRADES = [1,2,3,4,5,6,7,8,9,10,11];
  var AVATAR_HUES = [352,28,142,200,262,320,48,182];
  var HISTORY_CAP = 50;

  var firebaseConfig = {
    apiKey: "AIzaSyAgo5HyP_KbyVJKCuOrwwjBQgeAbkPHICM",
    authDomain: "uchenysh-bank.firebaseapp.com",
    projectId: "uchenysh-bank",
    storageBucket: "uchenysh-bank.firebasestorage.app",
    messagingSenderId: "73216223220",
    appId: "1:73216223220:web:f08ca2fe3302787d5dfba1"
  };
  var FIREBASE_SDK_VERSION = "9.23.0";
  var FIREBASE_CDN_BASES = [
    "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/",
    "https://cdn.jsdelivr.net/npm/firebase@" + FIREBASE_SDK_VERSION + "/"
  ];
  var firestore = null;
  var bankRef = null;

  function loadScript(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error("load_failed")); };
      document.head.appendChild(s);
    });
  }

  async function loadFirebaseSdk(){
    for (var i = 0; i < FIREBASE_CDN_BASES.length; i++){
      var base = FIREBASE_CDN_BASES[i];
      try{
        await loadScript(base + "firebase-app-compat.js");
        await loadScript(base + "firebase-firestore-compat.js");
        if (typeof firebase !== "undefined") return true;
      }catch(e){ /* try the next CDN */ }
    }
    return false;
  }

  function showFatalError(msg){
    document.getElementById("fatalErrorText").textContent = msg;
    document.getElementById("fatalError").hidden = false;
  }

  var ROSTER = {
    1: ["Кобец Алиса","Мянзелена Динара","Исанова Василиса","Назаренко Артем","Куприна Ева","Захаров Михаил","Сухарева Варвара","Каммари Василий","Нанадзе Эмилия","Купцов Тимур","Хребтова Алана","Таврель Александр"],
    2: ["Ходасевич Мария","Рооз Леонард","Лахадынов Максим","Евграфова Софья","Федоренко Петр","Камков Мирослав","Исанова Варвара","Цыкарева Алена","Купчинская Анна"],
    3: ["Квасникова Василиса","Татаринов Марк","Ширина Алеся","Шнипова Александра","Шумилин Константин","Колесников Ян","Фрейдман Александра","Солодухин Василий","Снисаренко Ярослав"],
    4: ["Фисун Андрей","Манучарян Маргарита","Ким Валерия","Липатов Федор","Вахитова Имани","Кобец Ева","Сухарева Дарья","Игнатенко Богдан"],
    5: ["Курусь Агата","Белоцерковская Кира","Мянзелен Тимур","Цугранис Герман","Зарипов Руслан","Давыдов Федор","Маркунина Юлия","Анжияк Эмилия","Егоров Александр","Пуховой Дамир"],
    6: ["Манучарян Нора","Резник Кристина","Тащеева Полина","Мальцев Максим","Дегтяренко Даниил","Грицкевич Майя","Шишова Виталина","Рооз Себастиан","Купчинский Матвей","Григорьев Мирон"],
    7: ["Чабан Даниил","Казакова Ева","Пашутин Алексей","Фисун Ксения","Якубова Елизавета","Хрол Ульяна","Фролова Анна","Кузьмин Лев","Артем Давыдов","Укеев Леон"],
    8: ["Терехова Софья","Соколов Ярик","Савин Глеб","Назукин Федор","Нужная Елизавета","Тараба Андрей","Каменский Александр"],
    9: ["Кулешов Алексей","Дунаев Филипп","Камков Роман","Степурко Алиса","Джанзакова Сафия","Орловская Арина","Нанадзе Нодар","Польянов Федор","Маркунин Артем"],
    10: ["Шишов Тимофей","Алексеев Борис","Сильченко Егор","Помазунов Евгений","Ильин Тимофей","Дадонова Паула"],
    11: ["Якубова Валерия","Джанзакова Малика","Свичихин Михаил","Мельничук Ольга","Пальянов Марк","Мартынова Алена"]
  };

  function pluralize(n, forms){
    n = Math.abs(n) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function initials(name){
    var parts = name.trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : "";
    var b = parts[1] ? parts[1][0] : "";
    return (a+b).toUpperCase() || "?";
  }
  function hueFor(name){
    var h = 0;
    for (var i=0;i<name.length;i++){ h = (h*31 + name.charCodeAt(i)) >>> 0; }
    return AVATAR_HUES[h % AVATAR_HUES.length];
  }
  function fmtDate(ts){
    var d = new Date(ts);
    return d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"}) + ", " +
           d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  }
  function escapeHtml(s){
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  function buildRosterAccounts(){
    var accounts = [];
    GRADES.forEach(function(g){
      (ROSTER[g] || []).forEach(function(name){
        accounts.push({ id: uid(), name: name, grade: g, balance: 0, history: [] });
      });
    });
    return accounts;
  }

  /* ---------- shared bank (Firestore-backed, one document: banks/main) ---------- */
  var bankDoc = { settings: { pin: "" }, accounts: [] };
  var unsubscribe = null;

  /* ---------- dom refs ---------- */
  var setupScreen = document.getElementById("setupScreen");
  var setupName = document.getElementById("setupName");
  var setupPassword = document.getElementById("setupPassword");
  var setupCreateBtn = document.getElementById("setupCreateBtn");
  var setupError = document.getElementById("setupError");
  var mainApp = document.getElementById("mainApp");
  var gradesEl = document.getElementById("grades");
  var gridEl = document.getElementById("accountsGrid");
  var emptyEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var statAccounts = document.getElementById("statAccounts");
  var statAccountsLabel = document.getElementById("statAccountsLabel");
  var statTotal = document.getElementById("statTotal");
  var statTotalLabel = document.getElementById("statTotalLabel");
  var modeBanner = document.getElementById("modeBanner");
  var toastContainer = document.getElementById("toastContainer");
  var fabBtn = document.getElementById("openAddModal");
  var lockBtn = document.getElementById("lockBtn");
  var leaderboardBtn = document.getElementById("leaderboardBtn");
  var leaderboardModalOverlay = document.getElementById("leaderboardModalOverlay");
  var leaderboardGradesEl = document.getElementById("leaderboardGrades");
  var leaderboardListEl = document.getElementById("leaderboardList");
  var soundToggleBtn = document.getElementById("soundToggle");

  var addModalOverlay = document.getElementById("addModalOverlay");
  var newNameInput = document.getElementById("newName");
  var newGradeSelect = document.getElementById("newGrade");

  var txModalOverlay = document.getElementById("txModalOverlay");
  var txAvatar = document.getElementById("txAvatar");
  var txNameEl = document.getElementById("txName");
  var txBalanceEl = document.getElementById("txBalance");
  var txTypeDeposit = document.getElementById("txTypeDeposit");
  var txTypeWithdraw = document.getElementById("txTypeWithdraw");
  var chipRow = document.getElementById("chipRow");
  var commentChipRow = document.getElementById("commentChipRow");
  var txAmountInput = document.getElementById("txAmount");
  var txNoteInput = document.getElementById("txNote");
  var txError = document.getElementById("txError");
  var confirmTxBtn = document.getElementById("confirmTx");

  var pinModalOverlay = document.getElementById("pinModalOverlay");
  var loginNameInput = document.getElementById("loginName");
  var loginPasswordInput = document.getElementById("loginPassword");
  var loginPasswordToggle = document.getElementById("loginPasswordToggle");
  var pinError = document.getElementById("pinError");
  var confirmPinBtn = document.getElementById("confirmPin");

  var selectedGrade = "all";
  var searchQuery = "";
  var currentTx = { accountId:null, type:"deposit" };
  var deleteConfirmId = null;
  var openHistoryIds = {};
  var editUnlocked = false;
  var dbStatus = "connecting"; // connecting | ready | error
  var lastDbError = null;

  // Firestore throws with a .code — surface what actually went wrong instead
  // of a blanket "check your internet", which is misleading for a rules
  // rejection (permission-denied), the most common real cause here.
  function describeFirestoreError(e){
    var code = e && e.code;
    if (code === "permission-denied"){
      return "Запись отклонена правилами Firestore — не совпадает пароль/структура с тем, что требуют правила в Firebase Console. Это не проблема интернета.";
    }
    if (code === "unavailable" || code === "deadline-exceeded"){
      return "Нет связи с сервером Firestore — проверьте интернет-соединение.";
    }
    return "Не удалось сохранить изменения" + (code ? " (" + code + ")" : "") + ".";
  }
  var leaderboardGrade = "all";
  var pendingFlash = null; // {id, type, amount} — one-shot reward animation for the next render
  var teacherName = "";
  try{ teacherName = localStorage.getItem("uchenyshBank.teacherName") || ""; }catch(e){}

  /* ---------- sound feedback ---------- */
  var audioCtx = null;
  var soundEnabled = true;
  try{ soundEnabled = localStorage.getItem("uchenyshBank.sound") !== "off"; }catch(e){}
  function updateSoundToggleUI(){
    soundToggleBtn.textContent = soundEnabled ? "🔊" : "🔇";
    soundToggleBtn.title = soundEnabled ? "Звук включён — нажмите, чтобы выключить" : "Звук выключен — нажмите, чтобы включить";
  }
  soundToggleBtn.addEventListener("click", function(){
    soundEnabled = !soundEnabled;
    try{ localStorage.setItem("uchenyshBank.sound", soundEnabled ? "on" : "off"); }catch(e){}
    updateSoundToggleUI();
  });
  updateSoundToggleUI();

  function playChime(type){
    if (!soundEnabled) return;
    try{
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var now = audioCtx.currentTime;
      var notes = type === "deposit" ? [523.25, 659.25, 783.99] : [392.00, 293.66];
      notes.forEach(function(freq, i){
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        var start = now + i * 0.09;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(start); osc.stop(start + 0.26);
      });
    }catch(e){ /* Web Audio unavailable — animation still plays */ }
  }

  /* ---------- grade filter chips + select options ---------- */
  function buildGrades(){
    var frag = document.createDocumentFragment();
    var allBtn = document.createElement("button");
    allBtn.className = "grade-btn" + (selectedGrade==="all" ? " active" : "");
    allBtn.textContent = "Все";
    allBtn.addEventListener("click", function(){ selectedGrade="all"; render(); });
    frag.appendChild(allBtn);
    GRADES.forEach(function(g){
      var btn = document.createElement("button");
      btn.className = "grade-btn" + (selectedGrade===g ? " active" : "");
      btn.textContent = g;
      btn.addEventListener("click", function(){ selectedGrade=g; render(); });
      frag.appendChild(btn);
    });
    gradesEl.innerHTML = "";
    gradesEl.appendChild(frag);

    if (!newGradeSelect.options.length){
      GRADES.forEach(function(g){
        var opt = document.createElement("option");
        opt.value = g; opt.textContent = g + " класс";
        newGradeSelect.appendChild(opt);
      });
    }
  }

  function renderBanner(){
    if (dbStatus === "error"){
      modeBanner.hidden = false;
      modeBanner.className = "mode-banner error";
      modeBanner.textContent = lastDbError ? describeFirestoreError(lastDbError) : "Не удалось связаться с общим хранилищем. Проверьте интернет-соединение — попробуем ещё раз автоматически.";
    } else if (dbStatus === "connecting"){
      modeBanner.hidden = false;
      modeBanner.className = "mode-banner";
      modeBanner.textContent = "Подключаемся к общему банку…";
    } else if (!editUnlocked){
      modeBanner.hidden = false;
      modeBanner.className = "mode-banner";
      modeBanner.innerHTML = "";
      modeBanner.textContent = "Режим просмотра. ";
      var btn = document.createElement("button");
      btn.className = "link-btn";
      btn.textContent = "Войти как учитель";
      btn.addEventListener("click", openLoginModal);
      modeBanner.appendChild(btn);
    } else {
      modeBanner.hidden = false;
      modeBanner.className = "mode-banner";
      modeBanner.innerHTML = "";
      modeBanner.textContent = "Режим учителя" + (teacherName ? ": " + teacherName + ". " : ". ");
      var nameBtn = document.createElement("button");
      nameBtn.className = "link-btn";
      nameBtn.textContent = teacherName ? "Сменить имя" : "Указать имя";
      nameBtn.addEventListener("click", openNameModal);
      modeBanner.appendChild(nameBtn);
    }
    fabBtn.hidden = !(dbStatus === "ready" && editUnlocked);
    lockBtn.textContent = editUnlocked ? "🔓 Режим учителя" : "🔒 Режим учителя";
    lockBtn.classList.toggle("unlocked", editUnlocked);
    leaderboardBtn.disabled = dbStatus !== "ready";
  }

  function render(){
    buildGrades();
    renderBanner();

    var flash = pendingFlash;
    pendingFlash = null;

    var accounts = bankDoc.accounts.filter(function(a){
      var gradeOk = selectedGrade === "all" || a.grade === selectedGrade;
      var queryOk = !searchQuery || a.name.toLowerCase().indexOf(searchQuery) !== -1;
      return gradeOk && queryOk;
    });

    gridEl.innerHTML = "";
    emptyEl.hidden = !(dbStatus === "ready" && accounts.length === 0);

    accounts
      .slice()
      .sort(function(a,b){ return a.name.localeCompare(b.name, "ru"); })
      .forEach(function(acc){ gridEl.appendChild(renderCard(acc, flash && flash.id === acc.id ? flash : null)); });

    var totalAccounts = bankDoc.accounts.length;
    var totalBalance = bankDoc.accounts.reduce(function(s,a){ return s + a.balance; }, 0);
    statAccounts.textContent = totalAccounts;
    statAccountsLabel.textContent = pluralize(totalAccounts, ["счёт","счета","счетов"]);
    statTotal.textContent = totalBalance;
    statTotalLabel.textContent = pluralize(totalBalance, ["ученыш","ученыша","ученышей"]) + " в обороте";

    if (!leaderboardModalOverlay.hidden) renderLeaderboard();
  }

  function renderCard(acc, flash){
    var card = document.createElement("article");
    card.className = "account-card";
    card.dataset.id = acc.id;

    var top = document.createElement("div");
    top.className = "card-top";
    var avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = "hsl(" + hueFor(acc.name) + " 55% 42%)";
    avatar.textContent = initials(acc.name);
    top.appendChild(avatar);

    if (editUnlocked){
      var del = document.createElement("button");
      del.className = "delete-btn";
      del.textContent = deleteConfirmId === acc.id ? "Точно?" : "✕";
      if (deleteConfirmId === acc.id) del.classList.add("confirming");
      del.title = "Удалить счёт";
      del.addEventListener("click", function(){
        if (deleteConfirmId === acc.id){
          deleteConfirmId = null;
          bankDoc.accounts = bankDoc.accounts.filter(function(a){ return a.id !== acc.id; });
          persist();
          showToast("Счёт «" + acc.name + "» удалён");
        } else {
          deleteConfirmId = acc.id;
          render();
        }
      });
      top.appendChild(del);
    }

    var name = document.createElement("h3");
    name.className = "account-name";
    name.textContent = acc.name;

    var badges = document.createElement("div");
    badges.className = "badges";
    var gradeBadge = document.createElement("span");
    gradeBadge.className = "grade-badge";
    gradeBadge.textContent = acc.grade + " класс";
    badges.appendChild(gradeBadge);

    var balance = document.createElement("div");
    balance.className = "balance";
    balance.innerHTML = '<span class="coin">🪙</span><span class="balance-value mono">' + acc.balance + "</span>";
    if (flash){
      var bv = balance.querySelector(".balance-value");
      bv.classList.add(flash.type === "deposit" ? "flash-deposit" : "flash-withdraw");
      var fly = document.createElement("span");
      fly.className = "fly-badge " + (flash.type === "deposit" ? "pos" : "neg");
      fly.textContent = (flash.type === "deposit" ? "+" : "−") + flash.amount;
      balance.appendChild(fly);
    }

    card.appendChild(top);
    card.appendChild(name);
    card.appendChild(badges);
    card.appendChild(balance);

    if (editUnlocked){
      var actions = document.createElement("div");
      actions.className = "card-actions";
      var depBtn = document.createElement("button");
      depBtn.className = "btn small positive";
      depBtn.textContent = "+ Начислить";
      depBtn.addEventListener("click", function(){ openTxModal(acc.id, "deposit"); });
      var wdBtn = document.createElement("button");
      wdBtn.className = "btn small negative";
      wdBtn.textContent = "− Снять";
      wdBtn.disabled = acc.balance <= 0;
      wdBtn.addEventListener("click", function(){ openTxModal(acc.id, "withdraw"); });
      actions.appendChild(depBtn); actions.appendChild(wdBtn);
      card.appendChild(actions);
    }

    var open = !!openHistoryIds[acc.id];
    var histToggle = document.createElement("button");
    histToggle.className = "history-toggle";
    histToggle.textContent = "История " + (open ? "▴" : "▾");
    histToggle.addEventListener("click", function(){
      openHistoryIds[acc.id] = !open;
      render();
    });
    card.appendChild(histToggle);

    var histList;
    if (acc.history && acc.history.length){
      histList = document.createElement("ul");
      histList.className = "history-list";
      histList.hidden = !open;
      acc.history.slice().reverse().slice(0,8).forEach(function(h){
        var li = document.createElement("li");
        var sign = h.type === "deposit" ? "+" : "−";
        var cls = h.type === "deposit" ? "pos" : "neg";
        li.innerHTML =
          '<span class="amt ' + cls + '">' + sign + h.amount + "</span>" +
          '<span><span class="hist-note">' + (h.note ? escapeHtml(h.note) : "—") + "</span>" +
          (h.by ? '<span class="hist-by">' + escapeHtml(h.by) + "</span>" : "") + "</span>" +
          "<span>" + fmtDate(h.ts) + "</span>";
        histList.appendChild(li);
      });
    } else {
      histList = document.createElement("p");
      histList.className = "history-empty";
      histList.hidden = !open;
      histList.textContent = "Операций пока не было";
    }
    card.appendChild(histList);
    return card;
  }

  function showToast(msg){
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2600);
  }

  /* ---------- persistence ---------- */
  async function persist(){
    render(); // optimistic local render first
    try{
      await bankRef.set(bankDoc);
      dbStatus = "ready";
      lastDbError = null;
    }catch(e){
      dbStatus = "error";
      lastDbError = e;
      showToast(describeFirestoreError(e));
    }
    render();
  }

  /* ---------- add account modal ---------- */
  fabBtn.addEventListener("click", function(){
    newNameInput.value = "";
    newGradeSelect.value = (selectedGrade === "all") ? "1" : String(selectedGrade);
    addModalOverlay.hidden = false;
    setTimeout(function(){ newNameInput.focus(); }, 0);
  });
  document.getElementById("cancelAdd").addEventListener("click", function(){ addModalOverlay.hidden = true; });
  addModalOverlay.addEventListener("click", function(e){ if (e.target === addModalOverlay) addModalOverlay.hidden = true; });
  document.getElementById("confirmAdd").addEventListener("click", submitAdd);
  newNameInput.addEventListener("keydown", function(e){ if (e.key === "Enter") submitAdd(); });

  function submitAdd(){
    var name = newNameInput.value.trim();
    if (!name){ newNameInput.focus(); return; }
    var grade = parseInt(newGradeSelect.value, 10);
    addModalOverlay.hidden = true;
    bankDoc.accounts.push({ id: uid(), name: name, grade: grade, balance: 0, history: [] });
    persist();
    showToast("Счёт «" + name + "» открыт");
  }

  /* ---------- transaction modal ---------- */
  function openTxModal(accountId, type){
    currentTx.accountId = accountId;
    currentTx.type = type;
    var acc = bankDoc.accounts.find(function(a){ return a.id === accountId; });
    if (!acc) return;
    txAvatar.style.background = "hsl(" + hueFor(acc.name) + " 55% 42%)";
    txAvatar.textContent = initials(acc.name);
    txNameEl.textContent = acc.name;
    txBalanceEl.textContent = acc.balance + " 🪙";
    txAmountInput.value = "";
    txNoteInput.value = "";
    txError.hidden = true;
    setTxType(type);
    txModalOverlay.hidden = false;
    setTimeout(function(){ txAmountInput.focus(); }, 0);
  }
  var DEPOSIT_COMMENT_PRESETS = ["Домашнее задание", "Работа в классе"];

  function setTxType(type){
    currentTx.type = type;
    txTypeDeposit.classList.toggle("active", type === "deposit");
    txTypeWithdraw.classList.toggle("active", type === "withdraw");
    buildChips(type);
    buildCommentChips(type);
    txError.hidden = true;
  }
  function buildChips(type){
    var amounts = type === "deposit" ? [1,5,10,20,50] : [1,5,10,20];
    chipRow.innerHTML = "";
    amounts.forEach(function(n){
      var chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = (type === "deposit" ? "+" : "−") + n;
      chip.addEventListener("click", function(){ txAmountInput.value = n; });
      chipRow.appendChild(chip);
    });
  }
  function buildCommentChips(type){
    commentChipRow.innerHTML = "";
    if (type !== "deposit"){ commentChipRow.hidden = true; return; }
    commentChipRow.hidden = false;
    DEPOSIT_COMMENT_PRESETS.forEach(function(text){
      var chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = text;
      chip.addEventListener("click", function(){ txNoteInput.value = text; });
      commentChipRow.appendChild(chip);
    });
  }
  txTypeDeposit.addEventListener("click", function(){ setTxType("deposit"); });
  txTypeWithdraw.addEventListener("click", function(){ setTxType("withdraw"); });
  document.getElementById("cancelTx").addEventListener("click", function(){ txModalOverlay.hidden = true; });
  txModalOverlay.addEventListener("click", function(e){ if (e.target === txModalOverlay) txModalOverlay.hidden = true; });
  confirmTxBtn.addEventListener("click", submitTx);
  txAmountInput.addEventListener("keydown", function(e){ if (e.key === "Enter") submitTx(); });

  function submitTx(){
    var acc = bankDoc.accounts.find(function(a){ return a.id === currentTx.accountId; });
    if (!acc) return;
    var amount = parseInt(txAmountInput.value, 10);
    if (!amount || amount <= 0){
      txError.textContent = "Введите сумму больше нуля";
      txError.hidden = false;
      return;
    }
    if (currentTx.type === "withdraw" && amount > acc.balance){
      txError.textContent = "На счёте только " + acc.balance + " " + pluralize(acc.balance, ["ученыш","ученыша","ученышей"]);
      txError.hidden = false;
      return;
    }
    acc.balance += currentTx.type === "deposit" ? amount : -amount;
    acc.history = (acc.history || []).concat([{
      type: currentTx.type, amount: amount, note: txNoteInput.value.trim(), by: teacherName || "", ts: Date.now()
    }]).slice(-HISTORY_CAP);

    pendingFlash = { id: acc.id, type: currentTx.type, amount: amount };
    playChime(currentTx.type);

    txModalOverlay.hidden = true;
    var word = pluralize(amount, ["ученыш","ученыша","ученышей"]);
    var msg = (currentTx.type === "deposit" ? "Начислено " : "Списано ") + amount + " " + word + " — " + acc.name;
    persist().then(function(){ showToast(msg); });
  }

  /* ---------- teacher login (shared password stored in the bank document
     itself, compared here in the browser — the simple scheme from the very
     start. No Firebase account or console setup needed beyond the database
     itself; the trade-off is that it's a UI-level gate, not a server-side
     one — see the security note given earlier in this conversation.) ---------- */
  function saveTeacherName(name){
    teacherName = name.trim();
    try{ localStorage.setItem("uchenyshBank.teacherName", teacherName); }catch(e){}
  }
  function openNameModal(){
    var val = window.prompt("Ваше имя (будет видно в истории операций):", teacherName || "");
    if (val === null) return;
    saveTeacherName(val);
    render();
  }

  /* ---------- escalating lockout after wrong passwords (UX deterrent —
     shared across the login modal and the first-run setup screen, since
     both guess the same account. This is client-side, so it slows down
     casual guessing in the visible UI; it is not the real security layer —
     that's Firebase Auth + Firestore rules, which no browser trick bypasses.
     3 wrong passwords in a row locks for 1 minute, then 5, then 15, 30, 60 —
     the wait keeps growing the more it keeps happening. ) ---------- */
  var LOGIN_MAX_ATTEMPTS = 3;
  var LOGIN_LOCK_STEPS_MS = [60000, 300000, 900000, 1800000, 3600000]; // 1, 5, 15, 30, 60 min
  var loginLockInterval = null;

  function getLoginLockState(){
    try{ return JSON.parse(localStorage.getItem("uchenyshBank.loginLock") || "{}"); }
    catch(e){ return {}; }
  }
  function setLoginLockState(state){
    try{ localStorage.setItem("uchenyshBank.loginLock", JSON.stringify(state)); }catch(e){}
  }
  function loginLockRemainingMs(){
    var st = getLoginLockState();
    return st.lockUntil ? Math.max(0, st.lockUntil - Date.now()) : 0;
  }
  function noteFailedLoginAttempt(){
    var st = getLoginLockState();
    var attempts = (st.attempts || 0) + 1;
    var level = st.level || 0;
    if (attempts >= LOGIN_MAX_ATTEMPTS){
      var stepMs = LOGIN_LOCK_STEPS_MS[Math.min(level, LOGIN_LOCK_STEPS_MS.length - 1)];
      setLoginLockState({ attempts: 0, level: level + 1, lockUntil: Date.now() + stepMs });
    } else {
      setLoginLockState({ attempts: attempts, level: level });
    }
  }
  function resetLoginLock(){
    setLoginLockState({});
  }
  function formatLockRemaining(ms){
    var totalSec = Math.ceil(ms / 1000);
    if (totalSec <= 60) return totalSec + " сек.";
    var min = Math.ceil(totalSec / 60);
    return min + " " + pluralize(min, ["минуту","минуты","минут"]);
  }
  function lockMessage(){
    return "Слишком много неверных попыток. Подождите " + formatLockRemaining(loginLockRemainingMs()) + ".";
  }
  function updateLoginLockUI(){
    var remaining = loginLockRemainingMs();
    if (remaining > 0){
      pinError.hidden = false;
      pinError.textContent = lockMessage();
      loginNameInput.disabled = true;
      loginPasswordInput.disabled = true;
      confirmPinBtn.disabled = true;
    } else {
      if (loginLockInterval){ clearInterval(loginLockInterval); loginLockInterval = null; }
      loginNameInput.disabled = false;
      loginPasswordInput.disabled = false;
      confirmPinBtn.disabled = false;
      if (pinError.textContent.indexOf("Слишком много") === 0) pinError.hidden = true;
    }
  }

  function openLoginModal(){
    loginNameInput.value = teacherName || "";
    loginPasswordInput.value = "";
    loginPasswordInput.type = "password";
    loginPasswordToggle.textContent = "👁";
    loginPasswordToggle.title = "Показать пароль";
    pinError.hidden = true;
    confirmPinBtn.textContent = "Войти";
    pinModalOverlay.hidden = false;
    updateLoginLockUI();
    if (loginLockRemainingMs() > 0 && !loginLockInterval){
      loginLockInterval = setInterval(updateLoginLockUI, 1000);
    }
    setTimeout(function(){ if (!loginNameInput.disabled) loginNameInput.focus(); }, 0);
  }
  loginPasswordToggle.addEventListener("click", function(){
    var showing = loginPasswordInput.type === "text";
    loginPasswordInput.type = showing ? "password" : "text";
    loginPasswordToggle.textContent = showing ? "👁" : "🙈";
    loginPasswordToggle.title = showing ? "Показать пароль" : "Скрыть пароль";
    loginPasswordInput.focus();
  });
  lockBtn.addEventListener("click", function(){
    if (editUnlocked){
      editUnlocked = false;
      try{ localStorage.removeItem("uchenyshBank.unlocked"); }catch(e){}
      render();
    } else {
      openLoginModal();
    }
  });
  document.getElementById("cancelPin").addEventListener("click", function(){
    pinModalOverlay.hidden = true;
    if (loginLockInterval){ clearInterval(loginLockInterval); loginLockInterval = null; }
  });
  pinModalOverlay.addEventListener("click", function(e){
    if (e.target === pinModalOverlay){
      pinModalOverlay.hidden = true;
      if (loginLockInterval){ clearInterval(loginLockInterval); loginLockInterval = null; }
    }
  });
  confirmPinBtn.addEventListener("click", submitLogin);
  loginPasswordInput.addEventListener("keydown", function(e){ if (e.key === "Enter") submitLogin(); });

  function submitLogin(){
    if (loginLockRemainingMs() > 0){ updateLoginLockUI(); return; }
    var name = loginNameInput.value.trim();
    var password = loginPasswordInput.value;
    if (!name || !password){
      pinError.textContent = "Введите ваше имя и пароль";
      pinError.hidden = false;
      return;
    }
    if (bankDoc.settings && password === bankDoc.settings.pin && password !== ""){
      resetLoginLock();
      saveTeacherName(name);
      editUnlocked = true;
      try{ localStorage.setItem("uchenyshBank.unlocked", "1"); }catch(e){}
      pinModalOverlay.hidden = true;
      render();
    } else {
      noteFailedLoginAttempt();
      if (loginLockRemainingMs() > 0){
        updateLoginLockUI();
        if (!loginLockInterval) loginLockInterval = setInterval(updateLoginLockUI, 1000);
      } else {
        pinError.textContent = "Неверный пароль";
        pinError.hidden = false;
      }
    }
  }

  /* ---------- leaderboard ---------- */
  function buildLeaderboardGrades(){
    var frag = document.createDocumentFragment();
    var allBtn = document.createElement("button");
    allBtn.className = "grade-btn" + (leaderboardGrade==="all" ? " active" : "");
    allBtn.textContent = "Вся школа";
    allBtn.addEventListener("click", function(){ leaderboardGrade="all"; renderLeaderboard(); });
    frag.appendChild(allBtn);
    GRADES.forEach(function(g){
      var btn = document.createElement("button");
      btn.className = "grade-btn" + (leaderboardGrade===g ? " active" : "");
      btn.textContent = g;
      btn.addEventListener("click", function(){ leaderboardGrade=g; renderLeaderboard(); });
      frag.appendChild(btn);
    });
    leaderboardGradesEl.innerHTML = "";
    leaderboardGradesEl.appendChild(frag);
  }

  function renderLeaderboard(){
    buildLeaderboardGrades();
    var accounts = bankDoc.accounts.filter(function(a){
      return leaderboardGrade === "all" || a.grade === leaderboardGrade;
    });
    var ranked = accounts.slice().sort(function(a,b){
      return b.balance - a.balance || a.name.localeCompare(b.name, "ru");
    });

    leaderboardListEl.innerHTML = "";
    if (!ranked.length){
      var empty = document.createElement("p");
      empty.className = "leaderboard-empty";
      empty.textContent = "Здесь пока пусто";
      leaderboardListEl.appendChild(empty);
      return;
    }

    var medals = ["🥇","🥈","🥉"];
    ranked.slice(0, 30).forEach(function(acc, i){
      var li = document.createElement("li");
      li.className = "leaderboard-row" + (i < 3 ? " top" + (i+1) : "");

      var rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = i < 3 ? medals[i] : String(i + 1);

      var avatar = document.createElement("span");
      avatar.className = "leaderboard-avatar";
      avatar.style.background = "hsl(" + hueFor(acc.name) + " 55% 42%)";
      avatar.textContent = initials(acc.name);

      var nameWrap = document.createElement("div");
      nameWrap.className = "leaderboard-name";
      var nameText = document.createElement("span");
      nameText.className = "leaderboard-name-text";
      nameText.textContent = acc.name;
      var gradeText = document.createElement("span");
      gradeText.className = "leaderboard-grade";
      gradeText.textContent = acc.grade + " класс";
      nameWrap.appendChild(nameText);
      nameWrap.appendChild(gradeText);

      var balance = document.createElement("span");
      balance.className = "leaderboard-balance mono";
      balance.textContent = acc.balance + " 🪙";

      li.appendChild(rank);
      li.appendChild(avatar);
      li.appendChild(nameWrap);
      li.appendChild(balance);
      leaderboardListEl.appendChild(li);
    });
  }

  leaderboardBtn.addEventListener("click", function(){
    if (leaderboardBtn.disabled) return;
    leaderboardGrade = "all";
    leaderboardModalOverlay.hidden = false;
    renderLeaderboard();
  });
  document.getElementById("closeLeaderboard").addEventListener("click", function(){ leaderboardModalOverlay.hidden = true; });
  leaderboardModalOverlay.addEventListener("click", function(e){ if (e.target === leaderboardModalOverlay) leaderboardModalOverlay.hidden = true; });

  /* ---------- support modal ---------- */
  var supportModalOverlay = document.getElementById("supportModalOverlay");
  document.getElementById("openSupportModal").addEventListener("click", function(){
    supportModalOverlay.hidden = false;
  });
  document.getElementById("closeSupportModal").addEventListener("click", function(){
    supportModalOverlay.hidden = true;
  });
  supportModalOverlay.addEventListener("click", function(e){
    if (e.target === supportModalOverlay) supportModalOverlay.hidden = true;
  });

  /* ---------- search / escape ---------- */
  searchInput.addEventListener("input", function(){
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape"){
      addModalOverlay.hidden = true;
      txModalOverlay.hidden = true;
      pinModalOverlay.hidden = true;
      supportModalOverlay.hidden = true;
      leaderboardModalOverlay.hidden = true;
    }
  });
  document.addEventListener("click", function(e){
    if (deleteConfirmId && !(e.target.classList && e.target.classList.contains("delete-btn"))){
      deleteConfirmId = null;
      render();
    }
  }, true);

  /* ---------- boot ---------- */
  function showMainApp(){
    setupScreen.hidden = true;
    mainApp.hidden = false;
    try{
      if (localStorage.getItem("uchenyshBank.unlocked") === "1") editUnlocked = true;
    }catch(e){}
    render();
    if (unsubscribe) unsubscribe();
    unsubscribe = bankRef.onSnapshot(function(snap){
      if (snap.exists){
        var data = snap.data() || {};
        bankDoc = {
          settings: data.settings || {},
          accounts: Array.isArray(data.accounts) ? data.accounts : []
        };
        dbStatus = "ready";
        lastDbError = null;
        render();
      }
    }, function(err){
      dbStatus = "error";
      lastDbError = err;
      render();
    });
  }

  setupCreateBtn.addEventListener("click", async function(){
    setupError.hidden = true;
    var name = setupName.value.trim();
    var password = setupPassword.value;
    if (!name || !password){
      setupError.textContent = "Введите ваше имя и пароль учителя";
      setupError.hidden = false;
      return;
    }
    setupCreateBtn.disabled = true;
    setupCreateBtn.textContent = "Создаём…";
    try{
      var doc = { settings: { pin: password }, accounts: buildRosterAccounts() };
      await bankRef.set(doc);
      bankDoc = doc;
      saveTeacherName(name);
      editUnlocked = true;
      try{ localStorage.setItem("uchenyshBank.unlocked", "1"); }catch(e){}
      showMainApp();
      showToast("Общий банк создан");
    }catch(e){
      setupError.textContent = describeFirestoreError(e);
      setupError.hidden = false;
      setupCreateBtn.disabled = false;
      setupCreateBtn.textContent = "Создать общий банк";
    }
  });

  async function start(){
    dbStatus = "connecting";
    try{
      var snap = await bankRef.get();
      if (snap.exists){
        showMainApp();
      } else {
        setupScreen.hidden = false;
      }
    }catch(e){
      // Can't tell yet whether a bank already exists — default to the main
      // view and let the live listener report the real connection state.
      showMainApp();
    }
  }

  async function boot(){
    var ok = await loadFirebaseSdk();
    if (!ok || typeof firebase === "undefined"){
      showFatalError("Не удалось загрузить Firebase (заблокирован интернетом, блокировщиком рекламы или расширением браузера). Отключите блокировщик для этого сайта и обновите страницу.");
      return;
    }
    firebase.initializeApp(firebaseConfig);
    firestore = firebase.firestore();
    // Some networks (school/office firewalls, certain proxies) block the
    // streaming connection Firestore prefers by default. Falling back to
    // long-polling avoids the "WebChannelConnection ... transport errored"
    // loop on those networks.
    firestore.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });
    bankRef = firestore.collection("banks").doc("main");
    start();
  }

  boot();
})();
