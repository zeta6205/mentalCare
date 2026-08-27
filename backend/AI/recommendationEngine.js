// AI/recommendationEngine.js
// V6 — PERSONALIZED RECOMMENDATION + COUNTER ANALYTICS


// ============================================================
// HELPERS
// ============================================================

function clamp(
  value,
  min = 0,
  max = 1
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


function normalizeCategory(value) {
  return String(
    value || 'general'
  )
    .trim()
    .toLowerCase();
}


function normalizeTags(tags) {

  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map(tag =>
          String(tag)
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )
  ];
}


// ============================================================
// TAGS ESTRUTURAIS
//
// Esses sinais descrevem FORMATO/ESTÍMULO do vídeo,
// não necessariamente o assunto de interesse.
//
// Eles continuam disponíveis para o contra-algoritmo,
// mas não devem dominar a recomendação personalizada.
// ============================================================

const STRUCTURAL_TAGS =
  new Set([

    'short_video',
    'medium_video',
    'long_video',

    'slow_paced',
    'medium_paced',
    'fast_paced',
    'very_fast_paced',

    'quiet_audio',
    'medium_audio',
    'loud_audio',
    'very_loud_audio',

    'low_stimulus',
    'medium_stimulus',
    'high_stimulus',

    'low_arousal',
    'medium_arousal',
    'high_arousal',

    // compatibilidade com dados antigos
    'high_dopamine',

    'speech_detected',
    'speech_semantic',
    'speech_analysis_unavailable',
    'no_speech_detected',

    'general'

  ]);


function isMeaningfulRecommendationTag(
  tag,
  category = ''
) {

  const normalized =
    String(
      tag || ''
    )
      .trim()
      .toLowerCase();


  if (!normalized) {
    return false;
  }


  if (
    STRUCTURAL_TAGS.has(
      normalized
    )
  ) {

    return false;

  }


  /*
   * A categoria já recebe um peso próprio.
   * Evitamos contar a mesma evidência duas vezes.
   */
  if (
    normalized ===
    normalizeCategory(
      category
    )
  ) {

    return false;

  }


  return true;
}


// ============================================================
// INTERESSE OBSERVADO EM UMA VISUALIZAÇÃO
//
// Resultado em 0..1:
//
// 0.50 = aproximadamente neutro
// >0.50 = sinal positivo
// <0.50 = sinal negativo
//
// Like/comment/share reforçam a intenção explícita.
// ============================================================

function calculateObservedInterest(
  behavior,
  completion
) {

  let interest = 0.50;


  if (completion < 0.08) {
    interest = 0.08;
  }

  else if (completion < 0.20) {
    interest = 0.20;
  }

  else if (completion < 0.40) {
    interest = 0.36;
  }

  else if (completion < 0.60) {
    interest = 0.55;
  }

  else if (completion < 0.80) {
    interest = 0.72;
  }

  else if (completion < 0.95) {
    interest = 0.86;
  }

  else {
    interest = 0.95;
  }


  if (behavior?.liked) {
    interest += 0.18;
  }


  if (behavior?.commented) {
    interest += 0.10;
  }


  if (behavior?.shared) {
    interest += 0.16;
  }


  return clamp(
    interest
  );
}


// ============================================================
// CONFIANÇA NA EVIDÊNCIA RECENTE
//
// Uma única interação não deve redefinir o usuário.
// Com mais observações, a confiança se aproxima de 1.
// ============================================================

function recentEvidenceConfidence(
  weightedCount
) {

  const count =
    Math.max(
      0,
      Number(weightedCount) || 0
    );


  return clamp(
    1 -
    Math.exp(
      -count / 2.5
    )
  );
}


// ============================================================
// NORMALIZAR DURAÇÃO
//
// Alguns vídeos antigos estão salvos em milissegundos.
// Ex:
// 35347 -> 35.347 segundos
//
// Vídeos normais já estão em segundos.
// ============================================================

function normalizeDuration(value) {

  const duration =
    Math.max(
      0,
      Number(value) || 0
    );

  if (duration > 1000) {
    return duration / 1000;
  }

  return duration;
}


// ============================================================
// CONVERTER MAP DO MONGOOSE PARA OBJETO NORMAL
// ============================================================

