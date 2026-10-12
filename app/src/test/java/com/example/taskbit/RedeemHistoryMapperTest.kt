package com.example.taskbit

import com.example.taskbit.api.MyWithdrawal
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RedeemHistoryMapperTest {

    @Test
    fun coinsAreDerivedFromRecordedRupeesUsingBackendRate() {
        val item = RedeemHistoryMapper.toRedeemItem(
            MyWithdrawal(
                id = "w1",
                amount = 10.0,
                method = "UPI",
                status = "approved",
                createdAt = "2026-10-13T01:21:38.123Z",
                archived = false
            )
        )
        // 10 coins = Rs.1 (backend rate), so Rs.10 must map to 100 coins.
        assertTrue(item.amount.startsWith("100 Coins"))
        assertTrue(item.amount.contains("₹10"))
        assertEquals("Approved", item.status)
    }

    @Test
    fun coinsFromRupeesUsesTenCoinsPerRupee() {
        assertEquals(100.0, RedeemHistoryMapper.coinsFromRupees(10.0), 0.001)
        assertEquals(150.0, RedeemHistoryMapper.coinsFromRupees(15.0), 0.001)
        assertEquals(250.0, RedeemHistoryMapper.coinsFromRupees(25.0), 0.001)
    }

    @Test
    fun allStatusesArePreservedForDisplay() {
        listOf("pending", "approved", "rejected").forEach { status ->
            val item = RedeemHistoryMapper.toRedeemItem(
                MyWithdrawal(id = "w", amount = 15.0, method = "UPI", status = status, createdAt = null, archived = false)
            )
            assertEquals(status.replaceFirstChar { it.uppercase() }, item.status)
        }
    }

    @Test
    fun missingDateFallsBackInsteadOfFailing() {
        val item = RedeemHistoryMapper.toRedeemItem(
            MyWithdrawal(id = "w", amount = 10.0, method = "UPI", status = "pending", createdAt = null, archived = false)
        )
        assertEquals("Just now", item.date)
    }
}
