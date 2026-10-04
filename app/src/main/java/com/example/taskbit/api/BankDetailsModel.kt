package com.example.taskbit.api

import com.google.gson.annotations.SerializedName

data class BankDetailsModel(
    @SerializedName("_id")
    val id: String?,
    val userId: String,
    val accountHolderName: String,
    val bankName: String,
    val accountNumber: String,
    val ifsc: String,
    val upiId: String?
)
