// =====================================================================
// СЮЖЕТ «БОЛАШАКОВЦЫ. ПЕРЕЗАПУСК»
// Колледж «Болашак», Актау. Опять 10-е число — а зарплаты нет.
// «Средства не поступили с ОБЛОНО» — говорит бухгалтерия. Но в этот раз
// всё серьёзнее: зарплаты всего города перехватывает вымышленная банда
// легендарного «Мистера Депозита». Айтишники идут возвращать своё.
//
// Фото персонажей: static/img/story/<id>.png (если файла нет — рисуется заглушка).
// Звуки (необязательно): static/audio/story/blip.mp3 — щелчок букв в диалоге,
// static/audio/story/blip_<id>.mp3 — свой голос персонажа,
// static/audio/story/chapter<N>.mp3 — музыка главы.
// =====================================================================

// Кто говорит в диалогах. Герои берут фото из static/img (как в игре), остальные — из static/img/story/
const CAST = {
  dani:    { name: 'ДАНИ',      role: 'IT, кабинет 316',             color: '#05d9e8', hero: true },
  gal:     { name: 'ГАЛА',      role: 'IT, кабинет 321',             color: '#ff2a6d', hero: true },
  daur:    { name: 'ДАУР',      role: 'IT, кабинет 319',             color: '#ffd319', hero: true },
  ulzhan:  { name: 'УЛЖАН',     role: 'секретарь директора',         color: '#ff7ad9' },
  aseke:   { name: 'АСЕКЕ',     role: 'сисадмин, кабинет 324',       color: '#7ab4ff' },
  symbat:  { name: 'СЫМБАТ',    role: 'лаборант, кабинет 324',       color: '#9affc8' },
  asik:    { name: 'АСИК',      role: 'физрук, боксёр',              color: '#ff9a3a' },
  meka:    { name: 'МЕКА',      role: 'физрук, тренер по футболу',   color: '#3dff8a' },
  nurzhan: { name: 'НУРЖАН',    role: 'старший физрук',              color: '#c8ff5a' },
  amir:    { name: 'АМИР',      role: 'старший преподаватель IT',    color: '#c060ff' },
  aulet:   { name: 'АУЛЕТ',     role: 'архитектура',                 color: '#5ae0ff' },
  ykylas:  { name: 'ЫКЫЛАС',    role: 'юриспруденция',               color: '#d0d6e0' },
  galym:   { name: 'ГАЛЫМ АГАЙ', role: 'замдиректора по практике',   color: '#ffb040' },
  zhuma:   { name: 'ЖУМА',      role: 'легенда НВП',                 color: '#e8dcc0' },
  dias:    { name: 'ДИАС',      role: 'новый препод юриспруденции',  color: '#8a8aff' },
  ereke:   { name: 'ЕРЕКЕ',     role: 'новый препод НВП',            color: '#a8c070' },
  deposit: { name: 'МИСТЕР ДЕПОЗИТ', role: '???',                    color: '#ffd319', villain: true },
  thug:    { name: 'БАНДИТ',    role: 'люди Депозита',               color: '#ff5050', villain: true },
  sms:     { name: 'SMS',       role: 'телефон',                     color: '#3dff8a', phone: true },
  '':      { name: '',          role: '',                            color: '#9a94b8' },
};

