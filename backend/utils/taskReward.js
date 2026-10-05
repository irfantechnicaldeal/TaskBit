const REWARD_UNITS_PER_TASK = 1;
const COINS_PER_REWARD_UNIT = 0.5;

function coinsFromRewardUnits(units) {
    if (!Number.isSafeInteger(units) || units < 0) {
        throw new TypeError('Reward units must be a non-negative safe integer');
    }
    return units * COINS_PER_REWARD_UNIT;
}

module.exports = { REWARD_UNITS_PER_TASK, coinsFromRewardUnits };
