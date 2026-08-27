const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WaveFile } = require('wavefile');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// ==================================================
// MENTALCARE — SPEECH AI V1
//
// Pipeline:
// vídeo
//   ↓
// áudio 16 kHz mono
//   ↓
// Whisper local
//   ↓
// transcrição
//   ↓
// embeddings multilíngues
//   ↓
// categoria + mood + themes
// ==================================================

const WHISPER_MODEL =
    process.env.WHISPER_MODEL ||
    'Xenova/whisper-base';

const SEMANTIC_MODEL =
    process.env.SEMANTIC_MODEL ||
    'Xenova/multilingual-e5-small';

let transformersPromise = null;
let transcriberPromise = null;
let semanticExtractorPromise = null;

const prototypeCache = new Map();


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


function cleanText(
    value
) {

    return String(
        value || ''
    )
        .replace(/\s+/g, ' ')
        .trim();

}


function normalizeForMatching(
    value
) {

    return cleanText(
        value
    )
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

}


// ==================================================
// REDUZIR REPETIÇÕES / HALLUCINAÇÕES DO WHISPER
// ==================================================

function deduplicateTranscript(
    value
) {

    const text =
        cleanText(
            value
        );


    if (!text) {

        return '';

    }


    /*
     * Whisper pode repetir a mesma frase várias vezes,
     * especialmente em música, ruído ou sobreposição
     * entre chunks.
     *
     * Dividimos também por vírgula porque esse tipo
     * de repetição costuma vir separado por vírgulas.
     */
    const segments =
        text
            .split(
                /(?<=[.!?])\s+|,\s+/u
            )
            .map(cleanText)
            .filter(Boolean);


    const cleaned =
        [];


    let lastNormalized =
        '';


    let consecutiveRepeats =
        0;


    for (
        const segment
        of segments
    ) {

        const normalized =
            normalizeForMatching(
                segment
            );


        if (
            normalized &&
            normalized ===
                lastNormalized
        ) {

            consecutiveRepeats +=
                1;


            /*
             * Mantemos no máximo duas ocorrências
             * consecutivas para não apagar repetições
             * legítimas de fala/música.
             */
            if (
                consecutiveRepeats >=
                2
            ) {

                continue;

            }

        }

        else {

            consecutiveRepeats =
                0;

        }


        cleaned.push(
            segment
        );


        lastNormalized =
            normalized;

    }


    let result =
        cleaned.join(
            ', '
        );


    /*
     * Reduz repetições absurdas da mesma palavra.
     * Ex.: "não não não não não não".
     */
    result =
        result.replace(
            /\b([\p{L}\p{N}]+)(?:\s+\1){3,}\b/giu,
            '$1 $1'
        );


    result =
        result
            .replace(/\s+([,.!?;:])/g, '$1')
            .replace(/\.\s*,/g, '.')
            .replace(/,\s*\./g, '.')
            .replace(/([.!?]){2,}/g, '$1');


    return cleanText(
        result
    );

}


function normalizeTag(
    value
) {

    return String(
        value || ''
    )
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');

}


function cleanUp(
    targetPath
) {

    try {

        if (
            targetPath &&
            fs.existsSync(
                targetPath
            )
        ) {

            fs.rmSync(
                targetPath,
                {
                    recursive: true,
                    force: true
                }
            );

        }

    }

    catch (
        err
    ) {

        console.log(
            '⚠️ erro ao limpar SpeechAI:',
            err.message
        );

    }

}


// ==================================================
// TRANSFORMERS.JS
// ==================================================

async function getTransformers() {

    if (
        !transformersPromise
    ) {

        transformersPromise =
            import(
                '@huggingface/transformers'
            );

    }

    return transformersPromise;

}


// ==================================================
// WHISPER
// ==================================================

async function getTranscriber() {

    if (
        !transcriberPromise
    ) {

        transcriberPromise =
            (
                async () => {

                    const {
                        pipeline
                    } =
                        await getTransformers();


                    console.log(
                        '🎙 carregando Whisper local:',
                        WHISPER_MODEL
                    );


                    const pipe =
                        await pipeline(
                            'automatic-speech-recognition',
                            WHISPER_MODEL
                        );


                    console.log(
                        '✅ Whisper local carregado'
                    );


                    return pipe;

                }
            )();

    }

    return transcriberPromise;

}


// ==================================================
// EMBEDDINGS SEMÂNTICOS
// ==================================================

async function getSemanticExtractor() {

    if (
        !semanticExtractorPromise
    ) {

        semanticExtractorPromise =
            (
                async () => {

                    const {
                        pipeline
                    } =
                        await getTransformers();


                    console.log(
                        '🧠 carregando modelo semântico:',
                        SEMANTIC_MODEL
                    );


                    const pipe =
                        await pipeline(
                            'feature-extraction',
                            SEMANTIC_MODEL
                        );


                    console.log(
                        '✅ modelo semântico carregado'
                    );


                    return pipe;

                }
            )();

    }

    return semanticExtractorPromise;

}


