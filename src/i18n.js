// UI translations: English, Russian, Armenian.
export const LANGS = { en: 'EN', ru: 'RU', hy: 'ՀՅ' };

const D = {
  title: { en: 'World Explorer — paint your world', ru: 'World Explorer — раскрась свой мир', hy: 'World Explorer — ներկիր քո աշխարհը' },
  sub: { en: "Paint the places you've really been — from countries down to streets.", ru: 'Раскрась места, где ты реально был — от страны до улицы.', hy: 'Ներկիր այն վայրերը, որտեղ իրականում եղել ես՝ երկրից մինչև փողոց։' },
  login: { en: 'Log in', ru: 'Вход', hy: 'Մուտք' },
  signup: { en: 'Sign up', ru: 'Регистрация', hy: 'Գրանցում' },
  namePh: { en: 'Name (for your profile)', ru: 'Имя (для профиля)', hy: 'Անուն (պրոֆիլի համար)' },
  passPh: { en: 'Password (min. 6 characters)', ru: 'Пароль (мин. 6 символов)', hy: 'Գաղտնաբառ (նվազ. 6 նիշ)' },
  doLogin: { en: 'Log in', ru: 'Войти', hy: 'Մուտք գործել' },
  doSignup: { en: 'Create account', ru: 'Создать аккаунт', hy: 'Ստեղծել հաշիվ' },
  localNote: { en: '⚠️ Supabase is not connected — local mode (data is stored in this browser).', ru: '⚠️ Supabase ещё не подключён — работает локальный режим (данные хранятся в этом браузере).', hy: '⚠️ Supabase-ը միացված չէ — տեղային ռեժիմ (տվյալները պահվում են այս դիտարկիչում)։' },
  searchPh: { en: 'Find a place: Shanghai, Bali…', ru: 'Найти место: Шанхай, Бали…', hy: 'Գտնել վայր՝ Երևան, Բալի…' },
  profile: { en: 'Profile', ru: 'Профиль', hy: 'Պրոֆիլ' },
  pan: { en: 'Move', ru: 'Двигать', hy: 'Շարժել' },
  brush: { en: 'Brush', ru: 'Кисть', hy: 'Վրձին' },
  fill: { en: 'Fill', ru: 'Заливка', hy: 'Լցնել' },
  eraser: { en: 'Eraser', ru: 'Ластик', hy: 'Ռետին' },
  undo: { en: 'Undo', ru: 'Отмена', hy: 'Հետարկել' },
  customColor: { en: 'Custom color', ru: 'Свой цвет', hy: 'Քո գույնը' },
  sizeOpacity: { en: 'Size and opacity', ru: 'Размер и прозрачность', hy: 'Չափ և թափանցիկություն' },
  size: { en: 'Size', ru: 'Размер', hy: 'Չափ' },
  opacity: { en: 'Opacity', ru: 'Прозрачность', hy: 'Թափանցիկություն' },
  countries: { en: 'countries', ru: 'стран', hy: 'երկիր' },
  marks: { en: 'marks', ru: 'отметок', hy: 'նշում' },
  world: { en: 'of world', ru: 'мира', hy: 'աշխարհի' },
  myPlaces: { en: 'My places', ru: 'Мои места', hy: 'Իմ վայրերը' },
  clearAll: { en: '🗑️ Clear all', ru: '🗑️ Очистить всё', hy: '🗑️ Մաքրել ամբողջը' },
  logout: { en: 'Log out', ru: 'Выйти', hy: 'Ելք' },
  language: { en: 'Language', ru: 'Язык', hy: 'Լեզու' },

  hintPan: { en: 'Spin the globe, zoom with wheel or pinch — down to streets', ru: 'Крути глобус, приближай колёсиком или щипком — до улиц', hy: 'Պտտիր գլոբուսը, մոտեցրու անիվով կամ երկու մատով՝ մինչև փողոցներ' },
  hintBrush: { en: 'Paint on the map — the brush sticks to the ground and scales with it', ru: 'Рисуй по карте — кисть привязана к местности и масштабируется вместе с ней', hy: 'Նկարիր քարտեզի վրա — վրձինը կապված է տեղանքին և մեծանում է նրա հետ' },
  hintEraser: { en: 'Tap or drag over a mark to erase it', ru: 'Нажми или проведи по отметке, чтобы стереть', hy: 'Սեղմիր կամ անցկացրու նշման վրայով՝ ջնջելու համար' },
  hintFillHover: { en: '🪣 Hover over land — I’ll highlight what gets filled', ru: '🪣 Наведи на сушу — подсвечу, что зальётся', hy: '🪣 Պահիր ցամաքի վրա — ցույց կտամ, ինչը կլցվի' },
  hintFillTouch: { en: '🪣 Aim the crosshair — I’ll highlight what gets filled, then tap', ru: '🪣 Наведи прицел на место — подсвечу, что зальётся, затем тапни', hy: '🪣 Ուղղիր նշանը — ցույց կտամ, ինչը կլցվի, հետո սեղմիր' },
  hintAimLand: { en: '🪣 Aim the crosshair at land', ru: '🪣 Наведи прицел на сушу', hy: '🪣 Ուղղիր նշանը ցամաքի վրա' },
  lvl_adm0: { en: 'country', ru: 'страна', hy: 'երկիր' },
  lvl_adm1: { en: 'region', ru: 'регион', hy: 'մարզ' },
  lvl_adm2: { en: 'district', ru: 'округ', hy: 'շրջան' },
  lvl_adm3: { en: 'city / county', ru: 'город / уезд', hy: 'քաղաք / համայնք' },

  bordersFail: { en: 'Could not load country borders', ru: 'Не удалось загрузить границы стран', hy: 'Չհաջողվեց բեռնել երկրների սահմանները' },
  ocean: { en: 'Ocean / unknown', ru: 'Океан / неизвестно', hy: 'Օվկիանոս / անհայտ' },
  empty: { en: 'Nothing yet. Grab the brush 🖌️ and paint your first place!', ru: 'Пока пусто. Возьми кисть 🖌️ и раскрась первое место!', hy: 'Դեռ դատարկ է։ Վերցրու վրձինը 🖌️ և ներկիր առաջին վայրը։' },
  wholeCountry: { en: 'whole country', ru: 'вся страна', hy: 'ամբողջ երկիրը' },
  nMarks: { en: '{n} marks', ru: '{n} отм.', hy: '{n} նշում' },
  saveErr: { en: 'Save error: ', ru: 'Ошибка сохранения: ', hy: 'Պահպանման սխալ՝ ' },
  delErr: { en: 'Delete error: ', ru: 'Ошибка удаления: ', hy: 'Ջնջման սխալ՝ ' },
  loadErr: { en: 'Load error: ', ru: 'Ошибка загрузки: ', hy: 'Բեռնման սխալ՝ ' },
  busy: { en: 'the borders server is busy, try again in a minute', ru: 'сервер границ сейчас занят, попробуй через минуту', hy: 'սահմանների սերվերը զբաղված է, փորձիր մեկ րոպեից' },
  noLand: { en: '🌊 No land here — the ocean can’t be filled', ru: '🌊 Тут нет суши — океан не заливается', hy: '🌊 Այստեղ ցամաք չկա — օվկիանոսը չի լցվում' },
  unfilled: { en: '{name} — fill removed', ru: '{name} — заливка снята', hy: '{name} — լցումը հանված է' },
  filled: { en: '🎉 {name} painted!', ru: '🎉 {name} раскрашено!', hy: '🎉 {name}՝ ներկված է։' },
  undone: { en: 'Undone', ru: 'Отменено', hy: 'Հետարկված է' },
  nothingUndo: { en: 'Nothing to undo', ru: 'Нечего отменять', hy: 'Հետարկելու բան չկա' },
  alreadyEmpty: { en: 'Already empty', ru: 'И так пусто', hy: 'Արդեն դատարկ է' },
  confirmClear: { en: 'Delete all {n} marks? This can’t be undone.', ru: 'Удалить все {n} отметок? Это нельзя отменить.', hy: 'Ջնջե՞լ բոլոր {n} նշումները։ Սա հնարավոր չէ հետարկել։' },
  cleared: { en: 'All cleared 🧹', ru: 'Всё очищено 🧹', hy: 'Ամեն ինչ մաքրված է 🧹' },
  checkEmail: { en: '📧 We sent you an email — confirm it and log in.', ru: '📧 Мы отправили письмо — подтверди email и войди.', hy: '📧 Նամակ ենք ուղարկել — հաստատիր email-ը և մուտք գործիր։' },
  modeCloud: { en: '☁️ Synced: Supabase', ru: '☁️ Синхронизация: Supabase', hy: '☁️ Համաժամեցում՝ Supabase' },
  modeLocal: { en: '💾 Local mode: data only in this browser', ru: '💾 Локальный режим: данные только в этом браузере', hy: '💾 Տեղային ռեժիմ՝ տվյալները միայն այս դիտարկիչում' },
  hello: { en: 'Hi, {name}! 👋', ru: 'Привет, {name}! 👋', hy: 'Բարև, {name}։ 👋' },
  emailTaken: { en: 'This email is already registered', ru: 'Такой email уже зарегистрирован', hy: 'Այս email-ն արդեն գրանցված է' },
  badLogin: { en: 'Wrong email or password', ru: 'Неверный email или пароль', hy: 'Սխալ email կամ գաղտնաբառ' },
};

const detect = () => {
  try { const s = localStorage.getItem('we_lang'); if (s && D.title[s]) return s; } catch {}
  const n = (navigator.language || 'en').slice(0, 2);
  return D.title[n] ? n : 'en';
};
export let lang = detect();

export function t(key, vars = {}) {
  const s = D[key]?.[lang] ?? D[key]?.en ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function setLang(l) {
  lang = l;
  try { localStorage.setItem('we_lang', l); } catch {}
  applyStatic();
}

// static markup: data-i18n (text), data-i18n-ph (placeholder), data-i18n-title (title)
export function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
}