function normalizePreferenceMap(
  mapLike
) {

  const result = {};

  if (!mapLike) {
    return result;
  }


  // Map / Mongoose Map
  if (
    typeof mapLike.entries ===
    'function'
  ) {

    for (
      const [
        key,
        rawValue
      ] of mapLike.entries()
    ) {

      const normalizedKey =
        String(key)
          .trim()
          .toLowerCase();

      const value =
        Number(rawValue);

      if (
        normalizedKey &&
        Number.isFinite(value)
      ) {

        result[
          normalizedKey
        ] =
          clamp(value);

      }

    }

    return result;
  }


  // Objeto comum
  if (
    typeof mapLike ===
    'object'
  ) {

    for (
      const [
        key,
        rawValue
      ] of Object.entries(
        mapLike
      )
    ) {

      const normalizedKey =
        String(key)
          .trim()
          .toLowerCase();

      const value =
        Number(rawValue);

      if (
        normalizedKey &&
        Number.isFinite(value)
      ) {

        result[
          normalizedKey
        ] =
          clamp(value);

      }

    }

  }

  return result;
}


// ============================================================
// PERFIL RECENTE
//
// Analisa os últimos UserBehavior recebidos.
//
// Essa parte representa:
//
// "O que o usuário parece querer AGORA?"
// ============================================================

function buildRecentProfile(
  behaviors = []
) {

  const categoryStats = {};
  const tagStats = {};

  const recentVideoIds =
    new Set();


  behaviors.forEach(
    (
      behavior,
      index
    ) => {

      const category =
        normalizeCategory(
          behavior?.category
        );


      const tags =
        normalizeTags(
          behavior?.tags
        );


      const duration =
        normalizeDuration(
          behavior?.duration
        );


      const watchTime =
        Math.max(
          0,
          Number(
            behavior?.watchTime
          ) || 0
        );


      let completion =
        Number(
          behavior?.completionRate
        );


      if (
        !Number.isFinite(
          completion
        )
      ) {

        completion =
          duration > 0
            ? watchTime /
              duration
            : 0;

      }


      completion =
        clamp(
          completion
        );


      /*
       * Mais recente = mais importante.
       *
       * A curva exponencial evita que eventos mais
       * antigos desapareçam abruptamente.
       */
      const recencyWeight =
        Math.max(
          0.22,
          Math.exp(
            -index / 12
          )
        );


      const observedInterest =
        calculateObservedInterest(
          behavior,
          completion
        );


      if (
        !categoryStats[
          category
        ]
      ) {

        categoryStats[
          category
        ] = {

          preferenceSum: 0,

          weightSum: 0,

          count: 0,

          completionSum: 0

        };

      }


      categoryStats[
        category
      ].preferenceSum +=
        observedInterest *
        recencyWeight;


      categoryStats[
        category
      ].weightSum +=
        recencyWeight;


      categoryStats[
        category
      ].count +=
        1;


      categoryStats[
        category
      ].completionSum +=
        completion;


      /*
       * Só tags semânticas entram na aprendizagem
       * de recomendação.
       */
      for (
        const tag
        of tags
      ) {

        if (
          !isMeaningfulRecommendationTag(
            tag,
            category
          )
        ) {

          continue;

        }


        if (
          !tagStats[
            tag
          ]
        ) {

          tagStats[
            tag
          ] = {

            preferenceSum: 0,

            weightSum: 0,

            count: 0

          };

        }


        tagStats[
          tag
        ].preferenceSum +=
          observedInterest *
          recencyWeight;


        tagStats[
          tag
        ].weightSum +=
          recencyWeight;


        tagStats[
          tag
        ].count +=
          1;

      }


      if (
        index < 5 &&
        behavior?.videoId
      ) {

        recentVideoIds.add(
          String(
            behavior.videoId
          )
        );

      }

    }
  );


  const categoryAffinity = {};


  for (
    const [
      category,
      stats
    ]
    of Object.entries(
      categoryStats
    )
  ) {

    const affinity =
      stats.weightSum > 0

        ? stats.preferenceSum /
          stats.weightSum

        : 0.50;


    const avgCompletion =
      stats.count > 0

        ? stats.completionSum /
          stats.count

        : 0;


    categoryAffinity[
      category
    ] = {

      affinity:
        clamp(
          affinity
        ),

      avgCompletion:
        clamp(
          avgCompletion
        ),

      count:
        stats.count,

      evidenceConfidence:
        recentEvidenceConfidence(
          stats.weightSum
        )

    };

  }


  const tagAffinity = {};


  for (
    const [
      tag,
      stats
    ]
    of Object.entries(
      tagStats
    )
  ) {

    tagAffinity[
      tag
    ] = {

      affinity:
        stats.weightSum > 0

          ? clamp(
              stats.preferenceSum /
              stats.weightSum
            )

          : 0.50,

      count:
        stats.count,

      evidenceConfidence:
        recentEvidenceConfidence(
          stats.weightSum
        )

    };

  }


  return {

    categoryAffinity,

    tagAffinity,

    recentVideoIds,

    totalBehaviors:
      behaviors.length

  };

}