// Главы. level: { campaign: индекс уровня CAMPAIGN } или { seed, name, sub, color, boss, mul } — случайный этаж с фиксированным seed
const STORY = [
  {
    id: 'ch1', title: 'ГЛАВА 1. ФИЛЛЕРНЫЙ ДЕНЬ', place: 'Колледж «Болашак», третий этаж', color: '#ffd319',
    blurb: 'Десятое число. Зарплаты нет. Ночью в колледже кто-то ходит по коридорам.',
    level: { campaign: 0 },
    intro: [
      ['', '10-е число. 17:58. Третий этаж колледжа «Болашак».'],
      ['dani', 'Ну что, кто-нибудь видел зарплату? Я уже в магазине у дома в долг беру. Опять.'],
      ['gal', 'Бухгалтерия сказала: «Средства не поступили». Классика.'],
      ['daur', 'Всё, я ухожу в айти. Нормальное. С зарплатой. Вот прямо в этом месяце.'],
      ['gal', 'Ты это говоришь каждый месяц, Даур.'],
      ['ulzhan', 'Мальчики, новости есть, только не падайте. Директор в командировке — подпись ставить некому.'],
      ['dani', 'За день до зарплаты. Я даже не удивлён.'],
      ['ulzhan', 'Это ещё не всё. В бухгалтерии говорят, деньги вообще не дошли. Будто их кто-то перехватил по дороге.'],
      ['aseke', 'Парни, зайдите в 324. Я тут камеры смотрю... На первом этаже какие-то люди в кожанках. И это не студенты.'],
      ['symbat', 'Я вам чаю налила. Возьмите с собой, вдруг надолго.'],
      ['aseke', 'Они ломятся к бухгалтерии. Кажется, ищут папку с ведомостями.'],
      ['daur', 'То есть зарплату у нас не просто задержали, а ещё и воруют то, чего нет?'],
      ['gal', 'Ладно. Филлерный день закончился. Пошли.'],
    ],
    outro: [
      ['', 'Фальшивый вахтёр лежит на полу холла. Из кармана выпадает визитка.'],
      ['dani', '«МФО ЗАЙМ ДО ЗП. Мы найдём вас сами». ...Подождите. Я им тоже должен.'],
      ['gal', 'Отлично. Значит, адрес ты знаешь.'],
      ['aseke', 'По камерам видно: двое уехали на чёрной машине в сторону 28-го микрорайона.'],
      ['dani', 'Это мой район. Там меня все знают. Особенно в магазине.'],
      ['daur', 'Завтра шесть пар... Ладно, перенесём. Скажем, короткий день — прорвало трубу.'],
    ],
  },
  {
    id: 'ch2', title: 'ГЛАВА 2. ЗАЙМ ДО ЗАРПЛАТЫ', place: 'МФО «Займ до ЗП», 28 микрорайон', color: '#05d9e8',
    blurb: 'Контора, где Дани должен всем. Здесь знают, куда ушли деньги.',
    level: { campaign: 1 },
    intro: [
      ['', 'Короткий день. Пары по 45 минут. Самое время для визита в микрофинансовую контору.'],
      ['dani', 'Если что, я тут под другим именем. Ну, почти под другим.'],
      ['gal', 'Сколько ты им должен?'],
      ['dani', 'Неважно. Важно, что они должны всем нам.'],
      ['amir', 'Коллеги! Я вас подвёз, как и договаривались. Может, после... всего этого посидим где-нибудь? Лампово, без шума?'],
      ['daur', 'Амир-агай, давайте сначала выживем.'],
      ['amir', 'Понимаю. Я подожду в машине. И запишу всех, кто опоздал на операцию.'],
      ['thug', 'Эй! Это не тот, который нам с прошлого месяца должен?!'],
      ['dani', '...Ладно, имя не помогло.'],
    ],
    outro: [
      ['', 'В сейфе Коллектора — ведомости зарплат всех колледжей Актау. Подпись внизу: «М. Д.»'],
      ['gal', '«М. Д.» — Мистер Депозит. Я думал, это просто байка из курилки.'],
      ['daur', 'Мы же сами шутили: «депозит директора, проценты капают». Оказалось — не директора.'],
      ['dani', 'Тут ещё моя расписка. Ну всё, теперь мы квиты.'],
      ['amir', 'Деньги переводят в банк «Депозит». Я знаю, где это. Я там людей возил, когда таксовал.'],
      ['gal', 'Амир-агай, вы сегодня очень полезный.'],
      ['amir', 'Значит... в пятницу посидим?'],
    ],
  },
  {
    id: 'ch3', title: 'ГЛАВА 3. ИНКАССАЦИЯ', place: 'Банк «Депозит», центр Актау', color: '#3fff8f',
    blurb: 'Зарплаты Актау лежат в хранилище. Охраняет его инкассатор с миниганом.',
    level: { campaign: 2 },
    intro: [
      ['', 'Ночь. Банк «Депозит». Амир паркуется аккуратно, по разметке.'],
      ['ykylas', 'Юридически вы забираете свою же зарплату. Я проверил.'],
      ['daur', 'Ыкылас, ты как тут оказался?'],
      ['ykylas', 'Проезжал. ...Удачи.'],
      ['aseke', 'Я в сети банка. Камеры у них новые, но я считаю, старые были лучше. Пятнадцать секунд — и они слепые.'],
      ['dani', 'Асеке, а ты нам потом зарплату на карту закинешь, если мы её найдём?'],
      ['aseke', 'Я сисадмин, а не бухгалтер. Но курс по финансам я проходил.'],
      ['gal', 'Тогда начинаем. Хранилище в конце служебного коридора.'],
    ],
    outro: [
      ['', 'Хранилище пустое. На стене висит приглашение на корпоратив.'],
      ['daur', '«Корпоратив ко Дню учителя. Клуб VIBE». Это же наш корпоратив!'],
      ['ulzhan', 'Мальчики, я же говорила — все идут, никаких отговорок! Я столик забронировала.'],
      ['gal', 'Улжан, в этом клубе люди Депозита прячут деньги.'],
      ['ulzhan', 'Тем более идём. Заодно и деньги вернём. Будет что вспомнить.'],
      ['dani', 'Первый корпоратив, на который я иду с удовольствием.'],
    ],
  },
  {
    id: 'ch4', title: 'ГЛАВА 4. КОРПОРАТИВ', place: 'Клуб VIBE', color: '#ff2a6d',
    blurb: 'Корпоратив ко Дню учителя. Физруки в деле.',
    level: { campaign: 3 },
    intro: [
      ['', 'Клуб VIBE. Корпоратив. Музыка громче, чем выстрелы.'],
      ['asik', 'Парни! Я слышал, тут будет махач. Я в деле, я же боксёр!'],
      ['meka', 'Я своих футболистов предупредил — пусть сегодня не приходят. Хотя они бы помогли...'],
      ['nurzhan', 'Я всё распланировал: заходим с трёх сторон, как в шахматах. Вот схема.'],
      ['asik', 'Нуржан, это меню.'],
      ['nurzhan', 'Ой. На обороте схема.'],
      ['aulet', 'Коллеги, с точки зрения urban design этот клуб — антиутопия. Каждый выход — это exit strategy.'],
      ['dani', 'Аулет, это значит «можно бежать»?'],
      ['aulet', 'Это значит, что выбор пути определяет нас. Но да.'],
      ['gal', 'VIP-зал. Деньги там. Физруки держат вход, мы идём внутрь.'],
    ],
    outro: [
      ['', 'Вышибала повержен. В VIP-ложе — только записка.'],
      ['thug', '(хрипит) Вы опоздали... Завтра в «Болашак» приедет «проверка»... Заберут подписи и печати...'],
      ['daur', 'Проверка? Это же те, перед кем все делают вид, что работают.'],
      ['gal', 'Только эта проверка — фальшивая. Ряженые от Депозита.'],
      ['meka', 'Я уже всем написал. К утру весь колледж будет знать. Ну, как всегда.'],
      ['asik', 'Слушайте, а я кого-то вырубил... Это был наш?'],
      ['nurzhan', 'Это был манекен, Асик.'],
    ],
  },
  {
    id: 'ch5', title: 'ГЛАВА 5. ПРОВЕРКА', place: 'Колледж «Болашак», день проверки', color: '#ffb040',
    blurb: 'Весь колледж делает вид, что работает. А по коридорам ходят ряженые ревизоры.',
    level: { seed: 550701, name: '«БОЛАШАК». ДЕНЬ ПРОВЕРКИ', sub: 'Делайте вид, что работаете', color: '#ffb040', boss: 'revisor', mul: 1.1 },
    intro: [
      ['', 'Утро. Колледж блестит. Табели сданы. Кураторские папки — тоже. Впервые в истории.'],
      ['galym', 'Ребятки, всё будет чётко, на чиле! Я провёл курс «Как пережить проверку». Держите сертификаты.'],
      ['dani', 'Галым агай, а что с ним делать?'],
      ['galym', 'Это сертификат. Он просто есть. Это вайб!'],
      ['aseke', 'Внимание. По камерам — восемь «ревизоров». У всех одинаковые чемоданы. Настоящие так не ходят.'],
      ['amir', 'Студенты! Кто опоздал — не входит! ...Коллеги, к вам это не относится. Наверное.'],
      ['daur', 'Главный ревизор пошёл в кабинет директора. Там все печати.'],
      ['gal', 'Директор в командировке. Значит, защищать печать некому, кроме нас.'],
    ],
    outro: [
      ['', 'Ряженый ревизор снимает парик. Под ним — татуировка «М. Д.»'],
      ['ykylas', 'Подделка документов. Плюс незаконное проникновение. Плюс плохой парик.'],
      ['galym', 'Вот это вы, конечно, разнесли! Всем по сертификату — «Защитник колледжа»!'],
      ['dani', 'Этот я, пожалуй, повешу.'],
      ['aseke', 'У «ревизора» нашёлся навигатор. Последний адрес — склад в порту Актау.'],
      ['daur', 'Порт... У меня машина. Только бензин на нуле. Из-за зарплаты.'],
    ],
  },
  {
    id: 'ch6', title: 'ГЛАВА 6. НОВЕНЬКИЕ', place: 'Порт Актау, склады', color: '#8a8aff',
    blurb: 'В колледже пополнение. И очень вовремя.',
    level: { seed: 660802, name: 'ПОРТ АКТАУ', sub: 'Склады Мистера Депозита', color: '#8a8aff', boss: 'brigadir', mul: 1.25 },
    intro: [
      ['', 'В «Болашак» пришли двое новеньких. Их представили на планёрке за пять минут до выезда.'],
      ['dias', 'Диас. Юриспруденция. ...По-казахски пока плохо, извините.'],
      ['dani', 'Ничего, у нас по-русски тоже не все понимают. Особенно Аулета.'],
      ['gal', 'Слушай, а у тебя на запястье тату «wanted». Это нам стоит знать?'],
      ['dias', 'Нет.'],
      ['ereke', 'Ерболат. Можно просто Ереке. НВП. Слышал, у вас тут война за зарплату. Я с вами.'],
      ['daur', 'Вот это я понимаю — новый коллега. С первого дня стал своим.'],
      ['ereke', 'В порту склад, охрана, бригадир — шкаф размером с контейнер. Работаем по-армейски: тихо и быстро.'],
      ['dani', 'Тихо — это ко мне. У меня глушитель.'],
    ],
    outro: [
      ['', 'Бригадир не встаёт. На складе — пустые мешки с надписью «ЗАРПЛАТЫ АКТАУ».'],
      ['dias', 'Деньги вывезли. Вот накладная. Адрес — особняк за городом.'],
      ['ereke', 'Хорошо поработали. Завтра — финал.'],
      ['gal', 'Слушайте... а кто вообще этот Депозит? Его кто-нибудь видел?'],
      ['zhuma', 'Видел. Давно. Я из-за него и уволился — зарплату не платили годами.'],
      ['daur', 'Жума-агай?! Легенда!'],
      ['zhuma', 'Я покажу дорогу. Пора вернуть то, что принадлежит учителям.'],
    ],
  },
  {
    id: 'ch7', title: 'ГЛАВА 7. ДЕНЬ ЗАРПЛАТЫ', place: 'Особняк Мистера Депозита', color: '#ffd319',
    blurb: 'Финал. Все зарплаты Актау — в одном доме.',
    level: { seed: 770903, name: 'ОСОБНЯК ДЕПОЗИТА', sub: 'Здесь лежат все зарплаты Актау', color: '#ffd319', boss: 'deposit', mul: 1.4 },
    intro: [
      ['', 'Ночь. Особняк за городом. Ворота из золота. Наверное, из нашей зарплаты.'],
      ['zhuma', 'Я двадцать лет ждал этого дня. Сынки, не подведите.'],
      ['aseke', 'Я с вами на связи. Камеры отключу. Вспомнил молодость, как в CS 1.6.'],
      ['symbat', 'Чай в термосе. Возвращайтесь живыми, пожалуйста.'],
      ['ulzhan', 'Если вернёте зарплату — следующий корпоратив за мой счёт. Шучу. Но вы постарайтесь.'],
      ['deposit', 'Учителя... Вы правда думали, что деньги «не поступили»? Они поступили. Ко мне.'],
      ['dani', 'Слушай, Депозит. Я брал в долг у магазина, у столовой и у МФО. Но у тебя я ничего не брал.'],
      ['daur', 'А я из-за тебя так и не ушёл в айти!'],
      ['gal', 'Хватит разговоров. Отдай зарплату.'],
      ['deposit', 'Попробуйте взять.'],
    ],
    outro: [
      ['', 'Мистер Депозит повержен. Сейф открывается сам — внутри зарплаты за все задержанные месяцы.'],
      ['sms', 'Зачислено: заработная плата. Баланс: впервые больше нуля.'],
      ['dani', 'ПАРНИ! ЗАРПЛАТА ПРИШЛА! Я первый узнал — я всегда первый узнаю!'],
      ['ulzhan', 'Директор вернулась из командировки. Говорит: «Видите, а вы переживали».'],
      ['gal', 'Ну да. Мы совсем не переживали.'],
      ['amir', 'Коллеги... Может, теперь всё-таки посидим? Лампово?'],
      ['asik', 'Амир, сегодня — да. Даже я «за».'],
      ['daur', 'Знаете... Может, я и не уйду в айти. Коллектив у нас нормальный.'],
      ['dani', 'До следующего десятого числа.'],
      ['', 'КОНЕЦ. Спасибо, что играли! Колледж «Болашак» ещё вернётся.'],
    ],
  },
];

