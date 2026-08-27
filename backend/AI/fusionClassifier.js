const classifyContent =
    require('./contentClassifier');

const {
    analyzeVideo
} =
    require('../services/videoAI');

const {
    analyzeSpeech
} =
    require('../services/speechAI');


// ==================================================
// HELPERS
// ==================================================

function clamp(
    value,
    min = 0,
    max = 1
) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return min;

    }

    return Math.max(
        min,
        Math.min(
            max,
            number
        )
    );

}


// ==================================================
// NORMALIZAR DURAÇÃO
//
// Aceita:
// 35.5   → segundos
// 35347  → milissegundos
//
// Como os vídeos do app têm no máximo poucos minutos,
// valores > 1000 são tratados como milissegundos.
// ==================================================

function normalizeDuration(
    value
) {

    let duration =
        Number(value || 0);


    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {

        return 0;

    }


    if (
        duration > 1000
    ) {

        duration =
            duration / 1000;

    }


    return duration;

}


// ==================================================
// NORMALIZAR CATEGORIA
//
// Isso permite que o classificador visual use nomes
// ligeiramente diferentes sem quebrar a taxonomia.
// ==================================================

function normalizeCategory(
    value
) {

    const category =
        String(
            value || ''
        )
            .toLowerCase()
            .trim();


    const aliases = {

        humour:
            'meme',

        humor:
            'meme',

        funny:
            'meme',

        comedy:
            'meme',


        education:
            'educational',

        learning:
            'educational',

        study:
            'educational',


        tech:
            'technology',

        coding:
            'programming',

        code:
            'programming',


        car:
            'automotive',

        cars:
            'automotive',

        vehicle:
            'automotive',


        sport:
            'sports',

        football:
            'sports',

        soccer:
            'sports',


        food_and_drink:
            'food',

        cooking:
            'food',


        fitness_and_health:
            'fitness',

        workout:
            'fitness',


        relaxation:
            'mental_health',

        wellbeing:
            'mental_health',

        wellness:
            'mental_health',


        spirituality:
            'religion',


        animal:
            'animals',

        pets:
            'animals',


        travel_and_places:
            'travel',


        finance_and_business:
            'finance',


        political:
            'politics',


        relationship:
            'relationships'

    };


    return (
        aliases[
            category
        ] ||
        category ||
        'general'
    );

}


// ==================================================
// CONFIANÇA VISUAL
//
// Se o videoAI futuramente retornar confidence,
// usamos.
//
// Se ainda não retornar, usamos um valor conservador.
// ==================================================

function getVisualConfidence(
    visual
) {

    if (!visual) {

        return 0;

    }


    const possibleConfidence =
        Number(
            visual.confidence
        );


    if (
        Number.isFinite(
            possibleConfidence
        )
    ) {

        return clamp(
            possibleConfidence
        );

    }


    /*
     * Enquanto nosso videoAI não informar
     * confidence explicitamente.
     */
    return 0.55;

}


// ==================================================
// ESTÍMULO BASEADO EM DURAÇÃO
//
// Duração sozinha NÃO determina compulsão.
//
// Ela é apenas um dos sinais.
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
// PRIOR DE ESTÍMULO POR CATEGORIA
//
// IMPORTANTE:
//
// A categoria NÃO define o estímulo.
//
// Isto é apenas um prior pequeno para ajudar
// caso a análise visual seja ruim ou falhe.
// ==================================================

function getCategoryStimulus(
    category
) {

    const priors = {

        meme:
            0.76,

        gaming:
            0.68,

        sports:
            0.68,

        dance:
            0.70,

        music:
            0.61,

        entertainment:
            0.62,

        news:
            0.58,

        politics:
            0.56,

        automotive:
            0.58,

        fashion:
            0.54,

        relationships:
            0.52,

        lifestyle:
            0.50,

        food:
            0.48,

        technology:
            0.47,

        programming:
            0.42,

        finance:
            0.43,

        educational:
            0.40,

        motivation:
            0.46,

        travel:
            0.40,

        animals:
            0.42,

        religion:
            0.34,

        nature:
            0.28,

        mental_health:
            0.25,

        general:
            0.50

    };


    return (
        priors[
            category
        ] ??
        0.50
    );

}


// ==================================================
// FUSION CLASSIFIER V2
// ==================================================

