package com.example.taskbit.api

data class AuthRequest(
    val identifier: String? = null,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val password: String? = null
)