// ==================================================
// EXTRAIR ÁUDIO
// ==================================================

function extractAudio(
    videoPath,
    audioPath
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            ffmpeg(
                videoPath
            )
                .noVideo()
                .audioChannels(1)
                .audioFrequency(16000)
                .audioCodec(
                    'pcm_s16le'
                )
                .format(
                    'wav'
                )
                .on(
                    'end',
                    () =>
                        resolve(
                            audioPath
                        )
                )
                .on(
                    'error',
                    err =>
                        reject(err)
                )
                .save(
                    audioPath
                );

        }
    );

}


// ==================================================
// TRANSCRIÇÃO
// ==================================================

async function transcribeAudio(
    audioPath
) {

    const transcriber =
        await getTranscriber();


    /*
     * Node.js não possui AudioContext.
     *
     * Então NÃO passamos caminho de arquivo
     * para read_audio/load_audio.
     *
     * Lemos o WAV manualmente com wavefile
     * e entregamos ao Whisper um Float32Array,
     * que é exatamente o formato esperado
     * pelo pipeline.
     */
    const buffer =
        fs.readFileSync(
            audioPath
        );


    const wav =
        new WaveFile(
            buffer
        );


    /*
     * O FFmpeg já gera:
     *
     * mono
     * 16 kHz
     * PCM
     *
     * Mesmo assim, garantimos aqui o formato
     * esperado pelo Whisper.
     */
    wav.toBitDepth(
        '32f'
    );


    if (
        Number(
            wav?.fmt?.sampleRate
        ) !==
        16000
    ) {

        wav.toSampleRate(
            16000
        );

    }


    let audioData =
        wav.getSamples();


    /*
     * getSamples() pode retornar:
     *
     * Float32Array        → mono
     * Float32Array[]      → múltiplos canais
     */
    if (
        Array.isArray(
            audioData
        )
    ) {

        if (
            audioData.length >
            1
        ) {

            const left =
                audioData[0];

            const right =
                audioData[1];

            const size =
                Math.min(
                    left.length,
                    right.length
                );


            const mono =
                new Float32Array(
                    size
                );


            /*
             * Mistura estéreo → mono.
             *
             * Como o FFmpeg já deveria ter
             * gerado mono, isto é só proteção.
             */
            for (
                let i = 0;
                i < size;
                i += 1
            ) {

                mono[i] =
                    (
                        Number(
                            left[i]
                        ) +
                        Number(
                            right[i]
                        )
                    ) /
                    2;

            }


            audioData =
                mono;

        }

        else {

            audioData =
                audioData[0];

        }

    }


    /*
     * Garantia final:
     * o pipeline ASR recebe Float32Array,
     * nunca um path/URL.
     */
    if (
        !(
            audioData instanceof
            Float32Array
        )
    ) {

        audioData =
            Float32Array.from(
                audioData || []
            );

    }


    if (
        audioData.length ===
        0
    ) {

        throw new Error(
            'Áudio WAV sem amostras.'
        );

    }


    console.log(
        '🎧 áudio preparado para Whisper:',
        {
            samples:
                audioData.length,

            sampleRate:
                16000,

            seconds:
                Number(
                    (
                        audioData.length /
                        16000
                    ).toFixed(
                        2
                    )
                )
        }
    );


    const output =
        await transcriber(
            audioData,
            {
                language:
                    'portuguese',

                task:
                    'transcribe',

                return_timestamps:
                    true,

                chunk_length_s:
                    30,

                stride_length_s:
                    5
            }
        );


    const rawTranscript =
        cleanText(
            output?.text
        );


    const transcript =
        deduplicateTranscript(
            rawTranscript
        );


    if (
        rawTranscript &&
        transcript !==
            rawTranscript
    ) {

        console.log(
            '🧹 transcrição deduplicada:',
            {
                raw:
                    rawTranscript,

                cleaned:
                    transcript
            }
        );

    }


    const chunks =
        Array.isArray(
            output?.chunks
        )
            ? output.chunks
                .map(
                    chunk => ({

                        text:
                            cleanText(
                                chunk?.text
                            ),

                        timestamp:
                            Array.isArray(
                                chunk?.timestamp
                            )
                                ? chunk.timestamp
                                : null

                    })
                )
                .filter(
                    chunk =>
                        chunk.text
                )
            : [];


    return {

        transcript,

        rawTranscript,

        chunks

    };

}

// ==================================================
// TAXONOMIA SEMÂNTICA
//
// Não são palavras-chave.
//
// São "protótipos semânticos":
// frases que representam o significado esperado.
// ==================================================