// ============================================================
// CONSTRUIR PERFIL COMPLETO
//
// Combina:
//
// 1. memória recente (UserBehavior)
// 2. memória persistente (UserPreference)
//
// O peso máximo da memória persistente será 65%.
// ============================================================

function buildUserProfile(
  behaviors = [],
  persistentPreference = null
) {

  const recentProfile =
    buildRecentProfile(
      behaviors
    );


  const persistentCategories =
    normalizePreferenceMap(
      persistentPreference
        ?.categories
    );


  const persistentTags =
    normalizePreferenceMap(
      persistentPreference
        ?.tags
    );


  const totalInteractions =
    Math.max(
      0,
      Number(
        persistentPreference
          ?.totalInteractions
      ) || 0
    );


  const persistentConfidence =
    clamp(
      totalInteractions /
      20
    );


  /*
   * Limite conceitual:
   *
   * perfil maduro:
   * 65% memória longa
   * 35% momento recente
   *
   * Em evidência fraca, o valor é puxado
   * para 0.50 (neutro).
   */
  const basePersistentWeight =
    0.65 *
    persistentConfidence;


  const baseRecentWeight =
    1 -
    basePersistentWeight;


  const allCategories =
    new Set([

      ...Object.keys(
        recentProfile
          .categoryAffinity
      ),

      ...Object.keys(
        persistentCategories
      )

    ]);


  const categoryAffinity = {};


  let dominantCategory =
    null;


  let dominantValue =
    -Infinity;


  for (
    const category
    of allCategories
  ) {

    const recentData =
      recentProfile
        .categoryAffinity[
          category
        ] || null;


    const hasPersistentValue =
      Object.prototype
        .hasOwnProperty
        .call(
          persistentCategories,
          category
        );


    const persistentValue =
      hasPersistentValue

        ? clamp(
            persistentCategories[
              category
            ]
          )

        : 0.50;


    const recentAffinity =
      recentData

        ? clamp(
            recentData.affinity
          )

        : 0.50;


    const recentConfidence =
      recentData

        ? clamp(
            recentData
              .evidenceConfidence
          )

        : 0;


    const persistentSignalWeight =
      hasPersistentValue

        ? basePersistentWeight

        : 0;


    const recentSignalWeight =
      recentData

        ? baseRecentWeight *
          recentConfidence

        : 0;


    const evidenceWeight =
      clamp(
        persistentSignalWeight +
        recentSignalWeight
      );


    let blendedPreference =
      0.50;


    const signalTotal =
      persistentSignalWeight +
      recentSignalWeight;


    if (
      signalTotal > 0
    ) {

      blendedPreference =
        (
          persistentValue *
            persistentSignalWeight

          +

          recentAffinity *
            recentSignalWeight
        )
        /
        signalTotal;

    }


    /*
     * Se há pouca evidência, aproximamos de 0.50.
     *
     * Assim:
     * - 0.50 = neutro
     * - >0.50 = gosta
     * - <0.50 = rejeita
     */
    const combinedAffinity =
      0.50 +
      (
        blendedPreference -
        0.50
      ) *
      evidenceWeight;


    categoryAffinity[
      category
    ] = {

      affinity:
        clamp(
          combinedAffinity
        ),

      recentAffinity:
        recentData
          ? recentAffinity
          : null,

      persistentAffinity:
        hasPersistentValue
          ? persistentValue
          : null,

      recentConfidence,

      evidenceWeight,

      avgCompletion:
        recentData
          ?.avgCompletion ||
        0,

      count:
        recentData
          ?.count ||
        0

    };


    /*
     * "general" não deve virar categoria dominante.
     */
    if (
      category !==
        'general' &&
      combinedAffinity >
        dominantValue
    ) {

      dominantValue =
        combinedAffinity;

      dominantCategory =
        category;

    }

  }


  const allTags =
    new Set([

      ...Object.keys(
        recentProfile
          .tagAffinity
      ),

      ...Object.keys(
        persistentTags
      )

    ]);


  const tagAffinity = {};


  for (
    const tag
    of allTags
  ) {

    if (
      !isMeaningfulRecommendationTag(
        tag
      )
    ) {

      continue;

    }


    const recentData =
      recentProfile
        .tagAffinity[
          tag
        ] || null;


    const hasPersistentValue =
      Object.prototype
        .hasOwnProperty
        .call(
          persistentTags,
          tag
        );


    const persistentValue =
      hasPersistentValue

        ? clamp(
            persistentTags[
              tag
            ]
          )

        : 0.50;


    const recentAffinity =
      recentData

        ? clamp(
            recentData.affinity
          )

        : 0.50;


    const recentConfidence =
      recentData

        ? clamp(
            recentData
              .evidenceConfidence
          )

        : 0;


    const persistentSignalWeight =
      hasPersistentValue

        ? basePersistentWeight

        : 0;


    const recentSignalWeight =
      recentData

        ? baseRecentWeight *
          recentConfidence

        : 0;


    const signalTotal =
      persistentSignalWeight +
      recentSignalWeight;


    const evidenceWeight =
      clamp(
        signalTotal
      );


    let blendedPreference =
      0.50;


    if (
      signalTotal > 0
    ) {

      blendedPreference =
        (
          persistentValue *
            persistentSignalWeight

          +

          recentAffinity *
            recentSignalWeight
        )
        /
        signalTotal;

    }


    tagAffinity[
      tag
    ] =
      clamp(
        0.50 +
        (
          blendedPreference -
          0.50
        ) *
        evidenceWeight
      );

  }


  return {

    categoryAffinity,

    tagAffinity,

    dominantCategory,

    recentVideoIds:
      recentProfile
        .recentVideoIds,

    totalBehaviors:
      recentProfile
        .totalBehaviors,

    totalInteractions,

    persistentPreferenceUsed:
      Boolean(
        persistentPreference
      ),

    weights: {

      persistent:
        Number(
          basePersistentWeight
            .toFixed(3)
        ),

      recent:
        Number(
          baseRecentWeight
            .toFixed(3)
        ),

      persistentConfidence:
        Number(
          persistentConfidence
            .toFixed(3)
        )

    }

  };

}

