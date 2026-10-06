const REWARD_UNITS_PER_TASK = 1;
const COINS_PER_REWARD_UNIT = 0.5;
const RUPEES_PER_COIN = 0.1; // Existing redemption rate: 100 coins = ₹10.

function coinsFromRewardUnits(units) {
    if (!Number.isSafeInteger(units) || units < 0) {
        throw new TypeError('Reward units must be a non-negative safe integer');
    }
    return units * COINS_PER_REWARD_UNIT;
}

function rupeesFromRewardUnits(units) {
    return Number((coinsFromRewardUnits(units) * RUPEES_PER_COIN).toFixed(2));
}

module.exports = { REWARD_UNITS_PER_TASK, coinsFromRewardUnits, rupeesFromRewardUnits };
