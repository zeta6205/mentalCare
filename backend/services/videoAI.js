
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// ==================================================
// CONFIG
// ==================================================

const CLIP_MODEL = 'Xenova/clip-vit-base-patch32';

const VISUAL_LABELS = [
  { label: 'video game gameplay on a screen', category: 'gaming', tags: ['gaming', 'gameplay'] },
  { label: 'football or soccer match', category: 'sports', tags: ['sports', 'football'] },
  { label: 'basketball game', category: 'sports', tags: ['sports', 'basketball'] },
  { label: 'motorsport race track', category: 'sports', tags: ['sports', 'motorsport'] },
  { label: 'car or automobile', category: 'automotive', tags: ['cars', 'automotive'] },
  { label: 'food meal or cooking', category: 'food', tags: ['food'] },
  { label: 'computer programming code', category: 'programming', tags: ['programming', 'coding'] },
  { label: 'computer technology or hardware', category: 'technology', tags: ['technology', 'tech'] },
  { label: 'classroom lesson or educational tutorial', category: 'educational', tags: ['educational', 'learning'] },
  { label: 'meme comedy or funny scene', category: 'meme', tags: ['meme', 'humor'] },
  { label: 'music concert or musician performing', category: 'music', tags: ['music'] },
  { label: 'person dancing or choreography', category: 'dance', tags: ['dance'] },
  { label: 'church religion prayer or Jesus', category: 'religion', tags: ['religion', 'spirituality'] },
  { label: 'nature landscape forest beach or mountain', category: 'nature', tags: ['nature', 'calm'] },
  { label: 'meditation relaxation or wellbeing', category: 'mental_health', tags: ['mental_health', 'wellbeing', 'calm'] },
  { label: 'gym workout exercise or fitness', category: 'fitness', tags: ['fitness', 'workout'] },
  { label: 'travel tourism landmark or vacation', category: 'travel', tags: ['travel'] },
  { label: 'dog cat pet or animal', category: 'animals', tags: ['animals', 'pets'] },
  { label: 'fashion outfit beauty or makeup', category: 'fashion', tags: ['fashion', 'style'] },
  { label: 'politician government or political speech', category: 'politics', tags: ['politics'] },
  { label: 'television news broadcast or reporter', category: 'news', tags: ['news'] },
  { label: 'stock market finance money or investing', category: 'finance', tags: ['finance', 'money'] },
  { label: 'couple romance dating or relationship', category: 'relationships', tags: ['relationships'] },
  { label: 'daily life vlog or routine', category: 'lifestyle', tags: ['lifestyle', 'routine'] },
  { label: 'movie television series or entertainment scene', category: 'entertainment', tags: ['entertainment'] },
];

const CANDIDATE_LABELS = VISUAL_LABELS.map(item => item.label);

const LABEL_MAP = new Map(
  VISUAL_LABELS.map(item => [item.label, item])
);


// ==================================================
// MOODS / THEMES
// ==================================================

const MOOD_LABELS = [
  { label: 'a calm peaceful relaxing scene', key: 'calm', tags: ['mood_calm'] },
  { label: 'a nostalgic reflective scene about memories and longing', key: 'nostalgic', tags: ['mood_nostalgic'] },
  { label: 'a sad melancholic emotional scene', key: 'melancholic', tags: ['mood_melancholic'] },
  { label: 'a joyful happy cheerful scene', key: 'joyful', tags: ['mood_joyful'] },
  { label: 'an energetic exciting intense scene', key: 'energetic', tags: ['mood_energetic'] },
  { label: 'a tense stressful dramatic scene', key: 'tense', tags: ['mood_tense'] },
  { label: 'a romantic affectionate intimate scene', key: 'romantic', tags: ['mood_romantic'] },
  { label: 'an angry aggressive confrontational scene', key: 'angry', tags: ['mood_angry'] },
  { label: 'a scary frightening horror scene', key: 'fearful', tags: ['mood_fearful'] },
  { label: 'a neutral ordinary everyday scene', key: 'neutral', tags: [] },
];

