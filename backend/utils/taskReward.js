const REWARD_UNITS_PER_TASK = 1;
const COINS_PER_REWARD_UNIT = 0.5;
const RUPEES_PER_COIN = 0.1; // Existing redemption rate: 100 coins = ₹10.
const DEFAULT_TASK_COIN_REWARD = REWARD_UNITS_PER_TASK * COINS_PER_REWARD_UNIT; // 0.5 coins per task
const MAX_TASK_COIN_REWARD = 1000;

function coinsFromRewardUnits(units) {
    if (!Number.isSafeInteger(units) || units < 0) {
        throw new TypeError('Reward units must be a non-negative safe integer');
    }
    return units * COINS_PER_REWARD_UNIT;
}

function rupeesFromRewardUnits(units) {
    return Number((coinsFromRewardUnits(units) * RUPEES_PER_COIN).toFixed(2));
}

function coinsToRupees(coins) {
    return Number((coins * RUPEES_PER_COIN).toFixed(2));
}

// A valid coin reward is a non-negative amount up to the cap, given in
// half-coin increments. Keeping rewards in 0.5 increments means every reward
// stays an exact number of reward units (1 unit = 0.5 coin), so points,
// balances, and the completion ledger never drift with floating point math.
function isValidCoinReward(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_TASK_COIN_REWARD) {
        return false;
    }
    const doubled = value * 2;
    return Math.abs(doubled - Math.round(doubled)) < 1e-9;
}

function normalizeCoinReward(value) {
    if (!isValidCoinReward(value)) {
        throw new Error(`Coin reward must be between 0 and ${MAX_TASK_COIN_REWARD} coins in 0.5 increments`);
    }
    return Number(value.toFixed(2));
}

// Read the reward configured on a task document, falling back to the legacy
// 0.5-coin default for tasks created before per-task rewards existed.
function resolveTaskCoinReward(task) {
    const stored = task && typeof task.coinReward === 'number' ? task.coinReward : undefined;
    return isValidCoinReward(stored) ? Number(stored.toFixed(2)) : DEFAULT_TASK_COIN_REWARD;
}

function rewardUnitsFromCoins(coins) {
    return Math.round(coins * 2); // 2 units per coin keeps units an exact integer
}

// Payment summary for a withdrawal request, computed from the backend's real
// conversion rate (RUPEES_PER_COIN). The frontend displays these values and
// never hardcodes its own rate.
function withdrawalPaymentMeta(amount) {
    const rupeeAmount = Number((Number(amount) || 0).toFixed(2));
    const coinsRequested = Number((rupeeAmount / RUPEES_PER_COIN).toFixed(2));
    return {
        rupeeAmount,
        coinsRequested,
        coinsPerRupee: Number((1 / RUPEES_PER_COIN).toFixed(2)),
        ratePerCoin: RUPEES_PER_COIN
    };
}

module.exports = {
    REWARD_UNITS_PER_TASK,
    COINS_PER_REWARD_UNIT,
    RUPEES_PER_COIN,
    DEFAULT_TASK_COIN_REWARD,
    MAX_TASK_COIN_REWARD,
    coinsFromRewardUnits,
    rupeesFromRewardUnits,
    coinsToRupees,
    isValidCoinReward,
    normalizeCoinReward,
    resolveTaskCoinReward,
    rewardUnitsFromCoins,
    withdrawalPaymentMeta
};
