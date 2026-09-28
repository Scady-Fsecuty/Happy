// ==================== STATE ====================
const state = {
  passcode: '2909',
  entered: '',
  currentScreen: 'lockscreen',
  currentApp: null,
  homePage: 0,
  questStage: 0, // 0: telegram, 1: gallery, 2: facts, 3: game
  tgChoiceMade: false,
  galleryDone: false,
  factsDone: false,
  gameDone: false,
  slideshowTimer: null,
  progressTimer: null,
  audioEnabled: false, // Track if user has tapped to enable audio
};

// ==================== ELEMENTS ====================
const $ = (id) => document.getElementById(id);
const screens = {
  lockscreen: $('lockscreen'),
  passcode: $('passcode'),
  home: $('home'),
};

const appScreens = {
  telegram: $('app-telegram'),
  gallery: $('app-gallery'),
  facts: $('app-facts'),
  game: $('app-game'),
  tiktok: $('app-tiktok'),
  appstore: $('app-appstore'),
  clock: $('app-clock'),
  weather: $('app-weather'),
  notes: $('app-notes'),
  calc: $('app-calc'),
  settings: $('app-settings'),
  music: $('app-music'),
  camera: $('app-camera'),
  safari: $('app-safari'),
  messages: $('app-messages'),
  phone: $('app-phone'),
  calendar: $('app-calendar'),
  photos: $('app-photos'),
};

// ==================== TIME ====================
function updateTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${h}:${m}`;
  $('status-time').textContent = timeStr;
  $('lock-time').textContent = timeStr;

  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  $('lock-date').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}
updateTime();
setInterval(updateTime, 1000);

// ==================== SCREEN MANAGEMENT ====================
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
  state.currentScreen = name;
}

function showHome() {
  // Close any open app
  if (state.currentApp) {
    closeApp(state.currentApp);
  }
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens.home.classList.add('active');
  state.currentScreen = 'home';
}

// ==================== LOCK SCREEN ====================
function showNotification() {
  $('lockscreen').classList.add('locked');
  setTimeout(() => {
    $('lock-notification').classList.add('show');
    $('lockscreen').classList.remove('locked');
    playSound('audio-notify');
  }, 10000);
}
showNotification();

// Swipe up from lock screen
function initLockSwipe() {
  const area = $('lock-swipe');
  let startY = 0, startTime = 0;

  area.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  area.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    const dy = endY - startY;
    const dt = Date.now() - startTime;
    if (dy < -60 || (dy < -30 && dt < 300)) {
      transitionToPasscode();
    }
  }, { passive: true });

  // Mouse support for testing
  let mouseStartY = 0;
  area.addEventListener('mousedown', (e) => {
    mouseStartY = e.clientY;
  });
  area.addEventListener('mouseup', (e) => {
    if (e.clientY - mouseStartY < -60) {
      transitionToPasscode();
    }
  });
}

function transitionToPasscode() {
  playSound('audio-swipe');
  $('lockscreen').style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s';
  $('lockscreen').style.transform = 'translateY(-100%)';
  $('lockscreen').style.opacity = '0';
  setTimeout(() => {
    showScreen('passcode');
    $('lockscreen').style = '';
  }, 400);
}

// ==================== PASSCODE ====================
function initPasscode() {
  document.querySelectorAll('.key[data-num]').forEach(key => {
    key.addEventListener('click', () => {
      if (state.entered.length >= 4) return;
      state.entered += key.dataset.num;
      updateDots();
      if (state.entered.length === 4) {
        checkPasscode();
      }
    });
  });

  $('key-back').addEventListener('click', () => {
    if (state.entered.length > 0) {
      state.entered = state.entered.slice(0, -1);
      updateDots();
    }
  });
}

function updateDots() {
  const dots = document.querySelectorAll('#passcode-dots .dot');
  dots.forEach((d, i) => {
    d.classList.toggle('filled', i < state.entered.length);
  });
}

function checkPasscode() {
  if (state.entered === state.passcode) {
    // Correct - transition to home
    setTimeout(() => {
      $('passcode').style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s';
      $('passcode').style.transform = 'scale(1.1)';
      $('passcode').style.opacity = '0';
      setTimeout(() => {
        showScreen('home');
        $('passcode').style = '';
        state.entered = '';
        updateDots();
        // Start quest
        setTimeout(() => startQuest(), 800);
      }, 500);
    }, 200);
  } else {
    // Wrong - shake
    const dots = $('passcode-dots');
    dots.classList.add('shake');
    setTimeout(() => {
      dots.classList.remove('shake');
      state.entered = '';
      updateDots();
    }, 500);
  }
}

// ==================== HOME SCREEN SWIPE ====================
function initHomeSwipe() {
  const container = document.querySelector('.home-pages-container');
  const pages = $('home-pages');
  const dots = document.querySelectorAll('#page-dots .dot');
  let startX = 0, startY = 0, currentX = 0, isSwiping = false, isHorizontal = false;

  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
    isHorizontal = false;
    pages.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!isHorizontal && Math.abs(dx) > 10) {
      isHorizontal = true;
    }
    if (isHorizontal) {
      const screenWidth = container.offsetWidth;
      let offset = -state.homePage * screenWidth + dx;
      if (state.homePage === 0 && dx > 0) offset = dx * 0.3;
      if (state.homePage === 2 && dx < 0) offset = -2 * screenWidth + dx * 0.3;
      pages.style.transform = `translateX(${offset}px)`;
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    pages.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

    if (isHorizontal && Math.abs(dx) > 60) {
      if (dx < 0 && state.homePage < 2) {
        state.homePage++;
        playSound('audio-swipe');
      } else if (dx > 0 && state.homePage > 0) {
        state.homePage--;
        playSound('audio-swipe');
      }
    }
    const screenWidth = container.offsetWidth;
    pages.style.transform = `translateX(${-state.homePage * screenWidth}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === state.homePage));
  }, { passive: true });
}