// ---------- прогресс сюжета (в браузере) ----------
const StoryProgress = {
  unlocked() { try { return Math.max(1, parseInt(localStorage.getItem('cs_story') || '1', 10) || 1); } catch (e) { return 1; } },
  unlock(n) { try { if (n > this.unlocked()) localStorage.setItem('cs_story', String(Math.min(STORY.length, n))); } catch (e) {} },
};

// ---------- портреты и звуки (подхватываются, если файлы есть) ----------
const StoryAssets = {
  imgs: {}, voices: {}, _blip: null, _blipTried: false,
  portrait(game, id) {
    const c = CAST[id];
    if (!c) return null;
    if (c.hero && game.images[id] && game.images[id].naturalWidth) return game.images[id];
    if (!(id in this.imgs)) {
      const img = new Image();
      img.onerror = () => { this.imgs[id] = null; };
      img.src = `/static/img/story/${id}.png`;
      this.imgs[id] = img;
    }
    const img = this.imgs[id];
    return img && img.complete && img.naturalWidth ? img : null;
  },
  _load(src) {
    const a = new Audio();
    a.preload = 'auto';
    a.src = src;
    a.volume = 0.35;
    return a;
  },
  // звук букв: свой голос персонажа или общий щелчок; если файлов нет — тихий системный
  blip(id) {
    if (!(id in this.voices)) {
      const a = this._load(`/static/audio/story/blip_${id}.mp3`);
      this.voices[id] = a;
      a.addEventListener('error', () => { this.voices[id] = null; });
    }
    if (!this._blipTried) {
      this._blipTried = true;
      const a = this._load('/static/audio/story/blip.mp3');
      a.addEventListener('canplaythrough', () => { this._blip = a; });
    }
    const v = this.voices[id] && this.voices[id].readyState >= 2 ? this.voices[id] : this._blip;
    if (v) { try { const c = v.cloneNode(); c.volume = 0.35; c.play().catch(() => {}); } catch (e) {} }
    else AudioSys.play('menu_move', 0.18);
  },
  // музыка главы, если положена static/audio/story/chapterN.mp3
  async music(n) {
    const url = `/static/audio/story/chapter${n}.mp3`;
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) { AudioSys.stopMusic(); AudioSys.playMusic(url); }
    } catch (e) {}
  },
};

