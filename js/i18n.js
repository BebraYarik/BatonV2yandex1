const pairs = {
  title: ["Батон: хлебная империя", "Baton: Bread Empire"],
  tagline: [
    "Один батон. Бесконечные возможности.",
    "One loaf. Endless possibilities.",
  ],
  balance: ["БАТОНОВ", "LOAVES"],
  perSecond: ["в секунду", "per second"],
  perClick: ["за клик", "per click"],
  bake: ["Испечь батон", "Bake a loaf"],
  production: ["Производство", "Production"],
  upgrades: ["Улучшения", "Upgrades"],
  prestige: ["Новый замес", "New dough"],
  achievements: ["Достижения", "Achievements"],
  quests: ["Заказы", "Orders"],
  settings: ["Настройки", "Settings"],
  sound: ["Звук", "Sound"],
  save: ["Сохранить", "Save"],
  close: ["Закрыть", "Close"],
  cancel: ["Пока нет", "Not now"],
  shopTitle: ["Пекарни и агрегаты", "Bakeries & machines"],
  hint: [
    "Нажимай на батон → купи первую ложку",
    "Tap the loaf → buy your first spoon",
  ],
  owned: ["Куплено", "Owned"],
  each: ["за штуку", "each"],
  contribution: ["Вклад", "Output"],
  next: ["Следующая цель", "Next goal"],
  secret: ["Секрет пекарни", "Bakery secret"],
  noUpgrades: [
    "Продолжай печь — откроются новые рецепты.",
    "Keep baking to discover new recipes.",
  ],
  bought: ["Куплено!", "Purchased!"],
  clickEffect: ["Клик ×{n}", "Click ×{n}"],
  globalEffect: ["Производство ×{n}", "Production ×{n}"],
  goldenEffect: ["Частота плюшек ×{n}", "Golden bun frequency ×{n}"],
  percentEffect: ["Клик +{n}% BPS", "Click +{n}% of BPS"],
  buildingEffect: ["Производство: {name} ×{n}", "Output: {name} ×{n}"],
  crusts: ["Золотые корочки", "Golden crusts"],
  crustHelp: [
    "Корочки остаются навсегда. Каждая заработанная корочка даёт +15% к производству.",
    "Crusts last forever. Every crust ever earned adds +15% production.",
  ],
  runBaked: ["Испечено за цикл", "Baked this run"],
  lifetime: ["Испечено за всё время", "All-time loaves"],
  clicks: ["Нажатий за всё время", "All-time clicks"],
  golden: ["Поймано плюшек", "Golden buns caught"],
  bestBps: ["Рекорд BPS", "Best BPS"],
  prestiges: ["Новых замесов", "New dough runs"],
  bonus: ["Постоянный множитель", "Permanent multiplier"],
  prestigeReward: ["Награда сейчас: +{n} корочек", "Reward now: +{n} crusts"],
  nextCrust: [
    "Следующая корочка при {n} батонов за цикл",
    "Next crust at {n} loaves this run",
  ],
  prestigeLocked: [
    "Откроется при 1 млн батонов за цикл",
    "Unlocks at 1 million loaves this run",
  ],
  prestigeConfirm: [
    "Начать новый замес? Ты получишь +{n} золотых корочек. Батоны, постройки, обычные улучшения и задания сбросятся. Постоянные бонусы, достижения, коллекция и рекорды останутся.",
    "Start new dough? You will receive +{n} golden crusts. Loaves, buildings, regular upgrades and orders reset. Permanent bonuses, achievements, collection and records stay.",
  ],
  prestigeDone: [
    "Новый замес начат! +{n} корочек. Выбирай постоянные улучшения ниже.",
    "New dough started! +{n} crusts. Choose permanent upgrades below.",
  ],
  permanentShop: ["Рецепты навсегда", "Recipes forever"],
  rank: ["Ранг", "Rank"],
  maxRank: ["Максимальный ранг", "Maximum rank"],
  productionPreview: ["BPS после покупки: {n}", "BPS after purchase: {n}"],
  all: ["Все", "All"],
  baking: ["Выпечка", "Baking"],
  collection: ["Коллекция", "Collection"],
  earned: ["Получено", "Earned"],
  locked: ["Не открыто", "Locked"],
  metric_baked: ["Испечь {n} батонов за всё время", "Bake {n} lifetime loaves"],
  metric_clicks: ["Нажать на батон {n} раз", "Tap the loaf {n} times"],
  metric_buildings: [
    "Владеть {n} производствами за цикл",
    "Own {n} buildings in one run",
  ],
  metric_golden: ["Поймать {n} золотых плюшек", "Catch {n} golden buns"],
  metric_bps: [
    "Достичь {n} BPS без временных бонусов",
    "Reach {n} BPS without temporary bonuses",
  ],
  metric_upgrades: [
    "Купить {n} улучшений за цикл",
    "Buy {n} upgrades in one run",
  ],
  metric_offline: ["Испечь {n} батонов офлайн", "Bake {n} loaves offline"],
  metric_prestige: ["Выполнить {n} новых замесов", "Start new dough {n} times"],
  metric_crusts: [
    "Заработать {n} корочек за всё время",
    "Earn {n} lifetime crusts",
  ],
  metric_permanent: [
    "Купить {n} рангов постоянных улучшений",
    "Buy {n} permanent upgrade ranks",
  ],
  metric_maxBuy: [
    "Купить {n} производств одной покупкой MAX",
    "Buy {n} buildings in one MAX purchase",
  ],
  metric_skins: ["Открыть {n} скинов", "Unlock {n} skins"],
  metric_quests: ["Выполнить {n} заказов", "Complete {n} orders"],
  metric_balance: [
    "Накопить {n} батонов на балансе",
    "Hold {n} loaves in your balance",
  ],
  metric_events: ["Завершить {n} событий", "Complete {n} events"],
  metric_chef: [
    "Подсказка: бабушка, масло и немного золотой удачи.",
    "Hint: grandma, butter and a little golden luck.",
  ],
  claim: ["Забрать", "Claim"],
  reward: ["Награда", "Reward"],
  questHelp: [
    "Три заказа одновременно. Новая цель появляется после получения награды.",
    "Three orders at a time. Claim a reward to receive the next goal.",
  ],
  quest_clicks: ["Нажать {n} раз", "Tap {n} times"],
  quest_baked: ["Испечь {n} батонов", "Bake {n} loaves"],
  quest_buildings: ["Купить {n} производств", "Buy {n} buildings"],
  quest_golden: ["Поймать {n} плюшек", "Catch {n} golden buns"],
  quest_bps: ["Развить производство до {n} BPS", "Reach {n} BPS"],
  orderDone: ["Заказ выполнен! +{n} батонов", "Order delivered! +{n} loaves"],
  goldenCatch: ["Поймать золотую плюшку", "Catch a golden bun"],
  frenzy: ["Выпечка ×7", "Baking ×7"],
  clickBuff: ["Клик ×15", "Click ×15"],
  adBuff: ["Производство ×2", "Production ×2"],
  queueBuff: ["Очередь ×2", "Queue ×2"],
  goldenGift: ["Счастливая крошка! +{n} батонов", "Lucky crumb! +{n} loaves"],
  watchAd: [
    "Смотреть рекламу → ×2 BPS на 3 минуты",
    "Watch an ad → ×2 BPS for 3 minutes",
  ],
  adUnavailable: [
    "Реклама сейчас недоступна. Продолжай печь!",
    "No ad is available right now. Keep baking!",
  ],
  adReward: [
    "Бонус получен: ×2 BPS на 3 минуты",
    "Reward received: ×2 BPS for 3 minutes",
  ],
  adHint: [
    "Необязательный бонус, выдаётся после просмотра.",
    "Optional bonus, awarded after watching.",
  ],
  paused: ["Пекарня на паузе", "Bakery paused"],
  resume: ["Продолжить", "Continue"],
  pauseHelp: [
    "Вернись в игру, чтобы продолжить выпечку.",
    "Return to the game to continue baking.",
  ],
  offline: ["Пока тебя не было…", "While you were away…"],
  offlineGain: [
    "Пекарня испекла {n} батонов. Учтено до 8 часов.",
    "Your bakery made {n} loaves. Up to 8 hours counted.",
  ],
  local: ["Локальное сохранение", "Local save"],
  localOnly: [
    "Локальный режим · SDK недоступен",
    "Local mode · SDK unavailable",
  ],
  cloud: ["Сохранено в облаке", "Saved to cloud"],
  cloudPending: ["Облако: ожидает синхронизации", "Cloud: sync pending"],
  cloudError: [
    "Облако недоступно; повторим позже",
    "Cloud unavailable; retrying later",
  ],
  saveError: [
    "Не удалось сохранить на устройстве. Проверь доступ к хранилищу.",
    "Unable to save on this device. Check storage access.",
  ],
  badSave: [
    "Повреждённое сохранение пропущено. Использована последняя доступная копия.",
    "Invalid save ignored. The latest available backup was used.",
  ],
  otherTab: [
    "Сохранение обновлено в другой вкладке. Используется новая версия.",
    "Save updated in another tab. The newer version is now in use.",
  ],
  sdkError: [
    "SDK Яндекса не подключён. Перед публикацией проверь запуск в черновике.",
    "Yandex SDK is unavailable. Verify it in a platform draft before publishing.",
  ],
  language: ["Язык", "Language"],
  volume: ["Громкость", "Volume"],
  motion: ["Снизить анимацию", "Reduce motion"],
  stats: ["Статистика", "Statistics"],
  skins: ["Внешний вид батона", "Loaf collection"],
  skinHint: [
    "Открой: 1 000 нажатий · 10 плюшек · 1 трлн батонов · первый замес.",
    "Unlock: 1,000 taps · 10 buns · 1 trillion loaves · first new dough.",
  ],
  tutorial: ["Как играть", "How to play"],
  tutorialText: [
    "Нажимай на батон и покупай производство. Лови золотые плюшки, выполняй заказы. При 1 млн испечённых батонов начни новый замес ради постоянных усилений. Реклама необязательна.",
    "Tap the loaf and buy production. Catch golden buns and complete orders. At 1 million baked loaves, start new dough for permanent boosts. Ads are optional.",
  ],
  wipe: ["Удалить весь прогресс", "Delete all progress"],
  wipeFirst: [
    "Удалить весь прогресс? Пропадут все корочки, достижения и покупки на устройстве и в доступном облаке. Это необратимо.",
    "Delete all progress? All crusts, achievements and purchases on this device and in the available cloud will be lost. This cannot be undone.",
  ],
  wipeSecond: [
    "Последнее подтверждение: удалить весь профиль навсегда?",
    "Final confirmation: permanently delete the entire profile?",
  ],
  wipeConfirm: ["Да, удалить навсегда", "Yes, delete forever"],
  wipeDone: ["Профиль очищен", "Profile cleared"],
  wipeCloudError: [
    "Локальный профиль очищен. Удаление в облаке ещё не подтверждено — синхронизация будет повторена.",
    "Local profile cleared. Cloud deletion is not confirmed yet — sync will retry.",
  ],
  event_gost: ["Проверка качества", "Quality inspection"],
  event_queue: ["Покупатели в очереди", "Customers are waiting"],
  event_rain: ["Батонный дождь", "Bread rain"],
  event_grandma: ["Бабушкин праздник", "Grandma’s celebration"],
  eventHelp_gost: [
    "Испеки 10 батонов вручную до конца проверки.",
    "Tap the loaf 10 times before inspection ends.",
  ],
  eventHelp_queue: [
    "Обслужить очередь → ×2 производство на 30 секунд.",
    "Serve the queue → ×2 production for 30 seconds.",
  ],
  eventHelp_rain: [
    "Поймай три кусочка кнопкой ниже.",
    "Catch three slices using the button below.",
  ],
  eventHelp_grandma: [
    "Забери скидку 25% на следующую покупку производства.",
    "Claim 25% off your next building purchase.",
  ],
  eventAction: ["Участвовать", "Take part"],
  eventCatch: ["Поймать кусочек", "Catch a slice"],
  eventDone: ["Событие завершено!", "Event complete!"],
  discount: ["Скидка 25% на одну покупку", "25% off one purchase"],
  newSkin: ["Новый скин!", "New skin!"],
  achievementToast: ["Достижение открыто", "Achievement unlocked"],
  seconds: ["с", "s"],
  minutes: ["мин", "min"],
};
export const MESSAGES = Object.fromEntries(
  ["ru", "en"].map((l, i) => [
    l,
    Object.fromEntries(Object.entries(pairs).map(([k, v]) => [k, v[i]])),
  ]),
);
export const text = (lang, key, vars = {}) =>
  (MESSAGES[lang]?.[key] ?? MESSAGES.en[key] ?? key).replace(
    /\{(\w+)\}/g,
    (_, k) => String(vars[k] ?? ""),
  );
