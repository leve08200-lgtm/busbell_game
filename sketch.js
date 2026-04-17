// =============================================
// 버스 하차벨 게임 - Bus Bell Game
// =============================================

// ── 에셋 변수 ──────────────────────────────
let bus, busStop1, busStop2;
let street1,
  street2,
  street3,
  street4,
  street5,
  street6,
  street7,
  street8,
  street9,
  street10;
let bell1, bell1Off, bell2, bell2Off;
let button1, button2, button3;
let gameOverImg;
let nametag;

// ── 사운드 변수 ───────────────────────────
let bgMusic, gameOverSound, bellSound;

// ── 배경 레이어 ────────────────────────────
// 배경은 4개 이미지 중 현재 2장이 나란히 이어짐
// bgImgs[i]  : 이미지 참조
// bgSlots[]  : 현재 화면에 있는 두 슬롯 {img, x}
let bgImgs = [];
let bgSlots = []; // [{img, x}, {img, x}]

// ── 정류장 ────────────────────────────────
let stopImgs = []; // [busStop1, busStop2]

// 화면 위에 존재하는 정류장 오브젝트 배열
// {img, x, y, w, h, isTarget}
let stops = [];

// 목표 정류장 인덱스(stops 배열 내)
let targetStopIndex = -1;

// 다음 정류장 스폰까지 남은 거리(px)
let nextStopDist = 0;
const STOP_MIN_DIST = 1500; // 정류장 사이 최소 거리
const STOP_MAX_DIST = 2800; // 정류장 사이 최대 거리
const STOP_W = 172;
const STOP_H = 89;

// ── 버스 ─────────────────────────────────
const BUS_W = 487;
const BUS_H = 153;
let busY; // setup()에서 계산

// ── 속도 & 게임 상태 ──────────────────────
let speed = 2.4;
const SPEED_INCREMENT = 0.5;
const SPEED_MAX = 12;

let score = 0;
let gameOver = false;
let gameStarted = true; // 타이틀 화면 없이 바로 시작

// ── 게임오버 연출 ─────────────────────────
// 'playing' | 'goingToStop' | 'busExiting' | 'ended' | 'nameInput'
let gamePhase = "playing";
let gameOverStopX = 0;
let busExitX = 100;

// ── 이름 입력 ────────────────────────────
let playerName = "";
let nameInputActive = false;
let nameInput; // HTML input 요소

// ── 속도 변동 (15점 이상) ─────────────────
let speedVariTimer = 0; // 속도 변동 주기 타이머
let speedVariDir = 1; // 1: 빠르게, -1: 느리게
let speedVariPeriod = 160; // 방향 전환 주기 (전환 시점에만 새로 뽑음)

// ── 벨 스페셜 스테이지 ───────────────────
let bellSpecialTimer = 0; // 스페셜 남은 프레임 (>0이면 벨 움직이는 중)
const BELL_SPECIAL_DURATION = 180; // 3초
let lastSpecialScore = 0; // 마지막 스페셜 발동 점수

// ── 유령 벨 이벤트 (15점 이후 랜덤 발생) ──
let ghostBellActive = false; // 다른 승객이 벨을 누른 상태
let ghostBellPenalty = false; // 유저가 중복으로 눌러서 패널티 중
let nextGhostScore = 0; // 다음 유령 벨 발동 점수

// ── 벨 버튼 (동적 위치/크기) ──────────────
// 기본 벨: 화면 하단 왼쪽 / 보조벨(bell2): 점수 오르면 랜덤 등장
let bellPressed = false;

// 벨 오브젝트 배열 {x, y, w, h, type('1'|'2'), active, pressedTimer}
let bells = [];

// ── 마포구 정류장 이름 풀 ────────────────
const STOP_NAMES = [
  "합정역",
  "망원역",
  "마포역",
  "공덕역",
  "대흥역",
  "신수동",
  "서교동",
  "동교동",
  "성산동",
  "망원동",
  "합정동",
  "상수동",
  "구수동",
  "아현동",
  "염리동",
  "용강동",
  "도화동",
  "현석동",
  "당인리",
  "토정로",
  "마포대교북단",
  "양화대교북단",
  "성미산로",
  "월드컵경기장",
  "홍대입구역",
  "상암DMC",
  "디지털미디어시티역",
  "수색역",
  "가좌역",
  "증산역",
  "난지캠핑장",
  "하늘공원",
  "평화의공원",
];

