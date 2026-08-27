// AI/compulsionScore.js


// ============================================================
// CONFIGURAÇÃO
// ============================================================

// Depois de 30 minutos sem comportamento,
// consideramos que uma nova sessão começou.
const SESSION_BREAK_MINUTES = 30;


// Depois de 6 horas fora da plataforma,
// consideramos recuperação completa do score.
//
// Esse é um parâmetro do protótipo e pode ser
// calibrado posteriormente.
const FULL_RECOVERY_HOURS = 6;


// Evita que um único vídeo depois de uma pausa
// já gere um score alto.
//
// Com 5 comportamentos da sessão,
// o score passa a ter confiança total.
const FULL_CONFIDENCE_BEHAVIORS = 5;


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
        Math.min(
            max,
            value
        )
    );

}


function getTimestamp(value) {

    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    const timestamp =
        date.getTime();

    return Number.isFinite(timestamp)
        ? timestamp
        : null;

}


// ============================================================
// RECUPERAÇÃO PELO TEMPO OFFLINE
// ============================================================

function calculateRecoveryMultiplier(
    offlineHours
) {

    // menos de 30 minutos
    if (offlineHours < 0.5) {

        return 1;

    }


    // 30 minutos até 2 horas
    if (offlineHours < 2) {

        return 0.75;

    }


    // 2 até 4 horas
    if (offlineHours < 4) {

        return 0.50;

    }


    // 4 até 6 horas
    if (
        offlineHours <
        FULL_RECOVERY_HOURS
    ) {

        return 0.25;

    }


    // 6h+
    return 0;

}


// ============================================================
// 🧠 COMPULSION SCORE
// ============================================================

