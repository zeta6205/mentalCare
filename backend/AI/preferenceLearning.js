const UserPreference =
  require('../models/UserPreference');


// ============================================================
// UTILITÁRIOS
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


function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}


// ============================================================
// 🧠 APRENDIZADO DE PREFERÊNCIA
// ============================================================

async function learnFromBehavior(
  behavior
) {

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  if (!behavior?.userId) {
    return null;
  }


  const userId =
    behavior.userId;


  const category =
    normalize(
      behavior.category ||
      'general'
    );


  const tags =
    Array.isArray(behavior.tags)

      ? [
          ...new Set(
            behavior.tags
              .map(normalize)
              .filter(Boolean)
          )
        ]

      : [];


  // ==========================================================
  // COMPLETION RATE
  // ==========================================================

  const completion =
    clamp(
      Number(
        behavior.completionRate
      ) || 0
    );


  // ==========================================================
  // 📊 SINAL DE INTERESSE
  //
  // -1 = forte rejeição
  //  0 = neutro
  // +1 = forte interesse
  // ==========================================================

  let signal = 0;


  // ----------------------------------------------------------
  // Menos de 8%
  // Rejeição muito forte
  // ----------------------------------------------------------

  if (completion < 0.08) {

    signal = -0.45;

  }


  // ----------------------------------------------------------
  // 8% até 20%
  // Rejeição clara
  // ----------------------------------------------------------

  else if (completion < 0.20) {

    signal = -0.25;

  }


  // ----------------------------------------------------------
  // 20% até 40%
  // Pouco interesse
  // ----------------------------------------------------------

  else if (completion < 0.40) {

    signal = -0.10;

  }


  // ----------------------------------------------------------
  // 40% até 60%
  // Neutro / interesse incerto
  // ----------------------------------------------------------

  else if (completion < 0.60) {

    signal = 0.05;

  }


  // ----------------------------------------------------------
  // 60% até 80%
  // Interesse moderado
  // ----------------------------------------------------------

  else if (completion < 0.80) {

    signal = 0.30;

  }


  // ----------------------------------------------------------
  // 80% até 95%
  // Interesse forte
  // ----------------------------------------------------------

  else if (completion < 0.95) {

    signal = 0.50;

  }


  // ----------------------------------------------------------
  // 95% até 100%
  // Interesse muito forte
  // ----------------------------------------------------------

  else {

    signal = 0.70;

  }


  // ==========================================================
  // ❤️ INTERAÇÕES EXPLÍCITAS
  // ==========================================================

  if (behavior.liked) {

    signal += 0.35;

  }


  if (behavior.commented) {

    signal += 0.20;

  }


  if (behavior.shared) {

    signal += 0.30;

  }


  // ==========================================================
  // LIMITAR SINAL
  // ==========================================================

  signal =
    clamp(
      signal,
      -1,
      1
    );


  // ==========================================================
  // 🔎 BUSCAR PERFIL DO USUÁRIO
  // ==========================================================

  let preference =
    await UserPreference.findOne({
      userId
    });


  // ==========================================================
  // CRIAR PERFIL CASO NÃO EXISTA
  // ==========================================================

  if (!preference) {

    preference =
      new UserPreference({
        userId
      });

  }


  // ==========================================================
  // TAXA DE APRENDIZADO
  //
  // 15% do sinal influencia a preferência a cada evento.
  // ==========================================================

  const learningRate =
    0.15;


  // ==========================================================
  // 🎯 APRENDIZADO DA CATEGORIA
  // ==========================================================

  const oldCategory =
    Number(
      preference.categories.get(
        category
      )
    ) || 0.5;


  /*
   * Regra:
   *
   * sinal positivo
   * → preferência sobe
   *
   * sinal negativo
   * → preferência desce
   *
   * sinal zero
   * → preferência não muda
   */

  const newCategory =
    clamp(
      oldCategory +
      signal *
      learningRate
    );


  preference.categories.set(
    category,
    newCategory
  );


  // ==========================================================
  // 🏷️ APRENDIZADO DAS TAGS
  // ==========================================================

  for (const tag of tags) {

    const oldTag =
      Number(
        preference.tags.get(
          tag
        )
      ) || 0.5;


    const newTag =
      clamp(
        oldTag +
        signal *
        learningRate
      );


    preference.tags.set(
      tag,
      newTag
    );

  }


  // ==========================================================
  // 📈 CONTADOR DE INTERAÇÕES
  // ==========================================================

  preference.totalInteractions =
    (
      Number(
        preference.totalInteractions
      ) || 0
    ) + 1;


  // ==========================================================
  // 🕒 ÚLTIMO COMPORTAMENTO
  // ==========================================================

  preference.lastBehaviorAt =
    new Date();


  // ==========================================================
  // 💾 SALVAR PERFIL
  // ==========================================================

  await preference.save();


  // ==========================================================
  // DEBUG
  // ==========================================================

  console.log(
    '🧠 PREFERÊNCIA ATUALIZADA:',
    {

      userId:
        String(userId),

      category,

      completion:
        Number(
          completion.toFixed(3)
        ),

      signal:
        Number(
          signal.toFixed(3)
        ),

      oldCategory:
        Number(
          oldCategory.toFixed(3)
        ),

      newCategory:
        Number(
          newCategory.toFixed(3)
        ),

      totalInteractions:
        preference.totalInteractions

    }
  );


  return preference;

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  learnFromBehavior
};