const CATEGORY_PROTOTYPES = {

    gaming:
        'conteúdo sobre videogames, gameplay, jogos eletrônicos, consoles, partidas online, Minecraft, GTA, Forza, Valorant ou jogos competitivos',

    sports:
        'conteúdo sobre esportes, futebol, jogadores, gols, campeonatos, basquete, vôlei, automobilismo ou competições esportivas',

    meme:
        'conteúdo de humor, meme, piada, situação engraçada, zoeira, comédia, pegadinha ou algo feito para provocar risadas',

    educational:
        'conteúdo educativo, aula, estudo, explicação, tutorial, conhecimento, ensino, escola, faculdade ou aprendizado',

    technology:
        'conteúdo sobre tecnologia, computadores, celulares, inteligência artificial, hardware, software ou inovação tecnológica',

    programming:
        'conteúdo sobre programação, desenvolvimento de software, código, JavaScript, Python, Java, React, banco de dados ou desenvolvimento web',

    automotive:
        'conteúdo sobre carros, automóveis, motores, tuning, veículos, corridas de carros, drift ou indústria automotiva',

    food:
        'conteúdo sobre comida, culinária, receita, restaurante, churrasco, carne, cozinha, refeições ou gastronomia',

    music:
        'conteúdo sobre música, cantor, banda, instrumento musical, canção, show, rock, rap, funk ou performance musical',

    dance:
        'conteúdo sobre dança, coreografia, passinho, dancinha ou pessoas dançando',

    religion:
        'conteúdo sobre religião, Deus, Jesus, fé, oração, igreja, Bíblia, cristianismo ou espiritualidade religiosa',

    mental_health:
        'conteúdo sobre saúde mental, ansiedade, terapia, depressão, bem-estar emocional, autocuidado, meditação ou psicologia',

    nature:
        'conteúdo sobre natureza, paisagem, praia, floresta, montanha, cachoeira, trilha, céu ou ambiente natural',

    fitness:
        'conteúdo sobre academia, exercício físico, musculação, treino, corrida, hipertrofia, fitness ou atividade física',

    travel:
        'conteúdo sobre viagem, turismo, férias, destinos, cidades, países, aeroporto, hotel ou passeio',

    animals:
        'conteúdo sobre animais, cachorro, gato, pet, filhotes, aves ou outros bichos',

    finance:
        'conteúdo sobre dinheiro, finanças, investimentos, bolsa, economia, salário, renda, bancos ou criptomoedas',

    news:
        'conteúdo jornalístico, notícia, reportagem, acontecimento atual, informação pública ou cobertura de fatos',

    politics:
        'conteúdo sobre política, governo, eleições, presidente, congresso, candidatos, partidos ou assuntos políticos',

    relationships:
        'conteúdo sobre relacionamentos, amor, namoro, casamento, término, saudade de alguém, sentir falta, vínculos afetivos ou relações pessoais',

    fashion:
        'conteúdo sobre moda, roupas, maquiagem, beleza, cabelo, estilo, look, skincare ou acessórios',

    lifestyle:
        'conteúdo sobre rotina, vida cotidiana, vlog, dia a dia, hábitos pessoais ou estilo de vida',

    motivation:
        'conteúdo motivacional sobre disciplina, foco, superação, objetivos, produtividade, evolução pessoal ou inspiração',

    entertainment:
        'conteúdo de entretenimento geral, filmes, séries, celebridades, televisão, cinema, cenas virais ou diversão'

};


const MOOD_PROTOTYPES = {

    nostalgic:
        'tom nostálgico, lembranças do passado, saudade, memória afetiva e sensação de sentir falta de algo ou alguém',

    melancholic:
        'tom melancólico, triste, introspectivo, contemplativo, emocional ou de sofrimento silencioso',

    calm:
        'tom calmo, sereno, tranquilo, relaxante, pacífico ou reconfortante',

    joyful:
        'tom alegre, feliz, positivo, divertido, animado ou de celebração',

    energetic:
        'tom energético, empolgante, intenso, acelerado, excitante ou eufórico',

    romantic:
        'tom romântico, apaixonado, carinhoso, íntimo ou relacionado a amor de casal',

    tense:
        'tom tenso, preocupante, dramático, urgente, de suspense ou conflito',

    angry:
        'tom de raiva, indignação, revolta, irritação, agressividade ou frustração',

    fearful:
        'tom de medo, insegurança, ameaça, terror, pânico ou apreensão',

    neutral:
        'tom neutro, informativo, cotidiano e sem emoção dominante evidente'

};