const THEME_LABELS = [
  { label: 'nostalgia memories and missing the past', key: 'nostalgia', tags: ['theme_nostalgia'] },
  { label: 'grief loss or missing someone', key: 'loss', tags: ['theme_loss'] },
  { label: 'love romance or affection', key: 'love', tags: ['theme_love'] },
  { label: 'family relationships and relatives', key: 'family', tags: ['theme_family'] },
  { label: 'friendship friends and companionship', key: 'friendship', tags: ['theme_friendship'] },
  { label: 'faith spirituality prayer or religion', key: 'spirituality', tags: ['theme_spirituality'] },
  { label: 'nature outdoors scenery and landscape', key: 'nature', tags: ['theme_nature'] },
  { label: 'learning education teaching or studying', key: 'learning', tags: ['theme_learning'] },
  { label: 'humor comedy joke or funny moment', key: 'humor', tags: ['theme_humor'] },
  { label: 'competition sports match or winning', key: 'competition', tags: ['theme_competition'] },
  { label: 'video games gameplay or gaming', key: 'gaming', tags: ['theme_gaming'] },
  { label: 'food cooking meal or eating', key: 'food', tags: ['theme_food'] },
  { label: 'travel tourism trip or vacation', key: 'travel', tags: ['theme_travel'] },
  { label: 'technology computers software or gadgets', key: 'technology', tags: ['theme_technology'] },
  { label: 'work productivity career or studying hard', key: 'productivity', tags: ['theme_productivity'] },
  { label: 'personal growth motivation or self improvement', key: 'self_improvement', tags: ['theme_self_improvement'] },
  { label: 'daily life routine or ordinary activities', key: 'daily_life', tags: ['theme_daily_life'] },
];

// ==================================================
// HELPERS
// ==================================================

function clamp(value, min = 0, max = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, number)
  );
}

function normalizeDuration(value) {
  let duration = Number(value || 0);

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 0;
  }

  if (duration > 1000) {
    duration /= 1000;
  }

  return duration;
}

function safeRemove(dir) {
  try {
    fs.rmSync(
      dir,
      {
        recursive: true,
        force: true
      }
    );
  } catch (err) {
    console.log(
      '⚠️ erro ao limpar frames:',
      err.message
    );
  }
}

// ==================================================
// TRANSFORMERS / CLIP SINGLETON
// ==================================================

let transformersPromise = null;
let classifierPromise = null;

async function getTransformersRuntime() {
  if (!transformersPromise) {
    transformersPromise =
      import('@huggingface/transformers');
  }

  const runtime =
    await transformersPromise;

  const cacheDir =
    path.join(
      __dirname,
      '../.cache/transformers'
    );

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(
      cacheDir,
      { recursive: true }
    );
  }

  runtime.env.cacheDir =
    cacheDir;

  return runtime;
}

async function getVisualClassifier() {
  if (!classifierPromise) {
    classifierPromise =
      (async () => {

        const {
          pipeline
        } =
          await getTransformersRuntime();

        console.log(
          '🧠 carregando CLIP local:',
          CLIP_MODEL
        );

        const classifier =
          await pipeline(
            'zero-shot-image-classification',
            CLIP_MODEL
          );

        console.log(
          '✅ CLIP local carregado'
        );

        return classifier;

      })();
  }

  return classifierPromise;
}

// ==================================================
// EXTRAIR FRAMES REPRESENTATIVOS
//
// Aqui frameCount NÃO mede ritmo.
// Ele existe apenas para obter amostras visuais
// distribuídas ao longo do vídeo.
// ==================================================

function extractRepresentativeFrames(
  videoPath,
  outputDir,
  duration
) {
  return new Promise((resolve) => {

    try {

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(
          outputDir,
          { recursive: true }
        );
      }

      const frameCount =
        duration <= 15
          ? 3
          : duration <= 60
            ? 4
            : 5;

      ffmpeg(videoPath)
        .on(
          'end',
          () => {

            try {

              const files =
                fs.readdirSync(outputDir)
                  .filter(
                    file =>
                      /\.(png|jpg|jpeg)$/i
                        .test(file)
                  )
                  .sort(
                    (a, b) =>
                      a.localeCompare(
                        b,
                        undefined,
                        { numeric: true }
                      )
                  );

              resolve(
                files.map(
                  file =>
                    path.join(
                      outputDir,
                      file
                    )
                )
              );

            } catch (err) {

              console.log(
                '⚠️ erro lendo frames:',
                err.message
              );

              resolve([]);

            }

          }
        )
        .on(
          'error',
          (err) => {

            console.log(
              '❌ erro ffmpeg frames:',
              err.message
            );

            resolve([]);

          }
        )
        .screenshots({
          count: frameCount,
          folder: outputDir,
          filename: 'frame-%i.png'
        });

    } catch (err) {

      console.log(
        '❌ erro extractRepresentativeFrames:',
        err.message
      );

      resolve([]);

    }

  });
}

