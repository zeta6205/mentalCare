function decideIntervention(score) {

    // ==========================================
    // 🟢 USO NORMAL
    // ==========================================

    if (score < 30) {

        return {
            state: "normal",
            action: "none",

            feedStrategy: {
                counterRatio: 0,
                reduceHighStimulus: false,
                prioritizeLowStimulus: false,
                diversifyCategories: false
            }
        };
    }

    // ==========================================
    // 🟡 ATENÇÃO
    // ==========================================

    if (score < 70) {

        return {
            state: "attention",
            action: "soft_warning",

            feedStrategy: {
                counterRatio: 4,
                reduceHighStimulus: true,
                prioritizeLowStimulus: true,
                diversifyCategories: true
            }
        };
    }

    // ==========================================
    // 🔴 USO INTENSO
    // ==========================================

    return {
        state: "intense_use",
        action: "strong_intervention",

        feedStrategy: {
            counterRatio: 2,
            reduceHighStimulus: true,
            prioritizeLowStimulus: true,
            diversifyCategories: true
        }
    };
}

module.exports = decideIntervention;