// ============================================================
// SCORE BASE DE RECOMENDAÇÃO
// ============================================================

function calculateRecommendationScore(
  video,
  profile
) {

  const category =
    normalizeCategory(
      video?.category
    );


  const tags =
    normalizeTags(
      video?.tags
    );


  const meaningfulTags =
    tags.filter(
      tag =>
        isMeaningfulRecommendationTag(
          tag,
          category
        )
    );


  const videoId =
    String(
      video?._id ||
      video?.id ||
      ''
    );


  /*
   * Escala mental do score:
   *
   * ~50 = conteúdo neutro
   * >65 = forte candidato
   * >80 = altamente compatível
   * <35 = pouco compatível
   */
  let score = 50;


  // ==========================================================
  // 1. AFINIDADE DE CATEGORIA
  //
  // Agora 0.50 é realmente neutro.
  //
  // 1.00 => +28
  // 0.50 =>  0
  // 0.00 => -28
  // ==========================================================

  const categoryData =
    profile
      ?.categoryAffinity
      ?.[
        category
      ];


  if (
    categoryData &&
    category !==
      'general'
  ) {

    score +=
      (
        Number(
          categoryData.affinity
        ) -
        0.50
      ) *
      56;

  }


  // ==========================================================
  // 2. TAGS SEMÂNTICAS
  //
  // mood_*, theme_*, gameplay, football etc.
  //
  // Não usamos short_video/high_stimulus/etc.
  // ==========================================================

  const tagContributions =
    meaningfulTags
      .map(
        tag => {

          const affinity =
            profile
              ?.tagAffinity
              ?.[
                tag
              ];


          if (
            !Number.isFinite(
              Number(
                affinity
              )
            )
          ) {

            return null;

          }


          return (
            Number(
              affinity
            ) -
            0.50
          ) *
          12;

        }
      )
      .filter(
        value =>
          Number.isFinite(
            value
          )
      )
      .sort(
        (a, b) =>
          Math.abs(b) -
          Math.abs(a)
      )
      .slice(
        0,
        4
      );


  const semanticTagScore =
    tagContributions.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    );


  score +=
    Math.max(
      -22,
      Math.min(
        22,
        semanticTagScore
      )
    );


  // ==========================================================
  // 3. RETENÇÃO RECENTE DA CATEGORIA
  //
  // É um reforço pequeno.
  //
  // Não queremos que watch time substitua gosto aprendido.
  // ==========================================================

  if (
    categoryData &&
    Number(
      categoryData.count
    ) > 0
  ) {

    score +=
      (
        clamp(
          categoryData
            .avgCompletion
        ) -
        0.50
      ) *
      12;

  }


  // ==========================================================
  // 4. DESCOBERTA CONTROLADA
  //
  // Categorias ainda desconhecidas recebem um bônus mínimo.
  // Isso impede uma bolha fechada sem tornar o ranking aleatório.
  // ==========================================================

  if (
    profile
      ?.totalBehaviors >=
      5 &&
    !categoryData &&
    category !==
      'general'
  ) {

    score +=
      3;

  }


  // ==========================================================
  // 5. REPETIÇÃO RECENTE
  //
  // Um vídeo recém-visto cai bastante,
  // mas não é apagado permanentemente.
  // ==========================================================

  if (
    profile
      ?.recentVideoIds
      ?.has(
        videoId
      )
  ) {

    score -=
      28;

  }


  // ==========================================================
  // 6. LIMITADOR
  // ==========================================================

  return Math.max(
    0,
    Math.min(
      100,
      score
    )
  );

}

