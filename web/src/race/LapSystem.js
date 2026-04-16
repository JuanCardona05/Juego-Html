const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class LapSystem {
  constructor(track, racers, totalLaps = 3) {
    this.track = track;
    this.racers = racers;
    this.totalLaps = totalLaps;
    this.finishCount = 0;
  }

  update() {
    const cps = this.track.checkpoints;
    if (!cps || cps.length === 0) return;

    for (const r of this.racers) {
      if (r.finished) continue;
      const cp = cps[r.nextCheckpoint];
      if (!cp) continue;

      const d = distance(r.position, cp);
      if (d < cp.r) {
        r.nextCheckpoint += 1;
        if (r.nextCheckpoint >= cps.length) {
          r.nextCheckpoint = 0;
          r.lap += 1;
          if (r.lap > this.totalLaps) {
            r.finished = true;
            this.finishCount += 1;
            r.finishOrder = this.finishCount;
            r.lap = this.totalLaps;
          }
        }
      }
    }
  }

  getPositionOf(target) {
    const sorted = this.getRanking();
    return sorted.findIndex((r) => r === target) + 1;
  }

  getRacerAhead(target) {
    const sorted = this.getRanking();
    const idx = sorted.findIndex((r) => r === target);
    if (idx <= 0) return null;
    return sorted[idx - 1];
  }

  getRanking() {
    return [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
      if (a.finished) return -1;
      if (b.finished) return 1;

      if (a.lap !== b.lap) return b.lap - a.lap;
      if (a.nextCheckpoint !== b.nextCheckpoint) return b.nextCheckpoint - a.nextCheckpoint;

      const acp = this.track.checkpoints[a.nextCheckpoint];
      const bcp = this.track.checkpoints[b.nextCheckpoint];
      const ad = acp ? distance(a.position, acp) : Infinity;
      const bd = bcp ? distance(b.position, bcp) : Infinity;
      return ad - bd;
    });
  }
}