// ==================================================
// ZERO-SHOT VISUAL: CATEGORIA / MOOD / THEMES
// ==================================================

function getDefinitionKey(definition) {
  return (
    definition.category ||
    definition.key ||
    'general'
  );
}

function selectRepresentativeSubset(frames, maxCount = 3) {
  if (!Array.isArray(frames) || frames.length <= maxCount) {
    return Array.isArray(frames) ? frames : [];
  }

  const indexes = new Set([
    0,
    Math.floor((frames.length - 1) / 2),
    frames.length - 1
  ]);

  const selected = [...indexes]
    .sort((a, b) => a - b)
    .map(index => frames[index])
    .filter(Boolean);

  return selected.slice(0, maxCount);
}

function calibrateZeroShotConfidence({
  bestScore,
  secondScore,
  wins,
  frameCount,
  labelCount
}) {
  const chance = labelCount > 0
    ? 1 / labelCount
    : 0;

  const absoluteSignal = clamp(
    (Number(bestScore) - chance) /
    Math.max(0.10, 0.45 - chance)
  );

  const margin = Math.max(
    0,
    Number(bestScore) - Number(secondScore)
  );

  const marginRatio = Number(bestScore) > 0
    ? clamp(margin / Number(bestScore))
    : 0;

  const consistency = frameCount > 0
    ? clamp(Number(wins || 0) / frameCount)
    : 0;

  return clamp(
    0.08 +
    absoluteSignal * 0.45 +
    marginRatio * 0.30 +
    consistency * 0.17,
    0,
    0.88
  );
}