// ==================== APP OPENING / CLOSING ====================
function openApp(appName) {
  const appEl = appScreens[appName];
  if (!appEl) return;

  playSound('audio-open');

  // Find the icon position for zoom animation
  const icon = document.querySelector(`.app-icon[data-app="${appName}"]`);
  if (icon) {
    const rect = icon.getBoundingClientRect();
    const screenRect = $('iphone-screen').getBoundingClientRect();
    const originX = ((rect.left + rect.width / 2 - screenRect.left) / screenRect.width) * 100;
    const originY = ((rect.top + rect.height / 2 - screenRect.top) / screenRect.height) * 100;
    appEl.style.transformOrigin = `${originX}% ${originY}%`;
    icon.classList.add('opening');
    setTimeout(() => icon.classList.remove('opening'), 400);
  }

  state.currentApp = appName;
  appEl.classList.add('open');

  // Trigger app-specific logic
  setTimeout(() => {
    if (appName === 'telegram') openTelegram();
    if (appName === 'gallery') openGallery();
    if (appName === 'facts') openFacts();
    if (appName === 'game') openGame();
    if (appName === 'clock') openClock();
    if (appName === 'calc') openCalc();
  }, 300);
}

function closeApp(appName) {
  const appEl = appScreens[appName];
  if (!appEl) return;

  playSound('audio-close');

  appEl.classList.remove('open');
  appEl.classList.add('closing');

  // Clean up
  if (appName === 'gallery') stopGallery();
  if (appName === 'game') stopGame();
  if (appName === 'facts') stopFacts();

  setTimeout(() => {
    appEl.classList.remove('closing');
    appEl.style.transformOrigin = '';
    state.currentApp = null;
    // Continue quest if needed
    afterAppClose(appName);
  }, 400);
}

// Swipe up to close apps — listen on app screen since overlay has pointer-events:none
function initAppCloseSwipe() {
  document.querySelectorAll('.app-screen').forEach(appEl => {
    let startY = 0;
    const appName = appEl.id.replace('app-', '');

    appEl.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    appEl.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy < -100) {
        closeApp(appName);
      }
    }, { passive: true });

    let mouseStartY = 0;
    appEl.addEventListener('mousedown', (e) => {
      mouseStartY = e.clientY;
    });
    appEl.addEventListener('mouseup', (e) => {
      if (e.clientY - mouseStartY < -100) {
        closeApp(appName);
      }
    });
  });

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const appEl = btn.closest('.app-screen');
      const appName = appEl.id.replace('app-', '');
      closeApp(appName);
    });
  });
}

