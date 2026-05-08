import { UIManager } from "./arcade/UIManager.js";
import { GameManager } from "./arcade/GameManager.js";
import { MenuPreview } from "./arcade/MenuPreview.js";
import { IntroManager } from "./IntroManager.js";
import { MenuManager } from "./MenuManager.js";
import { AudioManager } from "./arcade/AudioManager.js";

const canvas = document.getElementById("gameCanvas");
const mobileControls = document.getElementById("mobileControls");
const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
const ui = new UIManager();
const previews = new MenuPreview();
const audioManager = new AudioManager();
const menuManager = new MenuManager(audioManager);

let game = null;
let introManager = null;
let isIntroSkipped = false;
let mobileControlBindingsReady = false;
const mobileHeldKeys = new Set();

const isTouchDevice = () => {
  try {
    const touchQuery = window.matchMedia?.("(pointer: coarse) and (hover: none)");
    return !!(touchQuery?.matches || navigator.maxTouchPoints > 0);
  } catch {
    return navigator.maxTouchPoints > 0;
  }
};

const refreshTouchUiMode = () => {
  document.body.classList.toggle("touch-device", isTouchDevice());
};

const updateViewportUnits = () => {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const vh = viewportHeight * 0.01;
  document.documentElement.style.setProperty("--app-vh", `${vh}px`);
};

const getMinFpsLimit = () => (isTouchDevice() ? 30 : 60);

const isPortrait = () => {
  try {
    return !!window.matchMedia?.("(orientation: portrait)")?.matches;
  } catch {
    return window.innerHeight >= window.innerWidth;
  }
};

const lockLandscapeForGameplay = async () => {
  if (!isTouchDevice()) return;

  if (typeof screen.orientation?.lock === "function") {
    await screen.orientation.lock("landscape").catch(() => {});
  }
};

const unlockGameplayOrientation = () => {
  if (typeof screen.orientation?.unlock === "function") {
    try {
      screen.orientation.unlock();
    } catch {
      // Ignore unsupported unlock calls.
    }
  }
};

const SETTINGS_KEY = "animalKartSettings";
const defaultSettings = {
  volume: 0.45,
  fpsLimit: 60,
  quality: "medium",
  screen: "windowed",
  vsync: true,
};

const loadSettings = () => {
  const minFpsLimit = getMinFpsLimit();

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings, fpsLimit: minFpsLimit };

    const parsed = JSON.parse(raw);
    const requestedFps = parsed.fpsLimit === "unlimited" ? "unlimited" : Number(parsed.fpsLimit);
    const normalizedFps = requestedFps === "unlimited"
      ? "unlimited"
      : (Number.isFinite(requestedFps) ? Math.max(minFpsLimit, requestedFps) : minFpsLimit);

    return {
      volume: Number.isFinite(parsed.volume) ? Math.min(1, Math.max(0, parsed.volume)) : defaultSettings.volume,
      fpsLimit: normalizedFps,
      quality: parsed.quality || defaultSettings.quality,
      screen: parsed.screen || defaultSettings.screen,
      vsync: parsed.vsync !== false,
    };
  } catch {
    return { ...defaultSettings, fpsLimit: minFpsLimit };
  }
};

const gameSettings = loadSettings();
window.AnimalKartSettings = gameSettings;

let optionsPanelBound = false;

const saveSettings = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(gameSettings));
  } catch {
    // Ignore storage failures.
  }
};

const applyMenuVolume = () => {
  if (!audioManager) return;
  if (typeof audioManager._ensureContext === "function") {
    audioManager._ensureContext();
  }
  if (audioManager.master) {
    audioManager.master.gain.value = Math.max(0, Math.min(1, gameSettings.volume));
  }
};

const setGameActiveUi = (active) => {
  document.body.classList.toggle("game-active", !!active);
  if (!active) {
    unlockGameplayOrientation();
  }

  if (!active) {
    for (const keyCode of Array.from(mobileHeldKeys)) {
      releaseMobileKey(keyCode);
    }
  }
};