// ── 정류장 시퀀스 ─────────────────────────
// 게임 시작 시 전체 순서를 배열로 만들어두고 순서대로 스폰
// [{name, isTarget}, ...]
let stopSequence = [];
let seqIndex = 0;

function buildSequence() {
  let names = [...STOP_NAMES].sort(() => Math.random() - 0.5);
  let seq = [];
  let i = 0;
  while (i < names.length) {
    // 일반 정류장 1~3개
    let gap = rndInt(1, 3);
    for (let g = 0; g < gap && i < names.length; g++, i++) {
      seq.push({ name: names[i], isTarget: false });
    }
    // 목표 정류장 1개
    if (i < names.length) {
      seq.push({ name: names[i], isTarget: true });
      i++;
    }
  }
  return seq;
}

function nextSeqItem() {
  if (seqIndex >= stopSequence.length) {
    stopSequence = buildSequence();
    seqIndex = 0;
    // 새 시퀀스의 첫 목표를 pendingTargetName으로 미리 설정
    let ft = stopSequence.find((s) => s.isTarget);
    if (ft) {
      pendingTargetName = ft.name;
      targetAnnounce.name = ft.name;
    }
  }
  return stopSequence[seqIndex++];
}

// ── 안내방송 관련 ─────────────────────────
let announcement = { currentName: "", nextName: "", timer: 0 };

// ── 목표 정류장 안내 ──────────────────────
let targetAnnounce = { name: "", timer: 0 };
const TARGET_ANNOUNCE_DURATION = 170;

// 스폰 카운터
let spawnCounter = 0;
let pendingTargetName = "";

// ── 기준 해상도 (모든 좌표는 이 크기 기준) ──
const BASE_W = 1440;
const BASE_H = 717;
let scaleRatio = 1;
function rndInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// 연속 같은 배경 최대 2회까지만 허용
let bgHistory = []; // 최근 선택된 배경 인덱스 기록

function pickBg() {
  let candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  // 최근 2장이 같은 이미지면 그 인덱스 제외
  if (bgHistory.length >= 1) {
    let blocked = bgHistory[bgHistory.length - 1];
    candidates = candidates.filter((i) => i !== blocked);
  }
  let chosen = candidates[Math.floor(Math.random() * candidates.length)];
  bgHistory.push(chosen);
  if (bgHistory.length > 4) bgHistory.shift();
  return bgImgs[chosen];
}

// ── preload ───────────────────────────────
function preload() {
  bus = loadImage("bus.gif");
  busStop1 = loadImage("busStop1.png");
  busStop2 = loadImage("busStop2.png");
  street1 = loadImage("street1.PNG");
  street2 = loadImage("street2.PNG");
  street3 = loadImage("street3.PNG");
  street4 = loadImage("street4.PNG");
  street5 = loadImage("street5.PNG");
  street6 = loadImage("street6.PNG");
  street7 = loadImage("street7.PNG");
  street8 = loadImage("street8.PNG");
  street9 = loadImage("street9.PNG");
  street10 = loadImage("street10.PNG");
  bell1 = loadImage("bell1.png");
  bell1Off = loadImage("bell1Off.png");
  bell2 = loadImage("bell2.png");
  bell2Off = loadImage("bell2Off.png");

  bgMusic = loadSound("bus.mp3");
  gameOverSound = loadSound("gameover.mp3");
  bellSound = loadSound("bell.mp3");
  gameOverImg = loadImage("GameOver.png");
  button1 = loadImage("button1.png");
  button2 = loadImage("button2.png");
  button3 = loadImage("button_circle.png");
  nametag = loadImage("name.png");
}