export const label = (obj, lang) => obj[lang] ?? obj.en;
export function fmt(n, lang = "ru", exact = false) {
  if (!Number.isFinite(n)) n = 0;
  if (exact)
    return new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(n);
  if (n >= 1e18) return n.toExponential(2);
  return new Intl.NumberFormat(lang, {
    notation: n >= 1000 ? "compact" : "standard",
    maximumFractionDigits: n < 100 ? 1 : 2,
  }).format(n);
}
const newsPairs = [
  [
    "Свежие батоны только из печи — кликай, пока горячие!",
    "Fresh from the oven. Tap while it’s hot!",
  ],
  [
    "Срочно: горячие батоны сметают с полок!",
    "Breaking: warm loaves are flying off the shelves!",
  ],
  [
    "Бабушкино тесто признано эталоном уюта.",
    "Grandma’s dough is the new standard of comfort.",
  ],
  [
    "Учёные: батон с маслом вкуснее на 200%.",
    "Scientists: butter makes bread 200% tastier.",
  ],
  [
    "Очередь за батоном растянулась до горизонта.",
    "The bread queue reaches the horizon.",
  ],
  [
    "Над городом замечен золотой круассан.",
    "A golden croissant spotted above town.",
  ],
  [
    "Пшеничные поля сообщают об урожае века.",
    "Wheat fields report the harvest of the century.",
  ],
  [
    "Пекари объявили батон королём выпечки.",
    "Bakers crown the loaf king of the oven.",
  ],
  [
    "Внутри батона найдено озеро сгущёнки.",
    "A lake of condensed milk discovered inside a loaf.",
  ],
  [
    "Фермеры требуют молоко к каждому батону.",
    "Farmers demand milk with every loaf.",
  ],
  [
    "Батонолёт совершил первый тёплый рейс.",
    "Bread rocket completes its first warm flight.",
  ],
  [
    "Кунжут подорожал: аналитики винят пекарей.",
    "Sesame prices rise. Analysts blame bakers.",
  ],
  [
    "Крошка за плечом проросла батоном.",
    "A crumb over the shoulder grew into a loaf.",
  ],
  [
    "Хлебный поезд ушёл. За ним очередь.",
    "The bread train left. The queue followed.",
  ],
  [
    "Бабушка попросила выходной. Получила печь.",
    "Grandma asked for a day off. Got an oven.",
  ],
  [
    "На Луне нашли крошки. Следствие ведёт батон.",
    "Crumbs found on the Moon. A loaf investigates.",
  ],
  [
    "Ложка прошла курсы повышения хрусткости.",
    "Wooden spoon graduates from crunch school.",
  ],
  [
    "Тесто растёт быстрее очереди на кассе.",
    "Dough rises faster than the checkout queue.",
  ],
  [
    "Пекарня открыла отдел контроля аромата.",
    "Bakery opens an aroma control department.",
  ],
  [
    "Соседи пришли за солью. Остались на батон.",
    "Neighbours came for salt. Stayed for bread.",
  ],
  [
    "В духовке обнаружена зона повышенного уюта.",
    "An area of extreme comfort found in the oven.",
  ],
  [
    "Батоны предпочитают путешествовать тёплыми.",
    "Loaves prefer to travel warm.",
  ],
  [
    "Служба доставки просит ещё один кусочек.",
    "Delivery service asks for one more slice.",
  ],
  [
    "Хруст корочки записали в симфонию.",
    "Crust crunch recorded for a symphony.",
  ],
  [
    "Мука объявила сегодня белую пятницу.",
    "Flour declares today a white Friday.",
  ],
  [
    "Тостер ушёл в отпуск. Его заменили порталом.",
    "Toaster takes a holiday. Replaced by a portal.",
  ],
  [
    "На заводе установили конвейер для крошек.",
    "Factory installs a crumb conveyor.",
  ],
  [
    "Кот назначен главным дегустатором запахов.",
    "Cat appointed chief aroma tester.",
  ],
  [
    "В городе открылась улица Свежей Корочки.",
    "Fresh Crust Street opens in town.",
  ],
  [
    "Первый хлебный спутник вышел на обеденную орбиту.",
    "First bread satellite enters lunch orbit.",
  ],
  [
    "Портал закрывается только на расстойку.",
    "Portal only closes for proofing.",
  ],
  [
    "В космосе никто не услышит твой хруст.",
    "In space, no one can hear your crunch.",
  ],
  [
    "Галактика заказала батон с доставкой.",
    "Galaxy orders a loaf for delivery.",
  ],
  ["Новый замес — старый добрый аромат.", "New dough, same comforting aroma."],
  [
    "Золотые корочки не боятся инфляции теста.",
    "Golden crusts resist dough inflation.",
  ],
  ["Бабушка измеряет успех корзинами.", "Grandma measures success in baskets."],
  [
    "Печь научилась подмигивать огоньком.",
    "Oven learns to wink with its flame.",
  ],
  [
    "Пшеничный прогноз: ожидается хлебный дождь.",
    "Wheat forecast: bread showers expected.",
  ],
  [
    "Очередь образовала собственный профсоюз.",
    "Queue forms its own bread club.",
  ],
  [
    "Космо-каравай виден без телескопа.",
    "Cosmic loaf visible without a telescope.",
  ],
  [
    "Исследователи нашли измерение вечного завтрака.",
    "Researchers discover the dimension of eternal breakfast.",
  ],
  [
    "Свежесть — единственная валюта на орбите.",
    "Freshness is the only currency in orbit.",
  ],
  [
    "Хлебный совет одобрил ещё одну печь.",
    "Bread council approves one more oven.",
  ],
  [
    "Крошечный ускоритель раскрошил рекорд.",
    "Crumb accelerator crumbles the record.",
  ],
  [
    "Закваска получила пожизненную прописку.",
    "Sourdough granted permanent residence.",
  ],
  ["Время обеда перенесено на весь день.", "Lunch time extended to all day."],
  [
    "У магазина запах: свежеиспечённый успех.",
    "The shop smells like freshly baked success.",
  ],
  ["Космическая станция просит добавки.", "Space station asks for seconds."],
];
export const NEWS = newsPairs.map(([ru, en], i) => ({
  ru,
  en,
  stage: i < 24 ? 0 : i < 33 ? 2 : 4,
}));
