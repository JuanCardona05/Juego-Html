export class GameManager {
  constructor(ui) {
    this.ui = ui;
    this.started = false;
    this.finished = false;
    this.playerPosition = 1;

    this.ui.setRaceStarted(false);
    this.ui.hideFinish();

    this.ui.startBtn.addEventListener("click", () => this.start());
  }

  start() {
    this.started = true;
    this.finished = false;
    this.ui.setRaceStarted(true);
    this.ui.hideFinish();
  }

  finish(position) {
    this.started = false;
    this.finished = true;
    this.playerPosition = position;
    this.ui.showFinish(position);
  }
}