// ── setup ────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CORNER);
  textFont("Gowun Dodum");

  bgImgs = [
    street1,
    street2,
    street3,
    street4,
    street5,
    street6,
    street7,
    street8,
    street9,
    street10,
  ];
  stopImgs = [busStop1, busStop2];

  scaleRatio = min(windowWidth / BASE_W, windowHeight / BASE_H);
  busY = BASE_H - BUS_H - 220;

  bgMusic.setLoop(true);
  userStartAudio();

  // 한글 입력을 위한 HTML input 요소 생성
  nameInput = createInput("");
  nameInput.attribute("placeholder", "이름을 입력하세요");
  nameInput.attribute("maxlength", "10");
  nameInput.style("position", "absolute");
  nameInput.style("font-size", "18px");
  nameInput.style("font-family", "Gowun Dodum");
  nameInput.style("border", "none");
  nameInput.style("outline", "none");
  nameInput.style("background", "transparent");
  nameInput.style("text-align", "center");
  nameInput.style("color", "#141414");
  nameInput.style("width", "300px");
  nameInput.hide();
  nameInput.input(() => {
    playerName = nameInput.value();
  });

  initGame();
}

// ── initGame: 게임 상태 초기화 ────────────
function initGame() {
  speed = 2.4;
  score = 0;
  gameOver = false;
  gamePhase = "playing";
  busExitX = 100;
  speedVariTimer = 0;
  speedVariDir = 1;
  speedVariPeriod = 160;
  stops = [];
  targetStopIndex = -1;
  bellPressed = false;
  nextStopDist = rndInt(STOP_MIN_DIST, STOP_MAX_DIST);
  announcement = { currentName: "", nextName: "", timer: 0 };
  targetAnnounce = { name: "", timer: 0 };
  pendingTargetName = "";
  bellSpecialTimer = 0;
  lastSpecialScore = 0;
  ghostBellActive = false;
  ghostBellPenalty = false;
  nextGhostScore = 0;
  spawnCounter = 0;

  // 시퀀스 초기화
  stopSequence = buildSequence();
  seqIndex = 0;

  showLeaderboard = false;
  scoreSaved = false;
  playerName = "";
  nameInputActive = false;
  if (nameInput) {
    nameInput.value("");
    nameInput.hide();
  }

  bgHistory = [];
  bgSlots = [
    { img: pickBg(), x: 0 },
    { img: pickBg(), x: BASE_W },
  ];

  let bellType = rndInt(0, 1) === 0 ? "1" : "2";
  bells = [makeBell(bellType, false)];

  // 첫 목표 이름: seqIndex=0부터 순서대로 첫 isTarget
  pendingTargetName = "";
  for (let i = 0; i < stopSequence.length; i++) {
    if (stopSequence[i].isTarget) {
      pendingTargetName = stopSequence[i].name;
      targetAnnounce.name = stopSequence[i].name;
      targetAnnounce.timer = TARGET_ANNOUNCE_DURATION;
      break;
    }
  }

  // 배경음악 재시작
  if (bgMusic && !bgMusic.isPlaying()) {
    bgMusic.play();
  }
}

// 벨 오브젝트 생성
function makeBell(type, isRandom) {
  let w, h, x, y;
  if (!isRandom) {
    // 기본 위치: 왼쪽 하단
    if (type === "2") {
      w = 60;
      h = 60; // bell2: 1:1 비율 60×60
    } else {
      w = 90;
      h = 135; // bell1: 기존 비율
    }
    x = 80;
    y = BASE_H - h - 30;
  } else {
    if (type === "2") {
      let s = rndInt(45, 90);
      w = s;
      h = s; // bell2: 1:1 랜덤 크기
    } else {
      w = rndInt(60, 110);
      h = Math.round(w * 1.5);
    }
    x = rndInt(50, BASE_W - w - 50);
    y = rndInt(BASE_H * 0.5, BASE_H - h - 20);
  }
  return { x, y, w, h, type, active: true, pressedTimer: 0 };
}

// ── draw ─────────────────────────────────
function draw() {
  // 레터박스 배경
  background(30);

  // 기준 해상도 기준으로 가운데 정렬 후 스케일
  let offsetX = (windowWidth - BASE_W * scaleRatio) / 2;
  let offsetY = (windowHeight - BASE_H * scaleRatio) / 2;
  translate(offsetX, offsetY);
  scale(scaleRatio);

  if (gamePhase === "ended") {
    drawGameOver();
    return;
  }

  // waitingForStop: 게임오버 판정 후 가장 가까운 정류장까지 달리는 중
  // updateStops에서 passed 감지 시 자동으로 ended로 전환
  if (gamePhase === "waitingForStop") {
    updateBackground();
    updateStops();
    drawScene();
    drawHUD();
    return;
  }

  // ── 정상 게임 진행 ───────────────────────
  updateBackground();
  updateStops();
  updateBells();
  updateSpeedVariation();
  drawScene();
  drawHUD();
}