// ==================== APP ICON CLICKS ====================
function initAppIcons() {
  document.querySelectorAll('.app-icon[data-app]').forEach(icon => {
    icon.addEventListener('click', () => {
      const app = icon.dataset.app;
      if (state.currentScreen !== 'home') return;
      if (state.currentApp) return;

      // Remove badge on click
      const badge = icon.querySelector('.badge');
      if (badge) badge.style.display = 'none';

      // Remove highlight
      icon.classList.remove('highlighted');

      openApp(app);
    });
  });
}

// ==================== QUEST FLOW ====================
let homeMessageTimer = null;
function showHomeMessage(text, duration = 0) {
  const msg = $('home-message');
  msg.textContent = text;
  msg.classList.add('show');

  if (homeMessageTimer) clearTimeout(homeMessageTimer);
  if (duration > 0) {
    homeMessageTimer = setTimeout(() => {
      msg.classList.remove('show');
    }, duration);
  }
}

function hideHomeMessage() {
  $('home-message').classList.remove('show');
}

function startQuest() {
  // Telegram badge already visible
  showHomeMessage('Заходи в Telegram', 4000);
}

function afterAppClose(appName) {
  if (appName === 'telegram' && !state.galleryDone) {
    // After telegram, guide to gallery
    $('badge-gallery').style.display = 'flex';
    document.querySelector('.app-icon[data-app="gallery"]').classList.add('highlighted');
    showHomeMessage('Окей, зайди в галерею');
  }

  if (appName === 'gallery' && !state.factsDone) {
    state.galleryDone = true;
    showHomeMessage('Чё прям до слёз, да?');
    setTimeout(() => {
      hideHomeMessage();
      showHomeMessage('Зайди в приложение «20 фактов о мире»');
      document.querySelector('.app-icon[data-app="facts"]').classList.add('highlighted');
    }, 6000);
  }

  if (appName === 'facts' && !state.gameDone) {
    state.factsDone = true;
    showHomeMessage('Почему не смеёшься? Смешно же))))');
    setTimeout(() => {
      hideHomeMessage();
      showHomeMessage('Так, окей. Ты можешь в принципе зайти и поиграть в игру, она подсвечена у тебя.');
      $('badge-game').style.display = 'flex';
      document.querySelector('.app-icon[data-app="game"]').classList.add('highlighted');
    }, 6000);
  }
}

// ==================== TELEGRAM CHAT ====================
const tgMessages = [
  { text: 'Привет! Я сделал этот сайт для тебя в качестве подарка. Разблокируй айфон.', type: 'received', delay: 500 },
  { text: 'К сожалению, я не смог придумать что-то оригинальнее этого. Абсурдно, не правда ли?', type: 'received', delay: 2000 },
];

const tgResponses = {
  first: 'Пошла нахуй. Но, понимаешь, и из-за жалости я всё-таки проведу экскурсию по твоему «айфону».',
  second: 'Спасибо, буду честен — «молодец» на хлеб не намажешь. Надеюсь, ты готова к экскурсии по твоему «айфону».',
};

function openTelegram() {
  const chat = $('tg-chat');
  chat.innerHTML = '';
  $('tg-input-area').innerHTML = '';
  state.tgChoiceMade = false;

  // Show messages one by one
  tgMessages.forEach((msg, i) => {
    setTimeout(() => {
      addTgMessage(msg.text, msg.type);
      if (i === tgMessages.length - 1) {
        setTimeout(showTgChoices, 1000);
      }
    }, msg.delay);
  });
}

