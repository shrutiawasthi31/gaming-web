"use client";

import { useEffect, useRef, useState } from "react";

const games = [
  {
    title: "Apex Drift",
    genre: "competitive",
    players: "3v3",
    description: "Fast arena battles with hover-bike movement and ranked ladders.",
    tags: ["Ranked", "Cross-play", "Weekly cups"],
  },
  {
    title: "Relic Run",
    genre: "co-op",
    players: "4-player",
    description: "Raid ancient vaults with your squad and share live loot rolls.",
    tags: ["Co-op", "PvE", "Voice rooms"],
  },
  {
    title: "Neon Archive",
    genre: "story",
    players: "Solo",
    description: "A cyber mystery RPG with choice-driven arcs and companion missions.",
    tags: ["Story", "Choices", "Episodes"],
  },
  {
    title: "Titan Grid",
    genre: "competitive",
    players: "5v5",
    description: "Hero shooter tactics with map objectives and replay analysis.",
    tags: ["Esports", "Strategy", "Clips"],
  },
  {
    title: "Campfire Quest",
    genre: "co-op",
    players: "2-4 player",
    description: "Relaxed survival crafting with shared journals and drop-in sessions.",
    tags: ["Cozy", "Crafting", "Drop-in"],
  },
  {
    title: "Ghost Signal",
    genre: "story",
    players: "Solo",
    description: "Stealth thriller chapters with atmospheric puzzles and branching endings.",
    tags: ["Mystery", "Stealth", "Narrative"],
  },
];

const squads = [
  {
    name: "Night Shift",
    focus: "Ranked grinders",
    members: 18,
    note: "Queues most nights and shares VOD reviews after sessions.",
  },
  {
    name: "Loot Loop",
    focus: "Co-op raiders",
    members: 24,
    note: "Runs weekly dungeon nights and clip contests for standout plays.",
  },
  {
    name: "Lore Seekers",
    focus: "Story explorers",
    members: 11,
    note: "Trades theories, walkthrough tips, and spoiler-safe discussion threads.",
  },
];

const initialForm = { username: "", password: "" };