// ── 배경 업데이트 ─────────────────────────
function updateBackground() {
  for (let s of bgSlots) s.x -= speed;
  if (bgSlots[0].x <= -BASE_W) {
    bgSlots[0].x = bgSlots[1].x + BASE_W;
    bgSlots[0].img = pickBg();
    let tmp = bgSlots[0];
    bgSlots[0] = bgSlots[1];
    bgSlots[1] = tmp;
  }
}

// ── 정류장 업데이트 ───────────────────────
function updateStops() {
  for (let s of stops) s.x -= speed;

  let busRight = 100 + BUS_W;

  for (let s of stops) {
    // 안내방송: 정류장이 버스 앞 600px 안에 들어올 때 미리 트리거
    if (!s.announced && s.x < busRight + 600) {
      s.announced = true;
      announcement.currentName = s.name;
      announcement.nextName = s.nextName || "-";
      announcement.timer = 180;
    }

    // 버스가 정류장을 지나쳤을 때
    if (!s.passed && s.x + s.w < busRight) {
      s.passed = true;

      // 벨 초기화 (정류장 통과 시)
      bellPressed = false;
      ghostBellActive = false;
      for (let b of bells) b.pressedTimer = 0;

      // 목표 정류장을 벨 안 누르고 지나침 → 게임오버
      if (s.isTarget && !s.wasTarget) {
        startGameOverSequence();
        return;
      }

      // 목표 정류장 정답 통과 → 다음 목표 안내 + 스페셜 발동
      if (s.wasTarget) {
        targetAnnounce.timer = TARGET_ANNOUNCE_DURATION;
        if (score % 5 === 0 && bellSpecialTimer === 0) {
          bellSpecialTimer = 1;
          moveBellRandom();
        }
      }

      if (gamePhase === "waitingForStop") {
        gamePhase = "ended";
        gameOverSound.play();
      }
    }
  }

  stops = stops.filter((s) => s.x + s.w > -10);

  nextStopDist -= speed;
  if (nextStopDist <= 0) {
    spawnStop();
    nextStopDist = rndInt(STOP_MIN_DIST, STOP_MAX_DIST);
  }
}

// ── 속도 변동 (15점 이상) ─────────────────
function updateSpeedVariation() {
  if (score < 15) return;
  speedVariTimer++;
  if (speedVariTimer >= speedVariPeriod) {
    speedVariTimer = 0;
    speedVariDir *= -1;
    speedVariPeriod = rndInt(120, 200); // 다음 주기만 여기서 뽑음
  }
  let baseSpeed = 2 + score * 0.3;
  let targetSpeed =
    speedVariDir === 1 ? min(baseSpeed + 2, SPEED_MAX) : max(baseSpeed - 2, 1);
  speed = lerp(speed, targetSpeed, 0.02);
}

// 정류장 하나 스폰
function spawnStop() {
  let bgBottom = BASE_H * 2 * (615 / 1326) - 80;
  let isStop2 = rndInt(0, 1) === 1;
  let img = isStop2 ? busStop2 : busStop1;
  let w = isStop2 ? 35 : STOP_W;
  let h = isStop2 ? 131 : STOP_H;
  let y = isStop2 ? bgBottom - 256 : bgBottom - 210;

  // 시퀀스에서 순서대로 꺼냄
  let item = nextSeqItem();

  if (item.isTarget) {
    pendingTargetName = item.name;
    targetAnnounce.name = item.name;
    // 타이머는 켜지 않음 (목표 통과 후에만 표시)
  }

  // 다음에 나올 이름을 지금 peek해서 저장 (안내방송용)
  // 단, 시퀀스 끝이면 다음 시퀀스 첫 이름
  let peekIdx = seqIndex;
  let nextItemName;
  if (peekIdx < stopSequence.length) {
    nextItemName = stopSequence[peekIdx].name;
  } else {
    // 시퀀스 끝 - 다음 시퀀스 첫 이름은 알 수 없으므로 pendingTargetName 사용
    nextItemName = pendingTargetName || "-";
  }

  let newStop = {
    img,
    x: BASE_W + 50,
    y,
    w,
    h,
    isTarget: item.isTarget,
    name: item.name,
    nextName: nextItemName,
    spawnIndex: spawnCounter++,
    announced: false,
    passed: false,
    wasTarget: false,
  };

  // 직전 스폰된 정류장의 nextName을 이번 정류장 이름으로 확정
  // 단, 이미 안내방송이 나간 정류장은 덮어쓰지 않음
  if (stops.length > 0) {
    let prev = stops[stops.length - 1];
    if (!prev.announced) {
      prev.nextName = item.name;
    }
  }

  stops.push(newStop);
}