function addTgMessage(text, type) {
  const chat = $('tg-chat');
  const bubble = document.createElement('div');
  bubble.className = `tg-bubble ${type}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
  requestAnimationFrame(() => {
    bubble.classList.add('show');
  });
  // Play notification sound for received messages
  if (type === 'received') {
    playSound('audio-notify');
  }
}

function showTgChoices() {
  const area = $('tg-input-area');
  area.innerHTML = '';

  const btn1 = document.createElement('button');
  btn1.className = 'tg-reply-btn';
  btn1.textContent = 'Да ты мог придумать что-то лучше(';
  btn1.addEventListener('click', () => handleTgChoice('first'));

  const btn2 = document.createElement('button');
  btn2.className = 'tg-reply-btn';
  btn2.textContent = 'Всё нормально, ты молодец.';
  btn2.addEventListener('click', () => handleTgChoice('second'));

  area.appendChild(btn1);
  area.appendChild(btn2);
}

function handleTgChoice(choice) {
  if (state.tgChoiceMade) return;
  state.tgChoiceMade = true;

  // Show user's message
  const userText = choice === 'first'
    ? 'Да ты мог придумать что-то лучше('
    : 'Всё нормально, ты молодец.';
  addTgMessage(userText, 'sent');

  // Clear buttons
  $('tg-input-area').innerHTML = '';

  // Show response after delay
  setTimeout(() => {
    addTgMessage(tgResponses[choice], 'received');
    // Auto exit after reading
    setTimeout(() => {
      closeApp('telegram');
    }, 4000);
  }, 1500);
}

// ==================== GALLERY ====================
const gallerySlideCount = 6;
const gallerySlideDuration = 3000; // 3s per slide

function openGallery() {
  const slides = document.querySelectorAll('.gallery-slide');
  const progressFill = $('gallery-progress-fill');
  let current = 0;
  let progress = 0;

  // Reset
  slides.forEach((s, i) => {
    s.classList.toggle('active', i === 0);
  });
  progressFill.style.width = '0%';

  // Play music
  const audio = $('bg-audio');
  audio.src = 'https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3';
  audio.volume = 0.3;
  audio.play().catch(() => {});

  // Progress bar animation
  state.progressTimer = setInterval(() => {
    progress += 100 / (gallerySlideDuration / 100);
    if (progress > 100) progress = 100;
    progressFill.style.width = progress + '%';
  }, 100);

  state.slideshowTimer = setInterval(() => {
    progress = 0;
    progressFill.style.width = '0%';
    slides[current].classList.remove('active');
    current++;
    if (current >= gallerySlideCount) {
      stopGallery();
      setTimeout(() => closeApp('gallery'), 500);
      return;
    }
    slides[current].classList.add('active');
  }, gallerySlideDuration);
}

function stopGallery() {
  if (state.slideshowTimer) {
    clearInterval(state.slideshowTimer);
    state.slideshowTimer = null;
  }
  if (state.progressTimer) {
    clearInterval(state.progressTimer);
    state.progressTimer = null;
  }
  const audio = $('bg-audio');
  audio.pause();
  audio.currentTime = 0;
}

// ==================== FACTS ====================
function openFacts() {
  $('facts-content').style.display = 'block';
  $('facts-video-container').classList.remove('visible', 'flying-corner', 'flying-center');
  $('facts-video-container').style.display = 'none';

  document.querySelectorAll('.facts-btn').forEach(btn => {
    btn.style.display = '';
    btn.onclick = null;
  });

  document.querySelectorAll('.facts-btn').forEach(btn => {
    btn.addEventListener('click', handleFactsAnswer, { once: true });
  });
}

function handleFactsAnswer() {
  $('facts-content').style.display = 'none';

  // Show video flying from corner
  const container = $('facts-video-container');
  const video = $('facts-video');

  // Use a placeholder video URL
  video.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  video.muted = true;
  video.loop = false;

  container.style.display = 'flex';
  container.classList.add('flying-corner');

  setTimeout(() => {
    container.classList.remove('flying-corner');
    container.classList.add('flying-center');

    video.play().then(() => {
      // Unmute after play starts
      video.muted = false;
    }).catch(() => {
      // If autoplay fails, try muted
      video.muted = true;
      video.play().catch(() => {});
    });

    // After 6 seconds, exit
    setTimeout(() => {
      stopFacts();
      closeApp('facts');
    }, 6000);
  }, 1000);
}

function stopFacts() {
  const video = $('facts-video');
  video.pause();
  video.currentTime = 0;
  $('facts-video-container').classList.remove('flying-corner', 'flying-center', 'visible');
  $('facts-video-container').style.display = 'none';
}

// ==================== GAME: GUESS THE MELODY ====================
// Только скачанные треки
const gameTracks = [
  { title: '18 мне уже', artist: 'Руки Вверх', src: 'audio/18_mne_uzhe.mp3' },
  { title: 'Поезда', artist: 'Женя Трофимов', src: 'audio/poezda.mp3' },
  { title: 'Если я буду танцевать', artist: 'Баста, Мой Мишель', src: 'audio/esli_ya_budu_tantsevat.mp3' },
  { title: 'Танцуя лечусь', artist: 'Соня Белькевич, M.r-X', src: 'audio/tantsuya_lechus.mp3' },
  { title: 'Нежность моя', artist: 'Мари Краймбрери', src: 'audio/nezhnost_moya.mp3' },
  { title: 'Обещай (Kavkaz Remix)', artist: 'ANIVAR, kvmly, zovo', src: 'audio/obeshay_kavkaz_remix.mp3' },
  { title: 'Потеряла голову', artist: 'ХАННА', src: 'audio/poteryala_golovu.mp3' },
  { title: 'Тёмная ночь', artist: 'Guerrero', src: 'audio/temnaya_noch.mp3' },
  { title: 'Ты так красива', artist: 'Quest Pistols', src: 'audio/ty_tak_krasiva.mp3' },
  { title: 'Бывшая', artist: 'neklyud', src: 'audio/byvshaya.mp3' },
];

// Все варианты ответов (включая нескачанные)
const gameAllOptions = [
  { title: '18 мне уже', artist: 'Руки Вверх' },
  { title: 'Поезда', artist: 'Женя Трофимов' },
  { title: 'Panda', artist: 'CYGO' },
  { title: 'Если я буду танцевать', artist: 'Баста, Мой Мишель' },
  { title: 'Танцуя лечусь', artist: 'Соня Белькевич, M.r-X' },
  { title: 'Радость', artist: 'IOWA' },
  { title: 'Недолюбила', artist: 'Зара' },
  { title: 'Потеряла голову', artist: 'ХАННА' },
  { title: 'Тёмная ночь', artist: 'Guerrero' },
  { title: 'Безоружна 2.0', artist: 'I\'unno' },
  { title: 'Ты так красива', artist: 'Quest Pistols' },
  { title: 'Бывшая', artist: 'neklyud' },
  { title: 'Обещай (Kavkaz Remix)', artist: 'ANIVAR, kvmly, zovo' },
  { title: 'Нежность моя', artist: 'Мари Краймбрери' },
  { title: 'Химия', artist: 'ODGO' },
  { title: 'А он меня целует (Cover)', artist: 'Glebova, Tribeat' },
  { title: 'Мелодия дождя', artist: 'Эльбрус Джанмирзоев' },
  { title: 'Всё просто (RMX)', artist: 'Антоха МС, muzaferov' },
  { title: 'Такси', artist: 'Elvira T' },
  { title: 'А чё чё', artist: 'Бьянка' },
  { title: 'На дух не переношу', artist: 'Бьянка, ST' },
  { title: 'G-Woman', artist: 'G-Woman' },
  { title: 'Крошка моя', artist: 'Руки Вверх' },
  { title: 'Belly Dancer', artist: 'CYGO' },
  { title: 'Ветер с моря', artist: 'Женя Трофимов' },
];

let gameScore = { correct: 0, wrong: 0 };
let gameRound = 0;
let gameTotalRounds = 5;
let gameCurrentTrack = null;
let gameTimerInterval = null;
let gameAudioClone = null;
let gameChorusStartTime = 0; // Начало главного куплета для правильного ответа

function openGame() {
  $('game-intro')?.style.setProperty('display', '');
  const intro = document.querySelector('.game-intro');
  if (intro) intro.style.display = '';
  $('game-play').style.display = 'none';
  $('game-result').style.display = 'none';

  const startBtn = $('game-start');
  startBtn.onclick = startGame;

  const restartBtn = $('game-restart');
  restartBtn.onclick = startGame;
}

function startGame() {
  gameScore = { correct: 0, wrong: 0 };
  gameRound = 0;

  document.querySelector('.game-intro').style.display = 'none';
  $('game-result').style.display = 'none';
  $('game-play').style.display = 'block';

  updateScore();
  nextRound();
}

function nextRound() {
  if (gameRound >= gameTotalRounds) {
    endGame();
    return;
  }

  gameRound++;
  $('game-round').textContent = `Раунд ${gameRound} из ${gameTotalRounds}`;

  // Show "ГОТОВА??" for 4 seconds
  $('game-timer').style.display = 'none';
  $('game-options').style.display = 'none';
  $('game-wave').classList.add('paused');
  $('game-ready').style.display = 'block';

  // Pick random track
  const trackIdx = Math.floor(Math.random() * gameTracks.length);
  gameCurrentTrack = gameTracks[trackIdx];

  // Generate 4 options (1 correct + 3 random)
  const wrongOptions = gameAllOptions.filter(o =>
    !(o.title === gameCurrentTrack.title && o.artist === gameCurrentTrack.artist)
  );
  const shuffled = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffled, { title: gameCurrentTrack.title, artist: gameCurrentTrack.artist }]
    .sort(() => Math.random() - 0.5);

  // Render options (hidden for now)
  const container = $('game-options');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'game-option';
    btn.innerHTML = `<div>${opt.title}</div><div style="font-size:11px;opacity:0.6;margin-top:4px">${opt.artist}</div>`;
    btn.addEventListener('click', () => handleGameAnswer(btn, opt));
    container.appendChild(btn);
  });

  // After 4 seconds, start the round
  setTimeout(() => {
    $('game-ready').style.display = 'none';
    $('game-timer').style.display = 'block';
    $('game-options').style.display = 'grid';
    $('game-wave').classList.remove('paused');

    // Play audio
    playGameAudio();

    // Start 6 second timer
    let timeLeft = 6;
    const timerEl = $('game-timer');
    timerEl.textContent = timeLeft;
    timerEl.classList.remove('urgent');

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 2) timerEl.classList.add('urgent');
      if (timeLeft <= 0) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
        // Time's up - count as wrong
        stopGameAudio();
        $('game-wave').classList.add('paused');
        gameScore.wrong++;
        updateScore();
        markCorrectAnswer(container, gameCurrentTrack);
        setTimeout(() => {
          container.querySelectorAll('.game-option').forEach(b => b.classList.add('disabled'));
          setTimeout(nextRound, 1500);
        }, 500);
      }
    }, 1000);
  }, 4000);
}

function handleGameAnswer(btn, opt) {
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
  stopGameAudio();
  $('game-wave').classList.add('paused');

  const container = $('game-options');
  const isCorrect = opt.title === gameCurrentTrack.title && opt.artist === gameCurrentTrack.artist;

  if (isCorrect) {
    btn.classList.add('correct');
    gameScore.correct++;
    // Проиграть 10 секунд из главного куплета
    playChorusAudio();
    // Остановить через 10 секунд
    setTimeout(() => {
      stopGameAudio();
    }, 10000);
  } else {
    btn.classList.add('wrong');
    gameScore.wrong++;
    markCorrectAnswer(container, gameCurrentTrack);
  }

  container.querySelectorAll('.game-option').forEach(b => b.classList.add('disabled'));
  updateScore();

  // Если правильно - ждем 10 секунд для проигрывания куплета, иначе 1.8 секунды
  const delay = isCorrect ? 10000 : 1800;
  setTimeout(nextRound, delay);
}

function markCorrectAnswer(container, track) {
  container.querySelectorAll('.game-option').forEach(b => {
    const titleEl = b.querySelector('div');
    if (titleEl && titleEl.textContent === track.title) {
      b.classList.add('correct');
    }
  });
}

function updateScore() {
  $('score-plus').textContent = gameScore.correct;
  $('score-minus').textContent = gameScore.wrong;
}

function playGameAudio() {
  const audio = $('game-audio');
  if (gameCurrentTrack && gameCurrentTrack.src) {
    audio.src = gameCurrentTrack.src;
    try {
      // Рандомное место в треке (от 10 до 60 секунд)
      const randomStart = Math.floor(Math.random() * 50) + 10;
      audio.currentTime = randomStart;
      audio.play().catch(() => {
        // Audio file not found or cannot play - continue silently
      });
    } catch (e) {
      // Audio not available - continue silently
    }
  }
}

function playChorusAudio() {
  const audio = $('game-audio');
  if (gameCurrentTrack && gameCurrentTrack.src) {
    audio.src = gameCurrentTrack.src;
    try {
      // Главный куплет (где-то в середине трека, 40-60 секунд)
      gameChorusStartTime = Math.floor(Math.random() * 20) + 40;
      audio.currentTime = gameChorusStartTime;
      audio.play().catch(() => {
        // Audio file not found or cannot play - continue silently
      });
    } catch (e) {
      // Audio not available - continue silently
    }
  }
}

function stopGameAudio() {
  const audio = $('game-audio');
  audio.pause();
  audio.currentTime = 0;
}

function endGame() {
  stopGameAudio();
  $('game-play').style.display = 'none';
  $('game-result').style.display = 'block';

  $('game-result-score').textContent = `Правильно: ${gameScore.correct}  ·  Неправильно: ${gameScore.wrong}`;

  const msg = $('game-result-msg');
  if (gameScore.correct >= 4) {
    msg.textContent = 'Вау, ты реально хорошо знаешь музыку! Может ты вообще меломан? Спасибо что играла. С днём рождения!';
  } else if (gameScore.correct >= 2) {
    msg.textContent = 'Неплохо! Но могло быть и лучше. Главное что мы повеселились. С днём рождения!';
  } else {
    msg.textContent = 'Ну хотя бы ты попробовала. Музыка — это не главное. Главное — ты классная. С днём рождения!';
  }

  state.gameDone = true;
}

function stopGame() {
  stopGameAudio();
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
}

// ==================== CLOCK APP ====================
function openClock() {
  updateTimeClock();
  setInterval(updateTimeClock, 1000);
}

function updateTimeClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${h}:${m}`;
  $('clock-time').textContent = timeStr;

  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  $('clock-date').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}

