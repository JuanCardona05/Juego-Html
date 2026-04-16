export class UIManager {
  constructor() {
    this.positionEl = document.getElementById("hudPosition");
    this.lapEl = document.getElementById("hudLap");
    this.powerUpEl = document.getElementById("hudPowerUp");
    this.speedEl = document.getElementById("hudSpeed");

    this.startScreen = document.getElementById("startScreen");
    this.finishScreen = document.getElementById("finishScreen");
    this.finishText = document.getElementById("finishText");
    this.startBtn = document.getElementById("startBtn");
    this.restartBtn = document.getElementById("restartBtn");
  }

  setRaceStarted(started) {
    this.startScreen.classList.toggle("visible", !started);
  }

  showFinish(position) {
    this.finishText.textContent = `Llegaste en posicion ${position}`;
    this.finishScreen.classList.add("visible");
  }

  hideFinish() {
    this.finishScreen.classList.remove("visible");
  }

  update(player, position, totalRacers, totalLaps) {
    this.positionEl.textContent = `${position} / ${totalRacers}`;
    this.lapEl.textContent = `${player.lap} / ${totalLaps}`;
    this.powerUpEl.textContent = player.currentPowerUp;
    this.speedEl.textContent = `${Math.round(player.getSpeed())}`;
  }
}