const syncFullscreenButton = () => {
  if (!fullscreenToggleBtn) return;
  const isFs = !!document.fullscreenElement;
  fullscreenToggleBtn.textContent = isFs ? "EXIT" : "FULL";
  fullscreenToggleBtn.setAttribute("aria-pressed", String(isFs));
  document.body.classList.toggle("fullscreen-mode", isFs);
};

const toggleFullscreenGameplay = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen().catch(() => {});
    await lockLandscapeForGameplay();
  } else {
    await document.exitFullscreen().catch(() => {});
    unlockGameplayOrientation();
  }
  syncFullscreenButton();
};

fullscreenToggleBtn?.addEventListener("click", () => {
  void toggleFullscreenGameplay();
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    unlockGameplayOrientation();
  }
  syncFullscreenButton();
  updateViewportUnits();
});

const dispatchVirtualKey = (type, code) => {
  window.dispatchEvent(new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    code,
    key: code,
  }));
};

const pressMobileKey = (code) => {
  if (mobileHeldKeys.has(code)) return;
  mobileHeldKeys.add(code);
  dispatchVirtualKey("keydown", code);
};

const releaseMobileKey = (code) => {
  if (!mobileHeldKeys.has(code)) return;
  mobileHeldKeys.delete(code);
  dispatchVirtualKey("keyup", code);
};

const tapMobileKey = (code) => {
  dispatchVirtualKey("keydown", code);
  setTimeout(() => dispatchVirtualKey("keyup", code), 60);
};

const bindMobileControls = () => {
  if (mobileControlBindingsReady || !mobileControls) return;

  const buttons = mobileControls.querySelectorAll("[data-mobile-key]");
  buttons.forEach((button) => {
    const code = button.dataset.mobileKey;
    const mode = button.dataset.mobileMode || "hold";

    const press = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.add("is-pressed");
      if (mode === "tap") {
        tapMobileKey(code);
      } else {
        pressMobileKey(code);
      }
    };

    const release = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove("is-pressed");
      if (mode !== "tap") {
        releaseMobileKey(code);
      }
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });

  mobileControlBindingsReady = true;
};

const syncOptionsUI = () => {
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  if (volumeSlider) volumeSlider.value = String(Math.round(gameSettings.volume * 100));
  if (volumeValue) volumeValue.textContent = `${Math.round(gameSettings.volume * 100)}%`;

  const setActiveGroup = (selector, attrName, value) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset[attrName] === value);
    });
  };

  setActiveGroup(".option-btn[data-fps]", "fps", String(gameSettings.fpsLimit));
  setActiveGroup(".option-btn[data-quality]", "quality", gameSettings.quality);
  setActiveGroup(".option-btn[data-screen]", "screen", gameSettings.screen);
  setActiveGroup(".option-btn[data-vsync]", "vsync", gameSettings.vsync ? "on" : "off");
};

