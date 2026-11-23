import { Ctx, Env, rng } from "./core";
import { Film } from "./film";
import { human } from "./character/human/figure";
import { writeOn, measure } from "./kinetic";
import { line, type Piece } from "./music/plan";
import { filmAudio } from "./music/render";
import { cue, cueEnd, drawSubtitles, phrases, toCaptions } from "./subtitles";
import { narrationAudio, syncMarks } from "./voice";

const W = 1080, H = 1920, FPS = 30, BPM = 80, BEAT = (60 / BPM) * FPS;
const DURATION_FRAMES = 45 * FPS; // 45 seconds

// Colors for flat vector style
const BG = "#f5f0e8";
const SKIN = "#f4c8a0";
const HAIR = "#3d2b1f";
const SHIRT = "#2d5a8a";
const PANTS = "#1a2d4a";
const ACCENT = "#e87d4d";
const TEXT = "#2d2d2d";
const LIGHT = "#fff8f0";
const SHADOW = "#d8c8b8";

// Baked voice timing (will be replaced after narrate.mjs bake)
// For now, using frame-based timing structure
const TIMING = {
  version: 1,
  fps: FPS,
  totalFrames: DURATION_FRAMES,
  lines: [
    {
      id: "intro",
      text: "Meet Alex. Alex has a problem.",
      display: "Meet Alex. Alex has a problem.",
      start: 30,
      end: 120,
      durationS: 3.0,
      words: [
        { w: "Meet", say: "Meet", from: 30, to: 45 },
        { w: "Alex.", say: "Alex", from: 45, to: 60 },
        { w: "Alex", say: "Alex", from: 60, to: 75 },
        { w: "has", say: "has", from: 75, to: 85 },
        { w: "a", say: "a", from: 85, to: 90 },
        { w: "problem.", say: "problem", from: 90, to: 120 }
      ],
      hash: "intro-hash"
    },
    {
      id: "problem",
      text: "Every day, the same mountain of tasks. No time. No focus.",
      display: "Every day, the same mountain of tasks. No time. No focus.",
      start: 150,
      end: 330,
      durationS: 6.0,
      words: [
        { w: "Every", say: "Every", from: 150, to: 165 },
        { w: "day,", say: "day", from: 165, to: 180 },
        { w: "the", say: "the", from: 180, to: 190 },
        { w: "same", say: "same", from: 190, to: 205 },
        { w: "mountain", say: "mountain", from: 205, to: 230 },
        { w: "of", say: "of", from: 230, to: 238 },
        { w: "tasks.", say: "tasks", from: 238, to: 260 },
        { w: "No", say: "No", from: 270, to: 285 },
        { w: "time.", say: "time", from: 285, to: 300 },
        { w: "No", say: "No", from: 305, to: 320 },
        { w: "focus.", say: "focus", from: 320, to: 330 }
      ],
      hash: "problem-hash"
    },
    {
      id: "discovery",
      text: "Then Alex found a way. A simple system. One thing at a time.",
      display: "Then Alex found a way. A simple system. One thing at a time.",
      start: 360,
      end: 540,
      durationS: 6.0,
      words: [
        { w: "Then", say: "Then", from: 360, to: 375 },
        { w: "Alex", say: "Alex", from: 375, to: 390 },
        { w: "found", say: "found", from: 390, to: 410 },
        { w: "a", say: "a", from: 410, to: 418 },
        { w: "way.", say: "way", from: 418, to: 435 },
        { w: "A", say: "A", from: 445, to: 453 },
        { w: "simple", say: "simple", from: 453, to: 470 },
        { w: "system.", say: "system", from: 470, to: 490 },
        { w: "One", say: "One", from: 500, to: 515 },
        { w: "thing", say: "thing", from: 515, to: 530 },
        { w: "at", say: "at", from: 530, to: 535 },
        { w: "a", say: "a", from: 535, to: 540 },
        { w: "time.", say: "time", from: 540, to: 540 }
      ],
      hash: "discovery-hash"
    },
    {
      id: "solution",
      text: "Now the mountain becomes steps. Each step, a win. Focus returns.",
      display: "Now the mountain becomes steps. Each step, a win. Focus returns.",
      start: 570,
      end: 750,
      durationS: 6.0,
      words: [
        { w: "Now", say: "Now", from: 570, to: 585 },
        { w: "the", say: "the", from: 585, to: 593 },
        { w: "mountain", say: "mountain", from: 593, to: 615 },
        { w: "becomes", say: "becomes", from: 615, to: 635 },
        { w: "steps.", say: "steps", from: 635, to: 655 },
        { w: "Each", say: "Each", from: 665, to: 680 },
        { w: "step,", say: "step", from: 680, to: 695 },
        { w: "a", say: "a", from: 695, to: 700 },
        { w: "win.", say: "win", from: 700, to: 720 },
        { w: "Focus", say: "Focus", from: 730, to: 742 },
        { w: "returns.", say: "returns", from: 742, to: 750 }
      ],
      hash: "solution-hash"
    },
    {
      id: "outro",
      text: "Your turn. One step. Today.",
      display: "Your turn. One step. Today.",
      start: 780,
      end: 900,
      durationS: 4.0,
      words: [
        { w: "Your", say: "Your", from: 780, to: 795 },
        { w: "turn.", say: "turn", from: 795, to: 815 },
        { w: "One", say: "One", from: 825, to: 840 },
        { w: "step.", say: "step", from: 840, to: 860 },
        { w: "Today.", say: "Today", from: 870, to: 900 }
      ],
      hash: "outro-hash"
    }
  ]
};

