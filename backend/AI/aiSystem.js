const calculateScore = require('./compulsionScore');
const decide = require('./decisionEngine');
const intervene = require('./interventionEngine');

function runAI(data) {

    const score = calculateScore(data);

    const decision = decide(score);

    const intervention = intervene(decision);

    return {
        score,
        state: decision.state,
        intervention
    };
}

module.exports = runAI;