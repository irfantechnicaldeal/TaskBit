package com.example.taskbit.api

import com.google.gson.annotations.SerializedName

data class UserModel(
    @SerializedName("_id")
    val id: String?,
    val name: String,
    val email: String,
    val phone: String,
    val points: Double = 0.0,
    val taskRewardUnits: Double = 0.0,
    val currentTaskCycle: Int = 1,
    val balance: Double = 0.0,
    val totalEarned: Double = 0.0,
    val totalWithdrawn: Double = 0.0,
    // Minimum coins (and rupees) required for this user's NEXT withdrawal,
    // computed by the backend from their approved withdrawal count.
    val withdrawalMinimumCoins: Double = 0.0,
    val withdrawalMinimumRupees: Double = 0.0,
    val createdAt: String? = null
)