const EVENTS = phrases(TIMING, { shape: "9x16" });
const onBeat = (f: number) => Math.floor(f / BEAT) * BEAT;

const CUT1 = onBeat(cue(TIMING, "problem"));
const CUT2 = onBeat(cue(TIMING, "discovery"));
const CUT3 = onBeat(cue(TIMING, "solution"));
const CUT4 = onBeat(cue(TIMING, "outro"));
const N = DURATION_FRAMES;

const ease = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
const span = (f: number, a: number, b: number) => ease((f - a) / Math.max(1, b - a));

// Character position and animation helpers
const charX = W / 2;
const charY = H * 0.55;
const charScale = 0.35;

const speaking = (f: number) => TIMING.lines.some((l) => f >= l.start && f < l.end);
const currentLine = (f: number) => TIMING.lines.find((l) => f >= l.start && f < l.end);
const currentWord = (f: number) => {
  const line = currentLine(f);
  if (!line) return null;
  return line.words.find((w) => f >= w.from && f < w.to);
};

// Draw ground/background
const drawGround = (ctx: Ctx, env: Env, f: number, mood: "calm" | "stress" | "hope" | "win" | "peace") => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  
  // Background gradient based on mood
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  switch (mood) {
    case "stress":
      grad.addColorStop(0, "#e8d8c8");
      grad.addColorStop(0.5, "#d8c0a0");
      grad.addColorStop(1, "#c8a888");
      break;
    case "hope":
      grad.addColorStop(0, "#e0f0e8");
      grad.addColorStop(0.5, "#c8e8d8");
      grad.addColorStop(1, "#a8d8c0");
      break;
    case "win":
      grad.addColorStop(0, "#f0f8e0");
      grad.addColorStop(0.5, "#d8e8c0");
      grad.addColorStop(1, "#c0d8a0");
      break;
    case "peace":
      grad.addColorStop(0, "#f0e8f8");
      grad.addColorStop(0.5, "#e0d0e8");
      grad.addColorStop(1, "#d0c0d8");
      break;
    default:
      grad.addColorStop(0, BG);
      grad.addColorStop(1, "#e8e0d8");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  
  // Subtle pattern
  ctx.fillStyle = "rgba(0,0,0,0.02)";
  for (let x = 0; x < W; x += 60) {
    for (let y = 0; y < H; y += 60) {
      const offset = (f * 0.5 + x + y) % 120;
      if (offset < 2) ctx.fillRect(x, y, 1, 1);
    }
  }
};