async function analyzeConceptFrames(
  frames,
  definitions,
  {
    defaultKey = 'general',
    maxTopLabels = 8,
    maxCandidates = 3,
    allowAbstain = true
  } = {}
) {
  if (
    !Array.isArray(frames) ||
    frames.length === 0 ||
    !Array.isArray(definitions) ||
    definitions.length === 0
  ) {
    return {
      key: defaultKey,
      suggestedKey: null,
      confidence: 0,
      scores: {},
      candidates: [],
      tags: [],
      topLabels: [],
      winningFrames: 0,
      frameCount: 0
    };
  }

  try {
    const classifier = await getVisualClassifier();
    const { RawImage } = await getTransformersRuntime();

    const candidateLabels = definitions.map(item => item.label);
    const definitionMap = new Map(
      definitions.map(item => [item.label, item])
    );

    const totals = {};
    const wins = {};
    const topLabels = [];
    let validFrames = 0;

    for (const framePath of frames) {
      try {
        const image = await RawImage.read(framePath);
        const output = await classifier(image, candidateLabels);

        if (!Array.isArray(output) || output.length === 0) {
          continue;
        }

        validFrames += 1;

        const bestPerKey = {};

        for (const prediction of output) {
          const definition = definitionMap.get(prediction.label);
          if (!definition) continue;

          const key = getDefinitionKey(definition);
          const score = clamp(prediction.score);
          const current = bestPerKey[key] || 0;

          if (score > current) {
            bestPerKey[key] = score;
          }
        }

        for (const [key, score] of Object.entries(bestPerKey)) {
          totals[key] = (totals[key] || 0) + Number(score);
        }

        const frameRanking = Object.entries(bestPerKey)
          .sort((a, b) => Number(b[1]) - Number(a[1]));

        if (frameRanking.length > 0) {
          const winner = frameRanking[0][0];
          wins[winner] = (wins[winner] || 0) + 1;
        }

        topLabels.push(
          ...output
            .slice(0, 3)
            .map(item => ({
              label: item.label,
              score: Number(Number(item.score).toFixed(3)),
              frame: path.basename(framePath)
            }))
        );

      } catch (err) {
        console.log(
          '⚠️ erro classificando conceito no frame:',
          path.basename(framePath),
          err.message
        );
      }
    }

    if (validFrames === 0) {
      return {
        key: defaultKey,
        suggestedKey: null,
        confidence: 0,
        scores: {},
        candidates: [],
        tags: [],
        topLabels: [],
        winningFrames: 0,
        frameCount: 0
      };
    }

    const scores = {};

    for (const [key, total] of Object.entries(totals)) {
      scores[key] = Number(
        (Number(total) / validFrames).toFixed(4)
      );
    }

    const ranking = Object.entries(scores)
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    if (ranking.length === 0) {
      return {
        key: defaultKey,
        suggestedKey: null,
        confidence: 0,
        scores,
        candidates: [],
        tags: [],
        topLabels: [],
        winningFrames: 0,
        frameCount: validFrames
      };
    }

    const [bestKey, bestScoreRaw] = ranking[0];
    const bestScore = Number(bestScoreRaw);
    const secondScore = ranking[1]
      ? Number(ranking[1][1])
      : 0;

    const winningFrames = Number(wins[bestKey] || 0);

    const confidence = calibrateZeroShotConfidence({
      bestScore,
      secondScore,
      wins: winningFrames,
      frameCount: validFrames,
      labelCount: definitions.length
    });

    const chance = 1 / definitions.length;
    const margin = Math.max(0, bestScore - secondScore);

    const weakEvidence =
      bestScore < Math.max(0.09, chance * 1.65) ||
      confidence < 0.32 ||
      (
        bestScore < Math.max(0.15, chance * 2.3) &&
        margin < 0.025
      );

    const finalKey = (
      allowAbstain && weakEvidence
    )
      ? defaultKey
      : bestKey;

    const selectedDefinition = definitions.find(
      item => getDefinitionKey(item) === bestKey
    );

    const tags = finalKey === defaultKey
      ? []
      : [
          ...new Set(
            (selectedDefinition?.tags || [])
          )
        ];

    const candidates = ranking
      .slice(0, maxCandidates)
      .map(([key, score]) => ({
        key,
        score: Number(Number(score).toFixed(4)),
        frameWins: Number(wins[key] || 0)
      }));

    return {
      key: finalKey,
      suggestedKey: bestKey,
      confidence: Number(confidence.toFixed(3)),
      scores,
      candidates,
      tags,
      topLabels: topLabels
        .sort((a, b) => b.score - a.score)
        .slice(0, maxTopLabels),
      winningFrames,
      frameCount: validFrames
    };

  } catch (err) {
    console.log(
      '❌ erro zero-shot visual:',
      err.message
    );

    return {
      key: defaultKey,
      suggestedKey: null,
      confidence: 0,
      scores: {},
      candidates: [],
      tags: [],
      topLabels: [],
      winningFrames: 0,
      frameCount: 0
    };
  }
}

async function analyzeSemanticFrames(frames) {
  const result = await analyzeConceptFrames(
    frames,
    VISUAL_LABELS,
    {
      defaultKey: 'general',
      maxTopLabels: 8,
      maxCandidates: 4,
      allowAbstain: true
    }
  );

  return {
    category: result.key,
    suggestedCategory: result.suggestedKey,
    confidence: result.confidence,
    tags: result.tags,
    scores: result.scores,
    candidates: result.candidates,
    topLabels: result.topLabels,
    winningFrames: result.winningFrames,
    frameCount: result.frameCount
  };
}

async function analyzeMoodFrames(frames) {
  const subset = selectRepresentativeSubset(frames, 3);

  const result = await analyzeConceptFrames(
    subset,
    MOOD_LABELS,
    {
      defaultKey: 'neutral',
      maxTopLabels: 6,
      maxCandidates: 3,
      allowAbstain: true
    }
  );

  return {
    mood: result.key,
    suggestedMood: result.suggestedKey,
    confidence: result.confidence,
    scores: result.scores,
    candidates: result.candidates,
    tags: result.tags,
    topLabels: result.topLabels
  };
}

