export class UIManager {
  constructor() {
    this.menuOverlay = document.getElementById("mainMenu");
    this.playBtn = document.getElementById("playBtn");

    this.characterSelect = document.getElementById("characterSelect");
    this.vehicleSelect = document.getElementById("vehicleSelect");
    this.colorPicker = document.getElementById("vehicleColorPicker");
    this.trackSelect = document.getElementById("trackSelect");
    this.difficultySelect = document.getElementById("difficultySelect");
    this.lapSelect = document.getElementById("lapSelect");

    this.hudPosition = document.getElementById("hudPosition");
    this.hudLap = document.getElementById("hudLap");
    this.hudPowerUp = document.getElementById("hudPowerUp");
    this.hudPowerIcon = document.getElementById("hudPowerIcon");
    this.hudSpeed = document.getElementById("hudSpeed");
    this.hudFps = document.getElementById("hudFps");
    this.hudTurboFill = document.getElementById("hudTurboFill");
    this.hudTurboLabel = document.getElementById("hudTurboLabel");
    this.hudRoot = document.getElementById("hud");
    this.minimap = document.getElementById("miniMap");
    this.raceCountdown = document.getElementById("raceCountdown");

    this.finishScreen = document.getElementById("finishScreen");
    this.finishText = document.getElementById("finishText");
    this.restartBtn = document.getElementById("restartBtn");
    this.backMenuBtn = document.getElementById("backMenuBtn");

    this.hideFinish();
    this.setMenuVisible(false); // Ocultar menú inicialmente
    this.setRaceUIVisible(false);
    this.setCountdownVisible(false);
  }

  onPlay(handler) {
    this.playBtn.addEventListener("click", () => handler(this.getSelection()));
  }

  onRestart(handler) {
    this.restartBtn.addEventListener("click", handler);
  }

  onBackToMenu(handler) {
    this.backMenuBtn?.addEventListener("click", handler);
  }

  onSelectionChange(handler) {
    const events = ["change", "input"];
    const controls = [this.characterSelect, this.vehicleSelect, this.colorPicker, this.trackSelect, this.difficultySelect, this.lapSelect].filter(Boolean);

    for (const control of controls) {
      for (const ev of events) {
        control.addEventListener(ev, () => handler(this.getSelection()));
      }
    }
  }

  getSelection() {
    return {
      characterId: this.characterSelect.value,
      vehicleId: this.vehicleSelect.value,
      vehicleColor: this.colorPicker.value,
      trackId: this.trackSelect.value,
      difficulty: this.difficultySelect?.value || "medium",
      laps: this.lapSelect?.value || "3",
    };
  }

  setMenuVisible(visible) {
    if (!this.menuOverlay) return;
    // Usar display directamente para evitar conflictos con inline styles
    this.menuOverlay.style.display = visible ? "flex" : "none";
  }

  setRaceUIVisible(visible) {
    if (this.hudRoot) this.hudRoot.classList.toggle("visible", !!visible);
    if (this.minimap) this.minimap.classList.toggle("visible", !!visible);
  }

  setCountdownVisible(visible) {
    if (!this.raceCountdown) return;
    this.raceCountdown.classList.toggle("visible", !!visible);
    if (!visible) this.raceCountdown.textContent = "";
  }

  setCountdownText(text) {
    if (!this.raceCountdown) return;
    this.raceCountdown.textContent = text;
    this.raceCountdown.classList.add("visible");
  }

  hideFinish() {
    this.finishScreen.classList.remove("visible");
  }

  showFinish(text) {
    this.finishText.textContent = text;
    this.finishScreen.classList.add("visible");
  }

  setFPS(fps) {
    if (!this.hudFps) return;
    this.hudFps.textContent = String(fps);
  }

  updateHUD(player, position, totalRacers, totalLaps) {
    this.hudPosition.textContent = `${position} / ${totalRacers}`;
    // totalLaps puede ser un número o "∞" para modo infinito
    this.hudLap.textContent = `${player.lap} / ${totalLaps}`;
    this.hudSpeed.textContent = `${Math.max(0, Math.round(player.velocity.length() * 4.2))} km/h`;

    const turboPct = Math.max(0, Math.min(100, Math.round(player.turboEnergy || 0)));
    if (this.hudTurboFill) this.hudTurboFill.style.width = `${turboPct}%`;
    if (this.hudTurboLabel) {
      if (player.driftFactor > 0.25) {
        this.hudTurboLabel.textContent = `Cargando turbo ${turboPct}%`;
      } else if (player.boostTimer > 0) {
        this.hudTurboLabel.textContent = `Gastando turbo ${player.boostTimer.toFixed(1)}s`;
      } else {
        this.hudTurboLabel.textContent = `Turbo ${turboPct}%`;
      }
    }

    if (player.currentItem) {
      const names = { rocket: "Cohete", spikes: "Pinchos", turbo: "Turbo", shield: "Escudo", pulse: "Pulso" };
      this.hudPowerUp.textContent = names[player.currentItem];
      if (this.hudPowerIcon) this.hudPowerIcon.className = `hud-power-icon ${player.currentItem}`;
      return;
    }

    if (player.boostTimer > 0) {
      this.hudPowerUp.textContent = `Turbo del coche ${player.boostTimer.toFixed(1)}s`;
      if (this.hudPowerIcon) this.hudPowerIcon.className = "hud-power-icon turbo";
      return;
    }

    this.hudPowerUp.textContent = "Sin poder";
    if (this.hudPowerIcon) this.hudPowerIcon.className = "hud-power-icon none";
  }
}