const THEME_PROTOTYPES = {

    nostalgia:
        'saudade, lembranças, memória afetiva, passado, recordar alguém ou sentir falta de uma época',

    longing:
        'sentir falta de alguém, saudade de uma pessoa, desejo de reencontro, querer ver ou falar com alguém novamente',

    memories:
        'lembranças, memórias, recordar momentos, pensar no passado ou reviver experiências marcantes',

    loss:
        'perda, luto, ausência, despedida, alguém que foi embora, morte, separação ou dificuldade de superar uma ausência',

    love:
        'amor, paixão, carinho, afeto, romance, gostar de alguém ou sentimentos amorosos',

    family:
        'família, mãe, pai, filho, filha, irmãos, avós ou relações familiares',

    friendship:
        'amizade, amigos, companheirismo, amizade verdadeira ou vínculo entre amigos',

    spirituality:
        'fé, Deus, Jesus, oração, espiritualidade, religião, esperança religiosa ou experiência espiritual',

    nature:
        'natureza, paisagem, meio ambiente, praia, floresta, montanha ou contemplação natural',

    learning:
        'aprendizado, estudo, educação, aula, ensino, explicação ou aquisição de conhecimento',

    humor:
        'humor, meme, piada, zoeira, algo engraçado ou comédia',

    competition:
        'competição, disputa, vitória, derrota, partida, campeonato, adversários ou performance competitiva',

    gaming:
        'videogame, gameplay, jogos eletrônicos, jogador, console ou partida online',

    food:
        'comida, culinária, receita, restaurante, cozinha ou gastronomia',

    travel:
        'viagem, turismo, férias, destino, passeio ou conhecer lugares',

    technology:
        'tecnologia, inteligência artificial, computadores, celulares, software ou inovação',

    productivity:
        'produtividade, organização, foco, rotina produtiva, trabalho ou gestão do tempo',

    self_improvement:
        'desenvolvimento pessoal, disciplina, melhorar a si mesmo, hábitos, evolução pessoal ou superação',

    daily_life:
        'vida cotidiana, rotina, dia a dia, acontecimentos pessoais ou vlog',

    money:
        'dinheiro, investimento, renda, economia, finanças ou patrimônio',

    politics:
        'política, eleições, governo, candidatos, partidos ou decisões públicas',

    current_events:
        'notícias, acontecimentos atuais, fatos recentes, reportagem ou informação pública',

    health:
        'saúde, corpo, doença, tratamento, exercício, alimentação saudável ou bem-estar',

    loneliness:
        'solidão, sentir-se sozinho, isolamento, falta de companhia ou vazio emocional',

    breakup:
        'término de relacionamento, separação amorosa, ex-parceiro, coração partido ou fim de namoro'
};



// ==================================================
// ÂNCORAS SEMÂNTICAS
//
// Embeddings E5 são ótimos para similaridade, mas
// seus scores absolutos costumam ficar muito próximos.
//
// Estas âncoras NÃO substituem embeddings.
// Elas apenas aumentam separação quando a própria
// fala contém evidência explícita.
// ==================================================

const CATEGORY_ANCHORS = {

    relationships: [
        {
            terms: [
                'sinto sua falta',
                'sinto falta de voce',
                'pensando em voce',
                'queria te ver',
                'queria falar com voce',
                'meu amor',
                'minha namorada',
                'meu namorado',
                'meu ex',
                'minha ex'
            ],
            boost: 0.065
        },
        {
            terms: [
                'saudade'
            ],
            boost: 0.025
        }
    ],

    religion: [
        { terms: ['jesus', 'deus', 'biblia', 'oracao', 'igreja', 'cristo', 'evangelho'], boost: 0.11 }
    ],

    mental_health: [
        { terms: ['ansiedade', 'depressao', 'terapia', 'psicologo', 'psicologia', 'saude mental', 'crise de ansiedade'], boost: 0.11 }
    ],

    gaming: [
        { terms: ['gameplay', 'minecraft', 'gta', 'forza', 'valorant', 'fortnite', 'league of legends', 'videogame'], boost: 0.11 }
    ],

    sports: [
        { terms: ['futebol', 'gol', 'campeonato', 'champions', 'neymar', 'messi', 'mbappe', 'basquete', 'formula 1'], boost: 0.10 }
    ],

    programming: [
        { terms: ['programacao', 'javascript', 'typescript', 'python', 'java', 'react', 'node', 'codigo', 'api', 'banco de dados'], boost: 0.11 }
    ],

    technology: [
        { terms: ['tecnologia', 'inteligencia artificial', 'chatgpt', 'computador', 'hardware', 'software', 'celular'], boost: 0.09 }
    ],

    automotive: [
        { terms: ['carro', 'motor', 'turbo', 'civic', 'camaro', 'ferrari', 'drift', 'automovel'], boost: 0.10 }
    ],

    food: [
        { terms: ['comida', 'receita', 'carne', 'churrasco', 'pizza', 'hamburguer', 'cozinha'], boost: 0.10 }
    ],

    educational: [
        { terms: ['aula', 'aprenda', 'tutorial', 'estudo', 'professor', 'curso', 'explicacao'], boost: 0.09 }
    ],

    politics: [
        { terms: ['politica', 'eleicao', 'presidente', 'governo', 'congresso', 'senado', 'deputado'], boost: 0.10 }
    ],

    finance: [
        { terms: ['investimento', 'dinheiro', 'acoes', 'bitcoin', 'financas', 'salario', 'renda'], boost: 0.10 }
    ]

};