// ============================================================
// CONTRA-RECOMENDAÇÃO
// ============================================================

function calculateCounterAdjustment(
  video,
  profile,
  decision
) {

  // ==========================================================
  // SEM INTERVENÇÃO
  // ==========================================================

  if (
    !decision ||
    decision.state ===
      'normal'
  ) {

    return {

      total: 0,

      stimulusPenalty: 0,

      dominantPenalty: 0,

      lowStimulusBonus: 0,

      diversityBonus: 0,

      durationBonus: 0

    };

  }


  const category =
    normalizeCategory(
      video.category
    );


  const stimulus =
    clamp(
      Number(
        video.stimulusLevel
      ) || 0.5
    );


  const duration =
    normalizeDuration(
      video.duration
    );


  const isDominant =

    profile.dominantCategory &&

    category ===
      profile.dominantCategory;


  const intense =
    decision.state ===
      'intense_use';


  // ==========================================================
  // PENALIDADE DE HIPERESTÍMULO
  // ==========================================================

  const stimulusPenalty =

    stimulus *

    (
      intense
        ? 38
        : 22
    );


  // ==========================================================
  // PENALIDADE DE REPETIÇÃO DA CATEGORIA DOMINANTE
  // ==========================================================

  const dominantPenalty =

    isDominant

      ? (
          intense
            ? 18
            : 9
        )

      : 0;


  // ==========================================================
  // BÔNUS DE BAIXO ESTÍMULO
  // ==========================================================

  const lowStimulusBonus =

    (1 - stimulus) *

    (
      intense
        ? 30
        : 18
    );


  // ==========================================================
  // DIVERSIDADE
  // ==========================================================

  const diversityBonus =

    !isDominant

      ? (
          intense
            ? 15
            : 8
        )

      : 0;


  // ==========================================================
  // BÔNUS PARA CONTEÚDOS MAIS LONGOS
  //
  // Reduz sequência excessiva de microvídeos.
  // ==========================================================

  let durationBonus = 0;


  if (
    duration >= 30
  ) {

    durationBonus =
      intense
        ? 10
        : 5;

  }


  if (
    duration >= 60
  ) {

    durationBonus +=
      intense
        ? 5
        : 3;

  }


  // ==========================================================
  // TOTAL DA CONTRA-RECOMENDAÇÃO
  // ==========================================================

  const total =

    -stimulusPenalty

    - dominantPenalty

    + lowStimulusBonus

    + diversityBonus

    + durationBonus;


  return {

    total,

    stimulusPenalty,

    dominantPenalty,

    lowStimulusBonus,

    diversityBonus,

    durationBonus

  };

}