// ==================== CALCULATOR APP ====================
let calcDisplay = '0';
let calcPrevious = null;
let calcOperation = null;
let calcWaitingForOperand = false;

function openCalc() {
  calcDisplay = '0';
  calcPrevious = null;
  calcOperation = null;
  calcWaitingForOperand = false;
  updateCalcDisplay();

  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.onclick = () => handleCalcButton(btn.dataset.val);
  });
}

function handleCalcButton(val) {
  if (val >= '0' && val <= '9' || val === '.') {
    inputCalcDigit(val);
  } else if (val === 'C') {
    clearCalc();
  } else if (val === '±') {
    toggleCalcSign();
  } else if (val === '%') {
    inputCalcPercent();
  } else if (val === '=') {
    performCalc();
  } else {
    handleCalcOperator(val);
  }
  updateCalcDisplay();
}

function inputCalcDigit(digit) {
  if (calcWaitingForOperand) {
    calcDisplay = digit;
    calcWaitingForOperand = false;
  } else {
    calcDisplay = calcDisplay === '0' ? digit : calcDisplay + digit;
  }
}

function clearCalc() {
  calcDisplay = '0';
  calcPrevious = null;
  calcOperation = null;
  calcWaitingForOperand = false;
}

function toggleCalcSign() {
  calcDisplay = (parseFloat(calcDisplay) * -1).toString();
}