const MOOD_ANCHORS = {

    nostalgic: [
        { terms: ['saudade', 'lembranca', 'lembrancas', 'sinto falta', 'recordo', 'lembro de voce', 'pensando em voce'], boost: 0.14 }
    ],

    melancholic: [
        { terms: ['triste', 'tristeza', 'chorar', 'chorei', 'dor', 'vazio', 'sofrendo'], boost: 0.10 }
    ],

    romantic: [
        { terms: ['eu te amo', 'amor da minha vida', 'apaixonado', 'apaixonada', 'meu amor'], boost: 0.12 }
    ],

    angry: [
        { terms: ['raiva', 'odio', 'revoltado', 'revoltada', 'irritado', 'irritada'], boost: 0.11 }
    ],

    fearful: [
        { terms: ['medo', 'assustado', 'assustada', 'panico', 'ameaca'], boost: 0.11 }
    ],

    joyful: [
        { terms: ['feliz', 'felicidade', 'alegria', 'comemorar', 'celebrar'], boost: 0.10 }
    ],

    calm: [
        { terms: ['calma', 'tranquilo', 'tranquila', 'paz', 'relaxar', 'sereno', 'serena'], boost: 0.08 }
    ]

};


const THEME_ANCHORS = {

    nostalgia: [
        { terms: ['saudade', 'lembranca', 'lembrancas', 'sinto falta', 'recordar', 'passado'], boost: 0.16 }
    ],

    longing: [
        { terms: ['saudade', 'sinto sua falta', 'sinto falta', 'queria te ver', 'queria estar com voce'], boost: 0.16 }
    ],

    memories: [
        { terms: ['lembranca', 'lembrancas', 'lembro', 'recordo', 'memoria', 'passado'], boost: 0.12 }
    ],

    loss: [
        { terms: ['luto', 'morreu', 'faleceu', 'perdi voce', 'perdi alguem', 'foi embora para sempre', 'despedida'], boost: 0.15 }
    ],

    loneliness: [
        { terms: ['sozinho', 'sozinha', 'solidao', 'sem ninguem', 'me sinto sozinho', 'me sinto sozinha'], boost: 0.13 }
    ],

    breakup: [
        { terms: ['terminamos', 'termino', 'acabou nosso relacionamento', 'meu ex', 'minha ex', 'separacao'], boost: 0.14 }
    ],

    love: [
        { terms: ['eu te amo', 'amor', 'apaixonado', 'apaixonada', 'meu amor'], boost: 0.10 }
    ],

    spirituality: [
        { terms: ['jesus', 'deus', 'oracao', 'biblia', 'igreja', 'fe em deus'], boost: 0.13 }
    ],

    gaming: [
        { terms: ['gameplay', 'minecraft', 'gta', 'forza', 'valorant', 'fortnite', 'videogame'], boost: 0.11 }
    ],

    humor: [
        { terms: ['piada', 'meme', 'engracado', 'zoeira', 'pegadinha'], boost: 0.10 }
    ]

};


function applyAnchorBoosts(
    ranking,
    transcript,
    anchorMap
) {

    const normalizedText =
        normalizeForMatching(
            transcript
        );


    return ranking
        .map(
            candidate => {

                const groups =
                    anchorMap[
                        candidate.key
                    ] ||
                    [];


                let anchorBoost =
                    0;


                const matchedAnchors =
                    [];


                for (
                    const group
                    of groups
                ) {

                    const terms =
                        Array.isArray(
                            group?.terms
                        )
                            ? group.terms
                            : [];


                    for (
                        const term
                        of terms
                    ) {

                        const normalizedTerm =
                            normalizeForMatching(
                                term
                            );


                        if (
                            normalizedTerm &&
                            normalizedText.includes(
                                normalizedTerm
                            )
                        ) {

                            anchorBoost +=
                                Number(
                                    group?.boost ||
                                    0
                                );


                            matchedAnchors.push(
                                term
                            );


                            /*
                             * Um grupo representa uma mesma
                             * evidência. Um match já basta.
                             */
                            break;

                        }

                    }

                }


                anchorBoost =
                    Math.min(
                        0.24,
                        anchorBoost
                    );


                return {

                    ...candidate,

                    semanticScore:
                        candidate.score,

                    anchorBoost:
                        Number(
                            anchorBoost
                                .toFixed(4)
                        ),

                    matchedAnchors,

                    score:
                        Number(
                            Math.min(
                                1,
                                candidate.score +
                                anchorBoost
                            ).toFixed(
                                4
                            )
                        )

                };

            }
        )
        .sort(
            (a, b) =>
                b.score -
                a.score
        );

}


