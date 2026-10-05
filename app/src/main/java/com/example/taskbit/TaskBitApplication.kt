package com.example.taskbit

import android.app.Application

class TaskBitApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: TaskBitApplication
            private set
    }
}
