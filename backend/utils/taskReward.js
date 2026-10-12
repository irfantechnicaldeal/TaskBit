const REWARD_UNITS_PER_TASK = 1;
const COINS_PER_REWARD_UNIT = 0.5;
const RUPEES_PER_COIN = 0.1; // Existing redemption rate: 100 coins = ₹10 (10 coins = ₹1).
const COIN_REWARD_INCREMENT = 0.1; // Task coin rewards are configurable in 0.1 steps.
const DEFAULT_TASK_COIN_REWARD = REWARD_UNITS_PER_TASK * COINS_PER_REWARD_UNIT; // 0.5 coins per task
const MAX_TASK_COIN_REWARD = 1000;

// Withdrawal minimum ladder: a user's first withdrawal must be at least
// MIN_WITHDRAWAL_COINS coins, and the minimum grows by WITHDRAWAL_MIN_STEP_COINS
// for every APPROVED withdrawal, capped at MAX_WITHDRAWAL_MINIMUM_COINS.
// Rejected and pending withdrawals never count toward the ladder.
const MIN_WITHDRAWAL_COINS = 100;
const WITHDRAWAL_MIN_STEP_COINS = 50;
const MAX_WITHDRAWAL_MINIMUM_COINS = 500;

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

function coinsFromRupees(rupees) {
    return Number((rupees / RUPEES_PER_COIN).toFixed(2));
}

// A valid coin reward is a non-negative amount up to the cap, given in 0.1
// increments (0.2, 0.3, 0.7, 1.2, ...). All credited amounts stay on a
// 2-decimal grid, so points, balances, and the completion ledger never drift.
function isValidCoinReward(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_TASK_COIN_REWARD) {
        return false;
    }
    const tenths = value * 10;
    return Math.abs(tenths - Math.round(tenths)) < 1e-9;
}

function normalizeCoinReward(value) {
    if (!isValidCoinReward(value)) {
        throw new Error(`Coin reward must be between 0 and ${MAX_TASK_COIN_REWARD} coins in ${COIN_REWARD_INCREMENT} increments`);
    }
    return Number(value.toFixed(2));
}

// Read the reward configured on a task document, falling back to the legacy
// 0.5-coin default for tasks created before per-task rewards existed.
function resolveTaskCoinReward(task) {
    const stored = task && typeof task.coinReward === 'number' ? task.coinReward : undefined;
    return isValidCoinReward(stored) ? Number(stored.toFixed(2)) : DEFAULT_TASK_COIN_REWARD;
}

// Reward units keep their meaning for every record: 1 unit = 0.5 coin.
// Pre-0.1-granularity completions stored integer units (1 unit = 0.5 coin);
// newer completions with 0.1-step rewards store the same exact ratio as a
// decimal number (e.g. 0.2 units = 0.1 coin), so historical records are
// untouched and no migration is needed.
function rewardUnitsFromCoins(coins) {
    return Number((coins / COINS_PER_REWARD_UNIT).toFixed(2));
}

// Minimum coins required for a user's next withdrawal, given how many of
// their withdrawals have been approved. Rejected/pending are not counted.
function requiredWithdrawalMinimumCoins(approvedCount) {
    const approved = Number.isFinite(approvedCount) && approvedCount > 0 ? Math.floor(approvedCount) : 0;
    const required = MIN_WITHDRAWAL_COINS + WITHDRAWAL_MIN_STEP_COINS * approved;
    return Math.min(required, MAX_WITHDRAWAL_MINIMUM_COINS);
}

// Payment summary for a withdrawal request, computed from the backend's real
// conversion rate (RUPEES_PER_COIN). The frontend displays these values and
// never hardcodes its own rate.
function withdrawalPaymentMeta(amount) {
    const rupeeAmount = Number((Number(amount) || 0).toFixed(2));
    const coinsRequested = coinsFromRupees(rupeeAmount);
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
    COIN_REWARD_INCREMENT,
    DEFAULT_TASK_COIN_REWARD,
    MAX_TASK_COIN_REWARD,
    MIN_WITHDRAWAL_COINS,
    WITHDRAWAL_MIN_STEP_COINS,
    MAX_WITHDRAWAL_MINIMUM_COINS,
    coinsFromRewardUnits,
    rupeesFromRewardUnits,
    coinsToRupees,
    coinsFromRupees,
    isValidCoinReward,
    normalizeCoinReward,
    resolveTaskCoinReward,
    rewardUnitsFromCoins,
    requiredWithdrawalMinimumCoins,
    withdrawalPaymentMeta
};
