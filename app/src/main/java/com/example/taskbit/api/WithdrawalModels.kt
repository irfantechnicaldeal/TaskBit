package com.example.taskbit.api

import com.google.gson.annotations.SerializedName

data class WithdrawalRequest(
    val userId: String,
    val amount: Int,
    val method: String
)

data class WithdrawalResponse(
    @SerializedName("_id")
    val id: String?,
    val userId: String?,
    val amount: Double,
    val method: String,
    val status: String,
    val createdAt: String?
)