async function analyzeThemeFrames(frames) {
  const subset = selectRepresentativeSubset(frames, 3);

  const result = await analyzeConceptFrames(
    subset,
    THEME_LABELS,
    {
      defaultKey: 'general',
      maxTopLabels: 8,
      maxCandidates: 5,
      allowAbstain: false
    }
  );

  const chance = 1 / THEME_LABELS.length;
  const bestScore = result.candidates[0]
    ? Number(result.candidates[0].score)
    : 0;

  const selected = result.candidates
    .filter(item => {
      const score = Number(item.score);
      return (
        score >= chance * 1.25 &&
        score >= bestScore * 0.55
      );
    })
    .slice(0, 3);

  const themes = selected.map(item => item.key);

  const tags = selected.flatMap(item => {
    const definition = THEME_LABELS.find(
      candidate => getDefinitionKey(candidate) === item.key
    );

    return definition?.tags || [];
  });

  return {
    themes,
    confidence: result.confidence,
    scores: result.scores,
    candidates: result.candidates,
    tags: [...new Set(tags)],
    topLabels: result.topLabels
  };
}

// ==================================================
// EXECUTAR FFMPEG E CAPTURAR STDERR
// ==================================================

function runFfmpeg(
  args
) {

  return new Promise(
    (resolve) => {

      try {

        const process =
          spawn(
            ffmpegPath,
            args,
            {
              windowsHide: true
            }
          );

        let stderr =
          '';

        process.stderr.on(
          'data',
          chunk => {

            stderr +=
              chunk.toString();

          }
        );

        process.on(
          'error',
          err => {

            console.log(
              '⚠️ erro processo ffmpeg:',
              err.message
            );

            resolve('');

          }
        );

        process.on(
          'close',
          () => {

            resolve(
              stderr
            );

          }
        );

      } catch (err) {

        console.log(
          '⚠️ erro runFfmpeg:',
          err.message
        );

        resolve('');

      }

    }
  );

}

// ==================================================
// RITMO DE EDIÇÃO REAL
//
// Conta mudanças fortes de cena no vídeo.
// Isso é diferente de simplesmente contar
// quantos frames nós extraímos.
// ==================================================

async function analyzeEditPace(
  videoPath,
  duration
) {

  if (
    !duration ||
    duration <= 0
  ) {

    return {
      sceneChanges: 0,
      cutsPerMinute: 0,
      pace: 'unknown',
      stimulus: 0.50
    };

  }

  const stderr =
    await runFfmpeg([
      '-hide_banner',
      '-nostats',
      '-i',
      videoPath,
      '-vf',
      "scale=320:-2,select='gt(scene,0.28)',showinfo",
      '-an',
      '-f',
      'null',
      '-'
    ]);

  const lines =
    stderr
      .split(/\r?\n/)
      .filter(
        line =>
          line.includes(
            'showinfo'
          ) &&
          line.includes(
            'pts_time:'
          )
      );

  const sceneChanges =
    lines.length;

  const cutsPerMinute =
    duration > 0
      ? (
          sceneChanges /
          duration
        ) * 60
      : 0;

  let pace =
    'medium';

  let stimulus =
    0.55;

  if (
    cutsPerMinute < 4
  ) {

    pace =
      'slow';

    stimulus =
      0.28;

  }

  else if (
    cutsPerMinute < 12
  ) {

    pace =
      'medium';

    stimulus =
      0.52;

  }

  else if (
    cutsPerMinute < 24
  ) {

    pace =
      'fast';

    stimulus =
      0.74;

  }

  else {

    pace =
      'very_fast';

    stimulus =
      0.90;

  }

  return {
    sceneChanges,

    cutsPerMinute:
      Number(
        cutsPerMinute
          .toFixed(2)
      ),

    pace,

    stimulus
  };

}

// ==================================================
// ÁUDIO
// ==================================================