// ============================================================
// M2.1 — BASELINE VS FINAL RANKING
//
// BASELINE = Recommendation Engine puro
// FINAL    = Recommendation + Counter Algorithm
//
// IMPORTANTE:
// esta camada não altera o comportamento do ranking atual.
// Ela apenas executa os dois cenários e mede a diferença.
// ============================================================

function roundMetric(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const factor = 10 ** decimals;

  return Math.round(number * factor) / factor;
}


function getVideoId(video, fallbackIndex = 0) {
  return String(
    video?._id ||
    video?.id ||
    video?.uri ||
    `video-${fallbackIndex}`
  );
}


function buildRankingItem(
  video,
  profile,
  decision,
  index
) {

  const recommendationScore =
    calculateRecommendationScore(
      video,
      profile
    );


  const counter =
    calculateCounterAdjustment(
      video,
      profile,
      decision
    );


  const counterAdjustment =
    Number(counter?.total) || 0;


  return {

    video,

    videoId:
      getVideoId(
        video,
        index
      ),

    description:
      String(
        video?.description ||
        ''
      ),

    category:
      normalizeCategory(
        video?.category
      ),

    stimulusLevel:
      clamp(
        Number(
          video?.stimulusLevel
        ) || 0.5
      ),

    duration:
      normalizeDuration(
        video?.duration
      ),

    recommendationScore:
      roundMetric(
        recommendationScore,
        3
      ),

    counterAdjustment:
      roundMetric(
        counterAdjustment,
        3
      ),

    finalScore:
      roundMetric(
        recommendationScore +
        counterAdjustment,
        3
      ),

    counterBreakdown: {

      stimulusPenalty:
        roundMetric(
          counter?.stimulusPenalty,
          3
        ),

      dominantPenalty:
        roundMetric(
          counter?.dominantPenalty,
          3
        ),

      lowStimulusBonus:
        roundMetric(
          counter?.lowStimulusBonus,
          3
        ),

      diversityBonus:
        roundMetric(
          counter?.diversityBonus,
          3
        ),

      durationBonus:
        roundMetric(
          counter?.durationBonus,
          3
        )

    }

  };

}


function averageStimulus(
  ranking,
  limit
) {

  const selected =
    ranking.slice(
      0,
      limit
    );


  if (selected.length === 0) {
    return 0;
  }


  const total =
    selected.reduce(
      (sum, item) =>
        sum +
        (
          Number(
            item.stimulusLevel
          ) || 0
        ),
      0
    );


  return total / selected.length;
}


function categoryDiversity(
  ranking,
  limit
) {

  return (
    new Set(
      ranking
        .slice(
          0,
          limit
        )
        .map(
          item =>
            item.category
        )
        .filter(Boolean)
    )
  ).size;
}


function dominantCategoryRatio(
  ranking,
  limit,
  dominantCategory
) {

  const selected =
    ranking.slice(
      0,
      limit
    );


  if (
    selected.length === 0 ||
    !dominantCategory
  ) {
    return 0;
  }


  const count =
    selected.filter(
      item =>
        item.category ===
        dominantCategory
    ).length;


  return count / selected.length;
}


function summarizeRanking(
  ranking,
  limit
) {

  return ranking
    .slice(
      0,
      limit
    )
    .map(
      (
        item,
        index
      ) => ({

        position:
          index + 1,

        videoId:
          item.videoId,

        description:
          item.description,

        category:
          item.category,

        stimulusLevel:
          roundMetric(
            item.stimulusLevel,
            3
          ),

        recommendationScore:
          roundMetric(
            item.recommendationScore,
            2
          ),

        counterAdjustment:
          roundMetric(
            item.counterAdjustment,
            2
          ),

        finalScore:
          roundMetric(
            item.finalScore,
            2
          )

      })
    );
}