const bindOptionsPanel = () => {
  if (optionsPanelBound) return;

  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const optionsPanel = document.getElementById("optionsPanel");
  const closeOptionsBtn = document.getElementById("closeOptionsBtn");
  const backFromOptionsBtn = document.getElementById("backFromOptionsBtn");

  if (volumeSlider) {
    volumeSlider.addEventListener("input", () => {
      gameSettings.volume = Number(volumeSlider.value) / 100;
      if (volumeValue) volumeValue.textContent = `${volumeSlider.value}%`;
      applyMenuVolume();
      saveSettings();
    });
  }

  optionsPanel?.addEventListener("click", async (event) => {
    const button = event.target.closest(".option-btn");
    if (!button) return;

    if (button.dataset.fps) {
      const minFpsLimit = getMinFpsLimit();
      if (button.dataset.fps === "unlimited") {
        gameSettings.fpsLimit = "unlimited";
      } else {
        gameSettings.fpsLimit = Math.max(minFpsLimit, Number(button.dataset.fps));
      }
      syncOptionsUI();
      saveSettings();
    }

    if (button.dataset.quality) {
      gameSettings.quality = button.dataset.quality;
      syncOptionsUI();
      saveSettings();
    }

    if (button.dataset.screen) {
      gameSettings.screen = button.dataset.screen;
      syncOptionsUI();
      saveSettings();

      if (button.dataset.screen === "fullscreen") {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    }

    if (button.dataset.vsync) {
      gameSettings.vsync = button.dataset.vsync === "on";
      syncOptionsUI();
      saveSettings();
    }
  });

  closeOptionsBtn?.addEventListener("click", () => {
    hideOptionsPanel();
  });

  backFromOptionsBtn?.addEventListener("click", () => {
    hideOptionsPanel();
  });

  document.addEventListener("keydown", (event) => {
    const visibleOptions = document.getElementById("optionsPanel")?.classList.contains("visible");
    if (!visibleOptions) return;
    if (event.code === "Escape" || event.code === "Backspace") {
      event.preventDefault();
      hideOptionsPanel();
    }
  });

  optionsPanelBound = true;
};

const showOptionsPanel = () => {
  const optionsPanel = document.getElementById("optionsPanel");
  const mainMenuOverlay = document.getElementById("mainMenuOverlay");
  const configMenu = document.getElementById("mainMenu");

  if (!optionsPanel) return;

  menuManager.hide();

  if (mainMenuOverlay) mainMenuOverlay.style.display = "none";
  if (configMenu) configMenu.classList.remove("visible");
  optionsPanel.style.display = "flex";
  optionsPanel.classList.add("visible");

  setGameActiveUi(false);

  audioManager.startMenuMusic();
  bindOptionsPanel();
  syncOptionsUI();
  applyMenuVolume();
};

const hideOptionsPanel = () => {
  const optionsPanel = document.getElementById("optionsPanel");
  if (optionsPanel) {
    optionsPanel.classList.remove("visible");
    optionsPanel.style.display = "none";
  }
  showMainMenu();
};

// Manejar pantalla de intro de video
const initIntroVideo = () => {
  console.log("Inicializando intro video");
  
  const introScreen = document.getElementById("introScreen");
  const introVideo = document.getElementById("introVideo");
  const mainMenuOverlay = document.getElementById("mainMenuOverlay");

  if (!introScreen || !introVideo || !mainMenuOverlay) {
    console.error("Elementos faltantes para intro video");
    return;
  }

  let hasSkipped = false;
  let introKeyHandler = null;
  let introVolumeHandler = null;
  let introFallbackTimer = null;

  const skipIntro = () => {
    if (hasSkipped) return;
    hasSkipped = true;
    
    console.log("Saltando intro...");
    
    introScreen.style.display = "none";
    mainMenuOverlay.classList.add("visible");
    introVideo.pause();
    introVideo.currentTime = 0;
    setGameActiveUi(false);
    if (introFallbackTimer) {
      clearTimeout(introFallbackTimer);
      introFallbackTimer = null;
    }
    
    // Remover listeners del intro
    if (introKeyHandler) document.removeEventListener("keydown", introKeyHandler);
    if (introVolumeHandler) document.removeEventListener("keydown", introVolumeHandler);
    
    console.log("Llamando a showMainMenu()");
    // Mostrar menú
    showMainMenu();
  };

  // Cuando termine el video, mostrar menú
  introVideo.addEventListener("ended", () => {
    console.log("Video terminado");
    skipIntro();
  });

  // Fallback: si ended no dispara, pasar al menú igual
  const scheduleFallback = () => {
    if (introFallbackTimer) clearTimeout(introFallbackTimer);
    const fallbackMs = Number.isFinite(introVideo.duration) && introVideo.duration > 0
      ? Math.ceil(introVideo.duration * 1000) + 500
      : 7000;
    introFallbackTimer = setTimeout(() => {
      console.log("Fallback de intro activado");
      skipIntro();
    }, fallbackMs);
  };

  if (introVideo.readyState >= 1) {
    scheduleFallback();
  } else {
    introVideo.addEventListener("loadedmetadata", scheduleFallback, { once: true });
  }

  introVideo.addEventListener("error", () => {
    console.log("Error en intro video, saltando al menú");
    skipIntro();
  }, { once: true });

  // Click en el video para saltar
  introVideo.addEventListener("click", () => {
    console.log("Click en video");
    skipIntro();
  });

  // Presionar ESC o ESPACIO para saltar (NO ENTER, eso es para seleccionar en menú)
  introKeyHandler = (e) => {
    if (e.code === "Escape" || e.code === "Space") {
      console.log("Tecla de salto presionada:", e.code);
      e.preventDefault();
      skipIntro();
    }
  };
  document.addEventListener("keydown", introKeyHandler);

  // Controlar volumen con + y -
  introVolumeHandler = (e) => {
    if (introScreen.style.display === "none") return;
    if (e.code === "Minus" || e.code === "NumpadSubtract") {
      introVideo.volume = Math.max(0, introVideo.volume - 0.1);
    } else if (e.code === "Equal" || e.code === "NumpadAdd") {
      introVideo.volume = Math.min(1, introVideo.volume + 0.1);
    } else if (e.code === "KeyM") {
      introVideo.muted = !introVideo.muted;
    }
  };
  document.addEventListener("keydown", introVolumeHandler);
};

// Función para iniciar la intro
const startIntro = () => {
  if (isIntroSkipped) return;

  introManager = new IntroManager(canvas);
  introManager.onComplete = () => {
    isIntroSkipped = true;
    introManager.dispose();
    introManager = null;
    showMainMenu();
  };

  const introLoop = () => {
    const currentTime = performance.now();
    const completed = introManager.update(currentTime);
    if (!completed) {
      requestAnimationFrame(introLoop);
    }
  };

  requestAnimationFrame(introLoop);
};

// Función para mostrar el menú principal
const showMainMenu = () => {
  console.log("Mostrando menú principal");
  setGameActiveUi(false);
  
  if (introManager) {
    introManager.dispose();
    introManager = null;
  }
  
  menuManager.show((mode) => {
    console.log("Modo seleccionado:", mode);
    if (mode === "arcade") {
      showConfigMenu();
    } else if (mode === "options") {
      showOptionsPanel();
    }
  });
  
  applyMenuVolume();
  ui.setRaceUIVisible(false);
};

// Función para mostrar el menú de configuración
const showConfigMenu = () => {
  // Asegurar que el menú principal esté completamente oculto
  const menuOverlay = document.getElementById("mainMenuOverlay");
  if (menuOverlay) {
    menuOverlay.style.display = "none";
    menuOverlay.classList.remove("visible");
  }
  setGameActiveUi(false);
  
  // Mostrar el menú de configuración
  ui.setMenuVisible(true);
  ui.setRaceUIVisible(false);
  
  // Mantener música durante la selección
  audioManager.startMenuMusic();
  applyMenuVolume();
  
  // Actualizar vistas previas
  const refreshPreviews = () => previews.update(ui.getSelection());
  ui.onSelectionChange(refreshPreviews);
  refreshPreviews();
};

// Evento para jugar
ui.onPlay((selection) => {
  audioManager.stopMenuMusic();
  ui.setMenuVisible(false); // Ocultar menú
  setGameActiveUi(true);
  bindMobileControls();
  if (game) game.stop();
  game = new GameManager(canvas, ui);
  game.start(selection);
});

// Evento para reintentar
ui.onRestart(() => {
  const selection = ui.getSelection();
  if (game) game.stop();
  game = new GameManager(canvas, ui);
  game.start(selection);
});

// Evento para volver al menú
ui.onBackToMenu(() => {
  if (game) {
    game.stop();
    game = null;
  }
  ui.hideFinish();
  ui.setRaceUIVisible(false);
  audioManager.stopMenuMusic();
  document.getElementById("mainMenu").style.display = "none";
  setGameActiveUi(false);
  showMainMenu();
});

// Iniciar la intro de video al cargar
window.addEventListener("load", () => {
  console.log("Página cargada, inicializando...");
  updateViewportUnits();
  refreshTouchUiMode();
  initIntroVideo();
});

const handleViewportChange = () => {
  updateViewportUnits();
  refreshTouchUiMode();
};

window.addEventListener("resize", handleViewportChange);
window.addEventListener("orientationchange", handleViewportChange);
window.visualViewport?.addEventListener("resize", handleViewportChange);
window.visualViewport?.addEventListener("scroll", handleViewportChange);
