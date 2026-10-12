package com.example.taskbit

import com.example.taskbit.api.MyWithdrawal
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Maps the user's own withdrawal records into redemption-history rows.
 *
 * The server is the single source of truth: the list comes from
 * GET /withdrawals/mine (this user only). Coin amounts are derived from the
 * recorded rupee amount using the backend's conversion rate
 * (RUPEES_PER_COIN = 0.1, i.e. 10 coins = Rs.1), never hardcoded per row.
 */
object RedeemHistoryMapper {

    private const val RUPEES_PER_COIN = 0.1

    fun coinsFromRupees(rupees: Double): Double = rupees / RUPEES_PER_COIN

    fun toRedeemItem(withdrawal: MyWithdrawal): RedeemHistoryAdapter.RedeemItem {
        val coins = coinsFromRupees(withdrawal.amount)
        return RedeemHistoryAdapter.RedeemItem(
            amount = "${CoinFormatter.format(coins)} Coins (₹${CoinFormatter.format(withdrawal.amount)})",
            date = formatServerDate(withdrawal.createdAt),
            status = withdrawal.status.replaceFirstChar { it.uppercase() }
        )
    }

    private fun formatServerDate(raw: String?): String {
        if (raw.isNullOrBlank()) return "Just now"
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            parser.timeZone = TimeZone.getTimeZone("UTC")
            val parsed = parser.parse(raw.take(24))
            if (parsed != null) {
                SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.US).format(parsed)
            } else {
                raw.substringBefore('T')
            }
        } catch (_: Exception) {
            raw.substringBefore('T')
        }
    }
}
