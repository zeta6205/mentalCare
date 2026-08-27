// AI/feedEngine.js

const {
  buildUserProfile,
  buildCounterAlgorithmAnalysis,
  logCounterAlgorithmAnalysis,
} = require(
  './recommendationEngine'
);


// ============================================================
// FEED ENGINE V5 — COUNTER ALGORITHM ANALYTICS
//
// Combina:
//
// - comportamento recente
// - preferência persistente
// - compulsion score
// - contra-algoritmo
// - comparação BASELINE vs FINAL
//
// IMPORTANTE:
//
// O feed entregue continua sendo ordenado pelo score final.
// A camada de analytics apenas mede o efeito da intervenção.
// ============================================================

function generateFeed(
  videos,
  compulsionScore,
  behaviors = [],
  decision = null,
  persistentPreference = null
) {

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  if (
    !Array.isArray(videos) ||
    videos.length === 0
  ) {

    return [];

  }


  // ==========================================================
  // 1. CONSTRUIR PERFIL DO USUÁRIO
  //
  // behaviors
  // = interesse recente
  //
  // persistentPreference
  // = memória de longo prazo
  // ==========================================================

  const profile =
    buildUserProfile(
      behaviors,
      persistentPreference
    );


  // ==========================================================
  // DEBUG DO PERFIL
  // ==========================================================

  console.log(
    '\n🎯 ========================================'
  );

  console.log(
    '🎯 PERFIL DE RECOMENDAÇÃO V5'
  );

  console.log(
    '🎯 ========================================'
  );


  console.log(
    '🧠 categoria dominante:',
    profile.dominantCategory
  );


  console.log(
    '💾 preferência persistente usada:',
    profile.persistentPreferenceUsed
  );


  console.log(
    '⚖️ pesos do perfil:',
    profile.weights
  );


  console.log(
    '📊 total de behaviors recentes:',
    profile.totalBehaviors
  );


  console.log(
    '🧠 total de interações aprendidas:',
    profile.totalInteractions
  );


  console.log(
    '📊 afinidades combinadas:'
  );


  // ==========================================================
  // MOSTRAR AFINIDADES DE FORMA MAIS LEGÍVEL
  // ==========================================================

  for (
    const [
      category,
      data
    ]
    of Object.entries(
      profile.categoryAffinity
    )
  ) {

    console.log(
      `   📁 ${category}:`,
      {

        final:
          Number(
            (
              data.affinity || 0
            ).toFixed(3)
          ),

        recente:
          Number(
            (
              data.recentAffinity || 0
            ).toFixed(3)
          ),

        persistente:
          data.persistentAffinity !==
          null

            ? Number(
                data
                  .persistentAffinity
                  .toFixed(3)
              )

            : null,

        avgCompletion:
          Number(
            (
              data.avgCompletion || 0
            ).toFixed(3)
          ),

        recentCount:
          data.count || 0

      }
    );

  }


  // ==========================================================
  // 2. BASELINE VS FINAL
  //
  // A função abaixo gera:
  //
  // baselineRanking
  // = Recommendation Engine puro
  //
  // finalRanking
  // = Recommendation + Counter Algorithm
  //
  // E também calcula as métricas do M2.
  // ==========================================================

  const analysis =
    buildCounterAlgorithmAnalysis(
      videos,
      profile,
      decision,
      {
        topN: 10
      }
    );


  // ==========================================================
  // 3. LOG DAS MÉTRICAS DO CONTRA-ALGORITMO
  // ==========================================================

  logCounterAlgorithmAnalysis(
    analysis
  );


  // ==========================================================
  // 4. USAR O RANKING FINAL COMO FEED REAL
  //
  // Não recalculamos scores aqui.
  //
  // Isso garante que o ranking analisado é exatamente
  // o mesmo ranking que será enviado para o usuário.
  // ==========================================================

  const ranked =
    analysis.finalRanking ||
    [];


  // ==========================================================
  // 5. DEBUG EXPLICÁVEL DO RANKING FINAL
  // ==========================================================

  console.log(
    '\n🧠 ========================================'
  );

  console.log(
    '🧠 RECOMMENDATION ENGINE V5'
  );

  console.log(
    '🧠 ========================================'
  );


  console.log(
    'Compulsion Score:',
    compulsionScore
  );


  console.log(
    'Estado:',
    decision?.state ||
      'normal'
  );


  console.log(
    'Ação:',
    decision?.action ||
      'none'
  );


  console.log(
    'Memória persistente:',
    profile.persistentPreferenceUsed
      ? 'ATIVA'
      : 'INATIVA'
  );


  console.log(
    'Peso persistente:',
    profile.weights?.persistent
  );


  console.log(
    'Peso recente:',
    profile.weights?.recent
  );


  console.log(
    '\n📱 RANKING FINAL:\n'
  );


  ranked.forEach(
    (
      entry,
      index
    ) => {

      const video =
        entry.video;


      console.log(
        `#${index + 1}`,
        {

          id:
            String(
              video?._id ||
              video?.id ||
              ''
            ),


          description:
            video?.description ||
            '',


          category:
            video?.category ||
            'general',


          stimulus:
            video?.stimulusLevel,


          duration:
            video?.duration,


          recommendationScore:
            Number(
              (
                entry
                  .recommendationScore ||
                0
              ).toFixed(2)
            ),


          counterAdjustment:
            Number(
              (
                entry
                  .counterAdjustment ||
                0
              ).toFixed(2)
            ),


          finalScore:
            Number(
              (
                entry
                  .finalScore ||
                0
              ).toFixed(2)
            )

        }
      );

    }
  );


  // ==========================================================
  // 6. GERAR FEED FINAL
  // ==========================================================

  const feed =
    ranked.map(
      entry =>
        entry.video
    );


  // ==========================================================
  // 7. RESUMO DAS MÉTRICAS NO FEED
  // ==========================================================

  const analyticsMetrics =
    analysis.metrics ||
    {};


  console.log(
    '\n📈 IMPACTO DO CONTRA-ALGORITMO:',
    {

      topN:
        analysis.topN,

      feedChangedPercent:
        analyticsMetrics
          .feedChangedPercent,

      stimulusBaseline:
        analyticsMetrics
          .baselineAverageStimulus,

      stimulusFinal:
        analyticsMetrics
          .finalAverageStimulus,

      stimulusReductionPercent:
        analyticsMetrics
          .stimulusReductionPercent,

      categoryDiversityBaseline:
        analyticsMetrics
          .baselineCategoryDiversity,

      categoryDiversityFinal:
        analyticsMetrics
          .finalCategoryDiversity,

      dominantCategory:
        analyticsMetrics
          .dominantCategory,

      dominantCategoryBaselinePercent:
        analyticsMetrics
          .baselineDominantCategoryPercent,

      dominantCategoryFinalPercent:
        analyticsMetrics
          .finalDominantCategoryPercent,

      movedVideosPercent:
        analyticsMetrics
          .movedVideosPercent

    }
  );


  // ==========================================================
  // DEBUG FINAL
  // ==========================================================

  console.log(
    '\n✅ FEED FINAL:',
    {

      score:
        compulsionScore,


      state:
        decision?.state ||
        'normal',


      dominantCategory:
        profile.dominantCategory,


      persistentPreferenceUsed:
        profile
          .persistentPreferenceUsed,


      persistentWeight:
        profile
          .weights
          ?.persistent,


      recentWeight:
        profile
          .weights
          ?.recent,


      interventionActive:
        analysis
          .interventionActive,


      feedChangedPercent:
        analyticsMetrics
          .feedChangedPercent,


      stimulusReductionPercent:
        analyticsMetrics
          .stimulusReductionPercent,


      total:
        feed.length

    }
  );


  return feed;

}


module.exports =
  generateFeed;
