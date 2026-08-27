function classifyContent(video) {

    // ==================================================
    // 1. NORMALIZAÇÃO
    // ==================================================

    const normalizeText = (value) => {

        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();

    };


    const description =
        normalizeText(
            video?.description
        );


    let duration =
        Number(
            video?.duration || 0
        );


    /*
     * Alguns vídeos antigos podem estar
     * com duração em milissegundos.
     */
    if (
        Number.isFinite(duration) &&
        duration > 1000
    ) {

        duration =
            duration / 1000;

    }


    if (
        !Number.isFinite(duration) ||
        duration < 0
    ) {

        duration = 0;

    }


    // ==================================================
    // 2. TAXONOMIA
    //
    // Cada categoria possui gatilhos com pesos.
    //
    // strong = evidência muito forte
    // medium = evidência média
    // weak   = contexto fraco
    // ==================================================

    const taxonomy = {


        // ==================================================
        // 🎮 GAMING
        // ==================================================

        gaming: {

            strong: [
                "gameplay",
                "minecraft",
                "fortnite",
                "valorant",
                "roblox",
                "free fire",
                "league of legends",
                "lol",
                "counter strike",
                "cs2",
                "gta",
                "gta v",
                "gta vi",
                "forza",
                "forza horizon",
                "call of duty",
                "cod",
                "elden ring",
                "dark souls",
                "the sims",
                "xbox",
                "playstation"
            ],

            medium: [
                "gaming",
                "videogame",
                "video game",
                "jogando",
                "jogador",
                "ranked",
                "partida online",
                "boss",
                "speedrun",
                "stream",
                "console",
                "steam"
            ],

            weak: [
                "game",
                "jogo"
            ],

            tags: [
                "gaming",
                "gameplay"
            ]

        },


        // ==================================================
        // ⚽ ESPORTES
        // ==================================================

        sports: {

            strong: [
                "futebol",
                "football",
                "soccer",
                "gol",
                "gols",
                "mbappe",
                "neymar",
                "messi",
                "cristiano ronaldo",
                "ronaldo",
                "champions league",
                "libertadores",
                "brasileirao",
                "copa do mundo",
                "formula 1",
                "f1",
                "nba",
                "ufc"
            ],

            medium: [
                "partida",
                "campeonato",
                "time",
                "torcida",
                "estadio",
                "jogador",
                "atleta",
                "treino",
                "corrida",
                "basquete",
                "volei",
                "tenis",
                "luta"
            ],

            weak: [
                "jogo",
                "final",
                "golaco"
            ],

            tags: [
                "sports"
            ]

        },


        // ==================================================
        // 😂 MEMES / HUMOR
        // ==================================================

        meme: {

            strong: [
                "meme",
                "kkkk",
                "kkkkk",
                "kkkkkk",
                "kkk",
                "lol",
                "piada",
                "pegadinha"
            ],

            medium: [
                "engracado",
                "comedia",
                "humor",
                "zoeira",
                "zueira",
                "rir",
                "risada",
                "troll",
                "trolagem"
            ],

            weak: [
                "viral",
                "doidera",
                "doido"
            ],

            tags: [
                "funny",
                "humor",
                "viral"
            ]

        },


        // ==================================================
        // 📚 EDUCAÇÃO
        // ==================================================

        educational: {

            strong: [
                "tutorial",
                "aula",
                "aprenda",
                "explicacao",
                "explicando",
                "estudo",
                "estudando",
                "professor",
                "curso"
            ],

            medium: [
                "escola",
                "faculdade",
                "universidade",
                "conhecimento",
                "ensino",
                "exercicio",
                "materia",
                "prova",
                "vestibular",
                "enem",
                "dica de estudo"
            ],

            weak: [
                "dica",
                "aprender"
            ],

            tags: [
                "learning",
                "study",
                "education"
            ]

        },


        // ==================================================
        // 💻 TECNOLOGIA
        // ==================================================

        technology: {

            strong: [
                "tecnologia",
                "inteligencia artificial",
                "chatgpt",
                "openai",
                "computador",
                "hardware",
                "software",
                "processador",
                "placa de video",
                "gpu",
                "cpu"
            ],

            medium: [
                "notebook",
                "pc",
                "celular",
                "smartphone",
                "android",
                "iphone",
                "windows",
                "linux",
                "mac",
                "apple",
                "samsung"
            ],

            weak: [
                "tech",
                "sistema"
            ],

            tags: [
                "technology",
                "tech"
            ]

        },


        // ==================================================
        // 👨‍💻 PROGRAMAÇÃO
        // ==================================================

        programming: {

            strong: [
                "programacao",
                "codigo",
                "javascript",
                "typescript",
                "python",
                "java",
                "react",
                "react native",
                "node",
                "nodejs",
                "html",
                "css",
                "sql",
                "mongodb",
                "api"
            ],

            medium: [
                "developer",
                "desenvolvedor",
                "dev",
                "backend",
                "frontend",
                "fullstack",
                "full stack",
                "banco de dados",
                "debug",
                "bug"
            ],

            weak: [
                "codar",
                "programar"
            ],

            tags: [
                "programming",
                "coding",
                "technology"
            ]

        },


        // ==================================================
        // 🚗 AUTOMOTIVO
        // ==================================================

        automotive: {

            strong: [
                "carro",
                "carros",
                "automovel",
                "civic",
                "civic type r",
                "camaro",
                "mustang",
                "ferrari",
                "lamborghini",
                "porsche",
                "bmw",
                "mercedes",
                "audi",
                "toyota",
                "honda",
                "mitsubishi"
            ],

            medium: [
                "motor",
                "turbo",
                "potencia",
                "cavalos",
                "hp",
                "drift",
                "racha",
                "pista",
                "corrida",
                "tuning",
                "tunagem"
            ],

            weak: [
                "veiculo",
                "velocidade"
            ],

            tags: [
                "cars",
                "automotive"
            ]

        },


        // ==================================================
        // 🍔 COMIDA
        // ==================================================

        food: {

            strong: [
                "comida",
                "receita",
                "cozinha",
                "churrasco",
                "pizza",
                "hamburguer",
                "sushi",
                "carne",
                "bolo"
            ],

            medium: [
                "restaurante",
                "almoco",
                "jantar",
                "lanche",
                "cozinhar",
                "chef",
                "tempero",
                "sobremesa",
                "doce"
            ],

            weak: [
                "comer",
                "gostoso",
                "delicioso"
            ],

            tags: [
                "food"
            ]

        },


        // ==================================================
        // 🎵 MÚSICA
        // ==================================================

        music: {

            strong: [
                "musica",
                "rock",
                "metal",
                "rap",
                "trap",
                "funk",
                "sertanejo",
                "pagode",
                "gospel",
                "show",
                "concerto"
            ],

            medium: [
                "cantor",
                "cantora",
                "banda",
                "guitarra",
                "bateria",
                "baixo",
                "piano",
                "violao",
                "musical"
            ],

            weak: [
                "som",
                "audio"
            ],

            tags: [
                "music"
            ]

        },


        // ==================================================
        // 💃 DANÇA
        // ==================================================

        dance: {

            strong: [
                "danca",
                "dancinha",
                "dance",
                "coreografia"
            ],

            medium: [
                "dancando",
                "passinho",
                "coreografia viral"
            ],

            weak: [
                "trend"
            ],

            tags: [
                "dance",
                "entertainment"
            ]

        },


        // ==================================================
        // 🙏 RELIGIÃO / ESPIRITUALIDADE
        // ==================================================

        religion: {

            strong: [
                "jesus",
                "cristo",
                "deus",
                "biblia",
                "evangelho",
                "oracao"
            ],

            medium: [
                "igreja",
                "pastor",
                "padre",
                "fe",
                "gospel",
                "cristao",
                "cristianismo",
                "espiritualidade"
            ],

            weak: [
                "milagre",
                "abencoado"
            ],

            tags: [
                "religion",
                "spirituality"
            ]

        },


        // ==================================================
        // 🧠 SAÚDE MENTAL / BEM-ESTAR
        // ==================================================

        mental_health: {

            strong: [
                "saude mental",
                "ansiedade",
                "depressao",
                "terapia",
                "psicologia",
                "meditacao",
                "mindfulness"
            ],

            medium: [
                "relaxar",
                "relaxamento",
                "calma",
                "tranquilo",
                "respiracao",
                "bem estar",
                "autocuidado"
            ],

            weak: [
                "relax",
                "paz"
            ],

            tags: [
                "mental_health",
                "wellbeing",
                "calm"
            ]

        },


        // ==================================================
        // 🌿 NATUREZA
        // ==================================================

        nature: {

            strong: [
                "natureza",
                "paisagem",
                "floresta",
                "montanha",
                "cachoeira",
                "praia",
                "mar",
                "trilha"
            ],

            medium: [
                "ceu",
                "por do sol",
                "nascer do sol",
                "rio",
                "campo",
                "ar livre"
            ],

            weak: [
                "natural"
            ],

            tags: [
                "nature",
                "relax"
            ]

        },


        // ==================================================
        // 🏋 FITNESS
        // ==================================================

        fitness: {

            strong: [
                "academia",
                "musculacao",
                "workout",
                "treino",
                "fitness",
                "crossfit"
            ],

            medium: [
                "exercicio",
                "corrida",
                "cardio",
                "supino",
                "agachamento",
                "hipertrofia",
                "dieta"
            ],

            weak: [
                "shape",
                "corpo"
            ],

            tags: [
                "fitness",
                "health"
            ]

        },


        // ==================================================
        // ✈️ VIAGEM
        // ==================================================

        travel: {

            strong: [
                "viagem",
                "viajando",
                "turismo",
                "turista",
                "ferias",
                "hotel",
                "aeroporto"
            ],

            medium: [
                "destino",
                "cidade",
                "pais",
                "passeio",
                "trip",
                "road trip"
            ],

            weak: [
                "viajar"
            ],

            tags: [
                "travel"
            ]

        },


        // ==================================================
        // 🐶 ANIMAIS
        // ==================================================

        animals: {

            strong: [
                "cachorro",
                "cachorros",
                "gato",
                "gatos",
                "dog",
                "cat",
                "pet"
            ],

            medium: [
                "animal",
                "animais",
                "filhote",
                "veterinario",
                "passaro",
                "coelho"
            ],

            weak: [
                "fofinho",
                "fofo"
            ],

            tags: [
                "animals",
                "pets"
            ]

        },


        // ==================================================
        // 💰 FINANÇAS
        // ==================================================

        finance: {

            strong: [
                "investimento",
                "investimentos",
                "acoes",
                "bolsa de valores",
                "bitcoin",
                "criptomoeda",
                "financas"
            ],

            medium: [
                "dinheiro",
                "renda",
                "salario",
                "economia",
                "poupanca",
                "dividendo",
                "banco"
            ],

            weak: [
                "rico",
                "milionario"
            ],

            tags: [
                "finance",
                "money"
            ]

        },


        // ==================================================
        // 📰 NOTÍCIAS
        // ==================================================

        news: {

            strong: [
                "noticia",
                "noticias",
                "urgente",
                "breaking news",
                "reportagem"
            ],

            medium: [
                "jornal",
                "aconteceu",
                "agora",
                "informacao",
                "entrevista"
            ],

            weak: [
                "novidade"
            ],

            tags: [
                "news"
            ]

        },


        // ==================================================
        // 🏛 POLÍTICA
        // ==================================================

        politics: {

            strong: [
                "politica",
                "presidente",
                "governo",
                "eleicao",
                "eleicoes",
                "congresso",
                "senado",
                "deputado"
            ],

            medium: [
                "prefeito",
                "governador",
                "ministro",
                "partido",
                "candidato",
                "votacao"
            ],

            weak: [
                "voto"
            ],

            tags: [
                "politics",
                "news"
            ]

        },


        // ==================================================
        // ❤️ RELACIONAMENTOS
        // ==================================================

        relationships: {

            strong: [
                "namoro",
                "namorada",
                "namorado",
                "casamento",
                "relacionamento",
                "termino"
            ],

            medium: [
                "amor",
                "casal",
                "date",
                "paquera",
                "crush",
                "amizade"
            ],

            weak: [
                "romance"
            ],

            tags: [
                "relationships"
            ]

        },


        // ==================================================
        // 👗 MODA / BELEZA
        // ==================================================

        fashion: {

            strong: [
                "moda",
                "fashion",
                "maquiagem",
                "makeup",
                "look",
                "outfit"
            ],

            medium: [
                "roupa",
                "tenis",
                "sapato",
                "cabelo",
                "beleza",
                "skincare"
            ],

            weak: [
                "estilo"
            ],

            tags: [
                "fashion",
                "style"
            ]

        },


        // ==================================================
        // 📹 LIFESTYLE
        // ==================================================

        lifestyle: {

            strong: [
                "rotina",
                "vlog",
                "dia a dia",
                "lifestyle",
                "minha rotina"
            ],

            medium: [
                "meu dia",
                "morning routine",
                "night routine",
                "organizando",
                "arrumando"
            ],

            weak: [
                "hoje"
            ],

            tags: [
                "daily",
                "routine",
                "lifestyle"
            ]

        },


        // ==================================================
        // 🚀 MOTIVAÇÃO
        // ==================================================

        motivation: {

            strong: [
                "motivacao",
                "motivacional",
                "disciplina",
                "nao desista",
                "voce consegue"
            ],

            medium: [
                "foco",
                "objetivo",
                "sucesso",
                "evolucao",
                "produtividade"
            ],

            weak: [
                "inspiracao"
            ],

            tags: [
                "motivation",
                "self_improvement"
            ]

        },


        // ==================================================
        // 🎬 ENTRETENIMENTO
        // ==================================================

        entertainment: {

            strong: [
                "filme",
                "serie",
                "cinema",
                "trailer"
            ],

            medium: [
                "ator",
                "atriz",
                "tv",
                "celebridade",
                "famoso"
            ],

            weak: [
                "viral",
                "trend"
            ],

            tags: [
                "entertainment"
            ]

        }

    };


    // ==================================================
    // 3. PESOS
    // ==================================================

    const WEIGHTS = {

        strong: 5,
        medium: 3,
        weak: 1

    };


    // ==================================================
    // 4. SCORE DAS CATEGORIAS
    // ==================================================

    const scores = {};

    const evidence = {};


    for (
        const [
            categoryName,
            config
        ] of Object.entries(taxonomy)
    ) {

        let score = 0;

        const matched = [];


        for (
            const level of [
                "strong",
                "medium",
                "weak"
            ]
        ) {

            const keywords =
                config[level] || [];


            for (
                const keyword of keywords
            ) {

                const normalizedKeyword =
                    normalizeText(keyword);


                if (
                    description.includes(
                        normalizedKeyword
                    )
                ) {

                    score +=
                        WEIGHTS[level];


                    matched.push({

                        keyword:
                            normalizedKeyword,

                        strength:
                            level,

                        weight:
                            WEIGHTS[level]

                    });

                }

            }

        }


        scores[categoryName] =
            score;


        if (
            matched.length > 0
        ) {

            evidence[categoryName] =
                matched;

        }

    }


    // ==================================================
    // 5. ORDENAR RESULTADOS
    // ==================================================

    const ranking =
        Object.entries(scores)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    const [
        bestCategory,
        bestScore
    ] =
        ranking[0] || [
            "general",
            0
        ];


    const second =
        ranking[1] || [
            null,
            0
        ];


    const secondCategory =
        second[0];


    const secondScore =
        second[1];


    // ==================================================
    // 6. DECIDIR CATEGORIA
    // ==================================================

    let category =
        "general";


    let confidence =
        0.20;


    /*
     * Exigimos pelo menos 3 pontos.
     *
     * Assim uma palavra extremamente genérica,
     * como "jogo", não classifica sozinha.
     */
    if (
        bestScore >= 3
    ) {

        category =
            bestCategory;

    }


    // ==================================================
    // 7. CONFIANÇA
    // ==================================================

    if (
        category !== "general"
    ) {

        /*
         * Score absoluto
         */
        const scoreConfidence =
            Math.min(
                bestScore / 10,
                1
            );


        /*
         * Distância para a segunda categoria.
         *
         * Quanto maior a vantagem,
         * maior a confiança.
         */
        const difference =
            Math.max(
                0,
                bestScore -
                secondScore
            );


        const marginConfidence =
            Math.min(
                difference / 5,
                1
            );


        confidence =
            (
                scoreConfidence * 0.65
            ) +
            (
                marginConfidence * 0.35
            );


        confidence =
            Math.max(
                0.35,
                confidence
            );

    }


    // ==================================================
    // 8. CATEGORIAS SECUNDÁRIAS
    // ==================================================

    const secondaryCategories =
        ranking
            .filter(
                ([name, score]) =>

                    name !== category &&

                    score >= 3 &&

                    score >=
                        bestScore * 0.45
            )
            .slice(
                0,
                3
            )
            .map(
                ([name]) =>
                    name
            );


    // ==================================================
    // 9. TAGS DA CATEGORIA
    // ==================================================

    let tags = [];


    if (
        category !== "general"
    ) {

        tags.push(
            ...(
                taxonomy[category]
                    ?.tags ||
                []
            )
        );

    }


    /*
     * Tags das categorias secundárias.
     */
    for (
        const secondaryCategory
        of secondaryCategories
    ) {

        const secondaryTags =
            taxonomy[
                secondaryCategory
            ]?.tags || [];


        tags.push(
            ...secondaryTags
        );

    }


    // ==================================================
    // 10. TAGS ESPECÍFICAS DAS PALAVRAS
    // ==================================================

    const semanticTags = {


        // Gaming

        "minecraft":
            "minecraft",

        "forza":
            "racing_game",

        "forza horizon":
            "racing_game",

        "gta":
            "gta",

        "league of legends":
            "moba",

        "lol":
            "moba",

        "valorant":
            "fps",

        "counter strike":
            "fps",

        "cs2":
            "fps",

        "fortnite":
            "battle_royale",


        // Esportes

        "futebol":
            "football",

        "football":
            "football",

        "soccer":
            "football",

        "mbappe":
            "football",

        "neymar":
            "football",

        "messi":
            "football",

        "formula 1":
            "motorsport",

        "f1":
            "motorsport",

        "nba":
            "basketball",

        "ufc":
            "combat_sports",


        // Veículos

        "civic":
            "honda",

        "camaro":
            "chevrolet",

        "ferrari":
            "supercar",

        "lamborghini":
            "supercar",

        "drift":
            "drift",


        // Tecnologia

        "chatgpt":
            "ai",

        "openai":
            "ai",

        "inteligencia artificial":
            "ai",

        "react native":
            "mobile_development",

        "javascript":
            "javascript",

        "typescript":
            "typescript",

        "python":
            "python",

        "mongodb":
            "database",


        // Humor

        "meme":
            "meme",

        "kkkk":
            "humor",

        "kkkkk":
            "humor",

        "kkkkkk":
            "humor",

        "piada":
            "humor"

    };


    for (
        const [
            keyword,
            tag
        ] of Object.entries(
            semanticTags
        )
    ) {

        if (
            description.includes(
                normalizeText(
                    keyword
                )
            )
        ) {

            tags.push(
                tag
            );

        }

    }


    // ==================================================
    // 11. DURAÇÃO
    // ==================================================

    if (
        duration > 0
    ) {

        if (
            duration <= 15
        ) {

            tags.push(
                "short_video"
            );

        }

        else if (
            duration <= 60
        ) {

            tags.push(
                "medium_video"
            );

        }

        else {

            tags.push(
                "long_video"
            );

        }

    }


    // ==================================================
    // 12. FALLBACK
    // ==================================================

    if (
        category === "general"
    ) {

        tags.push(
            "general"
        );


        confidence =
            description
                ? 0.25
                : 0.15;

    }


    // ==================================================
    // 13. GARANTIR VALORES VÁLIDOS
    // ==================================================

    confidence =
        Math.max(
            0,
            Math.min(
                1,
                confidence
            )
        );


    tags =
        [
            ...new Set(tags)
        ];


    // ==================================================
    // 14. LOG
    // ==================================================

    console.log(
        "📝 CONTENT CLASSIFIER V2:",
        {

            description:
                description.slice(
                    0,
                    100
                ),

            category,

            secondaryCategories,

            confidence:
                Number(
                    confidence
                        .toFixed(3)
                ),

            bestScore,

            secondCategory,

            secondScore,

            tags,

            scores:
                Object.fromEntries(
                    ranking
                        .filter(
                            ([, score]) =>
                                score > 0
                        )
                )

        }
    );


    // ==================================================
    // 15. RESULTADO
    // ==================================================

    return {

        /*
         * Mantemos estes três campos
         * para compatibilidade com o
         * restante do MentalCare.
         */
        category,

        tags,

        confidence,


        /*
         * Campos extras.
         *
         * O fusionClassifier pode ignorá-los
         * por enquanto.
         */
        secondaryCategories,

        scores,

        evidence,

        normalizedDescription:
            description

    };

}


module.exports =
    classifyContent;