// ==================================================
// EMBEDDINGS
// ==================================================

function chunkTranscript(
    transcript
) {

    const text =
        cleanText(
            transcript
        );


    if (!text) {

        return [];

    }


    /*
     * Mantemos os chunks curtos o suficiente
     * para não estourar a janela do encoder.
     */
    const sentences =
        text
            .split(
                /(?<=[.!?])\s+/u
            )
            .map(cleanText)
            .filter(Boolean);


    const chunks = [];

    let current =
        '';


    for (
        const sentence
        of sentences.length
            ? sentences
            : [text]
    ) {

        const candidate =
            current
                ? `${current} ${sentence}`
                : sentence;


        if (
            candidate.length <=
            900
        ) {

            current =
                candidate;

        }

        else {

            if (
                current
            ) {

                chunks.push(
                    current
                );

            }


            current =
                sentence.slice(
                    0,
                    900
                );

        }

    }


    if (
        current
    ) {

        chunks.push(
            current
        );

    }


    return chunks
        .slice(
            0,
            6
        );

}


function tensorToVectors(
    tensor,
    count
) {

    if (
        typeof tensor?.tolist ===
        'function'
    ) {

        const list =
            tensor.tolist();


        if (
            Array.isArray(list)
        ) {

            return list;
        }

    }


    const data =
        Array.from(
            tensor?.data || []
        );


    if (
        count <= 0 ||
        data.length === 0
    ) {

        return [];
    }


    const dimensions =
        Math.floor(
            data.length /
            count
        );


    const vectors =
        [];


    for (
        let i = 0;
        i < count;
        i += 1
    ) {

        vectors.push(
            data.slice(
                i * dimensions,
                (i + 1) *
                dimensions
            )
        );

    }


    return vectors;

}


async function embedTexts(
    texts
) {

    const extractor =
        await getSemanticExtractor();


    const output =
        await extractor(
            texts,
            {
                pooling:
                    'mean',

                normalize:
                    true
            }
        );


    return tensorToVectors(
        output,
        texts.length
    );

}


function cosineFromNormalized(
    a,
    b
) {

    const size =
        Math.min(
            a?.length || 0,
            b?.length || 0
        );


    if (
        size === 0
    ) {

        return 0;

    }


    let dot =
        0;


    for (
        let i = 0;
        i < size;
        i += 1
    ) {

        dot +=
            Number(a[i]) *
            Number(b[i]);

    }


    return dot;

}


async function getPrototypeVectors(
    cacheKey,
    prototypes
) {

    if (
        prototypeCache.has(
            cacheKey
        )
    ) {

        return prototypeCache.get(
            cacheKey
        );

    }


    const entries =
        Object.entries(
            prototypes
        );


    const texts =
        entries.map(
            ([, description]) =>
                `passage: ${description}`
        );


    const vectors =
        await embedTexts(
            texts
        );


    const result =
        entries.map(
            (
                [key, description],
                index
            ) => ({

                key,

                description,

                vector:
                    vectors[index] || []

            })
        );


    prototypeCache.set(
        cacheKey,
        result
    );


    return result;

}


// ==================================================
// CLASSIFICAÇÃO SEMÂNTICA
// ==================================================

function confidenceFromRanking(
    ranking
) {

    if (
        !ranking ||
        ranking.length === 0
    ) {

        return 0;

    }


    const best =
        Number(
            ranking[0]?.score ||
            0
        );


    const second =
        Number(
            ranking[1]?.score ||
            0
        );


    const third =
        Number(
            ranking[2]?.score ||
            second
        );


    /*
     * IMPORTANTE:
     *
     * Em embeddings E5, várias classes podem ter
     * cosine similarity alta ao mesmo tempo.
     *
     * Portanto, "0.86" NÃO significa 86% de confiança.
     * A separação entre candidatos é mais importante.
     */

    const absolute =
        clamp(
            (
                best -
                0.62
            ) /
            0.28
        );


    const marginSecond =
        clamp(
            (
                best -
                second
            ) /
            0.09
        );


    const marginThird =
        clamp(
            (
                best -
                third
            ) /
            0.14
        );


    return clamp(
        (
            absolute *
            0.15
        ) +
        (
            marginSecond *
            0.65
        ) +
        (
            marginThird *
            0.20
        )
    );

}