function inputCalcPercent() {
  calcDisplay = (parseFloat(calcDisplay) / 100).toString();
}

function handleCalcOperator(nextOperator) {
  const inputValue = parseFloat(calcDisplay);

  if (calcPrevious === null) {
    calcPrevious = inputValue;
  } else if (calcOperation) {
    const result = performCalculation(calcPrevious, inputValue, calcOperation);
    calcDisplay = String(result);
    calcPrevious = result;
  }

  calcWaitingForOperand = true;
  calcOperation = nextOperator;
}

function performCalc() {
  if (calcPrevious === null || calcOperation === null) return;

  const inputValue = parseFloat(calcDisplay);
  const result = performCalculation(calcPrevious, inputValue, calcOperation);
  calcDisplay = String(result);
  calcPrevious = null;
  calcOperation = null;
  calcWaitingForOperand = true;
}

function performCalculation(first, second, operation) {
  switch (operation) {
    case '+': return first + second;
    case '-': return first - second;
    case '*': return first * second;
    case '/': return second !== 0 ? first / second : 0;
    default: return second;
  }
}

function updateCalcDisplay() {
  $('calc-display').textContent = calcDisplay;
}

// ==================== AUDIO MANAGEMENT ====================
function enableAudio() {
  if (!state.audioEnabled) {
    state.audioEnabled = true;
    // Try to play a silent sound to unlock audio context
    const audio = $('audio-notify');
    audio.volume = 0;
    audio.play().catch(() => {});
    audio.pause();
    audio.volume = 1;
  }
}

function playSound(soundId) {
  if (!state.audioEnabled) return;
  const audio = $(soundId);
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

// Enable audio on first user interaction
document.addEventListener('click', enableAudio, { once: true });
document.addEventListener('touchstart', enableAudio, { once: true });

// ==================== INIT ====================
initLockSwipe();
initPasscode();
initHomeSwipe();
initAppIcons();
initAppCloseSwipe();

// Prevent context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// Prevent double-tap zoom
let lastTouch = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouch < 300) e.preventDefault();
  lastTouch = now;
}, { passive: false });