function buildCounterAlgorithmAnalysis(
  videos = [],
  profile,
  decision,
  options = {}
) {

  const requestedTopN =
    Math.max(
      1,
      Number(
        options?.topN
      ) || 10
    );


  const items =
    (
      Array.isArray(videos)
        ? videos
        : []
    )
      .map(
        (
          video,
          index
        ) =>
          buildRankingItem(
            video,
            profile,
            decision,
            index
          )
      );


  const baselineRanking =
    [
      ...items
    ]
      .sort(
        (a, b) =>
          b.recommendationScore -
          a.recommendationScore
      );


  const finalRanking =
    [
      ...items
    ]
      .sort(
        (a, b) =>
          b.finalScore -
          a.finalScore
      );


  const topN =
    Math.min(
      requestedTopN,
      items.length
    );


  const baselinePositionMap =
    new Map();


  baselineRanking.forEach(
    (
      item,
      index
    ) => {

      baselinePositionMap.set(
        item.videoId,
        index + 1
      );

    }
  );


  const finalPositionMap =
    new Map();


  finalRanking.forEach(
    (
      item,
      index
    ) => {

      finalPositionMap.set(
        item.videoId,
        index + 1
      );

    }
  );


  const positionChanges =
    items.map(
      item => {

        const baselinePosition =
          baselinePositionMap.get(
            item.videoId
          ) || 0;


        const finalPosition =
          finalPositionMap.get(
            item.videoId
          ) || 0;


        return {

          videoId:
            item.videoId,

          description:
            item.description,

          category:
            item.category,

          stimulusLevel:
            roundMetric(
              item.stimulusLevel,
              3
            ),

          baselinePosition,

          finalPosition,

          // positivo = subiu; negativo = caiu
          positionDelta:
            baselinePosition -
            finalPosition,

          recommendationScore:
            roundMetric(
              item.recommendationScore,
              2
            ),

          counterAdjustment:
            roundMetric(
              item.counterAdjustment,
              2
            ),

          finalScore:
            roundMetric(
              item.finalScore,
              2
            )

        };

      }
    );


  const movedVideos =
    positionChanges.filter(
      item =>
        item.positionDelta !==
        0
    );


  const biggestRise =
    [
      ...positionChanges
    ]
      .sort(
        (a, b) =>
          b.positionDelta -
          a.positionDelta
      )[0] ||
    null;


  const biggestDrop =
    [
      ...positionChanges
    ]
      .sort(
        (a, b) =>
          a.positionDelta -
          b.positionDelta
      )[0] ||
    null;


  const baselineTopIds =
    new Set(
      baselineRanking
        .slice(
          0,
          topN
        )
        .map(
          item =>
            item.videoId
        )
    );


  const finalTopIds =
    new Set(
      finalRanking
        .slice(
          0,
          topN
        )
        .map(
          item =>
            item.videoId
        )
    );


  let overlapCount = 0;


  for (
    const videoId
    of baselineTopIds
  ) {

    if (
      finalTopIds.has(
        videoId
      )
    ) {

      overlapCount += 1;

    }

  }


  const overlapRatio =
    topN > 0
      ? overlapCount / topN
      : 1;


  const feedChangedRatio =
    1 -
    overlapRatio;


  const baselineAverageStimulus =
    averageStimulus(
      baselineRanking,
      topN
    );


  const finalAverageStimulus =
    averageStimulus(
      finalRanking,
      topN
    );


  const absoluteStimulusReduction =
    baselineAverageStimulus -
    finalAverageStimulus;


  const stimulusReductionRatio =
    baselineAverageStimulus > 0

      ? absoluteStimulusReduction /
        baselineAverageStimulus

      : 0;


  const baselineCategoryDiversity =
    categoryDiversity(
      baselineRanking,
      topN
    );


  const finalCategoryDiversity =
    categoryDiversity(
      finalRanking,
      topN
    );


  const dominantCategory =
    profile?.dominantCategory ||
    null;


  const baselineDominantRatio =
    dominantCategoryRatio(
      baselineRanking,
      topN,
      dominantCategory
    );


  const finalDominantRatio =
    dominantCategoryRatio(
      finalRanking,
      topN,
      dominantCategory
    );


  return {

    interventionActive:
      Boolean(
        decision &&
        decision.state !==
          'normal'
      ),

    state:
      decision?.state ||
      'normal',

    action:
      decision?.action ||
      null,

    topN,

    totalVideos:
      items.length,

    metrics: {

      topNOverlapCount:
        overlapCount,

      topNOverlapPercent:
        roundMetric(
          overlapRatio *
          100,
          1
        ),

      feedChangedPercent:
        roundMetric(
          feedChangedRatio *
          100,
          1
        ),

      baselineAverageStimulus:
        roundMetric(
          baselineAverageStimulus,
          3
        ),

      finalAverageStimulus:
        roundMetric(
          finalAverageStimulus,
          3
        ),

      absoluteStimulusReduction:
        roundMetric(
          absoluteStimulusReduction,
          3
        ),

      stimulusReductionPercent:
        roundMetric(
          stimulusReductionRatio *
          100,
          1
        ),

      baselineCategoryDiversity,

      finalCategoryDiversity,

      categoryDiversityDelta:
        finalCategoryDiversity -
        baselineCategoryDiversity,

      dominantCategory,

      baselineDominantCategoryPercent:
        roundMetric(
          baselineDominantRatio *
          100,
          1
        ),

      finalDominantCategoryPercent:
        roundMetric(
          finalDominantRatio *
          100,
          1
        ),

      dominantCategoryReductionPoints:
        roundMetric(
          (
            baselineDominantRatio -
            finalDominantRatio
          ) *
          100,
          1
        ),

      movedVideosCount:
        movedVideos.length,

      movedVideosPercent:
        items.length > 0

          ? roundMetric(
              (
                movedVideos.length /
                items.length
              ) *
              100,
              1
            )

          : 0

    },

    baselineTopN:
      summarizeRanking(
        baselineRanking,
        topN
      ),

    finalTopN:
      summarizeRanking(
        finalRanking,
        topN
      ),

    biggestRise,

    biggestDrop,

    positionChanges,

    // feedEngine poderá reutilizar estes rankings
    // sem recalcular os scores.
    baselineRanking,

    finalRanking

  };

}