export default function PulsePlayApp({ initialScores }) {
  const [filter, setFilter] = useState("all");
  const [theme, setTheme] = useState("default");
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [authError, setAuthError] = useState("");
  const [status, setStatus] = useState("Ready when you are.");
  const [user, setUser] = useState(null);
  const [scores, setScores] = useState(initialScores);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [game, setGame] = useState({
    running: false,
    score: 0,
    best: 0,
    timeLeft: 30,
  });
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const stateRef = useRef({
    running: false,
    score: 0,
    timeLeft: 30,
    spawnTimer: 0,
    elapsedAccumulator: 0,
    lastFrameTime: 0,
    submittedScore: false,
    player: { x: 0, y: 462, width: 44, height: 18, speed: 7 },
    hazards: [],
    leftPressed: false,
    rightPressed: false,
  });

  const filteredGames = filter === "all" ? games : games.filter((item) => item.genre === filter);
  const challengeScore = Math.min(game.score, 250);
  const challengePercent = `${(challengeScore / 250) * 100}%`;

  useEffect(() => {
    const best = Number(window.localStorage.getItem("pulseplay-best-score") || 0);
    setGame((current) => ({ ...current, best }));
    drawStaticFrame(best);
    loadUser();
    loadScores();

    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  async function loadUser() {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    setUser(data.user);
  }

  async function loadScores() {
    const response = await fetch("/api/scores");
    const data = await response.json();
    setScores(data.scores || []);
  }

  function drawStaticFrame(bestOverride) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const state = stateRef.current;
    drawBackground(ctx, canvas);
    drawPlayer(ctx, state.player);
    setGame((current) => ({
      ...current,
      best: typeof bestOverride === "number" ? bestOverride : current.best,
    }));
  }

  function resetRound() {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    state.score = 0;
    state.timeLeft = 30;
    state.spawnTimer = 0;
    state.elapsedAccumulator = 0;
    state.lastFrameTime = 0;
    state.submittedScore = false;
    state.hazards = [];
    state.player.x = canvas.width / 2 - state.player.width / 2;
    setGame((current) => ({
      ...current,
      score: 0,
      timeLeft: 30,
    }));
  }

  async function submitScore(scoreValue) {
    if (!user || scoreValue <= 0) {
      return;
    }

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scoreValue }),
      });
      const data = await response.json();
      if (response.ok) {
        setScores(data.scores || []);
      }
    } catch (_error) {
      setStatus("Score saved locally, but leaderboard sync missed this run.");
    }
  }

  function finishRound(message, finalScore) {
    const state = stateRef.current;
    state.running = false;
    cancelAnimationFrame(frameRef.current);
    setStatus(message);
    setGame((current) => ({ ...current, running: false }));

    const best = Number(window.localStorage.getItem("pulseplay-best-score") || 0);
    if (finalScore > best) {
      window.localStorage.setItem("pulseplay-best-score", String(finalScore));
      setGame((current) => ({ ...current, best: finalScore }));
    }

    if (!state.submittedScore) {
      state.submittedScore = true;
      void submitScore(finalScore);
    }
  }

  function animate(timestamp) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const state = stateRef.current;

    if (!state.running) {
      return;
    }

    if (!state.lastFrameTime) {
      state.lastFrameTime = timestamp;
    }

    const delta = timestamp - state.lastFrameTime;
    state.lastFrameTime = timestamp;
    state.elapsedAccumulator += delta;
    state.spawnTimer += delta;

    if (state.leftPressed) {
      state.player.x -= state.player.speed;
    }
    if (state.rightPressed) {
      state.player.x += state.player.speed;
    }
    state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));

    if (state.spawnTimer > 440) {
      const size = 18 + Math.random() * 26;
      state.hazards.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size,
        speed: 2.5 + Math.random() * 2.6 + state.score * 0.015,
        color: Math.random() > 0.5 ? "#ff6bcb" : "#ffd166",
      });
      state.spawnTimer = 0;
    }

    state.hazards = state.hazards.filter((hazard) => {
      hazard.y += hazard.speed;
      if (intersects(state.player, hazard)) {
        finishRound(`Crashed at ${state.score} points. Tap start for another run.`, state.score);
        return false;
      }
      if (hazard.y > canvas.height) {
        state.score += 10;
        setGame((current) => ({ ...current, score: state.score }));
        return false;
      }
      return true;
    });

    if (state.elapsedAccumulator >= 1000) {
      state.elapsedAccumulator = 0;
      state.timeLeft -= 1;
      setGame((current) => ({ ...current, timeLeft: state.timeLeft }));
      if (state.timeLeft <= 0) {
        finishRound(`Run complete. Final score: ${state.score}.`, state.score);
        return;
      }
    }

    drawBackground(ctx, canvas);
    drawPlayer(ctx, state.player);
    drawHazards(ctx, state.hazards);
    frameRef.current = requestAnimationFrame(animate);
  }

  function startGame() {
    resetRound();
    const state = stateRef.current;
    state.running = true;
    setGame((current) => ({ ...current, running: true }));
    setStatus(user ? "Survive the full countdown and bank your score." : "Play freely. Login to save your score.");
    frameRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "ArrowLeft") stateRef.current.leftPressed = true;
      if (event.key === "ArrowRight") stateRef.current.rightPressed = true;
    }
    function onKeyUp(event) {
      if (event.key === "ArrowLeft") stateRef.current.leftPressed = false;
      if (event.key === "ArrowRight") stateRef.current.rightPressed = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setSubmittingAuth(true);
    setAuthError("");

    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || "Something went wrong.");
        return;
      }

      setUser(data.user);
      setForm(initialForm);
      setStatus(`Welcome, ${data.user.username}. Your next run can hit the leaderboard.`);
    } catch (_error) {
      setAuthError("Network error. Please try again.");
    } finally {
      setSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setStatus("Logged out. You can still play, but scores will stay local.");
  }

  return (
    <div className={`page-shell ${theme === "neon" ? "neon-mode" : ""}`}>
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <div className="brand-mark">P</div>
            <div>
              <p className="eyebrow">Gaming App</p>
              <h1>PulsePlay Arena</h1>
            </div>
          </div>
          <div className="nav-actions">
            <a href="#discover">Discover</a>
            <a href="#mini-game">Mini-Game</a>
            <a href="#leaderboard">Leaderboard</a>
          </div>
        </nav>

        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Level up your gaming crew</p>
            <h2>One hub for discovering games, tracking streaks, and climbing the board.</h2>
            <p className="hero-text">
              Register, log in, browse curated games, join squads, and post real scores from a built-in
              reflex challenge backed by Next.js route handlers.
            </p>
            <div className="hero-cta">
              <button className="primary-button" onClick={() => setTheme(theme === "neon" ? "default" : "neon")}>
                Toggle Neon Mode
              </button>
              <a className="secondary-button" href="#mini-game">
                Play Now
              </a>
            </div>
            <div className="stats-row">
              <article>
                <strong>28K</strong>
                <span>weekly players</span>
              </article>
              <article>
                <strong>112</strong>
                <span>active squads</span>
              </article>
              <article>
                <strong>{scores.length}</strong>
                <span>saved leaderboard runs</span>
              </article>
            </div>
          </div>

          <aside className="hero-panel">
            <div className="panel-card glass-card">
              <p className="eyebrow">Daily challenge</p>
              <h3>Skyline Sprint</h3>
              <p>Hit a score above 250 in the mini-game to unlock the Night Runner badge.</p>
              <div className="progress-row">
                <div className="progress-bar">
                  <span style={{ width: challengePercent }} />
                </div>
                <strong>{challengeScore} / 250</strong>
              </div>
            </div>

            <div className="panel-card auth-card">
              <div className="auth-toggle">
                <button
                  className={authMode === "login" ? "filter-button active" : "filter-button"}
                  onClick={() => setAuthMode("login")}
                  type="button"
                >
                  Login
                </button>
                <button
                  className={authMode === "register" ? "filter-button active" : "filter-button"}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  Register
                </button>
              </div>
              {user ? (
                <div className="signed-in-card">
                  <p className="eyebrow">Signed in</p>
                  <h3>{user.username}</h3>
                  <p>Your scores now submit directly to the live leaderboard.</p>
                  <button className="secondary-button button-reset" onClick={handleLogout} type="button">
                    Logout
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  <input
                    className="text-input"
                    placeholder="Username"
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  />
                  <input
                    className="text-input"
                    placeholder="Password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                  {authError ? <p className="error-text">{authError}</p> : null}
                  <button className="primary-button full-width" disabled={submittingAuth} type="submit">
                    {submittingAuth ? "Working..." : authMode === "login" ? "Login" : "Create Account"}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </section>
      </header>

      <main>
        <section className="section-block" id="discover">
          <div className="section-heading">
            <p className="eyebrow">Discover</p>
            <h2>Curated games for every mood</h2>
          </div>
          <div className="filter-row">
            {["all", "competitive", "co-op", "story"].map((value) => (
              <button
                key={value}
                className={filter === value ? "filter-button active" : "filter-button"}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value === "all" ? "All" : value === "co-op" ? "Co-op" : value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <div className="game-grid">
            {filteredGames.map((gameItem) => (
              <article className="game-card" key={gameItem.title}>
                <p className="eyebrow">{gameItem.genre}</p>
                <h3>{gameItem.title}</h3>
                <p>{gameItem.description}</p>
                <div className="tag-row">
                  <span className="tag">{gameItem.players}</span>
                  {gameItem.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block gameplay-section" id="mini-game">
          <div className="section-heading">
            <p className="eyebrow">Playable demo</p>
            <h2>Neon Dodge</h2>
            <p>Use arrow keys or on-screen controls to dodge incoming blocks for 30 seconds.</p>
          </div>
          <div className="gameplay-layout">
            <div className="canvas-shell">
              <canvas ref={canvasRef} width="420" height="520" aria-label="Neon Dodge game" />
              <div className="mobile-controls">
                <button
                  data-move="left"
                  onPointerDown={() => (stateRef.current.leftPressed = true)}
                  onPointerLeave={() => (stateRef.current.leftPressed = false)}
                  onPointerUp={() => (stateRef.current.leftPressed = false)}
                  type="button"
                >
                  Left
                </button>
                <button
                  data-move="right"
                  onPointerDown={() => (stateRef.current.rightPressed = true)}
                  onPointerLeave={() => (stateRef.current.rightPressed = false)}
                  onPointerUp={() => (stateRef.current.rightPressed = false)}
                  type="button"
                >
                  Right
                </button>
              </div>
            </div>
            <aside className="game-sidebar">
              <div className="score-card">
                <span>Score</span>
                <strong>{game.score}</strong>
              </div>
              <div className="score-card">
                <span>Best</span>
                <strong>{game.best}</strong>
              </div>
              <div className="score-card">
                <span>Time</span>
                <strong>{game.timeLeft}</strong>
              </div>
              <button className="primary-button full-width" disabled={game.running} onClick={startGame} type="button">
                {game.running ? "Run Active" : "Start Run"}
              </button>
              <p className="status-text">{status}</p>
            </aside>
          </div>
        </section>

        <section className="section-block" id="squads">
          <div className="section-heading">
            <p className="eyebrow">Squads</p>
            <h2>Find your crew</h2>
          </div>
          <div className="squad-grid">
            {squads.map((squad) => (
              <article className="squad-card" key={squad.name}>
                <div className="pulse-dot" />
                <h3>{squad.name}</h3>
                <p>{squad.focus}</p>
                <strong>{squad.members} members</strong>
                <p>{squad.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="leaderboard">
          <div className="section-heading">
            <p className="eyebrow">Backend leaderboard</p>
            <h2>Top recorded runs</h2>
            <p>Scores are stored server-side in the app data layer and refreshed through API routes.</p>
          </div>
          <div className="leaderboard-list">
            {scores.length ? (
              scores.map((entry, index) => (
                <article className="leaderboard-row" key={`${entry.username}-${entry.createdAt}-${index}`}>
                  <div>
                    <p className="eyebrow">#{index + 1}</p>
                    <h3>{entry.username}</h3>
                  </div>
                  <div className="leaderboard-meta">
                    <strong>{entry.score}</strong>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                </article>
              ))
            ) : (
              <article className="leaderboard-row">
                <div>
                  <h3>No scores yet</h3>
                  <p>Register, start a run, and be the first player on the board.</p>
                </div>
              </article>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function drawBackground(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#06101c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let y = 0; y < canvas.height; y += 36) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function drawPlayer(ctx, player) {
  ctx.fillStyle = "#66f2ff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#66f2ff";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.shadowBlur = 0;
}

function drawHazards(ctx, hazards) {
  hazards.forEach((hazard) => {
    ctx.fillStyle = hazard.color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = hazard.color;
    ctx.fillRect(hazard.x, hazard.y, hazard.size, hazard.size);
  });
  ctx.shadowBlur = 0;
}

function intersects(player, hazard) {
  return (
    player.x < hazard.x + hazard.size &&
    player.x + player.width > hazard.x &&
    player.y < hazard.y + hazard.size &&
    player.y + player.height > hazard.y
  );
}
