package com.example.taskbit

import android.content.Context
import android.content.SharedPreferences

object UserSession {
    private const val AUTH_PREFS = "TaskBitAuth"

    fun getUserPrefs(context: Context): SharedPreferences {
        val authPrefs = context.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)
        val mobile = authPrefs.getString("logged_in_mobile", "guest") ?: "guest"
        return context.getSharedPreferences("user_prefs_$mobile", Context.MODE_PRIVATE)
    }

    fun isUserLoggedIn(context: Context): Boolean {
        val authPrefs = context.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)
        return authPrefs.getBoolean("isLoggedIn", false)
    }

    fun getLoggedInMobile(context: Context): String {
        val authPrefs = context.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)
        return authPrefs.getString("logged_in_mobile", "") ?: ""
    }

    fun getLoggedInUserId(context: Context): String? {
        val authPrefs = context.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)
        return authPrefs.getString("user_id", null)
    }
}
