const shell = document.querySelector("#heroShell");
const video = document.querySelector("#foldVideo");
const canvas = document.querySelector("#videoCanvas");
const ctx = canvas?.getContext("2d", { willReadFrequently: true });
const progressValue = document.querySelector("#progressValue");
const researchDetail = document.querySelector("#researchDetail");

const HAND_CLOSE_DURATION = 2.945;
const animationState = {
  progress: 0,
  targetProgress: 0,
  duration: HAND_CLOSE_DURATION,
  ready: false,
  seeking: false,
};

const researchNodes = [
  {
    title: "LLM Automation",
    text: "A short story prompt is expanded into a full symbolic schema: objects, facts, actions, milestones, effects, stages, and action families.",
  },
  {
    title: "Action Generation",
    text: "Actions carry both narrative purpose and planning semantics: stage, family, narrative function, preconditions, forbidden facts, and effects.",
  },
  {
    title: "Milestones",
    text: "Milestones are ordered state goals. Different actions can reach the same milestone, so the narrative process remains flexible.",
  },
  {
    title: "Solver",
    text: "The planner treats each milestone as a temporary goal and returns a witness plan if that state is reachable.",
  },
  {
    title: "Reflection",
    text: "Verifier feedback gives the LLM concrete failure codes and diagnostics for revising the generated schema.",
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.dataset.page === pageName);
  });

  document.querySelectorAll(".site-nav nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === pageName);
  });

  if (!["home", "about", "research", "experience", "contact"].includes(pageName)) {
    document.querySelectorAll(".site-nav nav button").forEach((button) => {
      button.classList.remove("active");
    });
    document
      .querySelector('.site-nav nav button[data-page-target="research"]')
      ?.classList.add("active");
  }

  window.history.replaceState(null, "", `#${pageName}`);
}

function bindNavigation() {
  document.querySelectorAll("[data-page-target]").forEach((control) => {
    control.addEventListener("click", () => showPage(control.dataset.pageTarget));
  });

  const initialPage = window.location.hash.replace("#", "") || "home";
  if (document.querySelector(`[data-page="${initialPage}"]`)) {
    showPage(initialPage);
  }
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawVideoFrame();
}

function pointerToProgress(clientX) {
  const center = window.innerWidth / 2;
  const half = window.innerWidth / 2;
  return clamp(Math.abs(clientX - center) / half, 0, 1);
}

function setTargetFromPointer(event) {
  animationState.targetProgress = pointerToProgress(event.clientX);
  shell?.style.setProperty("--hand-close-progress", animationState.targetProgress.toFixed(3));
}

function sampleBackground(data, width, height) {
  const points = [
    [8, 8],
    [width - 9, 8],
    [8, height - 9],
    [width - 9, height - 9],
  ];
  const bg = [0, 0, 0];
  points.forEach(([x, y]) => {
    const i = (y * width + x) * 4;
    bg[0] += data[i];
    bg[1] += data[i + 1];
    bg[2] += data[i + 2];
  });
  return bg.map((value) => value / points.length);
}

function removeFlatBackground() {
  if (!canvas || !ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  if (width < 2 || height < 2) return;

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const bg = sampleBackground(data, width, height);

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const backgroundLike = distance < 46 || brightness < 26 || brightness > 246;

    if (backgroundLike) {
      data[i + 3] = 0;
    } else if (distance < 78) {
      data[i + 3] = Math.round(((distance - 46) / 32) * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
}

function drawVideoFrame() {
  if (!canvas || !ctx || !video || !animationState.ready || video.videoWidth === 0) return;

  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  const videoRatio = video.videoWidth / video.videoHeight;
  const canvasRatio = rect.width / rect.height;
  let drawWidth = rect.width;
  let drawHeight = rect.height;

  if (videoRatio > canvasRatio) {
    drawHeight = rect.width / videoRatio;
  } else {
    drawWidth = rect.height * videoRatio;
  }

  const x = (rect.width - drawWidth) / 2;
  const y = (rect.height - drawHeight) / 2;
  ctx.drawImage(video, x, y, drawWidth, drawHeight);

  try {
    removeFlatBackground();
  } catch {
    // Pixel reads may be blocked by local codec paths; the canvas still draws the frame.
  }
}

function seekToProgress(progress) {
  if (!video || !animationState.ready || animationState.seeking) return;
  const target = clamp(progress, 0, 1) * animationState.duration;
  if (Math.abs(video.currentTime - target) < 0.018) return;

  animationState.seeking = true;
  video.currentTime = target;
}

function animate() {
  animationState.progress += (animationState.targetProgress - animationState.progress) * 0.18;
  if (progressValue) {
    progressValue.textContent = animationState.progress.toFixed(3);
  }
  seekToProgress(animationState.progress);
  requestAnimationFrame(animate);
}

function bindResearchNodes() {
  document.querySelectorAll(".research-node").forEach((button) => {
    button.addEventListener("click", () => {
      const node = researchNodes[Number(button.dataset.node)];
      if (!node || !researchDetail) return;

      document.querySelectorAll(".research-node").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      researchDetail.innerHTML = `
        <p class="kicker">Selected Node</p>
        <h3>${node.title}</h3>
        <p>${node.text}</p>
      `;
    });
  });
}

function bindFlowNodes() {
  document.querySelectorAll(".project-visual").forEach((visual) => {
    const insight = visual.querySelector(".visual-insight");
    if (!insight) return;

    visual.querySelectorAll(".flow-node").forEach((button) => {
      button.addEventListener("click", () => {
        visual.querySelectorAll(".flow-node").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        insight.innerHTML = `
          <span>Interactive Flow</span>
          <h3>${button.dataset.insightTitle}</h3>
          <p>${button.dataset.insightText}</p>
        `;
      });
    });
  });
}

if (video) {
  video.addEventListener("loadedmetadata", () => {
    animationState.duration = Math.min(video.duration || HAND_CLOSE_DURATION, HAND_CLOSE_DURATION);
    animationState.ready = true;
    video.pause();
    resizeCanvas();
    seekToProgress(0);
  });

  video.addEventListener("seeked", () => {
    animationState.seeking = false;
    drawVideoFrame();
  });

  video.addEventListener("loadeddata", drawVideoFrame);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", setTargetFromPointer);
window.addEventListener("pointerleave", () => {
  animationState.targetProgress = animationState.progress;
});

bindNavigation();
resizeCanvas();
bindResearchNodes();
bindFlowNodes();
requestAnimationFrame(animate);
