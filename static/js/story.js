// =====================================================================
// СЮЖЕТ «ПРЕПОДЫ. ПЕРЕЗАПУСК»
// Колледж № 7 (вымышленный), Актау. Опять 10-е число — а зарплаты нет.
// «Средства не поступили с ОБЛОНО» — говорит бухгалтерия. Но в этот раз
// всё серьёзнее: зарплаты всего города перехватывает вымышленная банда
// легендарного «Мистера Депозита». Айтишники идут возвращать своё.
//
// Фото персонажей: static/img/story/<id>.png (если файла нет — рисуется заглушка).
// Звуки (необязательно): static/audio/story/blip.mp3 — щелчок букв в диалоге,
// static/audio/story/blip_<id>.mp3 — свой голос персонажа,
// static/audio/story/chapter<N>.mp3 — музыка главы (1…9).
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
    id: 'ch1', title: 'ГЛАВА 1. ФИЛЛЕРНЫЙ ДЕНЬ', place: 'Колледж № 7, третий этаж', color: '#ffd319',
    blurb: 'Десятое число. Зарплаты нет. Ночью в колледже кто-то ходит по коридорам.',
    level: { campaign: 0 },
    objectives: [
      { type: 'goto', room: 6, label: 'Кабинет 324: заберите у Асеке карту камер', think: 'Сначала к Асеке. Он всё видит.',
        doneRadio: ['aseke', 'Вижу их: шарят по кабинетам, ищут ведомости. Заберите их первыми!'] },
      { type: 'collect', n: 3, rooms: [1, 2, 7], item: 'folder', label: 'Заберите ведомости из кабинетов 319, 321 и 316',
        thinks: ['Ведомость за прошлый месяц… ещё без подписи.', 'Хорошо, что в 316 бардак — они её не нашли.', 'Последняя. Можно выдохнуть.'] },
      { type: 'hold', room: 9, t: 7, label: 'Столовая: включите свет на щитке — держитесь у щита', ambush: 3,
        radio: ['symbat', 'Щиток в столовой! Без света вы их не увидите.'], doneThink: 'Свет есть. Самсы нет. Классика.' },
      { type: 'boss', label: 'Спортзал: остановите фальшивого вахтёра', radio: ['aseke', 'Главный пошёл в спортзал. Это он у них «вахтёр».'] },
    ],
    intro: [
      ['', '10-е число. 17:58. Третий этаж колледжа № 7.'],
      ['dani', 'Ну что, кто-нибудь видел зарплату? Я уже третий раз проверяю приложение банка.'],
      ['gal', 'Бухгалтерия сказала: «Средства не поступили». Классика.'],
      ['daur', 'Всё, я ухожу в айти. Нормальное. С зарплатой. Вот прямо в этом месяце.'],
      ['gal', 'Ты это говоришь каждый месяц, Даур.'],
      ['ulzhan', 'Мальчики, новости есть, только не падайте. Директор в командировке — подпись ставить некому.'],
      ['dani', 'Ну, бывает. Подождём.'],
      ['ulzhan', 'Это ещё не всё. В бухгалтерии говорят, деньги вообще не дошли. Будто их кто-то перехватил по дороге.'],
      ['aseke', 'Парни, зайдите в 324. Я тут камеры смотрю... На первом этаже какие-то люди в кожанках. И это не студенты.'],
      ['symbat', 'Я вам чаю налила. Возьмите с собой, вдруг надолго.'],
      ['aseke', 'Они ломятся к бухгалтерии. Кажется, ищут папку с ведомостями.'],
      ['daur', 'То есть зарплату у нас не просто задержали, а ещё и воруют то, чего нет?'],
      ['gal', 'Ладно. Филлерный день закончился. Пошли.'],
    ],
    outro: [
      ['', 'Фальшивый вахтёр лежит на полу холла. Из кармана выпадает визитка.'],
      ['dani', '«МФО ЗАЙМ ДО ЗП. Мы найдём вас сами». ...Это они мне каждый день СМС шлют!'],
      ['gal', 'Отлично. Значит, адрес ты знаешь.'],
      ['aseke', 'По камерам видно: двое уехали на чёрной машине в сторону 28-го микрорайона.'],
      ['dani', 'Это мой район. Там меня все знают — проведу короткой дорогой.'],
      ['daur', 'Завтра шесть пар... Ладно, перенесём. Скажем, короткий день — прорвало трубу.'],
    ],
  },
  {
    id: 'ch2', title: 'ГЛАВА 2. ЗАЙМ ДО ЗАРПЛАТЫ', place: 'МФО «Займ до ЗП», 28 микрорайон', color: '#05d9e8',
    blurb: 'Контора, которая засыпает всех СМС про займы. Здесь знают, куда ушли деньги.',
    level: { campaign: 1 },
    objectives: [
      { type: 'goto', room: 1, label: 'Архив расписок: найдите базу должников', radio: ['amir', 'Я у входа, мотор не глушу. Только быстро!'],
        doneThink: 'Тут пол-Актау в должниках. Надо это удалить.' },
      { type: 'hold', room: 9, t: 8, label: 'Серверная: удалите базу — держитесь у стойки', ambush: 3, midAmbush: 2,
        radio: ['aseke', 'Подключаюсь удалённо… Держите их подальше от сервера!'], doneRadio: ['aseke', 'База удалена. Людей больше не будут дёргать.'] },
      { type: 'collect', n: 2, rooms: [4, 8], item: 'laptop', label: 'Заберите ноутбуки с переводами из опенспейсов' },
      { type: 'boss', label: 'Кабинет директора: разберитесь с Коллектором', think: 'Кабинет директора МФО. Звучит как босс-файт.' },
    ],
    intro: [
      ['', 'Короткий день. Пары по 45 минут. Самое время для визита в микрофинансовую контору.'],
      ['dani', 'Они мне звонят по пять раз в день. Хоть раз зайду сам.'],
      ['gal', 'Ты у них что-то брал?'],
      ['dani', 'Ни разу. Зато они кое-что взяли у всех нас.'],
      ['amir', 'Коллеги! Я вас подвёз, как и договаривались. Может, после... всего этого посидим где-нибудь? Лампово, без шума?'],
      ['daur', 'Амир-агай, давайте сначала выживем.'],
      ['amir', 'Понимаю. Я подожду в машине — мотор не глушу. Если что, сразу уезжаем.'],
      ['thug', 'Эй! Это же тот, кто наши звонки сбрасывает!'],
      ['dani', 'И правильно делаю.'],
    ],
    outro: [
      ['', 'В сейфе Коллектора — ведомости зарплат всех колледжей Актау. Подпись внизу: «М. Д.»'],
      ['gal', '«М. Д.» — Мистер Депозит. Я думал, это просто байка из курилки.'],
      ['daur', 'А мы думали, это просто байка, которую рассказывают в каждом колледже.'],
      ['dani', 'Тут ещё их «база клиентов» — пол-Актау. Удаляем, пусть людей не дёргают.'],
      ['amir', 'Деньги переводят в банк «Депозит». Я знаю, где это. Я там людей возил, когда таксовал.'],
      ['gal', 'Амир-агай, без вас мы бы не справились.'],
      ['amir', 'Значит... в пятницу посидим?'],
    ],
  },
  {
    id: 'ch3', title: 'ГЛАВА 3. ИНКАССАЦИЯ', place: 'Банк «Депозит», центр Актау', color: '#3fff8f',
    blurb: 'Зарплаты Актау лежат в хранилище. Охраняет его инкассатор с миниганом.',
    level: { campaign: 2 },
    objectives: [
      { type: 'goto', room: 5, label: 'Охрана: доберитесь до пульта сигнализации', think: 'Тихо… тут камеры на каждом шагу.' },
      { type: 'hold', room: 5, t: 6, label: 'Держите пульт, пока Асеке глушит камеры', ambush: 2,
        radio: ['aseke', 'Глушу камеры. Старые, кстати, были лучше.'], doneRadio: ['aseke', 'Готово. Банк ослеп.'] },
      { type: 'collect', n: 3, rooms: [2, 9, 10], item: 'bag', label: 'Соберите мешки с зарплатой: кассы, архив, комната персонала',
        thinks: ['Тяжёлый. Это, наверное, премии.', 'Опять мешок. Хоть бы один полный.', 'Всё, мешки наши.'] },
      { type: 'boss', label: 'Хранилище: Инкассатор', radio: ['ykylas', 'Юридически — самооборона. Действуйте.'] },
    ],
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
    objectives: [
      { type: 'goto', room: 7, label: 'Бар: найдите физруков', doneRadio: ['asik', 'Мы тут! Танцпол забит охраной!'] },
      { type: 'kill', n: 6, label: 'Танцпол: помогите физрукам — уберите 6 охранников', radio: ['meka', 'Я держу левый фланг, Нуржан — правый!'] },
      { type: 'collect', n: 1, rooms: [2], item: 'key', label: 'Офис клуба: возьмите ключ от VIP-зала', thinks: ['Ключ от VIP. Первый раз в жизни.'] },
      { type: 'boss', label: 'VIP-зал: Вышибала', radio: ['nurzhan', 'Ход конём: заходите, мы держим выход!'] },
    ],
    intro: [
      ['', 'Клуб VIBE. Корпоратив. Музыка громче, чем выстрелы.'],
      ['asik', 'Парни! Я слышал, тут будет махач. Я в деле, я же боксёр!'],
      ['meka', 'Я своих футболистов предупредил — пусть сегодня не приходят. Хотя они бы помогли...'],
      ['nurzhan', 'Я всё распланировал: заходим с трёх сторон, как в шахматах. Ход конём — через бар.'],
      ['asik', 'Нуржан, ты гений. Я иду первым.'],
      ['aulet', 'Коллеги, с точки зрения urban design этот клуб — антиутопия. Каждый выход — это exit strategy.'],
      ['dani', 'Аулет, это значит «можно бежать»?'],
      ['aulet', 'Это значит, что выбор пути определяет нас. Но да.'],
      ['gal', 'VIP-зал. Деньги там. Физруки держат вход, мы идём внутрь.'],
    ],
    outro: [
      ['', 'Вышибала повержен. В VIP-ложе — только записка.'],
      ['thug', '(хрипит) Вы опоздали... Завтра в ваш колледж приедет «проверка»... Заберут подписи и печати...'],
      ['daur', 'Проверка? Это же те, перед кем все делают вид, что работают.'],
      ['gal', 'Только эта проверка — фальшивая. Ряженые от Депозита.'],
      ['meka', 'Я уже всех предупредил. К утру колледж будет готов встретить «гостей».'],
      ['asik', 'Шестеро на одного — нечестно было. Для них.'],
      ['nurzhan', 'Красиво отработал, Асик.'],
    ],
  },
  {
    id: 'ch5', title: 'ГЛАВА 5. ПРОВЕРКА', place: 'Колледж № 7, день проверки', color: '#ffb040',
    blurb: 'Весь колледж делает вид, что работает. А по коридорам ходят ряженые ревизоры.',
    level: { seed: 550701, name: 'КОЛЛЕДЖ № 7. ДЕНЬ ПРОВЕРКИ', sub: 'Делайте вид, что работаете', color: '#ffb040', boss: 'revisor', mul: 1.1 },
    objectives: [
      { type: 'goto', room: 'mid', label: 'Кабинет директора: проверьте, на месте ли печати', think: 'Если печати украдут — зарплаты не будет до весны.' },
      { type: 'collect', n: 3, item: 'case', label: 'Найдите 3 одинаковых чемодана «ревизоров»',
        thinks: ['В чемодане — парик. Серьёзно?', 'Ещё один парик. Это не проверка, это театр.', 'Три парика. Всё ясно.'] },
      { type: 'hold', room: 'far', t: 6, label: 'Задержите ревизоров у выхода — держите проход', ambush: 3,
        radio: ['galym', 'Ребятки, я им курс читаю, чтобы отвлечь! Держитесь!'] },
      { type: 'boss', label: 'Главный ревизор', radio: ['amir', 'Студентов я увёл. Коридор ваш.'] },
    ],
    intro: [
      ['', 'Утро. Колледж блестит. Табели сданы. Кураторские папки — тоже. Впервые в истории.'],
      ['galym', 'Ребятки, всё будет чётко! Я провёл курс «Как пройти проверку». Держите сертификаты.'],
      ['dani', 'Галым агай, спасибо! Пригодится.'],
      ['galym', 'Конечно пригодится — с ним любая проверка видит профессионала!'],
      ['aseke', 'Внимание. По камерам — восемь «ревизоров». У всех одинаковые чемоданы. Настоящие так не ходят.'],
      ['amir', 'Студентов я увёл в свой кабинет — у меня порядок, никто не высунется. Действуйте.'],
      ['daur', 'Главный ревизор пошёл в кабинет директора. Там все печати.'],
      ['gal', 'Директор в командировке. Значит, защищать печать некому, кроме нас.'],
    ],
    outro: [
      ['', 'Ряженый ревизор снимает парик. Под ним — татуировка «М. Д.»'],
      ['ykylas', 'Подделка документов. Плюс незаконное проникновение. Плюс плохой парик.'],
      ['galym', 'Вот это вы, конечно, разнесли! Всем по сертификату — «Защитник колледжа»!'],
      ['dani', 'Этот я точно повешу на стену.'],
      ['aseke', 'У «ревизора» нашёлся навигатор. Последний адрес — склад в порту Актау.'],
      ['daur', 'Порт... У меня машина. Только бензин на нуле. Из-за зарплаты.'],
    ],
  },
  {
    id: 'ch6', title: 'ГЛАВА 6. НОВЕНЬКИЕ', place: 'Порт Актау, склады', color: '#8a8aff',
    blurb: 'В колледже пополнение. И очень вовремя.',
    level: { seed: 660802, name: 'ПОРТ АКТАУ', sub: 'Склады Мистера Депозита', color: '#8a8aff', boss: 'brigadir', mul: 1.25 },
    objectives: [
      { type: 'goto', room: 'mid', label: 'Склады: найдите накладные', radio: ['ereke', 'Работаем тихо. Я — по периметру.'] },
      { type: 'hold', room: 'far', t: 7, label: 'Контейнер: вскрывайте, пока Ереке прикрывает', ambush: 3, midAmbush: 2,
        radio: ['dias', 'Замок старый. Семь секунд — и он наш.'], doneThink: 'Пусто… Деньги уже увезли.' },
      { type: 'boss', label: 'Бригадир складов', radio: ['ereke', 'Шкаф идёт к вам. Не стойте в красном круге!'] },
    ],
    intro: [
      ['', 'В колледж пришли двое новеньких. Их представили на планёрке за пять минут до выезда.'],
      ['dias', 'Диас. Юриспруденция. Рад знакомству.'],
      ['dani', 'Добро пожаловать! Ты как раз вовремя.'],
      ['gal', 'Классная тату «wanted».'],
      ['dias', 'Спасибо. Долгая история.'],
      ['ereke', 'Ерболат. Можно просто Ереке. НВП. Слышал, у вас тут война за зарплату. Я с вами.'],
      ['daur', 'Вот это я понимаю — новый коллега. С первого дня стал своим.'],
      ['ereke', 'В порту склад, охрана, бригадир — шкаф размером с контейнер. Работаем по-армейски: тихо и быстро.'],
      ['dani', 'Тихо — это ко мне. У меня глушитель.'],
    ],
    outro: [
      ['', 'Бригадир не встаёт. На складе — пустые мешки с надписью «ЗАРПЛАТЫ АКТАУ».'],
      ['dias', 'Деньги грузят в машины. Их повезут через весь город — к поместью Депозита.'],
      ['ereke', 'Значит, перехватим по дороге.'],
      ['gal', 'Слушайте... а кто вообще этот Депозит? Его кто-нибудь видел?'],
      ['zhuma', 'Видел. Давно. Я из-за него и уволился — зарплату не платили годами.'],
      ['daur', 'Жума-агай?! Легенда!'],
      ['zhuma', 'Я покажу дорогу. Пора вернуть то, что принадлежит учителям.'],
    ],
  },
  {
    id: 'ch7', title: 'ГЛАВА 7. НОЧНОЙ ГОРОД', place: 'Улицы Актау, ночь', color: '#ff9a3a',
    blurb: 'Машины с зарплатами едут через весь город. Погоня по ночным улицам.',
    level: { campaign: 4 },
    objectives: [
      { type: 'goto', room: 7, label: 'Стоянка такси: Амир ждёт у машины', think: 'Мой район. Тут я каждый двор знаю.',
        doneRadio: ['amir', 'Садиться не надо — я их фары вижу! Курьеры раскидали телефоны по району.'] },
      { type: 'collect', n: 3, rooms: [1, 2, 3], item: 'phone', label: 'Найдите 3 телефона курьеров: сквер, парковка, площадь',
        thinks: ['Телефон курьера. Последний звонок — «М. Д.»', 'Опять «М. Д.». Он везде.', 'В переписке — адрес поместья. Попался.'] },
      { type: 'hold', room: 4, t: 8, label: 'Переулок: Асеке отслеживает машину — держите точку', ambush: 3, midAmbush: 2,
        radio: ['aseke', 'Ловлю сигнал… Ещё немного!'], doneRadio: ['aseke', 'Есть! Машина у моря. Водитель остановился.'] },
      { type: 'boss', label: 'Пустырь у моря: Водила', radio: ['dias', 'Он не остановится. Уходите с линии!'] },
    ],
    intro: [
      ['', 'Ночь. Актау. Фонари светят через один. По проспекту несутся чёрные машины.'],
      ['dani', 'Это же 28-й микрорайон. Мой. Здесь меня каждый подъезд знает.'],
      ['amir', 'Коллеги, я на такси. Поведу аккуратно, но быстро. По правилам.'],
      ['gal', 'Амир-агай, по правилам их не догнать.'],
      ['amir', 'Тогда… по правилам, но с вдохновением.'],
      ['aseke', 'Я слежу за камерами на перекрёстках. Курьеры петляют по дворам.'],
      ['daur', 'Главное — машину не поцарапать. Ладно, мою не поцарапать.'],
    ],
    outro: [
      ['', 'Водила лежит у разбитой машины. В бардачке — пропуск в «тропический сад» поместья.'],
      ['dias', 'Сад перед поместьем. Охраны там больше, чем деревьев.'],
      ['gal', 'Тропический сад. В Актау. Из наших зарплат.'],
      ['zhuma', 'Я знаю тайную тропу. Когда-то я там охранником подрабатывал.'],
      ['daur', 'Жума-агай, вы вообще где только не работали.'],
      ['zhuma', 'Учитель должен уметь всё, сынок.'],
    ],
  },
  {
    id: 'ch8', title: 'ГЛАВА 8. ДЖУНГЛИ', place: 'Тропический сад поместья Депозита', color: '#3fff8f',
    blurb: 'Пальмы, лианы и болото посреди степи. Сад Депозита охраняют лучше, чем банк.',
    level: { campaign: 5 },
    objectives: [
      { type: 'goto', room: 4, label: 'Старый фонтан: найдите вход в поместье', think: 'Пальмы в Актау. Видел бы это Аулет.',
        radio: ['aulet', 'Коллеги, с точки зрения landscape design это преступление против климата.'] },
      { type: 'collect', n: 3, rooms: [1, 5, 7], item: 'key', label: 'Соберите 3 части ключа от ворот: заросли, роща, болото',
        thinks: ['Первая часть. Почему ключи всегда делят на три?', 'Вторая. Тут кто-то шипит в кустах…', 'Третья. Сапоги — в болоте, ключ — у меня.'] },
      { type: 'hold', room: 6, t: 8, label: 'Поляна: Жума-агай открывает тайную тропу — прикройте его', ambush: 3, midAmbush: 3,
        radio: ['zhuma', 'Старый замок… Дайте мне восемь секунд!'], doneRadio: ['zhuma', 'Тропа открыта. Храм — дальше.'] },
      { type: 'boss', label: 'Храм Депозита: Садовник', radio: ['ereke', 'Садовник — бывший штангист. Не стойте близко!'] },
    ],
    intro: [
      ['', 'За забором поместья — джунгли. Настоящие. С лианами, пальмами и болотом.'],
      ['daur', 'Это сколько же зарплат ушло на полив?'],
      ['dani', 'Тут влажно. Энергетик нагреется.'],
      ['zhuma', 'Держитесь тропы. В кустах — охрана и собаки.'],
      ['gal', 'Огнемёт у меня. Лианы мы не боимся.'],
      ['ereke', 'Без лишнего пожара, Галымжан. Нам ещё назад выходить.'],
    ],
    outro: [
      ['', 'Садовник повержен. Ворота поместья открываются со скрипом.'],
      ['zhuma', 'Дальше — сам особняк. Он там.'],
      ['dani', 'Последний рывок. И зарплата.'],
      ['gal', 'И короткий день.'],
      ['daur', 'И… ладно, в айти потом.'],
    ],
  },
  {
    id: 'ch9', title: 'ГЛАВА 9. ДЕНЬ ЗАРПЛАТЫ', place: 'Особняк Мистера Депозита', color: '#ffd319',
    blurb: 'Финал. Все зарплаты Актау — в одном доме.',
    level: { seed: 770903, name: 'ОСОБНЯК ДЕПОЗИТА', sub: 'Здесь лежат все зарплаты Актау', color: '#ffd319', boss: 'deposit', mul: 1.4 },
    objectives: [
      { type: 'goto', room: 'mid', label: 'Найдите сейф с зарплатами', radio: ['aseke', 'Камеры особняка отключены. Как в CS 1.6.'] },
      { type: 'hold', room: 'mid', t: 8, label: 'Взломайте сейф — Асеке подбирает код', ambush: 3, midAmbush: 3,
        radio: ['aseke', 'Код из шести цифр… Держитесь!'], doneRadio: ['aseke', 'Открыто! Но денег там нет — он держит их при себе!'] },
      { type: 'boss', label: 'Мистер Депозит', radio: ['zhuma', 'Сынки, вот он. Двадцать лет я ждал.'] },
    ],
    intro: [
      ['', 'Ночь. Особняк за городом. Ворота из золота. Наверное, из нашей зарплаты.'],
      ['zhuma', 'Я двадцать лет ждал этого дня. Сынки, не подведите.'],
      ['aseke', 'Я с вами на связи. Камеры отключу. Вспомнил молодость, как в CS 1.6.'],
      ['symbat', 'Чай в термосе. Возвращайтесь живыми, пожалуйста.'],
      ['ulzhan', 'Если вернёте зарплату — следующий корпоратив за мой счёт. Шучу. Но вы постарайтесь.'],
      ['deposit', 'Учителя... Вы правда думали, что деньги «не поступили»? Они поступили. Ко мне.'],
      ['dani', 'Слушай, Депозит. Учителя и так работают за копейки. А ты забрал и копейки.'],
      ['daur', 'А я из-за тебя так и не ушёл в айти!'],
      ['gal', 'Хватит разговоров. Отдай зарплату.'],
      ['deposit', 'Попробуйте взять.'],
    ],
    outro: [
      ['', 'Мистер Депозит повержен. Сейф открывается сам — внутри зарплаты за все задержанные месяцы.'],
      ['sms', 'Зачислено: заработная плата. Баланс: впервые больше нуля.'],
      ['dani', 'ПАРНИ! ЗАРПЛАТА ПРИШЛА! Я первый узнал — я всегда первый узнаю!'],
      ['ulzhan', 'Директор вернулась из командировки и сразу всё подписала. Сказала: «Молодцы, коллеги!»'],
      ['gal', 'Приятно слышать.'],
      ['amir', 'Коллеги... Может, теперь всё-таки посидим? Лампово?'],
      ['asik', 'Амир, отличная идея! Я «за».'],
      ['daur', 'Знаете... Может, я и не уйду в айти. Коллектив у нас нормальный.'],
      ['dani', 'До следующего десятого числа.'],
      ['', 'КОНЕЦ. Спасибо, что играли! Колледж № 7 ещё вернётся.'],
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
    if (!(id in this.imgs) && !Assets.has({ type: 'portrait', name: id })) {
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
  music(n) {
    const url = `/static/audio/story/chapter${n}.mp3`;
    if (AudioSys.musicCache[url]) { AudioSys.stopMusic(); AudioSys.playMusic(url); }
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
// Экран сюжета: вкладки «ГЛАВЫ» и «ОБУЧЕНИЕ»
// =====================================================================
class StoryUI {
  constructor(game) { this.game = game; this.sel = 0; this.tsel = 0; this.tab = 'story'; this.t = 0; this.msg = ''; this.msgT = 0; }

  open(tab) {
    if (tab) this.tab = tab;
    this.sel = Math.min(this.sel, StoryProgress.unlocked() - 1);
    this.game.state = 'storySelect';
  }

  get list() { return this.tab === 'story' ? STORY : TUTORIALS; }
  get cur() { return this.tab === 'story' ? this.sel : this.tsel; }
  set cur(v) { if (this.tab === 'story') this.sel = v; else this.tsel = v; }

  _tabRects(w) {
    const tw = Math.min(170, (w - 40) / 2);
    return [{ id: 'story', x: w / 2 - tw - 4, y: 90, w: tw, h: 28 }, { id: 'tutorial', x: w / 2 + 4, y: 90, w: tw, h: 28 }];
  }

  _rects(w, h) {
    const n = this.list.length;
    const lw = Math.min(330, w * 0.4), rh = Math.min(this.tab === 'story' ? 46 : 64, (h - 200) / n - 6);
    const x = Math.max(16, w / 2 - (lw + Math.min(470, w * 0.5) + 20) / 2), y0 = 130;
    return this.list.map((_, i) => ({ x, y: y0 + i * (rh + 6), w: lw, h: rh }));
  }

  _choose(i) {
    if (this.tab === 'tutorial') {
      AudioSys.play('menu_select');
      this.game.startTutorial(i);
      return;
    }
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

  _switch(tab) { if (this.tab !== tab) { this.tab = tab; AudioSys.play('menu_move'); } }

  update(dt) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    const n = this.list.length;
    if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW') || Input.wasPressed('MobileUp')) { this.cur = (this.cur + n - 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS') || Input.wasPressed('MobileDown')) { this.cur = (this.cur + 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) this._switch('story');
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) this._switch('tutorial');
    if (Input.wasPressed('Tab')) this._switch(this.tab === 'story' ? 'tutorial' : 'story');
    if (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) { this._choose(this.cur); return; }
    if (Input.wasPressed('Escape')) { this.game.toMenu(); return; }
    const mx = Input.mouse.x, my = Input.mouse.y, click = Input.consumeClick();
    if (click) for (const r of this._tabRects(this.game.W)) if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { this._switch(r.id); return; }
    this._rects(this.game.W, this.game.H).forEach((r, i) => {
      if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
        if ((this._lm || 0) !== mx + my) this.cur = i;
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
    ctx.fillText('«ПРЕПОДЫ. ПЕРЕЗАПУСК» — колледж № 7, Актау', w / 2, 76, w - 24);
    // вкладки
    for (const r of this._tabRects(w)) {
      const on = this.tab === r.id;
      ctx.fillStyle = on ? 'rgba(255,42,109,0.85)' : 'rgba(10,5,22,0.75)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = on ? '#ffd319' : 'rgba(5,217,232,0.4)'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.font = `bold ${Math.min(14, r.w / 9)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? '#fff' : '#9a94b8';
      ctx.fillText(r.id === 'story' ? 'ГЛАВЫ' : 'ОБУЧЕНИЕ', r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    const R = this._rects(w, h);
    if (this.tab === 'story') this._drawStory(ctx, w, h, R); else this._drawTutorials(ctx, w, h, R);
    if (this.msgT > 0) {
      ctx.globalAlpha = Math.min(1, this.msgT);
      ctx.font = 'bold 14px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd319';
      ctx.fillText(this.msg, w / 2, h - 46, w - 24);
      ctx.globalAlpha = 1;
    }
    ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('A/D или TAB — вкладки   W/S — выбор   ENTER — играть   ESC — назад', w / 2, h - 20, w - 24);
  }

  _row(ctx, r, on, locked, color, title, sub) {
    ctx.save();
    ctx.globalAlpha = locked ? 0.45 : 1;
    ctx.fillStyle = on ? 'rgba(40,20,60,0.92)' : 'rgba(10,5,22,0.8)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = color; ctx.fillRect(r.x, r.y, on ? 5 : 3, r.h);
    ctx.strokeStyle = on ? color : 'rgba(255,255,255,0.12)'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.font = `bold ${Math.min(14, r.h * 0.32)}px "Courier New", monospace`; ctx.textAlign = 'left'; ctx.fillStyle = on ? '#fff' : '#c8c2e0';
    ctx.fillText(title, r.x + 14, r.y + r.h * 0.45, r.w - 24);
    ctx.font = `${Math.min(11, r.h * 0.25)}px "Courier New", monospace`; ctx.fillStyle = '#8a84a0';
    ctx.fillText(sub, r.x + 14, r.y + r.h * 0.8, r.w - 24);
    ctx.restore();
  }

  _detail(R, w) {
    const dx = R[0].x + R[0].w + 20, dw = Math.min(470, w - dx - 16), dy = R[0].y, dh = R[R.length - 1].y + R[0].h - dy;
    return { dx, dw, dy, dh };
  }

  _drawStory(ctx, w, h, R) {
    const M = this.game.menu, open = StoryProgress.unlocked();
    R.forEach((r, i) => {
      const ch = STORY[i], locked = i >= open;
      this._row(ctx, r, i === this.sel, locked, ch.color, locked ? `🔒 ГЛАВА ${i + 1}` : ch.title, locked ? 'закрыто' : ch.place);
    });
    const ch = STORY[this.sel], locked = this.sel >= open;
    const { dx, dw, dy, dh } = this._detail(R, w);
    if (dw <= 160) return;
    M.panel(ctx, dx, dy, dw, dh, ch.color, 0.85);
    ctx.textAlign = 'left';
    M.glowText(ctx, locked ? '???' : ch.title, dx + 18, dy + 34, ch.color, Math.min(18, dw * 0.045), 'left', 10);
    ctx.font = `bold ${Math.min(13, dw * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#ffffff';
    ctx.fillText(locked ? '' : ch.place, dx + 18, dy + 58, dw - 36);
    ctx.font = `${Math.min(13, dw * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#c8c2e0';
    let y = dy + 86;
    y += M._wrapText(ctx, locked ? 'Пройдите предыдущую главу, чтобы открыть эту.' : ch.blurb, dx + 18, y, dw - 36, 18);
    if (locked) return;
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

  _drawTutorials(ctx, w, h, R) {
    const M = this.game.menu, done = TutorialProgress.done();
    R.forEach((r, i) => {
      const t = TUTORIALS[i];
      this._row(ctx, r, i === this.tsel, false, t.color, (done.includes(t.id) ? '✓ ' : '') + t.title, `${t.steps.filter(s => !s.say).length} заданий · инструктор Ереке`);
      // портрет героя
      const img = this.game.images[t.hero], s = r.h - 12;
      if (img && img.complete && img.naturalWidth && r.w > 260) {
        ctx.drawImage(img, r.x + r.w - s - 8, r.y + 6, s, s);
        ctx.strokeStyle = t.color; ctx.strokeRect(r.x + r.w - s - 8.5, r.y + 5.5, s + 1, s + 1);
      }
    });
    const t = TUTORIALS[this.tsel];
    const { dx, dw, dy, dh } = this._detail(R, w);
    if (dw <= 160) return;
    M.panel(ctx, dx, dy, dw, Math.max(dh, 200), t.color, 0.85);
    ctx.textAlign = 'left';
    M.glowText(ctx, t.title, dx + 18, dy + 34, t.color, Math.min(18, dw * 0.045), 'left', 10);
    ctx.font = `bold ${Math.min(13, dw * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#ffffff';
    ctx.fillText('Полигон НВП · пять комнат · погибнуть нельзя', dx + 18, dy + 58, dw - 36);
    ctx.font = `${Math.min(13, dw * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#c8c2e0';
    let y = dy + 86;
    y += M._wrapText(ctx, 'Чему научит: ' + t.topics + '.', dx + 18, y, dw - 36, 18);
    ctx.fillStyle = done.includes(t.id) ? '#3dff8a' : '#ffd319';
    ctx.font = `bold ${Math.min(12, dw * 0.028)}px "Courier New", monospace`;
    ctx.fillText(done.includes(t.id) ? 'ПРОЙДЕН — можно повторить' : 'ENTER — начать урок', dx + 18, y + 10, dw - 36);
  }
}
