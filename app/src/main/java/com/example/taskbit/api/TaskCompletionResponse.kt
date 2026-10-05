package com.example.taskbit.api

data class TaskCompletionResponse(
    val success: Boolean = true,
    val message: String? = null,
    val points: Double = 0.0,
    val rewardUnits: Int = 1,
    val rewardCoins: Double = 0.5,
    val completedCycle: Int = 1,
    val currentCycle: Int = 1,
    val cycleCompleted: Boolean = false,
    val completedTasks: Int = 0,
    val totalTasks: Int = 50,
    val alreadyCompleted: Boolean = false
)