// Draw human character using the figure module
const drawCharacter = (ctx: Ctx, env: Env, f: number, action: "idle" | "stress" | "think" | "work" | "celebrate" | "confident") => {
  const s = charScale * env.scale;
  ctx.save();
  ctx.translate(charX * env.scale, charY * env.scale);
  ctx.scale(s, s);
  
  // Time-based micro-animations
  const breath = Math.sin(f * 0.05) * 2;
  const sway = Math.sin(f * 0.03) * 1.5;
  
  // Body
  const bodyY = 0 + breath;
  ctx.fillStyle = SHIRT;
  ctx.beginPath();
  ctx.roundRect(-40, bodyY - 20, 80, 100, 15);
  ctx.fill();
  
  // Pants
  ctx.fillStyle = PANTS;
  ctx.beginPath();
  ctx.roundRect(-35, bodyY + 80, 70, 60, 10);
  ctx.fill();
  
  // Arms
  const armSwing = action === "work" ? Math.sin(f * 0.3) * 15 : 
                   action === "celebrate" ? 30 : 0;
  const armAngle = action === "stress" ? -0.3 : 
                   action === "think" ? -0.1 : 0;
  
  // Left arm
  ctx.fillStyle = SKIN;
  ctx.save();
  ctx.translate(-50, bodyY + 10);
  ctx.rotate(armAngle + armSwing * 0.01);
  ctx.beginPath();
  ctx.roundRect(-12, 0, 24, 80, 8);
  ctx.fill();
  ctx.restore();
  
  // Right arm
  ctx.save();
  ctx.translate(50, bodyY + 10);
  ctx.rotate(-armAngle - armSwing * 0.01);
  ctx.beginPath();
  ctx.roundRect(-12, 0, 24, 80, 8);
  ctx.fill();
  ctx.restore();
  
  // Hands
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(-50 + Math.sin(armAngle) * 90, bodyY + 90 + Math.cos(armAngle) * 90, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(50 - Math.sin(armAngle) * 90, bodyY + 90 + Math.cos(armAngle) * 90, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  const headY = bodyY - 70 + breath * 0.5;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0 + sway * 0.5, headY, 45, 0, Math.PI * 2);
  ctx.fill();
  
  // Hair
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(0 + sway * 0.5, headY - 35, 50, Math.PI, 0);
  ctx.lineTo(45 + sway * 0.5, headY - 10);
  ctx.lineTo(-45 + sway * 0.5, headY - 10);
  ctx.closePath();
  ctx.fill();
  
  // Face - eyes
  const eyeY = headY - 8;
  const blink = (f % 180 < 4) ? 0.1 : 1;
  ctx.fillStyle = "#1a1a1a";
  // Left eye
  ctx.beginPath();
  ctx.ellipse(-12 + sway * 0.3, eyeY, 8, 8 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.ellipse(12 + sway * 0.3, eyeY, 8, 8 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyebrows - express emotion
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const browY = eyeY - 18;
  if (action === "stress") {
    // Worried brows
    ctx.beginPath();
    ctx.moveTo(-22 + sway * 0.3, browY + 5);
    ctx.lineTo(-2 + sway * 0.3, browY - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22 + sway * 0.3, browY - 5);
    ctx.lineTo(2 + sway * 0.3, browY + 5);
    ctx.stroke();
  } else if (action === "think") {
    // Thinking brow
    ctx.beginPath();
    ctx.moveTo(-20 + sway * 0.3, browY);
    ctx.lineTo(0 + sway * 0.3, browY - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20 + sway * 0.3, browY);
    ctx.lineTo(0 + sway * 0.3, browY - 3);
    ctx.stroke();
  } else if (action === "celebrate") {
    // Happy raised brows
    ctx.beginPath();
    ctx.moveTo(-20 + sway * 0.3, browY - 5);
    ctx.lineTo(-2 + sway * 0.3, browY - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20 + sway * 0.3, browY - 5);
    ctx.lineTo(2 + sway * 0.3, browY - 10);
    ctx.stroke();
  } else {
    // Neutral brows
    ctx.beginPath();
    ctx.moveTo(-20 + sway * 0.3, browY);
    ctx.lineTo(-4 + sway * 0.3, browY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4 + sway * 0.3, browY);
    ctx.lineTo(20 + sway * 0.3, browY);
    ctx.stroke();
  }
  
  // Mouth
  ctx.strokeStyle = "#2d1a1a";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  const mouthY = headY + 18;
  if (action === "stress") {
    // Frown
    ctx.beginPath();
    ctx.moveTo(-12 + sway * 0.3, mouthY + 3);
    ctx.quadraticCurveTo(0 + sway * 0.3, mouthY + 10, 12 + sway * 0.3, mouthY + 3);
    ctx.stroke();
  } else if (action === "celebrate") {
    // Big smile
    ctx.beginPath();
    ctx.moveTo(-18 + sway * 0.3, mouthY);
    ctx.quadraticCurveTo(0 + sway * 0.3, mouthY - 15, 18 + sway * 0.3, mouthY);
    ctx.stroke();
  } else if (action === "think") {
    // Slight frown/thinking
    ctx.beginPath();
    ctx.moveTo(-10 + sway * 0.3, mouthY + 2);
    ctx.quadraticCurveTo(0 + sway * 0.3, mouthY + 6, 10 + sway * 0.3, mouthY + 2);
    ctx.stroke();
  } else if (action === "confident") {
    // Confident slight smile
    ctx.beginPath();
    ctx.moveTo(-12 + sway * 0.3, mouthY);
    ctx.quadraticCurveTo(0 + sway * 0.3, mouthY - 5, 12 + sway * 0.3, mouthY);
    ctx.stroke();
  } else {
    // Neutral
    ctx.beginPath();
    ctx.moveTo(-8 + sway * 0.3, mouthY);
    ctx.lineTo(8 + sway * 0.3, mouthY);
    ctx.stroke();
  }
  
  ctx.restore();
};

// Draw visual metaphor elements
const drawMetaphor = (ctx: Ctx, env: Env, f: number, phase: number) => {
  const s = env.scale;
  const cx = charX * s;
  const cy = (charY - 180) * s;
  
  if (phase === 1) { // Mountain of tasks
    const progress = span(f, CUT1 - 60, CUT1);
    if (progress <= 0) return;
    
    ctx.globalAlpha = progress;
    // Mountain made of rectangles (tasks)
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = cx + (col - 1.5) * 50 * s;
      const y = cy + row * 45 * s - (1 - progress) * 100 * s;
      
      ctx.fillStyle = `hsl(${30 + i * 15}, 60%, ${50 + row * 10}%)`;
      ctx.fillRect(x - 35 * s, y - 20 * s, 70 * s, 40 * s);
      
      // Task label
      ctx.fillStyle = TEXT;
      ctx.font = `${14 * s}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("Task", x, y + 5 * s);
    }
    ctx.globalAlpha = 1;
  }
  
  if (phase === 2) { // Breaking mountain into steps
    const progress = span(f, CUT2 - 60, CUT2 + 120);
    if (progress <= 0) return;
    
    // Steps descending
    for (let i = 0; i < 8; i++) {
      const stepProgress = Math.max(0, progress - i * 0.1);
      const eased = ease(stepProgress);
      if (eased <= 0) continue;
      
      const x = cx + (i - 3.5) * 40 * s;
      const y = cy + 80 * s - i * 35 * s - (1 - eased) * 200 * s;
      
      ctx.fillStyle = `hsl(${120 + i * 10}, 50%, ${45 + i * 5}%)`;
      ctx.globalAlpha = eased;
      ctx.beginPath();
      ctx.roundRect(x - 50 * s, y - 15 * s, 100 * s, 30 * s, 8 * s);
      ctx.fill();
      
      // Step number
      ctx.fillStyle = LIGHT;
      ctx.font = `bold ${18 * s}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, x, y + 6 * s);
      ctx.globalAlpha = 1;
    }
  }
  
  if (phase === 3) { // Celebration particles
    const progress = span(f, CUT3, CUT4);
    if (progress <= 0) return;
    
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const distance = 100 * s + progress * 200 * s;
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance * 0.5 - progress * 100 * s;
      
      ctx.fillStyle = `hsl(${40 + i * 20}, 80%, 60%)`;
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(x, y, (5 + Math.sin(f * 0.3 + i) * 3) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
};

// Shot 1: Introduction - Meet Alex
const shotIntro = (ctx: Ctx, local: number, env: Env) => {
  drawGround(ctx, env, local, "calm");
  
  // Character enters
  const enterProgress = span(local, 0, 60);
  const charYOffset = (1 - enterProgress) * 200;
  
  ctx.save();
  ctx.translate(0, charYOffset * env.scale);
  drawCharacter(ctx, env, local, "idle");
  ctx.restore();
  
  // Title text
  const t0 = cue(TIMING, "intro:Meet");
  const t1 = cue(TIMING, "intro:problem");
  writeOn(ctx, env, "Meet Alex", W / 2 - measure("Meet Alex", 48) / 2, 150, 48, span(local, t0, t1), "ink", { seed: 1, color: TEXT });
  
  drawSubtitles(ctx, env, local, EVENTS, { highlight: true, accent: ACCENT });
};

const shotProblem = (ctx: Ctx, local: number, env: Env) => {
  const f = local + CUT1;
  drawGround(ctx, env, f, "stress");
  
  // Character stressed
  drawCharacter(ctx, env, f, "stress");
  
  // Mountain of tasks metaphor
  drawMetaphor(ctx, env, f, 1);
  
  // Key words
  const t0 = cue(TIMING, "problem:mountain");
  writeOn(ctx, env, "mountain of tasks", W / 2 - measure("mountain of tasks", 36) / 2, 300, 36, span(f, t0, t0 + 40), "ink", { seed: 2, color: TEXT });
  
  drawSubtitles(ctx, env, f, EVENTS, { highlight: true, accent: ACCENT });
};

const shotDiscovery = (ctx: Ctx, local: number, env: Env) => {
  const f = local + CUT2;
  drawGround(ctx, env, f, "hope");
  
  // Character thinking
  drawCharacter(ctx, env, f, "think");
  
  // Lightbulb moment
  const bulbProgress = span(f, 0, 60);
  if (bulbProgress > 0) {
    ctx.globalAlpha = bulbProgress;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc((charX + 120) * env.scale, (charY - 200) * env.scale, 30 * env.scale * bulbProgress, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  drawSubtitles(ctx, env, f, EVENTS, { highlight: true, accent: ACCENT });
};

const shotSolution = (ctx: Ctx, local: number, env: Env) => {
  const f = local + CUT3;
  drawGround(ctx, env, f, "win");
  
  // Character working confidently
  drawCharacter(ctx, env, f, "confident");
  
  // Steps metaphor
  drawMetaphor(ctx, env, f, 2);
  
  // Key word "steps"
  const t0 = cue(TIMING, "solution:steps");
  writeOn(ctx, env, "becomes steps", W / 2 - measure("becomes steps", 42) / 2, 280, 42, span(f, t0, t0 + 50), "ink", { seed: 3, color: TEXT });
  
  drawSubtitles(ctx, env, f, EVENTS, { highlight: true, accent: ACCENT });
};

const shotOutro = (ctx: Ctx, local: number, env: Env) => {
  const f = local + CUT4;
  drawGround(ctx, env, f, "peace");
  
  // Character celebrates
  drawCharacter(ctx, env, f, "celebrate");
  
  // Celebration particles
  drawMetaphor(ctx, env, f, 3);
  
  // Final message
  const t0 = cue(TIMING, "outro:turn");
  writeOn(ctx, env, "Your turn.", W / 2 - measure("Your turn.", 52) / 2, 200, 52, span(f, t0, t0 + 40), "ink", { seed: 4, color: TEXT });
  writeOn(ctx, env, "One step. Today.", W / 2 - measure("One step. Today.", 36) / 2, 280, 36, span(f, t0 + 20, t0 + 60), "ink", { seed: 5, color: ACCENT });
  
  drawSubtitles(ctx, env, f, EVENTS, { highlight: true, accent: ACCENT });
};

// Music bed - composed for the narrative
const problemSolutionBed = (): Piece => {
  const B = 4;
  return {
    title: "Problem→Solution bed (A minor, 80 bpm)", seed: 88, tail: 2,
    harmony: [
      { t: 0, name: "Am" }, { t: 4, name: "F" }, { t: 8, name: "C" }, { t: 12, name: "G" },
      { t: 16, name: "Am" }, { t: 20, name: "F" }, { t: 24, name: "Dm" }, { t: 28, name: "E" },
      { t: 32, name: "Am" }, { t: 36, name: "F" }, { t: 40, name: "C" }, { t: 44, name: "G" },
    ].map(({ t, name }) => ({ t: t as number, name: name as string })),
    plan: { 
      style: "lofiElectronic", 
      tempo: BPM, 
      meter: "4/4", 
      sections: [
        { id: "intro", bars: 4, mood: "curious", key: "A", mode: "minor", melody: ["hook"], dyn: [0.3, 0.4], ending: "continue" },
        { id: "problem", bars: 8, mood: "tense", key: "A", mode: "minor", melody: ["ostinato"], dyn: [0.5, 0.6], ending: "continue" },
        { id: "discovery", bars: 8, mood: "hopeful", key: "C", mode: "major", melody: ["hook", "counter"], dyn: [0.4, 0.6], ending: "continue" },
        { id: "solution", bars: 8, mood: "confident", key: "C", mode: "major", melody: ["hook", "counter"], dyn: [0.6, 0.7], ending: "continue" },
        { id: "outro", bars: 4, mood: "peaceful", key: "A", mode: "minor", melody: ["hook"], dyn: [0.4, 0.2], ending: "tail" }
      ] 
    },
    parts: [
      { id: "pad", inst: "warmPad", role: "accomp", notes: line(0, "[A3 C4 E4]:4 | [F3 A3 C4]:4 | [C3 E4 G4]:4 | [G3 B3 D4]:4 | [A3 C4 E4]:4 | [F3 A3 C4]:4 | [D3 F3 A3]:4 | [E3 G#3 B3]:4 | [A3 C4 E4]:4 | [F3 A3 C4]:4 | [C3 E4 G4]:4 | [G3 B3 D4]:4 | [A3 C4 E4]:4 | [F3 A3 C4]:4 | [C3 E4 G4]:4 | [E3 G#3 B3]:4 | [A3 C4 E4]:4", { role: "accomp", v: 0.4, bpb: B }), gainDb: -8, opts: { cut: 2000, attack: 0.8, release: 2.0, spread: 0.6 } },
      { id: "ostinato", inst: "softPluck", role: "texture", notes: line(0, "A4:1 E4:1 A4:1 E4:1 | F4:1 C4:1 F4:1 C4:1 | C4:1 G3:1 C4:1 G3:1 | G3:1 D3:1 G3:1 D3:1 | A4:1 E4:1 A4:1 E4:1 | F4:1 C4:1 F4:1 C4:1 | D4:1 A3:1 D4:1 A3:1 | E4:1 G#3:1 E4:1 G#3:1 | A4:1 E4:1 A4:1 E4:1 | F4:1 C4:1 F4:1 C4:1 | C4:1 G3:1 C4:1 G3:1 | G3:1 D3:1 G3:1 D3:1 | A4:1 E4:1 A4:1 E4:1 | F4:1 C4:1 F4:1 C4:1 | C4:1 G3:1 C4:1 G3:1 | E4:1 G#3:1 E4:1 G#3:1 | A4:2", { role: "texture", v: 0.3, bpb: B }), gainDb: -4 },
      { id: "melody", inst: "softLead", role: "melody", notes: line(0, "r:4 | r:4 | r:4 | r:4 | C5:2 E5:1 D5:1 | r:2 C5:1 D5:1 | E5:2 G5:1 E5:1 | D5:2 | C5:2 A4:1 G4:1 | r:2 A4:1 B4:1 | C5:2 E5:1 D5:1 | r:2 C5:1 D5:1 | E5:2 G5:1 E5:1 | D5:4 | C5:4", { role: "melody", v: 0.5, bpb: B }), gainDb: -2, opts: { cut: 3000, attack: 0.1, release: 0.5 } },
      { id: "bass", inst: "sub", role: "bass", notes: line(0, "A2:4 | F2:4 | C2:4 | G2:4 | A2:4 | F2:4 | D2:4 | E2:4 | A2:4 | F2:4 | C2:4 | G2:4 | A2:4 | F2:4 | C2:4 | E2:4 | A2:4", { role: "bass", v: 0.5, bpb: B }), gainDb: -6 },
    ],
  };
};

// SFX cues for key moments
const sfxCues = [
  { frame: CUT1, id: "whoosh" },      // Transition to problem
  { frame: CUT2, id: "pop" },         // Lightbulb moment
  { frame: CUT3, id: "chime" },       // Steps appearing
  { frame: CUT4, id: "success" },     // Celebration
];

export const problemSolution: Film = {
  meta: {
    title: "Problem → Solution",
    W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu", kind: "explainer",
    poster: cue(TIMING, "discovery:way") + 20,
    captions: toCaptions(EVENTS, FPS),
    sync: syncMarks(TIMING),
    score: { tempo: BPM, form: "32 bars: intro(4) problem(8) discovery(8) solution(8) outro(4)", grid: true },
  },
  assets: { images: {} },
  shots: [
    { id: "intro", start: 0, end: CUT1, draw: shotIntro },
    { id: "problem", start: CUT1, end: CUT2, draw: shotProblem },
    { id: "discovery", start: CUT2, end: CUT3, draw: shotDiscovery },
    { id: "solution", start: CUT3, end: CUT4, draw: shotSolution },
    { id: "outro", start: CUT4, end: N, draw: shotOutro },
  ],
  audio: narrationAudio({
    voice: TIMING as any, // Will be replaced with baked voice
    music: filmAudio(problemSolutionBed(), N / FPS),
    frames: N,
    musicDb: -6,
    depthDb: -9,
  }),
};