async function analyzeAudio(
  videoPath
) {

  const stderr =
    await runFfmpeg([
      '-hide_banner',
      '-nostats',
      '-i',
      videoPath,
      '-af',
      'volumedetect',
      '-vn',
      '-sn',
      '-dn',
      '-f',
      'null',
      '-'
    ]);

  const meanMatch =
    stderr.match(
      /mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i
    );

  const maxMatch =
    stderr.match(
      /max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i
    );

  const meanVolume =
    meanMatch
      ? Number(
          meanMatch[1]
        )
      : null;

  const maxVolume =
    maxMatch
      ? Number(
          maxMatch[1]
        )
      : null;

  if (
    meanVolume === null
  ) {

    return {
      hasAudio: false,
      meanVolume: null,
      maxVolume: null,
      loudness: 'unknown',
      stimulus: 0.45
    };

  }

  let loudness =
    'medium';

  let stimulus =
    0.52;

  if (
    meanVolume > -10
  ) {

    loudness =
      'very_loud';

    stimulus =
      0.88;

  }

  else if (
    meanVolume > -16
  ) {

    loudness =
      'loud';

    stimulus =
      0.72;

  }

  else if (
    meanVolume > -24
  ) {

    loudness =
      'medium';

    stimulus =
      0.53;

  }

  else {

    loudness =
      'quiet';

    stimulus =
      0.30;

  }

  return {
    hasAudio: true,

    meanVolume:
      Number(
        meanVolume
          .toFixed(2)
      ),

    maxVolume:
      maxVolume === null
        ? null
        : Number(
            maxVolume
              .toFixed(2)
          ),

    loudness,

    stimulus
  };

}

// ==================================================
// DURAÇÃO COMO SINAL PEQUENO
// ==================================================

function getDurationStimulus(
  duration
) {

  if (
    duration <= 0
  ) {
    return 0.50;
  }

  if (
    duration <= 8
  ) {
    return 0.72;
  }

  if (
    duration <= 15
  ) {
    return 0.66;
  }

  if (
    duration <= 30
  ) {
    return 0.58;
  }

  if (
    duration <= 60
  ) {
    return 0.50;
  }

  if (
    duration <= 120
  ) {
    return 0.42;
  }

  return 0.36;
}

// ==================================================
// PRIOR SEMÂNTICO PEQUENO
// ==================================================

function getSemanticStimulus(
  category
) {

  const values = {

    meme:
      0.72,

    gaming:
      0.68,

    sports:
      0.68,

    dance:
      0.69,

    music:
      0.60,

    entertainment:
      0.61,

    automotive:
      0.57,

    news:
      0.56,

    politics:
      0.55,

    fashion:
      0.52,

    relationships:
      0.51,

    lifestyle:
      0.49,

    food:
      0.47,

    technology:
      0.46,

    programming:
      0.42,

    finance:
      0.43,

    educational:
      0.39,

    fitness:
      0.54,

    travel:
      0.40,

    animals:
      0.40,

    religion:
      0.34,

    nature:
      0.27,

    mental_health:
      0.24,

    general:
      0.50

  };

  return (
    values[
      category
    ] ??
    0.50
  );
}

// ==================================================
// ANALISAR VÍDEO
// ==================================================

