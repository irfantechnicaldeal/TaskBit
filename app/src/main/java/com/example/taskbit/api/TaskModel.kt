package com.example.taskbit.api

import com.google.gson.annotations.SerializedName

data class TaskModel(
    @SerializedName("_id")
    val id: String?,
    val title: String,
    val description: String? = null,
    val completed: Boolean = false,
    val youtubeUrl: String? = null,
    val userId: String? = null,
    val points: Int? = null,
    val taskNumber: Int? = null,
    val status: String? = null,
    val cycle: Int? = null
)