function calculateCompulsionScore(
    behaviors
) {

    // ========================================================
    // SEM HISTÓRICO
    // ========================================================

    if (
        !Array.isArray(behaviors) ||
        behaviors.length === 0
    ) {

        return 0;

    }


    // ========================================================
    // NORMALIZAÇÃO
    // ========================================================

    const normalized =
        behaviors

            .map(b => {

                const watchTime =
                    Math.max(
                        0,
                        Number(
                            b.watchTime
                        ) || 0
                    );


                const duration =
                    Math.max(
                        0,
                        Number(
                            b.duration
                        ) || 0
                    );


                const stimulus =
                    clamp(
                        Number(
                            b.stimulusLevel
                        ) || 0
                    );


                let completion =
                    Number(
                        b.completionRate
                    );


                // Caso completionRate não exista
                if (
                    !Number.isFinite(
                        completion
                    ) ||
                    completion < 0
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


                const timestamp =
                    getTimestamp(
                        b.createdAt
                    );


                return {

                    watchTime,

                    duration,

                    stimulus,

                    completion,

                    category:
                        b.category ||
                        'general',

                    tags:
                        Array.isArray(
                            b.tags
                        )
                            ? b.tags
                            : [],

                    createdAt:
                        b.createdAt,

                    timestamp

                };

            })

            .filter(
                b =>
                    b.duration > 0
            );


    if (
        normalized.length === 0
    ) {

        return 0;

    }


    // ========================================================
    // ORDENAR:
    //
    // mais recente → mais antigo
    // ========================================================

    normalized.sort(
        (a, b) => {

            const timeA =
                a.timestamp || 0;

            const timeB =
                b.timestamp || 0;

            return (
                timeB -
                timeA
            );

        }
    );


    // ========================================================
    // ÚLTIMA ATIVIDADE
    // ========================================================

    const latestBehavior =
        normalized[0];


    const latestTimestamp =
        latestBehavior.timestamp;


    let offlineHours = 0;


    if (latestTimestamp) {

        offlineHours =
            Math.max(
                0,
                (
                    Date.now() -
                    latestTimestamp
                ) /
                (
                    1000 *
                    60 *
                    60
                )
            );

    }


    // ========================================================
    // 🌙 RECUPERAÇÃO COMPLETA
    // ========================================================

    if (
        latestTimestamp &&
        offlineHours >=
            FULL_RECOVERY_HOURS
    ) {

        console.log(
            '🌙 RECUPERAÇÃO DO COMPULSION SCORE:',
            {

                offlineHours:
                    Number(
                        offlineHours
                            .toFixed(2)
                    ),

                recoveryMultiplier:
                    0,

                sessionBehaviors:
                    0,

                final:
                    0,

                reason:
                    'healthy_break'

            }
        );


        return 0;

    }


    // ========================================================
    // 🔎 IDENTIFICAR SESSÃO ATUAL
    //
    // Começamos pelo behavior mais recente.
    //
    // Quando encontramos um espaço de 30 minutos ou mais
    // entre dois behaviors, paramos.
    //
    // Tudo depois desse intervalo pertence a outra sessão.
    // ========================================================

    const currentSession = [];


    for (
        let index = 0;
        index < normalized.length;
        index++
    ) {

        const current =
            normalized[index];


        // Primeiro comportamento
        if (index === 0) {

            currentSession.push(
                current
            );

            continue;

        }


        const previous =
            normalized[
                index - 1
            ];


        // Se os timestamps existirem,
        // verificamos a distância entre os eventos.

        if (
            previous.timestamp &&
            current.timestamp
        ) {

            const gapMinutes =
                (
                    previous.timestamp -
                    current.timestamp
                ) /
                (
                    1000 *
                    60
                );


            if (
                gapMinutes >=
                SESSION_BREAK_MINUTES
            ) {

                break;

            }

        }


        currentSession.push(
            current
        );

    }


    // ========================================================
    // CASO EXTREMO
    // ========================================================

    if (
        currentSession.length === 0
    ) {

        return 0;

    }


    // ========================================================
    // A PARTIR DAQUI:
    //
    // SCORE USA SOMENTE A SESSÃO ATUAL
    // ========================================================

    const activeBehaviors =
        currentSession;


    const count =
        activeBehaviors.length;


    // ========================================================
    // MÉDIAS
    // ========================================================

    const totalWatchTime =
        activeBehaviors.reduce(
            (
                sum,
                behavior
            ) =>
                sum +
                behavior.watchTime,
            0
        );


    const totalStimulus =
        activeBehaviors.reduce(
            (
                sum,
                behavior
            ) =>
                sum +
                behavior.stimulus,
            0
        );


    const totalCompletion =
        activeBehaviors.reduce(
            (
                sum,
                behavior
            ) =>
                sum +
                behavior.completion,
            0
        );


    const avgWatch =
        totalWatchTime /
        count;


    const avgStimulus =
        totalStimulus /
        count;


    const avgCompletion =
        totalCompletion /
        count;


    // ========================================================
    // 🎬 VÍDEOS CURTOS
    // ========================================================

    const shortVideos =
        activeBehaviors.filter(
            behavior =>
                behavior.duration <= 30
        ).length;


    const shortVideoRatio =
        shortVideos /
        count;


    // ========================================================
    // 🔥 RETENÇÃO ALTA
    // ========================================================

    const highRetentionVideos =
        activeBehaviors.filter(
            behavior =>
                behavior.completion >=
                0.85
        ).length;


    const highRetentionRatio =
        highRetentionVideos /
        count;


    // ========================================================
    // 🧠 HIPERESTÍMULO
    // ========================================================

    const highStimulusVideos =
        activeBehaviors.filter(
            behavior =>
                behavior.stimulus >=
                0.75
        ).length;


    const highStimulusRatio =
        highStimulusVideos /
        count;


    // ========================================================
    // 🔄 BINGE
    // ========================================================

    const bingeScore =
        (
            highRetentionRatio *
            8
        )
        +
        (
            highStimulusRatio *
            6
        )
        +
        (
            shortVideoRatio *
            6
        );


    // ========================================================
    // ⏱ WATCH SCORE
    // ========================================================

    const watchScore =

        Math.min(
            avgWatch / 60,
            1
        ) *

        20;


    // ========================================================
    // 🧠 STIMULUS SCORE
    // ========================================================

    const stimulusScore =
        avgStimulus *
        25;


    // ========================================================
    // 🎯 COMPLETION SCORE
    // ========================================================

    const completionScore =
        avgCompletion *
        20;


    // ========================================================
    // 📱 SHORT VIDEO SCORE
    // ========================================================

    const shortVideoScore =
        shortVideoRatio *
        15;


    // ========================================================
    // SCORE BRUTO
    // ========================================================

    let rawScore =

        watchScore +

        stimulusScore +

        completionScore +

        shortVideoScore +

        bingeScore;


    rawScore =
        clamp(
            rawScore,
            0,
            100
        );


    // ========================================================
    // 📊 CONFIANÇA DA SESSÃO
    //
    // Evita:
    //
    // 1 vídeo
    // ↓
    // score 50
    //
    // O score ganha confiança progressivamente.
    // ========================================================

    const evidenceFactor =
        clamp(
            count /
            FULL_CONFIDENCE_BEHAVIORS
        );


    let score =
        rawScore *
        evidenceFactor;


    // ========================================================
    // 🌙 RECUPERAÇÃO POR INATIVIDADE
    //
    // Se a pessoa abriu o app depois de ficar algum
    // tempo fora, o score anterior já chega reduzido.
    // ========================================================

    const recoveryMultiplier =
        calculateRecoveryMultiplier(
            offlineHours
        );


    score *=
        recoveryMultiplier;


    // ========================================================
    // LIMITADOR FINAL
    // ========================================================

    score =
        clamp(
            score,
            0,
            100
        );


    // ========================================================
    // ARREDONDAMENTO
    // ========================================================

    score =
        Number(
            score.toFixed(2)
        );


    // ========================================================
    // 🧪 DEBUG
    // ========================================================

    console.log(
        '🧠 SCORE DETALHADO:',
        {

            behaviorsReceived:
                normalized.length,

            sessionBehaviors:
                count,

            sessionBreakMinutes:
                SESSION_BREAK_MINUTES,

            offlineHours:
                Number(
                    offlineHours
                        .toFixed(3)
                ),

            recoveryMultiplier,

            evidenceFactor:
                Number(
                    evidenceFactor
                        .toFixed(2)
                ),

            avgWatch:
                Number(
                    avgWatch
                        .toFixed(2)
                ),

            avgStimulus:
                Number(
                    avgStimulus
                        .toFixed(2)
                ),

            avgCompletion:
                Number(
                    avgCompletion
                        .toFixed(2)
                ),

            shortVideoRatio:
                Number(
                    shortVideoRatio
                        .toFixed(2)
                ),

            highRetentionRatio:
                Number(
                    highRetentionRatio
                        .toFixed(2)
                ),

            highStimulusRatio:
                Number(
                    highStimulusRatio
                        .toFixed(2)
                ),

            watchScore:
                Number(
                    watchScore
                        .toFixed(2)
                ),

            stimulusScore:
                Number(
                    stimulusScore
                        .toFixed(2)
                ),

            completionScore:
                Number(
                    completionScore
                        .toFixed(2)
                ),

            shortVideoScore:
                Number(
                    shortVideoScore
                        .toFixed(2)
                ),

            bingeScore:
                Number(
                    bingeScore
                        .toFixed(2)
                ),

            rawScore:
                Number(
                    rawScore
                        .toFixed(2)
                ),

            final:
                score

        }
    );


    return score;

}


module.exports =
    calculateCompulsionScore;