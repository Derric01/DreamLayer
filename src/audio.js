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
    if (event === 'delivered') [392, 494, 587, 784].forEach((f, i) => this.tone(f, .6, i * .13, .035));
  }
}
