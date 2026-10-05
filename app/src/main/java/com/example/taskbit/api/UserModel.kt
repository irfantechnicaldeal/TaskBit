package com.example.taskbit.api

import com.google.gson.annotations.SerializedName

data class UserModel(
    @SerializedName("_id")
    val id: String?,
    val name: String,
    val email: String,
    val phone: String,
    val points: Double = 0.0,
    val taskRewardUnits: Long = 0,
    val currentTaskCycle: Int = 1,
    val balance: Double = 0.0,
    val totalEarned: Double = 0.0,
    val totalWithdrawn: Double = 0.0,
    val createdAt: String? = null
)
