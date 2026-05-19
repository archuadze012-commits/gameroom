export function playInviteSound() {
  try {
    const ctx = new AudioContext();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.5, ctx.currentTime);
    master.connect(ctx.destination);

    // Layer 1 — low pulse thud
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(80, ctx.currentTime);
    thud.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
    thudGain.gain.setValueAtTime(0.6, ctx.currentTime);
    thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    thud.connect(thudGain);
    thudGain.connect(master);
    thud.start(ctx.currentTime);
    thud.stop(ctx.currentTime + 0.08);

    // Layer 2 — rising frequency sweep (futuristic scanner)
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(200, ctx.currentTime + 0.05);
    sweep.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.25);
    sweepGain.gain.setValueAtTime(0, ctx.currentTime + 0.05);
    sweepGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.1);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    // Low-pass filter on sweep so it's not harsh
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    sweep.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(master);
    sweep.start(ctx.currentTime + 0.05);
    sweep.stop(ctx.currentTime + 0.25);

    // Layer 3 — first ping
    const ping1 = ctx.createOscillator();
    const ping1Gain = ctx.createGain();
    ping1.type = "sine";
    ping1.frequency.setValueAtTime(1047, ctx.currentTime + 0.22);
    ping1Gain.gain.setValueAtTime(0.45, ctx.currentTime + 0.22);
    ping1Gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    ping1.connect(ping1Gain);
    ping1Gain.connect(master);
    ping1.start(ctx.currentTime + 0.22);
    ping1.stop(ctx.currentTime + 0.45);

    // Layer 4 — second ping (higher, softer — harmonic)
    const ping2 = ctx.createOscillator();
    const ping2Gain = ctx.createGain();
    ping2.type = "sine";
    ping2.frequency.setValueAtTime(1568, ctx.currentTime + 0.32);
    ping2Gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.32);
    ping2Gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    ping2.connect(ping2Gain);
    ping2Gain.connect(master);
    ping2.start(ctx.currentTime + 0.32);
    ping2.stop(ctx.currentTime + 0.6);

    // Close context after sound finishes
    setTimeout(() => ctx.close(), 800);
  } catch {}
}
