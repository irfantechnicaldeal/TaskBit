package com.example.taskbit.api

import com.google.gson.annotations.SerializedName

data class TaskModel(
    @SerializedName("_id")
    val id: String?,
    val title: String,
    val description: String,
    val completed: Boolean,
    val youtubeUrl: String?,
    val userId: String?,
)