// ── 벨 업데이트 ───────────────────────────
function updateBells() {
  for (let b of bells) {
    if (b.pressedTimer > 0 && !bellPressed && !ghostBellActive)
      b.pressedTimer--;
    if (bellPressed || ghostBellActive) b.pressedTimer = 999;
  }

  // 스페셜 중이면 60프레임마다 벨 이동
  if (bellSpecialTimer > 0) {
    bellSpecialTimer++;
    if (bellSpecialTimer % 60 === 0) {
      moveBellRandom();
    }
  }

  // 유령 벨: 15점 이후 nextGhostScore 도달 시 자동으로 벨 켜짐
  if (
    score >= 15 &&
    !ghostBellActive &&
    !bellPressed &&
    nextGhostScore > 0 &&
    score >= nextGhostScore
  ) {
    let target = stops.find((s) => s.isTarget);
    if (target && target.x > 100 + BUS_W + 200) {
      ghostBellActive = true;
      bellSound.play();
    }
  }
}

function moveBellRandom() {
  let b = bells[0];
  b.type = rndInt(0, 1) === 0 ? "1" : "2";
  if (b.type === "2") {
    let s = rndInt(45, 90);
    b.w = s;
    b.h = s;
  } else {
    b.w = rndInt(60, 110);
    b.h = Math.round(b.w * 1.5);
  }
  if (score < 10) {
    b.x = rndInt(30, BASE_W * 0.5 - b.w);
    b.y = rndInt(BASE_H * 0.75, BASE_H - b.h - 20);
  } else if (score < 15) {
    b.x = rndInt(30, BASE_W - b.w - 30);
    b.y = rndInt(BASE_H * 0.55, BASE_H - b.h - 20);
  } else {
    b.x = rndInt(30, BASE_W - b.w - 30);
    b.y = rndInt(BASE_H * 0.35, BASE_H - b.h - 20);
  }
}
// ── 씬 그리기 ────────
function drawScene(busX) {
  if (busX === undefined) busX = 100;
  // 흰 배경 먼저
  background(255);

  // 배경 이미지: 1326:615 비율 유지, y=-20
  let bgH = BASE_H * 2 * (615 / 1326); // 비율 환산 (여유 포함)
  for (let s of bgSlots) {
    image(s.img, s.x, -80, BASE_W, bgH);
  }

  // 정류장
  for (let s of stops) {
    image(s.img, s.x, s.y, s.w, s.h);
    // 목표 정류장 표시 (별 아이콘 대신 간단한 하이라이트)
    // if (s.isTarget) {
    //   noFill();
    //   stroke(255, 200, 0);
    //   strokeWeight(3);
    //   rect(s.x - 4, s.y - 4, s.w + 8, s.h + 8, 4);
    //   noStroke();
    // }
  }

  // 버스
  image(bus, busX, busY, BUS_W, BUS_H);

  // 벨 버튼들
  for (let b of bells) {
    if (!b.active) continue;
    let isPressed = bellPressed || ghostBellActive || b.pressedTimer > 0;
    if (b.type === "1") {
      image(isPressed ? bell1 : bell1Off, b.x, b.y, b.w, b.h);
    } else {
      image(isPressed ? bell2 : bell2Off, b.x, b.y, 60, 60);
    }
  }
}