// Заглушка-портрет: силуэт и инициалы в цвете персонажа
function drawPortraitStub(ctx, x, y, s, id) {
  const c = CAST[id] || CAST[''];
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, '#1e1430'); g.addColorStop(1, '#0a0612');
  ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = c.color; ctx.globalAlpha = 0.22;
  ctx.beginPath(); ctx.arc(x + s / 2, y + s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s / 2, y + s * 0.95, s * 0.36, s * 0.32, 0, Math.PI, 0); ctx.fill();
  ctx.globalAlpha = 1;
  if (c.phone) {
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(x + s * 0.3, y + s * 0.15, s * 0.4, s * 0.7);
    ctx.fillStyle = '#3dff8a'; ctx.fillRect(x + s * 0.34, y + s * 0.22, s * 0.32, s * 0.48);
    return;
  }
  ctx.font = `bold ${Math.round(s * 0.26)}px "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = c.color;
  ctx.fillText(c.villain ? '?' : (c.name || '·').slice(0, 2), x + s / 2, y + s * 0.45);
  ctx.textBaseline = 'alphabetic';
}

// =====================================================================
// Проигрыватель диалогов: буквы печатаются, ENTER — дальше, ESC — пропустить сцену
// =====================================================================
class Dialogue {
  constructor(game, lines, { title = '', place = '', color = '#ffd319', onDone } = {}) {
    this.game = game;
    this.lines = lines || [];
    this.title = title; this.place = place; this.color = color;
    this.onDone = onDone;
    this.i = 0; this.t = 0; this.shown = 0; this.total = 0;
    this._blipN = 0;
    this._lock = 0.25;   // не пролистываем случайно нажатым Enter
  }

  get line() { return this.lines[this.i] || ['', '']; }

  update(dt) {
    this.t += dt;
    this._lock = Math.max(0, this._lock - dt);
    const text = this.line[1] || '';
    const before = Math.floor(this.shown);
    this.shown = Math.min(text.length, this.shown + dt * 46);
    if (Math.floor(this.shown) > before && Math.floor(this.shown) % 3 === 0 && text[Math.floor(this.shown)] !== ' ') StoryAssets.blip(this.line[0]);
    if (this._lock > 0) { Input.consumeClick(); return; }
    if (Input.wasPressed('Escape')) { this._finish(); return; }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter') || Input.consumeClick()) {
      if (this.shown < text.length) this.shown = text.length;
      else this._next();
    }
  }

  _next() {
    this.i++;
    this.shown = 0;
    if (this.i >= this.lines.length) this._finish();
    else AudioSys.play('menu_move', 0.4);
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    if (this.onDone) this.onDone();
  }

  draw(ctx, W, H) {
    const g = this.game, M = g.menu;
    const [id, text] = this.line;
    const c = CAST[id] || CAST[''];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // затемнение мира
    ctx.fillStyle = 'rgba(4,2,10,0.62)'; ctx.fillRect(0, 0, W, H);
    // титр главы
    if (this.title) {
      const k = Utils.clamp(this.t / 0.5, 0, 1);
      ctx.globalAlpha = k;
      M.glowText(ctx, this.title, W / 2, Math.max(48, H * 0.1), this.color, Math.min(30, W * 0.045), 'center', 16);
      ctx.font = `bold ${Math.min(14, W * 0.025)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#c8c2e0';
      ctx.fillText(this.place, W / 2, Math.max(48, H * 0.1) + 24, W - 32);
      ctx.globalAlpha = 1;
    }
    // панель диалога
    const pw = Math.min(900, W - 24), ph = Math.min(190, H * 0.36);
    const px = W / 2 - pw / 2, py = H - ph - 16;
    const narr = !id;
    M.panel(ctx, px, py, pw, ph, narr ? '#9a94b8' : c.color, 0.94);
    const ps = narr ? 0 : ph - 28;
    if (!narr) {
      const img = StoryAssets.portrait(g, id);
      const ix = px + 14, iy = py + 14;
      ctx.fillStyle = '#05030a'; ctx.fillRect(ix - 3, iy - 3, ps + 6, ps + 6);
      if (img) {
        const iw = img.naturalWidth, ih = img.naturalHeight, m = Math.min(iw, ih);
        ctx.drawImage(img, (iw - m) / 2, (ih - m) * 0.2, m, m, ix, iy, ps, ps);
      } else drawPortraitStub(ctx, ix, iy, ps, id);
      ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.strokeRect(ix - 2, iy - 2, ps + 4, ps + 4);
    }
    const tx = px + (narr ? 28 : ps + 34), tw = pw - (tx - px) - 24;
    let ty = py + 34;
    if (!narr) {
      ctx.textAlign = 'left';
      ctx.font = `bold ${Math.min(20, W * 0.032)}px "Courier New", monospace`;
      ctx.shadowColor = c.color; ctx.shadowBlur = 10; ctx.fillStyle = c.color;
      ctx.fillText(c.name, tx, ty);
      ctx.shadowBlur = 0;
      const nw = ctx.measureText(c.name).width;
      ctx.font = `${Math.min(12, W * 0.022)}px "Courier New", monospace`; ctx.fillStyle = '#7a7490';
      ctx.fillText(c.role, tx + nw + 12, ty - 1, tw - nw - 12);
      ty += 28;
    } else ty += 8;
    ctx.font = `${narr ? 'italic ' : ''}${Math.min(17, W * 0.028)}px "Courier New", monospace`;
    ctx.fillStyle = narr ? '#c8c2e0' : '#ffffff';
    ctx.textAlign = 'left';
    g.menu._wrapText(ctx, (text || '').slice(0, Math.floor(this.shown)), tx, ty, tw, Math.min(23, W * 0.036));
    // подсказка
    const done = this.shown >= (text || '').length;
    ctx.font = `bold ${Math.min(11, W * 0.02)}px "Courier New", monospace`; ctx.textAlign = 'right';
    ctx.fillStyle = done ? `rgba(255,255,255,${0.5 + 0.4 * Math.sin(this.t * 6)})` : 'rgba(255,255,255,0.35)';
    ctx.fillText(`${this.i + 1}/${this.lines.length}   ENTER — дальше   ESC — пропустить`, px + pw - 16, py + ph - 12, pw - 32);
    ctx.restore();
  }
}