async function fusionClassifier(
    videoData,
    videoPath
) {

    // ==================================================
    // 1. DURAÇÃO
    // ==================================================

    const rawDuration =
        Number(
            videoData?.duration || 0
        );


    const duration =
        normalizeDuration(
            rawDuration
        );


    console.log(
        '⏱ FUSION DURATION:',
        {
            raw:
                rawDuration,

            normalized:
                Number(
                    duration.toFixed(3)
                ),

            unit:
                'seconds'
        }
    );


    // ==================================================
    // 2. CLASSIFICAÇÃO TEXTUAL
    // ==================================================

    const base =
        classifyContent({

            ...videoData,

            duration

        });


    console.log(
        '📝 CLASSIFICAÇÃO TEXTO V2:',
        {

            category:
                base.category,

            secondaryCategories:
                base.secondaryCategories,

            confidence:
                base.confidence,

            scores:
                base.scores,

            tags:
                base.tags

        }
    );


    // ==================================================
    // 3. ANÁLISE VISUAL
    // ==================================================

    let visual =
        null;


    try {

        visual =
            await analyzeVideo(
                videoPath,
                duration
            );


        console.log(
            '👁️ ANÁLISE VISUAL:',
            visual
        );

    }

    catch (
        err
    ) {

        console.log(
            '⚠️ erro IA visual:',
            err?.message ||
            err
        );


        visual =
            null;

    }



    // ==================================================
    // 4. TRANSCRIÇÃO + SEMÂNTICA DA FALA
    // ==================================================

    let speech =
        null;


    try {

        speech =
            await analyzeSpeech(
                videoPath
            );


        console.log(
            '🎙 ANÁLISE DA FALA:',
            {

                hasSpeech:
                    speech?.hasSpeech,

                transcript:
                    speech?.transcript,

                category:
                    speech?.category,

                suggestedCategory:
                    speech?.suggestedCategory,

                confidence:
                    speech?.confidence,

                mood:
                    speech?.mood,

                moodConfidence:
                    speech?.moodConfidence,

                themes:
                    speech?.themes,

                themeConfidence:
                    speech?.themeConfidence

            }
        );

    }

    catch (
        err
    ) {

        console.log(
            '⚠️ erro Speech AI:',
            err?.message ||
            err
        );


        speech =
            null;

    }


    // ==================================================
    // 5. SCORE DE CATEGORIAS
    //
    // Texto + visão + fala colaboram.
    // ==================================================

    const fusionScores =
        {};


    const addCategoryScore =
        (
            category,
            score
        ) => {

            const normalized =
                normalizeCategory(
                    category
                );


            if (
                !normalized ||
                normalized ===
                    'general'
            ) {

                return;

            }


            if (
                !Number.isFinite(
                    Number(score)
                )
            ) {

                return;

            }


            fusionScores[
                normalized
            ] =
                (
                    fusionScores[
                        normalized
                    ] ||
                    0
                ) +
                Number(score);

        };


    // ==================================================
    // 6. SCORE TEXTUAL
    // ==================================================

    const textConfidence =
        clamp(
            base?.confidence ??
            0.20
        );


    const textScores =
        (
            base?.scores &&
            typeof base.scores ===
                'object'
        )
            ? base.scores
            : {};


    const textRanking =
        Object.entries(
            textScores
        )
            .filter(
                ([, score]) =>
                    Number(score) > 0
            )
            .sort(
                (a, b) =>
                    Number(b[1]) -
                    Number(a[1])
            );


    const bestTextRawScore =
        textRanking.length > 0
            ? Number(
                textRanking[0][1]
            )
            : 0;


    /*
     * Todos os candidatos textuais entram
     * na fusão.
     *
     * O melhor recebe 100% do peso textual.
     * Os demais recebem proporcionalmente.
     */

    if (
        bestTextRawScore > 0
    ) {

        for (
            const [
                category,
                rawScore
            ]
            of textRanking
        ) {

            const normalizedTextScore =
                clamp(
                    Number(
                        rawScore
                    ) /
                    bestTextRawScore
                );


            const contribution =
                normalizedTextScore *
                textConfidence *
                0.70;


            addCategoryScore(
                category,
                contribution
            );

        }

    }


    /*
     * Pequeno bônus para a categoria
     * principal escolhida pelo textual.
     */

    if (
        base?.category &&
        base.category !==
            'general'
    ) {

        addCategoryScore(
            base.category,

            textConfidence *
            0.15
        );

    }


    // ==================================================
    // 7. SCORE VISUAL
    // ==================================================

    const visualCategory =
        normalizeCategory(
            visual?.category
        );


    const visualConfidence =
        getVisualConfidence(
            visual
        );


    const speechCategory =
        normalizeCategory(
            speech?.category
        );


    const speechConfidence =
        clamp(
            speech?.confidence ||
            0
        );


    if (
        visual &&
        visualCategory !==
            'general'
    ) {

        addCategoryScore(

            visualCategory,

            visualConfidence *
            0.55

        );

    }



    // ==================================================
    // 8. SCORE DA FALA
    //
    // A fala é uma fonte semântica forte para assunto.
    // Por isso recebe peso maior que a visão isolada.
    // ==================================================

    if (
        speech?.hasSpeech &&
        speechCategory !==
            'general'
    ) {

        addCategoryScore(

            speechCategory,

            speechConfidence *
            0.95

        );

    }


    /*
     * Candidatos secundários da fala entram
     * com peso pequeno.
     */
    if (
        speech?.hasSpeech &&
        Array.isArray(
            speech?.categoryCandidates
        ) &&
        speech.categoryCandidates.length >
            1
    ) {

        const bestSpeechCandidateScore =
            Number(
                speech.categoryCandidates[0]
                    ?.score ||
                0
            );


        if (
            bestSpeechCandidateScore >
            0
        ) {

            for (
                const candidate
                of speech.categoryCandidates
                    .slice(
                        1,
                        4
                    )
            ) {

                const candidateCategory =
                    normalizeCategory(
                        candidate?.key
                    );


                const ratio =
                    clamp(
                        Number(
                            candidate?.score ||
                            0
                        ) /
                        bestSpeechCandidateScore
                    );


                /*
                 * Só deixamos candidatos próximos
                 * entrarem de verdade na disputa.
                 */
                if (
                    ratio >=
                    0.82
                ) {

                    addCategoryScore(

                        candidateCategory,

                        speechConfidence *
                        ratio *
                        0.18

                    );

                }

            }

        }

    }


    // ==================================================
    // 9. CONCORDÂNCIA ENTRE FONTES
    // ==================================================

    const normalizedBaseCategory =
        normalizeCategory(
            base?.category
        );


    const textVisualAgree =
        (
            normalizedBaseCategory !==
                'general' &&

            visualCategory !==
                'general' &&

            normalizedBaseCategory ===
                visualCategory
        );


    const textSpeechAgree =
        (
            normalizedBaseCategory !==
                'general' &&

            speechCategory !==
                'general' &&

            normalizedBaseCategory ===
                speechCategory
        );


    const visualSpeechAgree =
        (
            visualCategory !==
                'general' &&

            speechCategory !==
                'general' &&

            visualCategory ===
                speechCategory
        );


    const allSourcesAgree =
        (
            textVisualAgree &&
            textSpeechAgree &&
            visualSpeechAgree
        );


    const sourcesAgree =
        (
            textVisualAgree ||
            textSpeechAgree ||
            visualSpeechAgree
        );


    if (
        textVisualAgree
    ) {

        addCategoryScore(

            normalizedBaseCategory,

            0.18

        );

    }


    if (
        textSpeechAgree
    ) {

        addCategoryScore(

            normalizedBaseCategory,

            0.26

        );

    }


    if (
        visualSpeechAgree
    ) {

        addCategoryScore(

            speechCategory,

            0.18

        );

    }


    if (
        allSourcesAgree
    ) {

        addCategoryScore(

            speechCategory,

            0.12

        );

    }


    // ==================================================
    // 8. TAGS VISUAIS COMO EVIDÊNCIA AUXILIAR
    //
    // Só usamos tags muito explícitas.
    // ==================================================

    const visualTags =
        Array.isArray(
            visual?.tags
        )
            ? visual.tags
            : [];


    const visualTagCategoryMap = {

        gaming:
            'gaming',

        gameplay:
            'gaming',

        videogame:
            'gaming',


        football:
            'sports',

        soccer:
            'sports',

        basketball:
            'sports',

        motorsport:
            'sports',


        car:
            'automotive',

        cars:
            'automotive',

        automotive:
            'automotive',


        food:
            'food',

        cooking:
            'food',


        programming:
            'programming',

        coding:
            'programming',


        technology:
            'technology',

        tech:
            'technology',


        meme:
            'meme',

        humor:
            'meme',

        funny:
            'meme',


        nature:
            'nature',


        animal:
            'animals',

        animals:
            'animals',

        pet:
            'animals',

        pets:
            'animals',


        dance:
            'dance',


        music:
            'music',


        fitness:
            'fitness',

        workout:
            'fitness',


        religion:
            'religion',

        spirituality:
            'religion',


        education:
            'educational',

        educational:
            'educational'

    };


    for (
        const rawTag
        of visualTags
    ) {

        const tag =
            String(
                rawTag || ''
            )
                .toLowerCase()
                .trim();


        const mappedCategory =
            visualTagCategoryMap[
                tag
            ];


        if (
            mappedCategory
        ) {

            addCategoryScore(

                mappedCategory,

                0.08 *
                visualConfidence

            );

        }

    }


    // ==================================================
    // 9. RANKING FINAL DE CATEGORIAS
    // ==================================================

    const categoryRanking =
        Object.entries(
            fusionScores
        )
            .sort(
                (a, b) =>
                    Number(b[1]) -
                    Number(a[1])
            );


    let finalCategory =
        'general';


    let bestFusionScore =
        0;


    let secondFusionScore =
        0;


    if (
        categoryRanking.length >
        0
    ) {

        finalCategory =
            categoryRanking[0][0];


        bestFusionScore =
            Number(
                categoryRanking[0][1]
            );


        secondFusionScore =
            categoryRanking[1]
                ? Number(
                    categoryRanking[1][1]
                )
                : 0;

    }


    // ==================================================
    // 10. FALLBACK
    //
    // Nenhuma fonte encontrou algo útil.
    // ==================================================

    if (
        categoryRanking.length ===
        0
    ) {

        if (
            normalizedBaseCategory !==
                'general'
        ) {

            finalCategory =
                normalizedBaseCategory;

        }

        else if (
            visualCategory !==
                'general'
        ) {

            finalCategory =
                visualCategory;

        }

        else {

            finalCategory =
                'general';

        }

    }


    // ==================================================
    // 11. CONFIANÇA FINAL DA CATEGORIA
    // ==================================================

    let categoryConfidence =
        0.20;


    if (
        finalCategory !==
        'general'
    ) {

        const margin =
            Math.max(
                0,
                bestFusionScore -
                secondFusionScore
            );


        const absoluteConfidence =
            clamp(
                bestFusionScore
            );


        const marginConfidence =
            clamp(
                margin /
                0.50
            );


        categoryConfidence =
            (
                absoluteConfidence *
                0.70
            ) +
            (
                marginConfidence *
                0.30
            );


        if (
            sourcesAgree
        ) {

            categoryConfidence +=
                0.08;

        }


        if (
            allSourcesAgree
        ) {

            categoryConfidence +=
                0.05;

        }


        categoryConfidence =
            clamp(
                categoryConfidence
            );

    }


    // ==================================================
    // 12. CATEGORIAS SECUNDÁRIAS
    // ==================================================

    const speechDominatesCategory =
        (
            speech?.hasSpeech &&
            speechCategory ===
                finalCategory &&
            speechConfidence >=
                0.75
        );


    const secondaryRatioThreshold =
        speechDominatesCategory
            ? 0.70
            : 0.42;


    const secondaryCategories =
        categoryRanking
            .filter(
                (
                    [
                        category,
                        score
                    ]
                ) =>

                    category !==
                        finalCategory &&

                    Number(
                        score
                    ) >=
                        bestFusionScore *
                        secondaryRatioThreshold
            )
            .slice(
                0,
                3
            )
            .map(
                ([category]) =>
                    category
            );


    // ==================================================
    // 13. STIMULUS
    //
    // Agora usamos:
    //
    // visual
    // +
    // duração
    // +
    // prior pequeno da categoria
    //
    // Em vez de simplesmente aceitar o visual.
    // ==================================================

    const durationStimulus =
        getDurationStimulus(
            duration
        );


    const categoryStimulus =
        getCategoryStimulus(
            finalCategory
        );


    const rawVisualStimulus =
        Number(
            visual?.stimulusLevel
        );


    const hasVisualStimulus =
        Number.isFinite(
            rawVisualStimulus
        );


    let finalStimulus =
        0.50;


    if (
        hasVisualStimulus
    ) {

        const visualStimulus =
            clamp(
                rawVisualStimulus
            );


        /*
         * Mesmo se o visual disser 1.0,
         * ele não domina 100% da decisão.
         *
         * Isso ajuda muito no problema de
         * "todo vídeo recebe stimulus 1".
         */

        const visualTrust =
            clamp(

                visualConfidence,

                0.45,

                0.72

            );


        const remainingWeight =
            1 -
            visualTrust;


        finalStimulus =
            (
                visualStimulus *
                visualTrust
            ) +

            (
                durationStimulus *
                remainingWeight *
                0.65
            ) +

            (
                categoryStimulus *
                remainingWeight *
                0.35
            );

    }

    else {

        /*
         * Visual falhou.
         *
         * Não inventamos um valor aleatório:
         * duração + prior da categoria.
         */

        finalStimulus =
            (
                durationStimulus *
                0.65
            ) +

            (
                categoryStimulus *
                0.35
            );

    }


    // ==================================================
    // 14. AJUSTES SEMÂNTICOS PEQUENOS
    //
    // Não queremos transformar categoria em stimulus.
    // São apenas correções leves.
    // ==================================================

    const allRawTags =
        [
            ...(Array.isArray(
                base?.tags
            )
                ? base.tags
                : []),

            ...visualTags,

            ...(Array.isArray(
                speech?.tags
            )
                ? speech.tags
                : [])
        ]
            .map(
                tag =>
                    String(tag)
                        .toLowerCase()
                        .trim()
            );


    const hasFastPaced =
        allRawTags.includes(
            'fast_paced'
        );


    const hasHighArousal =
        (
            allRawTags.includes(
                'high_arousal'
            ) ||
            allRawTags.includes(
                'high_dopamine'
            )
        );


    const hasCalm =
        (
            allRawTags.includes(
                'calm'
            ) ||
            allRawTags.includes(
                'relax'
            ) ||
            allRawTags.includes(
                'relaxing'
            )
        );


    if (
        hasFastPaced
    ) {

        finalStimulus +=
            0.04;

    }


    if (
        hasHighArousal
    ) {

        finalStimulus +=
            0.04;

    }


    if (
        hasCalm
    ) {

        finalStimulus -=
            0.06;

    }


    finalStimulus =
        clamp(
            finalStimulus
        );


    // ==================================================
    // 15. TAGS
    // ==================================================

    let finalTags =
        [];


    if (
        Array.isArray(
            base?.tags
        )
    ) {

        finalTags.push(
            ...base.tags
        );

    }


    if (
        Array.isArray(
            visual?.tags
        )
    ) {

        finalTags.push(
            ...visual.tags
        );

    }


    if (
        Array.isArray(
            speech?.tags
        )
    ) {

        finalTags.push(
            ...speech.tags
        );

    }


    finalTags.push(
        finalCategory
    );


    finalTags.push(
        ...secondaryCategories
    );


    // ==================================================
    // 16. REMOVER TAGS QUE PODEM CONFLITAR
    //
    // Depois recriamos com os valores finais.
    // ==================================================

    const generatedTags =
        new Set([

            'general',

            'high_stimulus',
            'medium_stimulus',
            'low_stimulus',

            'short_video',
            'medium_video',
            'long_video'

        ]);


    finalTags =
        finalTags.filter(
            tag =>
                !generatedTags.has(
                    String(
                        tag
                    )
                        .toLowerCase()
                        .trim()
                )
        );


    // ==================================================
    // 17. TAG DE DURAÇÃO FINAL
    // ==================================================

    if (
        duration > 0
    ) {

        if (
            duration <= 15
        ) {

            finalTags.push(
                'short_video'
            );

        }

        else if (
            duration <= 60
        ) {

            finalTags.push(
                'medium_video'
            );

        }

        else {

            finalTags.push(
                'long_video'
            );

        }

    }


    // ==================================================
    // 18. TAG DE ESTÍMULO FINAL
    // ==================================================

    if (
        finalStimulus >=
        0.70
    ) {

        finalTags.push(
            'high_stimulus'
        );

    }

    else if (
        finalStimulus >=
        0.40
    ) {

        finalTags.push(
            'medium_stimulus'
        );

    }

    else {

        finalTags.push(
            'low_stimulus'
        );

    }


    // ==================================================
    // 19. FALLBACK GENERAL
    // ==================================================

    if (
        finalCategory ===
        'general'
    ) {

        finalTags.push(
            'general'
        );

    }


    // ==================================================
    // 20. LIMPAR TAGS
    // ==================================================

    finalTags =
        [
            ...new Set(
                finalTags
                    .filter(Boolean)
                    .map(
                        tag =>
                            String(tag)
                                .toLowerCase()
                                .trim()
                    )
            )
        ];


    // ==================================================
    // 21. MOOD + THEMES MULTIMODAIS
    // ==================================================

    const visualMood =
        String(
            visual?.mood ||
            visual?.emotion ||
            'neutral'
        )
            .toLowerCase()
            .trim() ||
        'neutral';


    const visualMoodConfidence =
        clamp(
            visual?.moodConfidence ||
            0
        );


    const speechMood =
        String(
            speech?.mood ||
            'neutral'
        )
            .toLowerCase()
            .trim() ||
        'neutral';


    const speechMoodConfidence =
        clamp(
            speech?.moodConfidence ||
            0
        );


    let finalMood =
        visualMood;


    let finalMoodConfidence =
        visualMoodConfidence;


    if (
        speech?.hasSpeech &&
        speechMood !==
            'neutral' &&
        (
            finalMood ===
                'neutral' ||
            speechMoodConfidence >=
                finalMoodConfidence
        )
    ) {

        finalMood =
            speechMood;


        finalMoodConfidence =
            speechMoodConfidence;

    }


    if (
        visualMood !==
            'neutral' &&
        speechMood !==
            'neutral' &&
        visualMood ===
            speechMood
    ) {

        finalMood =
            visualMood;


        finalMoodConfidence =
            clamp(
                Math.max(
                    visualMoodConfidence,
                    speechMoodConfidence
                ) +
                0.10
            );

    }


    const themeScores =
        new Map();


    const speechThemeCandidates =
        new Map(
            (
                Array.isArray(
                    speech?.themeCandidates
                )
                    ? speech.themeCandidates
                    : []
            )
                .map(
                    candidate => [

                        String(
                            candidate?.key ||
                            ''
                        )
                            .toLowerCase()
                            .trim(),

                        candidate

                    ]
                )
                .filter(
                    ([key]) =>
                        key
                )
        );


    const addTheme =
        (
            theme,
            score,
            source
        ) => {

            const normalized =
                String(
                    theme ||
                    ''
                )
                    .toLowerCase()
                    .trim();


            if (
                !normalized
            ) {

                return;

            }


            const current =
                themeScores.get(
                    normalized
                ) ||
                {
                    score:
                        0,

                    sources:
                        new Set()
                };


            let weightedScore =
                clamp(
                    score
                );


            if (
                source ===
                'visual'
            ) {

                /*
                 * Se existe fala semanticamente útil,
                 * um tema visual abstrato não pode
                 * dominar sozinho.
                 *
                 * Ex.: estética religiosa não significa
                 * necessariamente que o assunto seja
                 * espiritualidade.
                 */
                const hasSpeechThemes =
                    (
                        speech?.hasSpeech &&
                        Array.isArray(
                            speech?.themes
                        ) &&
                        speech.themes.length >
                            0
                    );


                weightedScore =
                    hasSpeechThemes
                        ? Math.min(
                            0.40,
                            weightedScore *
                            0.45
                        )
                        : Math.min(
                            0.56,
                            weightedScore *
                            0.72
                        );

            }


            if (
                source ===
                'speech'
            ) {

                /*
                 * Para fala usamos o score específico
                 * daquele tema, quando disponível.
                 *
                 * Isto é melhor do que aplicar a mesma
                 * themeConfidence global a todos.
                 */
                const candidate =
                    speechThemeCandidates.get(
                        normalized
                    );


                const candidateScore =
                    Number(
                        candidate?.score ||
                        0
                    );


                const anchorBoost =
                    Number(
                        candidate?.anchorBoost ||
                        0
                    );


                if (
                    candidateScore >
                    0
                ) {

                    weightedScore =
                        clamp(
                            (
                                candidateScore *
                                0.82
                            ) +
                            (
                                anchorBoost >=
                                    0.08
                                    ? 0.06
                                    : 0
                            )
                        );

                }

                else {

                    weightedScore =
                        clamp(
                            Math.max(
                                0.45,
                                weightedScore *
                                1.05
                            )
                        );

                }

            }


            current.score =
                Math.max(
                    current.score,
                    weightedScore
                );


            current.sources.add(
                source
            );


            themeScores.set(
                normalized,
                current
            );

        };


    for (
        const theme
        of (
            Array.isArray(
                visual?.themes
            )
                ? visual.themes
                : []
        )
    ) {

        addTheme(
            theme,
            visual?.themeConfidence ||
            0.35,
            'visual'
        );

    }


    for (
        const theme
        of (
            Array.isArray(
                speech?.themes
            )
                ? speech.themes
                : []
        )
    ) {

        addTheme(
            theme,
            speech?.themeConfidence ||
            0.40,
            'speech'
        );

    }


    /*
     * Se visão e fala realmente concordam no
     * mesmo tema, a concordância é valiosa.
     */
    for (
        const [
            theme,
            data
        ]
        of themeScores.entries()
    ) {

        if (
            data.sources.has(
                'visual'
            ) &&
            data.sources.has(
                'speech'
            )
        ) {

            data.score =
                clamp(
                    data.score +
                    0.10
                );


            themeScores.set(
                theme,
                data
            );

        }

    }


    const finalThemeEntries =
        [
            ...themeScores.entries()
        ]
            .map(
                (
                    [
                        theme,
                        data
                    ]
                ) => ({

                    theme,

                    score:
                        data.score,

                    sources:
                        [
                            ...data.sources
                        ]

                })
            )
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            );


    const strongestTheme =
        finalThemeEntries[0]
            ?.score ||
        0;


    const finalThemes =
        finalThemeEntries
            .filter(
                item =>
                    item.score >=
                        Math.max(
                            0.42,
                            strongestTheme -
                            0.10
                        )
            )
            .slice(
                0,
                4
            )
            .map(
                item =>
                    item.theme
            );


    const finalThemeConfidence =
        finalThemes.length >
        0
            ? clamp(
                finalThemeEntries[0]
                    ?.score ||
                0
            )
            : 0;


    const emotion =
        finalMood;


    // ==================================================
    // 22. NORMALIZAR TAGS SEMÂNTICAS FINAIS
    //
    // Remove decisões conflitantes das fontes
    // individuais e reinsere apenas o resultado
    // multimodal final.
    // ==================================================

    const semanticSourceValues =
        new Set(
            [
                normalizedBaseCategory,
                visualCategory,
                speechCategory,

                ...(Array.isArray(
                    base?.secondaryCategories
                )
                    ? base.secondaryCategories
                    : []),

                ...(Array.isArray(
                    visual?.themes
                )
                    ? visual.themes
                    : []),

                ...(Array.isArray(
                    speech?.themes
                )
                    ? speech.themes
                    : []),

                visual?.mood,
                visual?.emotion,
                speech?.mood,

                'spirituality'
            ]
                .filter(Boolean)
                .map(
                    value =>
                        String(value)
                            .toLowerCase()
                            .trim()
                )
        );


    finalTags =
        finalTags.filter(
            tag => {

                const normalized =
                    String(
                        tag ||
                        ''
                    )
                        .toLowerCase()
                        .trim();


                if (
                    !normalized
                ) {

                    return false;

                }


                if (
                    normalized.startsWith(
                        'mood_'
                    ) ||
                    normalized.startsWith(
                        'theme_'
                    )
                ) {

                    return false;

                }


                if (
                    semanticSourceValues.has(
                        normalized
                    )
                ) {

                    return false;

                }


                /*
                 * Categorias das fontes não devem
                 * sobreviver como tags cruas.
                 */
                if (
                    [
                        'gaming',
                        'sports',
                        'meme',
                        'educational',
                        'technology',
                        'programming',
                        'automotive',
                        'food',
                        'music',
                        'dance',
                        'religion',
                        'mental_health',
                        'nature',
                        'fitness',
                        'travel',
                        'animals',
                        'finance',
                        'news',
                        'politics',
                        'relationships',
                        'fashion',
                        'lifestyle',
                        'motivation',
                        'entertainment',
                        'general'
                    ].includes(
                        normalized
                    )
                ) {

                    return false;

                }


                return true;

            }
        );


    finalTags.push(
        finalCategory
    );


    for (
        const secondaryCategory
        of secondaryCategories
    ) {

        finalTags.push(
            `secondary_${secondaryCategory}`
        );

    }


    if (
        finalMood !==
            'neutral' &&
        finalMoodConfidence >=
            0.30
    ) {

        finalTags.push(
            `mood_${finalMood}`
        );

    }


    for (
        const theme
        of finalThemes
    ) {

        finalTags.push(
            `theme_${theme}`
        );

    }


    finalTags =
        [
            ...new Set(
                finalTags
                    .filter(Boolean)
                    .map(
                        tag =>
                            String(tag)
                                .toLowerCase()
                                .trim()
                    )
            )
        ];


    // ==================================================
    // 23. DESCOBRIR A FONTE PRINCIPAL
    // ==================================================

    let categorySource =
        'fallback';


    const finalMatches = {

        text:
            finalCategory !==
                'general' &&
            finalCategory ===
                normalizedBaseCategory,

        visual:
            finalCategory !==
                'general' &&
            finalCategory ===
                visualCategory,

        speech:
            finalCategory !==
                'general' &&
            finalCategory ===
                speechCategory

    };


    const sourceNames =
        Object.entries(
            finalMatches
        )
            .filter(
                ([, matches]) =>
                    matches
            )
            .map(
                ([name]) =>
                    name
            );


    if (
        sourceNames.length >
        0
    ) {

        categorySource =
            sourceNames.join(
                '+'
            );

    }

    else if (
        finalCategory !==
        'general'
    ) {

        categorySource =
            'fusion';

    }


    // ==================================================
    // 23. RESULTADO
    // ==================================================

    const result = {

        /*
         * CAMPOS USADOS ATUALMENTE
         * PELO RESTO DO MENTALCARE
         */

        category:
            finalCategory,

        tags:
            finalTags,

        stimulusLevel:
            Number(
                finalStimulus
                    .toFixed(2)
            ),

        emotion,

        mood:
            finalMood,

        moodConfidence:
            Number(
                finalMoodConfidence
                    .toFixed(3)
            ),

        themes:
            finalThemes,

        themeConfidence:
            Number(
                finalThemeConfidence
                    .toFixed(3)
            ),

        transcript:
            speech?.transcript ||
            '',

        speechAnalysis: {

            hasSpeech:
                Boolean(
                    speech?.hasSpeech
                ),

            category:
                speechCategory,

            confidence:
                Number(
                    speechConfidence
                        .toFixed(3)
                ),

            suggestedCategory:
                speech?.suggestedCategory ||
                'general',

            mood:
                speechMood,

            moodConfidence:
                Number(
                    speechMoodConfidence
                        .toFixed(3)
                ),

            themes:
                Array.isArray(
                    speech?.themes
                )
                    ? speech.themes
                    : []

        },


        /*
         * METADADOS NOVOS.
         *
         * Não quebram o código atual.
         * Servem para logs e futura análise.
         */

        categoryConfidence:
            Number(
                categoryConfidence
                    .toFixed(3)
            ),

        categorySource,

        secondaryCategories,

        fusionScores:
            Object.fromEntries(
                categoryRanking.map(
                    (
                        [
                            category,
                            score
                        ]
                    ) => [

                        category,

                        Number(
                            Number(score)
                                .toFixed(3)
                        )

                    ]
                )
            ),

        stimulusBreakdown: {

            visual:
                hasVisualStimulus
                    ? Number(
                        clamp(
                            rawVisualStimulus
                        ).toFixed(3)
                    )
                    : null,

            visualConfidence:
                Number(
                    visualConfidence
                        .toFixed(3)
                ),

            duration:
                Number(
                    durationStimulus
                        .toFixed(3)
                ),

            category:
                Number(
                    categoryStimulus
                        .toFixed(3)
                ),

            final:
                Number(
                    finalStimulus
                        .toFixed(3)
                )

        }

    };


    // ==================================================
    // 24. LOG FINAL
    // ==================================================

    console.log(
        '\n🧠 ========================================'
    );

    console.log(
        '🧠 FUSION CLASSIFIER V3.2 — SOURCE-AWARE MULTIMODAL'
    );

    console.log(
        '🧠 ========================================'
    );


    console.log(
        '📝 Texto:',
        {

            category:
                normalizedBaseCategory,

            confidence:
                Number(
                    textConfidence
                        .toFixed(3)
                )

        }
    );


    console.log(
        '👁️ Visual:',
        {

            category:
                visualCategory,

            confidence:
                Number(
                    visualConfidence
                        .toFixed(3)
                ),

            stimulus:
                hasVisualStimulus
                    ? clamp(
                        rawVisualStimulus
                    )
                    : null

        }
    );


    console.log(
        '🎙 Fala:',
        {

            hasSpeech:
                Boolean(
                    speech?.hasSpeech
                ),

            category:
                speechCategory,

            confidence:
                Number(
                    speechConfidence
                        .toFixed(3)
                ),

            transcript:
                speech?.transcript ||
                ''

        }
    );


    console.log(
        '🤝 Concordâncias:',
        {

            textVisual:
                textVisualAgree,

            textSpeech:
                textSpeechAgree,

            visualSpeech:
                visualSpeechAgree,

            all:
                allSourcesAgree

        }
    );


    console.log(
        '🏆 Categoria final:',
        finalCategory
    );


    console.log(
        '🎯 Confiança final:',
        Number(
            categoryConfidence
                .toFixed(3)
        )
    );


    console.log(
        '📡 Fonte:',
        categorySource
    );


    console.log(
        '🥈 Secundárias:',
        secondaryCategories
    );


    console.log(
        '🧭 Secondary policy:',
        {
            speechDominates:
                speechDominatesCategory,

            ratioThreshold:
                secondaryRatioThreshold
        }
    );


    console.log(
        '📊 Fusion scores:',
        result.fusionScores
    );


    console.log(
        '⚡ Stimulus:',
        result.stimulusBreakdown
    );


    console.log(
        '🎭 Mood final:',
        {

            mood:
                finalMood,

            confidence:
                Number(
                    finalMoodConfidence
                        .toFixed(3)
                )

        }
    );


    console.log(
        '🧩 Themes finais:',
        finalThemes
    );


    console.log(
        '🏷 Tags:',
        finalTags
    );


    console.log(
        '🧠 ========================================\n'
    );


    return result;

}


module.exports =
    fusionClassifier;