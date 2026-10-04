package com.example.taskbit.api

data class AuthResponse(
    val message: String?,
    val token: String?,
    val user: UserModel?
)