// =====================================================================
// Экран выбора главы
// =====================================================================
class StoryUI {
  constructor(game) { this.game = game; this.sel = 0; this.t = 0; this.msg = ''; this.msgT = 0; }

  open() {
    this.sel = Math.min(this.sel, StoryProgress.unlocked() - 1);
    this.game.state = 'storySelect';
  }

  _rects(w, h) {
    const lw = Math.min(330, w * 0.4), rh = Math.min(46, (h - 190) / STORY.length - 6);
    const x = Math.max(16, w / 2 - (lw + Math.min(470, w * 0.5) + 20) / 2), y0 = 110;
    return STORY.map((_, i) => ({ x, y: y0 + i * (rh + 6), w: lw, h: rh }));
  }

  _choose(i) {
    if (i >= StoryProgress.unlocked()) {
      this.msg = `Сначала пройдите «${STORY[i - 1].title}»`; this.msgT = 2.5;
      AudioSys.play('empty_click');
      return;
    }
    AudioSys.play('menu_select');
    this.game.storyIdx = i;
    this.game.soloMode = 'story';
    this.game.state = 'charSelect';
  }

  update(dt) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    const n = STORY.length;
    if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW') || Input.wasPressed('MobileUp')) { this.sel = (this.sel + n - 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS') || Input.wasPressed('MobileDown')) { this.sel = (this.sel + 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) this._choose(this.sel);
    if (Input.wasPressed('Escape')) { this.game.toMenu(); return; }
    const mx = Input.mouse.x, my = Input.mouse.y, click = Input.consumeClick();
    this._rects(this.game.W, this.game.H).forEach((r, i) => {
      if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
        if ((this._lm || 0) !== mx + my) this.sel = i;
        if (click) this._choose(i);
      }
    });
    this._lm = mx + my;
  }

  draw(ctx, w, h) {
    const M = this.game.menu;
    M.drawBackground(ctx, w, h, this.t, 0.5);
    M.glowText(ctx, 'СЮЖЕТ', w / 2, 52, '#ffd319', Math.min(40, w * 0.06), 'center', 18);
    ctx.font = `${Math.min(13, w * 0.022)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('«БОЛАШАКОВЦЫ. ПЕРЕЗАПУСК» — колледж «Болашак», Актау', w / 2, 78, w - 24);
    const open = StoryProgress.unlocked();
    const R = this._rects(w, h);
    R.forEach((r, i) => {
      const ch = STORY[i], locked = i >= open, on = i === this.sel;
      ctx.save();
      ctx.globalAlpha = locked ? 0.45 : 1;
      ctx.fillStyle = on ? 'rgba(40,20,60,0.92)' : 'rgba(10,5,22,0.8)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = ch.color; ctx.fillRect(r.x, r.y, on ? 5 : 3, r.h);
      ctx.strokeStyle = on ? ch.color : 'rgba(255,255,255,0.12)'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.font = `bold ${Math.min(14, r.h * 0.34)}px "Courier New", monospace`; ctx.textAlign = 'left'; ctx.fillStyle = on ? '#fff' : '#c8c2e0';
      ctx.fillText(locked ? `🔒 ГЛАВА ${i + 1}` : ch.title, r.x + 14, r.y + r.h * 0.45, r.w - 24);
      ctx.font = `${Math.min(11, r.h * 0.27)}px "Courier New", monospace`; ctx.fillStyle = '#8a84a0';
      ctx.fillText(locked ? 'закрыто' : ch.place, r.x + 14, r.y + r.h * 0.8, r.w - 24);
      ctx.restore();
    });
    // описание выбранной главы
    const ch = STORY[this.sel], locked = this.sel >= open;
    const dx = R[0].x + R[0].w + 20, dw = Math.min(470, w - dx - 16), dy = R[0].y, dh = R[R.length - 1].y + R[0].h - dy;
    if (dw > 160) {
      M.panel(ctx, dx, dy, dw, dh, ch.color, 0.85);
      ctx.textAlign = 'left';
      M.glowText(ctx, locked ? '???' : ch.title, dx + 18, dy + 34, ch.color, Math.min(18, dw * 0.045), 'left', 10);
      ctx.font = `bold ${Math.min(13, dw * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#ffffff';
      ctx.fillText(locked ? '' : ch.place, dx + 18, dy + 58, dw - 36);
      ctx.font = `${Math.min(13, dw * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#c8c2e0';
      let y = dy + 86;
      y += M._wrapText(ctx, locked ? 'Пройдите предыдущую главу, чтобы открыть эту.' : ch.blurb, dx + 18, y, dw - 36, 18);
      if (!locked) {
        const Lv = ch.level.campaign !== undefined ? CAMPAIGN[ch.level.campaign] : ch.level;
        const boss = BOSS_TYPES[ch.level.campaign !== undefined ? Lv.boss : ch.level.boss];
        y += 10;
        ctx.fillStyle = '#05d9e8'; ctx.font = `bold ${Math.min(12, dw * 0.028)}px "Courier New", monospace`;
        ctx.fillText('ЛОКАЦИЯ', dx + 18, y); ctx.fillStyle = '#ffffff'; ctx.fillText(Lv.name, dx + 110, y, dw - 128);
        y += 20;
        ctx.fillStyle = '#ff5a3a'; ctx.fillText('БОСС', dx + 18, y); ctx.fillStyle = '#ffffff'; ctx.fillText(boss ? `${boss.name} — ${boss.title}` : '—', dx + 110, y, dw - 128);
        y += 20;
        const who = [...new Set([...ch.intro, ...ch.outro].map(l => l[0]).filter(s => s && CAST[s] && !CAST[s].hero && !CAST[s].villain && !CAST[s].phone))];
        if (who.length) {
          ctx.fillStyle = '#ffd319'; ctx.fillText('В ГЛАВЕ', dx + 18, y);
          ctx.fillStyle = '#c8c2e0'; ctx.font = `${Math.min(12, dw * 0.028)}px "Courier New", monospace`;
          M._wrapText(ctx, who.map(s => CAST[s].name).join(', '), dx + 110, y, dw - 128, 16);
        }
      }
    }
    if (this.msgT > 0) {
      ctx.globalAlpha = Math.min(1, this.msgT);
      ctx.font = 'bold 14px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd319';
      ctx.fillText(this.msg, w / 2, h - 52, w - 24);
      ctx.globalAlpha = 1;
    }
    ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('W/S — выбор   ENTER — играть   ESC — назад', w / 2, h - 22, w - 24);
  }
}