// ── HUD ──────────────────────────────────
function drawHUD() {
  // 점수
  fill(30);
  noStroke();
  textSize(22);
  textStyle(BOLD);
  textAlign(RIGHT);
  text(`SCORE: ${score}`, BASE_W - 20, 40);
  textStyle(NORMAL);

  // ── 안내방송 (항상 표시, 타이머 있을 때) ──
  if (announcement.timer > 0) {
    announcement.timer--;
    let t = announcement.timer;
    let alpha = t < 30 ? map(t, 0, 30, 0, 255) : 255;

    fill(22, 24, 35, alpha * 0.6);
    noStroke();
    rect(BASE_W / 2 - 260, 12, 520, 56, 7);
    fill(255, 226, 98, alpha);
    textAlign(CENTER);
    textStyle(BOLD);
    textSize(15);
    text(`이번 정류장은 [${announcement.currentName}]입니다.`, BASE_W / 2, 33);
    fill(255, 255, 255, alpha);
    textSize(13);
    text(`다음 정류장은 [${announcement.nextName}]입니다.`, BASE_W / 2, 56);
    textStyle(NORMAL);
  }

  // ── 목표 정류장 안내 (안내방송 아래에 별도 표시) ──
  if (targetAnnounce.timer > 0) {
    targetAnnounce.timer--;
    let t = targetAnnounce.timer;
    let alpha = t < 30 ? map(t, 0, 30, 0, 255) : 255;

    fill(200, 35, 60, alpha * 0.9);
    noStroke();
    rect(BASE_W / 2 - 200, 78, 400, 52, 9);
    fill(255, alpha);
    textAlign(CENTER);
    textSize(14);
    text("내려야 할 정류장", BASE_W / 2, 94.5);
    textSize(19);
    textStyle(BOLD);
    fill(255, 226, 98, alpha);
    text(targetAnnounce.name, BASE_W / 2, 117);
    textStyle(NORMAL);
  }
}

// ── 벨 누름 처리 ──────────────────────────
function handleBellPress() {
  if (!gameStarted || gamePhase !== "playing") return;

  // 클릭 좌표를 기준 해상도로 역변환
  let offsetX = (windowWidth - BASE_W * scaleRatio) / 2;
  let offsetY = (windowHeight - BASE_H * scaleRatio) / 2;
  let mx = (mouseX - offsetX) / scaleRatio;
  let my = (mouseY - offsetY) / scaleRatio;

  // 벨 위치 클릭 확인
  let pressedBell = false;
  for (let b of bells) {
    if (!b.active) continue;
    if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) {
      pressedBell = true;
      break;
    }
  }
  if (!pressedBell) return;

  // 유령 벨 켜진 상태에서 또 누르면 → 패널티
  if (ghostBellActive && !bellPressed) {
    ghostBellActive = false;
    ghostBellPenalty = true;
    bellPressed = true;
    for (let b of bells) b.pressedTimer = 999;
    bellSound.play();
    return;
  }

  if (bellPressed) return; // 이미 눌린 상태면 무시

  // 벨 클릭 즉시 켜기
  bellPressed = true;
  for (let b of bells) b.pressedTimer = 999;
  bellSpecialTimer = 0;
  bellSound.play();

  let target = stops.find((s) => s.isTarget);
  let busRight = 100 + BUS_W;

  if (!target || target.x <= busRight - 80) {
    startGameOverSequence();
    return;
  }

  // 정답
  score++;
  if (ghostBellPenalty) {
    speed = 2;
    ghostBellPenalty = false;
  } else {
    speed = min(speed + SPEED_INCREMENT, SPEED_MAX);
  }
  target.isTarget = false;
  target.wasTarget = true;
  ghostBellActive = false;

  // 15점 이후 다음 유령 벨 발동 점수 설정
  if (score >= 15 && nextGhostScore <= score) {
    nextGhostScore = score + rndInt(4, 6);
  }

  // 다음 목표 이름 설정
  // stops에 아직 통과 안 한 isTarget 정류장이 있으면 그걸 사용
  let nextTarget = stops.find(
    (s) => s.isTarget && !s.passed && s.x > 100 + BUS_W,
  );
  if (nextTarget) {
    pendingTargetName = nextTarget.name;
    targetAnnounce.name = nextTarget.name;
  } else {
    // 아직 스폰 안 됐으면 시퀀스에서 다음 isTarget 이름 peek
    // seqIndex는 이미 꺼낸 다음을 가리키므로 여기서부터 탐색
    let found = false;
    for (let i = seqIndex; i < stopSequence.length; i++) {
      if (stopSequence[i].isTarget) {
        pendingTargetName = stopSequence[i].name;
        targetAnnounce.name = stopSequence[i].name;
        found = true;
        break;
      }
    }
    // 현재 시퀀스에 없으면 다음 시퀀스 첫 번째 목표
    if (!found) {
      let nextSeq = buildSequence();
      let firstTarget = nextSeq.find((s) => s.isTarget);
      if (firstTarget) {
        pendingTargetName = firstTarget.name;
        targetAnnounce.name = firstTarget.name;
      }
    }
  }
}