function logCounterAlgorithmAnalysis(
  analysis
) {

  if (!analysis) {
    return;
  }


  const metrics =
    analysis.metrics ||
    {};


  console.log(
    '\n📊 ========================================'
  );

  console.log(
    '📊 COUNTER ALGORITHM ANALYTICS'
  );

  console.log(
    '📊 ========================================'
  );


  console.log(
    '🧪 Estado:',
    {
      interventionActive:
        analysis.interventionActive,

      state:
        analysis.state,

      action:
        analysis.action,

      topN:
        analysis.topN
    }
  );


  console.log(
    '🔁 Mudança do feed:',
    {
      overlapPercent:
        metrics.topNOverlapPercent,

      feedChangedPercent:
        metrics.feedChangedPercent,

      movedVideosCount:
        metrics.movedVideosCount,

      movedVideosPercent:
        metrics.movedVideosPercent
    }
  );


  console.log(
    '⚡ Estímulo médio:',
    {
      baseline:
        metrics.baselineAverageStimulus,

      final:
        metrics.finalAverageStimulus,

      reductionPercent:
        metrics.stimulusReductionPercent
    }
  );


  console.log(
    '🌈 Diversidade:',
    {
      baselineCategories:
        metrics.baselineCategoryDiversity,

      finalCategories:
        metrics.finalCategoryDiversity,

      delta:
        metrics.categoryDiversityDelta
    }
  );


  console.log(
    '🎯 Categoria dominante:',
    {
      category:
        metrics.dominantCategory,

      baselinePercent:
        metrics.baselineDominantCategoryPercent,

      finalPercent:
        metrics.finalDominantCategoryPercent,

      reductionPoints:
        metrics.dominantCategoryReductionPoints
    }
  );


  console.log(
    '⬆️ Maior subida:',
    analysis.biggestRise
  );


  console.log(
    '⬇️ Maior queda:',
    analysis.biggestDrop
  );


  console.log(
    '📋 BASELINE TOP:',
    analysis.baselineTopN
  );


  console.log(
    '🧠 FINAL TOP:',
    analysis.finalTopN
  );


  console.log(
    '📊 ========================================\n'
  );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

  buildUserProfile,

  calculateRecommendationScore,

  calculateCounterAdjustment,

  buildCounterAlgorithmAnalysis,

  logCounterAlgorithmAnalysis

};
