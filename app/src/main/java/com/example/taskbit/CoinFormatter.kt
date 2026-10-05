package com.example.taskbit

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

object CoinFormatter {
    fun format(coins: Double): String {
        val formatter = DecimalFormat("0.#", DecimalFormatSymbols.getInstance(Locale.getDefault()))
        return formatter.format(coins)
    }
}
