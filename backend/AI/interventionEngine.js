function generateIntervention(decision) {

    if (!decision || decision.action === "none") {
        return null;
    }

    if (decision.action === "soft_warning") {

        return "Você já está há um tempo consumindo conteúdo. Que tal uma pausa?";
    }

    if (decision.action === "strong_intervention") {

        return "Você pode estar em uso excessivo. Vamos desacelerar?";
    }

    return null;
}

module.exports = generateIntervention;