async function rankSemantic(
    transcript,
    cacheKey,
    prototypes
) {

    const chunks =
        chunkTranscript(
            transcript
        );


    if (
        chunks.length === 0
    ) {

        return [];
    }


    const queryTexts =
        chunks.map(
            chunk =>
                `query: ${chunk}`
        );


    const queryVectors =
        await embedTexts(
            queryTexts
        );


    const prototypeVectors =
        await getPrototypeVectors(
            cacheKey,
            prototypes
        );


    const ranking =
        prototypeVectors
            .map(
                prototype => {

                    const similarities =
                        queryVectors.map(
                            query =>
                                cosineFromNormalized(
                                    query,
                                    prototype.vector
                                )
                        );


                    const best =
                        Math.max(
                            ...similarities
                        );


                    const avg =
                        similarities.reduce(
                            (
                                sum,
                                value
                            ) =>
                                sum +
                                value,
                            0
                        ) /
                        Math.max(
                            1,
                            similarities.length
                        );


                    /*
                     * Um trecho muito claro pode
                     * representar o tema do vídeo,
                     * por isso o máximo pesa mais.
                     */
                    const score =
                        (
                            best *
                            0.65
                        ) +
                        (
                            avg *
                            0.35
                        );


                    return {

                        key:
                            prototype.key,

                        score:
                            Number(
                                score.toFixed(
                                    4
                                )
                            ),

                        maxChunkScore:
                            Number(
                                best.toFixed(
                                    4
                                )
                            ),

                        avgChunkScore:
                            Number(
                                avg.toFixed(
                                    4
                                )
                            )

                    };

                }
            )
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            );


    return ranking;

}


// ==================================================
// RESULTADO SEMÂNTICO
// ==================================================

async function analyzeTranscript(
    transcript
) {

    const text =
        cleanText(
            transcript
        );


    const words =
        text
            .split(/\s+/u)
            .filter(Boolean);


    if (
        words.length <
        3
    ) {

        return {

            category:
                'general',

            confidence:
                0,

            categoryCandidates:
                [],

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

            tags:
                [
                    'speech_detected'
                ]

        };

    }


    const [
        rawCategoryRanking,
        rawMoodRanking,
        rawThemeRanking
    ] =
        await Promise.all([

            rankSemantic(
                text,
                'categories-v1',
                CATEGORY_PROTOTYPES
            ),

            rankSemantic(
                text,
                'moods-v1',
                MOOD_PROTOTYPES
            ),

            rankSemantic(
                text,
                'themes-v2',
                THEME_PROTOTYPES
            )

        ]);


    const categoryRanking =
        applyAnchorBoosts(
            rawCategoryRanking,
            text,
            CATEGORY_ANCHORS
        );


    const moodRanking =
        applyAnchorBoosts(
            rawMoodRanking,
            text,
            MOOD_ANCHORS
        );


    const themeRanking =
        applyAnchorBoosts(
            rawThemeRanking,
            text,
            THEME_ANCHORS
        );


    // --------------------------------------------------
    // CATEGORY
    // --------------------------------------------------

    const categoryConfidence =
        confidenceFromRanking(
            categoryRanking
        );


    const rawCategory =
        categoryRanking[0]?.key ||
        'general';


    const rawCategoryScore =
        Number(
            categoryRanking[0]?.score ||
            0
        );


    /*
     * Evitamos transformar uma semelhança
     * vaga em categoria definitiva.
     */
    const category =
        (
            rawCategoryScore >=
                0.60 &&

            categoryConfidence >=
                0.34
        )
            ? rawCategory
            : 'general';


    // --------------------------------------------------
    // MOOD
    // --------------------------------------------------

    const moodConfidence =
        confidenceFromRanking(
            moodRanking
        );


    const mood =
        (
            Number(
                moodRanking[0]?.score ||
                0
            ) >=
                0.60 &&

            moodConfidence >=
                0.30
        )
            ? moodRanking[0].key
            : 'neutral';


    // --------------------------------------------------
    // THEMES
    // --------------------------------------------------

    const themeConfidence =
        confidenceFromRanking(
            themeRanking
        );


    const bestThemeScore =
        Number(
            themeRanking[0]?.score ||
            0
        );


    const minimumThemeScore =
        Math.max(
            0.62,
            bestThemeScore -
            0.055
        );


    let themes =
        [];


    if (
        themeConfidence >=
        0.30
    ) {

        themes =
            themeRanking
                .filter(
                    candidate =>
                        candidate.score >=
                            minimumThemeScore
                )
                .slice(
                    0,
                    3
                )
                .map(
                    candidate =>
                        candidate.key
                );

    }

    else {

        /*
         * Se os embeddings ficaram empatados,
         * aceitamos apenas temas que tenham uma
         * âncora textual explícita.
         */
        themes =
            themeRanking
                .filter(
                    candidate =>
                        Number(
                            candidate.anchorBoost ||
                            0
                        ) >=
                            0.08
                )
                .slice(
                    0,
                    2
                )
                .map(
                    candidate =>
                        candidate.key
                );

    }


    // --------------------------------------------------
    // TAGS
    // --------------------------------------------------

    const tags =
        [
            'speech_detected',
            'speech_semantic'
        ];


    if (
        category !==
        'general'
    ) {

        tags.push(
            category
        );

    }


    if (
        mood !==
        'neutral' &&
        moodConfidence >=
            0.30
    ) {

        tags.push(
            `mood_${normalizeTag(
                mood
            )}`
        );

    }


    for (
        const theme
        of themes
    ) {

        tags.push(
            `theme_${normalizeTag(
                theme
            )}`
        );

    }


    return {

        category,

        suggestedCategory:
            rawCategory,

        confidence:
            Number(
                categoryConfidence
                    .toFixed(3)
            ),

        categoryCandidates:
            categoryRanking
                .slice(
                    0,
                    5
                ),

        mood,

        moodConfidence:
            Number(
                moodConfidence
                    .toFixed(3)
            ),

        moodCandidates:
            moodRanking
                .slice(
                    0,
                    4
                ),

        themes,

        themeConfidence:
            Number(
                themeConfidence
                    .toFixed(3)
            ),

        themeCandidates:
            themeRanking
                .slice(
                    0,
                    6
                ),

        tags:
            [
                ...new Set(
                    tags
                )
            ]

    };

}


