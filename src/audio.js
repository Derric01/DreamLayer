export class Audio {
  constructor() { this.enabled = false; this.ctx = null; }
  async enable() {
    try { this.ctx ??= new (window.AudioContext || window.webkitAudioContext)(); await this.ctx.resume(); this.enabled = true; this.play('stamp'); return true; }
    catch { this.enabled = false; return false; }
  }
  disable() { this.enabled = false; }
  tone(frequency, duration, at = 0, volume = .04, type = 'sine') {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + at, oscillator = this.ctx.createOscillator(), gain = this.ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + .01); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain).connect(this.ctx.destination); oscillator.start(t); oscillator.stop(t + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  play(event) {
    if (event === 'jump') { this.tone(440, .11, 0, .025, 'triangle'); this.tone(660, .09, .035, .018); }
    if (event === 'stamp') { this.tone(100, .13, 0, .09, 'triangle'); this.tone(180, .07, .015, .035); }
    if (event === 'reclaim') this.tone(280, .13, 0, .025, 'triangle');
    if (event === 'gravity') { this.tone(330, .17, 0, .025); this.tone(495, .22, .06, .025); }
    if (event === 'fall') this.tone(160, .2, 0, .025, 'triangle');
    if (event === 'dash') { this.tone(260, .08, 0, .035, 'sawtooth'); this.tone(520, .12, .03, .025); }
    if (event === 'pulse') [220, 440, 660].forEach((f, i) => this.tone(f, .22, i * .04, .035, 'triangle'));
    if (event === 'land') this.tone(100, .08, 0, .025, 'triangle');
    if (event === 'memory') [784, 988, 1175].forEach((f, i) => this.tone(f, .25, i * .065, .02));
    if (event === 'checkpoint') [330, 440, 660].forEach((f, i) => this.tone(f, .35, i * .09, .025));
    if (event === 'delivered') [392, 494, 587, 784].forEach((f, i) => this.tone(f, .6, i * .13, .035));
  }
}