function startGameOverSequence() {
  gameOver = true;
  bgMusic.stop();
  let nearest = stops
    .filter((s) => s.x > 100 + BUS_W * 0.5)
    .sort((a, b) => a.x - b.x)[0];
  if (nearest) {
    gamePhase = "waitingForStop";
  } else {
    gamePhase = "ended";
    gameOverSound.play();
  }
}

// ── 타이틀 화면 ───────────────────────────
/*function drawTitle() {
  background(255);
  textAlign(CENTER, CENTER);

  fill(50, 30, 10);
  textSize(48);
  text("game start", BASE_W / 2, BASE_H / 2 - 80);

  textSize(20);
  fill(80);
  text("가야하는 정류장에 맞게 벨을 누르자", BASE_W / 2, BASE_H / 2 - 20);

  fill(200, 50, 50);
  textSize(26);
  text("클릭하여 시작", BASE_W / 2, BASE_H / 2 + 80);
}
  */

// ── Firebase 리더보드 저장 ────────────────
// index.html에서 Firebase SDK를 로드한 후 sketch.js를 불러와야 함
async function saveScoreToFirebase(name, s) {
  try {
    const { initializeApp, getApps } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, collection, addDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    const firebaseConfig = {
      apiKey: "AIzaSyCwCawEbOgdv6ho_m5nKmadQDe1UcZ8Qsk",
      authDomain: "busbellgame.firebaseapp.com",
      projectId: "busbellgame",
      storageBucket: "busbellgame.firebasestorage.app",
      messagingSenderId: "407202848461",
      appId: "1:407202848461:web:ebc53269d1b559770b1384",
    };

    const app =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);
    await addDoc(collection(db, "scores"), {
      name: name || "익명",
      score: s,
      date: new Date().toLocaleDateString("ko-KR"),
      timestamp: Date.now(),
    });
    return true;
  } catch (e) {
    console.error("Firebase 저장 실패:", e);
    return false;
  }
}
let scoreSaved = false;

function drawGameOver() {
  textFont("Gowun Dodum");
  background(255);

  // textAlign(CENTER, CENTER);
  // fill(255, 80, 80);
  // textSize(52);
  // text("GAME OVER", BASE_W / 2, BASE_H / 2 - 130);
  image(gameOverImg, BASE_W / 2 - 225, BASE_H / 2 - 200, 450, 67);

  fill(20);
  textSize(28);
  text(`점수: ${score}`, BASE_W / 2, BASE_H / 2 - 75);

  // 이름 입력창 배경 (HTML input이 위에 올라탐)
  // fill(nameInputActive ? color(234, 233, 233) : color(244, 244, 244));
  // noStroke();
  // rectMode(CENTER);
  // rect(BASE_W / 2, BASE_H / 2, 320, 46, 3);
  // rectMode(CORNER);
  image(nametag, BASE_W / 2 - 160, BASE_H / 2 - 23, 320, 46);

  // HTML input 위치를 스케일 기준으로 업데이트
  if (nameInput) {
    let canvas = document.querySelector("canvas");
    let rect = canvas.getBoundingClientRect();
    let offsetX = (windowWidth - BASE_W * scaleRatio) / 2;
    let offsetY = (windowHeight - BASE_H * scaleRatio) / 2;
    let inputX = rect.left + offsetX + (BASE_W / 2 - 150) * scaleRatio;
    let inputY = rect.top + offsetY + (BASE_H / 2 - 13) * scaleRatio;
    nameInput.position(inputX, inputY);
    nameInput.style("width", 300 * scaleRatio + "px");
    nameInput.style("font-size", 18 * scaleRatio + "px");
    if (gamePhase === "ended") nameInput.show();
  }

  // 역변환된 마우스 좌표
  let offsetX = (windowWidth - BASE_W * scaleRatio) / 2;
  let offsetY = (windowHeight - BASE_H * scaleRatio) / 2;
  let mx = (mouseX - offsetX) / scaleRatio;
  let my = (mouseY - offsetY) / scaleRatio;

  // 버튼 정의 [img, cy, label]
  let buttons = [
    {
      img: button1,
      cy: BASE_H / 2 + 64,
      label: scoreSaved ? "저장 완료" : "기록 저장",
    },
    { img: button2, cy: BASE_H / 2 + 120, label: "순위 보기" },
    { img: button3, cy: BASE_H / 2 + 185, label: "다시 시작" },
  ];
  let bw = 129,
    bh = 45;

  for (let btn of buttons) {
    let hovering =
      mx > BASE_W / 2 - bw / 2 &&
      mx < BASE_W / 2 + bw / 2 &&
      my > btn.cy - bh / 2 &&
      my < btn.cy + bh / 2;
    let scale = hovering ? 1.05 : 1.0;
    let w = bw * scale,
      h = bh * scale;
    image(btn.img, BASE_W / 2 - w / 2, btn.cy - h / 2, w, h);
    fill(0);
    noStroke();
    textSize(17 * scale);
    textAlign(CENTER, CENTER);
    text(btn.label, BASE_W / 2, btn.cy);
  }
}