// ==================================================
// FALLBACK
// ==================================================

function fallbackSpeech(
    reason =
        'unavailable'
) {

    return {

        transcript:
            '',

        chunks:
            [],

        hasSpeech:
            false,

        language:
            'pt',

        category:
            'general',

        suggestedCategory:
            'general',

        confidence:
            0,

        categoryCandidates:
            [],

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

        tags:
            [
                reason ===
                    'no_speech'
                    ? 'no_speech_detected'
                    : 'speech_analysis_unavailable'
            ]

    };

}


// ==================================================
// FUNÇÃO PRINCIPAL
// ==================================================

async function analyzeSpeech(
    videoPath
) {

    const tempDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                'mentalcare-speech-'
            )
        );


    const audioPath =
        path.join(
            tempDir,
            'speech.wav'
        );


    try {

        console.log(
            '\n🎙 ========================================'
        );

        console.log(
            '🎙 SPEECH AI V1.3 — CONTEXTUAL SEMANTICS'
        );

        console.log(
            '🎙 ========================================'
        );


        await extractAudio(
            videoPath,
            audioPath
        );


        const {
            transcript,
            rawTranscript,
            chunks
        } =
            await transcribeAudio(
                audioPath
            );


        console.log(
            '📝 transcrição:',
            transcript ||
            '[sem fala reconhecida]'
        );


        if (
            !transcript ||
            transcript
                .split(/\s+/u)
                .filter(Boolean)
                .length <
                3
        ) {

            console.log(
                '🔇 fala insuficiente para análise semântica'
            );

            console.log(
                '🎙 ========================================\n'
            );


            return fallbackSpeech(
                'no_speech'
            );

        }


        const semantic =
            await analyzeTranscript(
                transcript
            );


        const result = {

            transcript,

            rawTranscript,

            chunks,

            hasSpeech:
                true,

            language:
                'pt',

            wordCount:
                transcript
                    .split(/\s+/u)
                    .filter(Boolean)
                    .length,

            ...semantic

        };


        console.log(
            '🏆 categoria da fala:',
            result.category
        );


        console.log(
            '🎯 confiança semântica:',
            result.confidence
        );


        console.log(
            '🥈 candidatos:',
            result.categoryCandidates
        );


        console.log(
            '🎭 mood da fala:',
            {
                mood:
                    result.mood,

                confidence:
                    result.moodConfidence,

                candidates:
                    result.moodCandidates
            }
        );


        console.log(
            '🧩 themes da fala:',
            {
                themes:
                    result.themes,

                confidence:
                    result.themeConfidence,

                candidates:
                    result.themeCandidates
            }
        );


        console.log(
            '🏷 tags da fala:',
            result.tags
        );


        console.log(
            '🎙 ========================================\n'
        );


        return result;

    }

    catch (
        err
    ) {

        console.log(
            '❌ erro Speech AI:',
            err?.message ||
            err
        );


        return fallbackSpeech(
            'error'
        );

    }

    finally {

        cleanUp(
            tempDir
        );

    }

}


module.exports = {
    analyzeSpeech,
    analyzeTranscript
};