async function analyzeVideo(
  videoPath,
  rawDuration = 0
) {

  const duration =
    normalizeDuration(
      rawDuration
    );

  const framesDir =
    path.join(
      __dirname,
      '../frames',
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
    );

  try {

    // --------------------------------------------------
    // 1. Frames para análise semântica
    // --------------------------------------------------

    const frames =
      await extractRepresentativeFrames(
        videoPath,
        framesDir,
        duration
      );

    console.log(
      '🖼 frames representativos:',
      frames.length
    );

    // --------------------------------------------------
    // 2. Semântica visual real (CLIP)
    // --------------------------------------------------

    const semantic =
      await analyzeSemanticFrames(
        frames
      );

    // --------------------------------------------------
    // 2.1 Mood + themes visuais
    //
    // São sinais auxiliares. Não afirmamos que a imagem
    // entende sozinha o significado completo do vídeo.
    // --------------------------------------------------

    const [
      mood,
      themeAnalysis
    ] =
      await Promise.all([
        analyzeMoodFrames(frames),
        analyzeThemeFrames(frames)
      ]);

    // --------------------------------------------------
    // 3. Ritmo real + áudio
    // --------------------------------------------------

    const [
      pace,
      audio
    ] =
      await Promise.all([
        analyzeEditPace(
          videoPath,
          duration
        ),

        analyzeAudio(
          videoPath
        )
      ]);

    // --------------------------------------------------
    // 4. Stimulus
    //
    // Não representa "dopamina".
    // É um índice heurístico de intensidade audiovisual.
    // --------------------------------------------------

    const durationStimulus =
      getDurationStimulus(
        duration
      );

    const semanticStimulus =
      getSemanticStimulus(
        semantic.category
      );

    let stimulusLevel =
      (
        pace.stimulus *
        0.35
      ) +
      (
        audio.stimulus *
        0.25
      ) +
      (
        durationStimulus *
        0.20
      ) +
      (
        semanticStimulus *
        0.20
      );

    /*
     * Mood altera pouco o estímulo.
     * Ele é um sinal auxiliar, não um diagnóstico emocional.
     */
    const moodStimulusAdjustment = {
      calm: -0.06,
      nostalgic: -0.02,
      melancholic: -0.02,
      joyful: 0.02,
      energetic: 0.06,
      tense: 0.05,
      romantic: -0.01,
      angry: 0.06,
      fearful: 0.06,
      neutral: 0
    };

    stimulusLevel +=
      moodStimulusAdjustment[
        mood.mood
      ] || 0;

    stimulusLevel =
      clamp(
        stimulusLevel
      );

    // --------------------------------------------------
    // 5. Tags
    // --------------------------------------------------

    let tags =
      [
        ...semantic.tags
      ];

    /*
     * Só adicionamos mood/theme às tags quando a evidência
     * é razoável. Assim sinais visuais fracos não poluem
     * o perfil de preferência.
     */
    if (
      mood.mood !== 'neutral' &&
      mood.confidence >= 0.38
    ) {
      tags.push(
        ...mood.tags
      );
    }

    if (
      themeAnalysis.confidence >= 0.34
    ) {
      tags.push(
        ...themeAnalysis.tags
      );
    }

    if (
      duration > 0
    ) {

      if (
        duration <= 15
      ) {

        tags.push(
          'short_video'
        );

      }

      else if (
        duration <= 60
      ) {

        tags.push(
          'medium_video'
        );

      }

      else {

        tags.push(
          'long_video'
        );

      }

    }

    if (
      pace.pace ===
      'slow'
    ) {

      tags.push(
        'slow_paced'
      );

    }

    else if (
      pace.pace ===
      'medium'
    ) {

      tags.push(
        'medium_paced'
      );

    }

    else {

      tags.push(
        'fast_paced'
      );

    }

    if (
      audio.loudness ===
      'quiet'
    ) {

      tags.push(
        'quiet_audio'
      );

    }

    else if (
      audio.loudness ===
      'loud' ||
      audio.loudness ===
      'very_loud'
    ) {

      tags.push(
        'loud_audio'
      );

    }

    /*
     * "high_arousal" é um proxy técnico
     * mais correto que afirmar "high_dopamine".
     */
    if (
      stimulusLevel >= 0.75
    ) {

      tags.push(
        'high_arousal'
      );

    }

    if (
      stimulusLevel >= 0.70
    ) {

      tags.push(
        'high_stimulus'
      );

    }

    else if (
      stimulusLevel >= 0.40
    ) {

      tags.push(
        'medium_stimulus'
      );

    }

    else {

      tags.push(
        'low_stimulus'
      );

    }

    tags =
      [
        ...new Set(
          tags
            .filter(Boolean)
            .map(
              tag =>
                String(tag)
                  .toLowerCase()
                  .trim()
            )
        )
      ];

    // --------------------------------------------------
    // 6. Mood / emoção visual
    //
    // Isto descreve a estética/atmosfera visual provável.
    // Não é inferência clínica nem emoção do usuário.
    // --------------------------------------------------

    const emotion =
      mood.confidence >= 0.34
        ? mood.mood
        : 'neutral';

    // --------------------------------------------------
    // 7. Resultado
    // --------------------------------------------------

    const result = {

      category:
        semantic.category,

      confidence:
        semantic.confidence,

      tags,

      stimulusLevel:
        Number(
          stimulusLevel
            .toFixed(2)
        ),

      emotion,

      mood:
        mood.mood,

      moodConfidence:
        mood.confidence,

      moodCandidates:
        mood.candidates,

      themes:
        themeAnalysis.themes,

      themeConfidence:
        themeAnalysis.confidence,

      themeCandidates:
        themeAnalysis.candidates,

      suggestedCategory:
        semantic.suggestedCategory,

      visualCategoryCandidates:
        semantic.candidates,

      visualScores:
        semantic.scores,

      topVisualLabels:
        semantic.topLabels,

      audiovisualMetrics: {

        duration:
          Number(
            duration
              .toFixed(3)
          ),

        sceneChanges:
          pace.sceneChanges,

        cutsPerMinute:
          pace.cutsPerMinute,

        pace:
          pace.pace,

        meanVolume:
          audio.meanVolume,

        maxVolume:
          audio.maxVolume,

        loudness:
          audio.loudness,

        stimulusBreakdown: {

          pace:
            Number(
              pace.stimulus
                .toFixed(3)
            ),

          audio:
            Number(
              audio.stimulus
                .toFixed(3)
            ),

          duration:
            Number(
              durationStimulus
                .toFixed(3)
            ),

          semantic:
            Number(
              semanticStimulus
                .toFixed(3)
            ),

          final:
            Number(
              stimulusLevel
                .toFixed(3)
            )

        }

      }

    };

    console.log(
      '\n👁️ ========================================'
    );

    console.log(
      '👁️ VIDEO AI V3 — SEMANTIC VISUAL ANALYSIS'
    );

    console.log(
      '👁️ ========================================'
    );

    console.log(
      '🏆 categoria visual:',
      result.category
    );

    console.log(
      '🎯 confiança calibrada:',
      result.confidence
    );

    console.log(
      '🥈 candidatos visuais:',
      result.visualCategoryCandidates
    );

    console.log(
      '🎭 mood visual:',
      {
        mood: result.mood,
        confidence: result.moodConfidence,
        candidates: result.moodCandidates
      }
    );

    console.log(
      '🧩 themes visuais:',
      {
        themes: result.themes,
        confidence: result.themeConfidence,
        candidates: result.themeCandidates
      }
    );

    console.log(
      '📊 scores:',
      result.visualScores
    );

    console.log(
      '🎞 ritmo:',
      {
        sceneChanges:
          result.audiovisualMetrics
            .sceneChanges,

        cutsPerMinute:
          result.audiovisualMetrics
            .cutsPerMinute,

        pace:
          result.audiovisualMetrics
            .pace
      }
    );

    console.log(
      '🔊 áudio:',
      {
        meanVolume:
          result.audiovisualMetrics
            .meanVolume,

        loudness:
          result.audiovisualMetrics
            .loudness
      }
    );

    console.log(
      '⚡ stimulus:',
      result.audiovisualMetrics
        .stimulusBreakdown
    );

    console.log(
      '🏷 tags:',
      result.tags
    );

    console.log(
      '👁️ ========================================\n'
    );

    safeRemove(
      framesDir
    );

    return result;

  } catch (err) {

    console.log(
      '❌ erro Video AI V3:',
      err?.message ||
      err
    );

    safeRemove(
      framesDir
    );

    return {

      category:
        'general',

      confidence:
        0,

      tags: [
        'neutral',
        'medium_stimulus'
      ],

      stimulusLevel:
        0.5,

      emotion:
        'neutral',

      mood:
        'neutral',

      moodConfidence:
        0,

      moodCandidates:
        [],

      themes:
        [],

      themeConfidence:
        0,

      themeCandidates:
        [],

      suggestedCategory:
        null,

      visualCategoryCandidates:
        [],

      visualScores:
        {},

      topVisualLabels:
        [],

      audiovisualMetrics: {

        duration,

        sceneChanges:
          0,

        cutsPerMinute:
          0,

        pace:
          'unknown',

        meanVolume:
          null,

        maxVolume:
          null,

        loudness:
          'unknown'

      }

    };

  }

}

module.exports = {
  analyzeVideo
};