// ── 입력 처리 ─────────────────────────────
function mousePressed() {
  // 첫 클릭 시 배경음악 재생
  if (bgMusic && !bgMusic.isPlaying() && !gameOver) {
    bgMusic.play();
  }

  // 실제 클릭 좌표를 기준 해상도 좌표로 역변환
  let offsetX = (windowWidth - BASE_W * scaleRatio) / 2;
  let offsetY = (windowHeight - BASE_H * scaleRatio) / 2;
  let mx = (mouseX - offsetX) / scaleRatio;
  let my = (mouseY - offsetY) / scaleRatio;

  if (!gameStarted) {
    gameStarted = true;
    initGame();
    return;
  }

  if (gamePhase === "ended") {
    // 이름 입력창 클릭
    if (
      mx > BASE_W / 2 - 160 &&
      mx < BASE_W / 2 + 160 &&
      my > BASE_H / 2 - 23 &&
      my < BASE_H / 2 + 23
    ) {
      nameInputActive = true;
      if (nameInput) nameInput.elt.focus();
      return;
    }

    // 기록 저장 버튼
    if (
      mx > BASE_W / 2 - 110 &&
      mx < BASE_W / 2 + 110 &&
      my > BASE_H / 2 + 42 &&
      my < BASE_H / 2 + 86
    ) {
      let name = playerName.trim() || "익명";
      saveScoreToFirebase(name, score).then((ok) => {
        if (ok) scoreSaved = true;
      });
      nameInputActive = false;
      return;
    }

    // 리더보드 버튼
    if (
      mx > BASE_W / 2 - 110 &&
      mx < BASE_W / 2 + 110 &&
      my > BASE_H / 2 + 98 &&
      my < BASE_H / 2 + 142
    ) {
      window.open("leaderboard.html", "_blank");
      return;
    }

    // 다시 시작 버튼
    if (
      mx > BASE_W / 2 - 110 &&
      mx < BASE_W / 2 + 110 &&
      my > BASE_H / 2 + 163 &&
      my < BASE_H / 2 + 207
    ) {
      nameInputActive = false;
      scoreSaved = false;
      showLeaderboard = false;
      playerName = "";
      if (nameInput) {
        nameInput.value("");
        nameInput.hide();
      }
      initGame();
      return;
    }

    // 다른 곳 클릭 시 포커스 해제
    nameInputActive = false;
    if (nameInput) nameInput.elt.blur();
    return;
  }

  if (gamePhase === "playing") {
    handleBellPress();
  }
}

function keyPressed() {
  if (gamePhase === "ended" && nameInputActive) {
    if (keyCode === ENTER) {
      let name = playerName.trim() || "익명";
      saveScoreToFirebase(name, score).then((ok) => {
        if (ok) scoreSaved = true;
      });
      nameInputActive = false;
      if (nameInput) nameInput.elt.blur();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  scaleRatio = min(windowWidth / BASE_W, windowHeight / BASE_H);
}
