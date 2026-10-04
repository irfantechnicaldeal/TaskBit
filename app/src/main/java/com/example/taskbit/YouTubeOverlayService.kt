package com.example.taskbit

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.provider.Settings
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat

class YouTubeOverlayService : Service() {

    private lateinit var windowManager: WindowManager

    private var overlayView: View? = null
    private var timer: CountDownTimer? = null
    private var isCountdownFinished = false

    companion object {
        private const val CHANNEL_ID = "taskbit_overlay"
        private const val NOTIFICATION_ID = 1001
        var isServiceRunning = false
    }

    override fun onCreate() {
        super.onCreate()
        isServiceRunning = true
        createNotificationChannel()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        startForegroundServiceNotification()

        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(
                this,
                "Please allow overlay permission in settings",
                Toast.LENGTH_LONG
            ).show()
            stopSelf()
            return START_NOT_STICKY
        }

        showOverlay()
        startCountdown()

        return START_NOT_STICKY
    }

    private fun startForegroundServiceNotification() {

        val notification: Notification =
            NotificationCompat.Builder(
                this,
                CHANNEL_ID
            )
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle("TaskBit")
                .setContentText("Countdown is running")
                .setOngoing(true)
                .setPriority(
                    NotificationCompat.PRIORITY_LOW
                )
                .build()

        try {

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {

                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )

            } else {

                startForeground(
                    NOTIFICATION_ID,
                    notification
                )
            }

        } catch (e: Exception) {
            stopSelf()
        }
    }

    private fun showOverlay() {

        if (overlayView != null) {
            removeOverlay()
        }

        windowManager =
            getSystemService(WINDOW_SERVICE) as WindowManager

        val windowType =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY

            } else {

                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

        val params =
            WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                windowType,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT
            )

        try {

            val inflater =
                LayoutInflater.from(this)

            overlayView =
                inflater.inflate(
                    R.layout.layout_youtube_overlay,
                    null
                )

            val container = overlayView as? OverlayContainerView
            container?.onWindowFocusLostListener = {
                if (!isCountdownFinished) {
                    Toast.makeText(
                        this,
                        "Task failed! You left the screen.",
                        Toast.LENGTH_LONG
                    ).show()

                    val intent =
                        Intent(
                            this,
                            MainActivity::class.java
                        ).apply {
                            addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK or
                                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                            )
                        }
                    startActivity(intent)

                    removeOverlay()
                    stopForeground(
                        STOP_FOREGROUND_REMOVE
                    )
                    stopSelf()
                }
            }

            overlayView?.isFocusable = true
            overlayView?.isFocusableInTouchMode = true
            overlayView?.requestFocus()
            overlayView?.setOnKeyListener { _, keyCode, _ ->
                if (keyCode == KeyEvent.KEYCODE_BACK) {
                    // Block back button press during countdown so YouTube doesn't go back
                    true
                } else {
                    false
                }
            }

            windowManager.addView(
                overlayView,
                params
            )

        } catch (e: Exception) {

            Toast.makeText(
                this,
                "Overlay error: ${e.message}",
                Toast.LENGTH_LONG
            ).show()

            overlayView = null
            stopSelf()
        }
    }

    private fun startCountdown() {

        val view = overlayView
        if (view == null) {
            Toast.makeText(
                this,
                "Overlay view is null",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        Toast.makeText(
            this,
            "Countdown started",
            Toast.LENGTH_SHORT
        ).show()

        val titleText =
            view.findViewById<TextView>(
                R.id.overlayTitleTextView
            )

        val countdownText =
            view.findViewById<TextView>(
                R.id.overlayCountdownTextView
            )

        val messageText =
            view.findViewById<TextView>(
                R.id.overlayMessageTextView
            )

        val backToAppButton =
            view.findViewById<Button>(
                R.id.backToAppButton
            )

        timer?.cancel()

        timer =
            object : CountDownTimer(
                30_000L,
                1_000L
            ) {

                override fun onTick(
                    millisUntilFinished: Long
                ) {

                    val seconds =
                        ((millisUntilFinished + 999) / 1000)
                            .toInt()

                    countdownText.text =
                        seconds.toString()
                }

                override fun onFinish() {
                    isCountdownFinished = true

                    countdownText.text = "0"
                    titleText.text = "Countdown Finished"
                    messageText.text = "Click below to return to app"
                    backToAppButton.visibility = View.VISIBLE

                    backToAppButton.setOnClickListener {
                        isServiceRunning = false

                        val prefs = UserSession.getUserPrefs(this@YouTubeOverlayService)
                        val currentTask = prefs.getInt("current_task_number", 1)

                        val existingSet = prefs.getStringSet("completed_tasks", emptySet()) ?: emptySet()
                        val completedSet = HashSet(existingSet)
                        completedSet.add(currentTask.toString())

                        val currentCoins = prefs.getInt("coins", 0)
                        var newCoins = currentCoins + 5

                        val allCompleted = completedSet.size >= 50
                        if (allCompleted) {
                            completedSet.clear()
                            newCoins += 50 // bonus
                        }

                        prefs.edit()
                            .putStringSet("completed_tasks", completedSet)
                            .putInt("coins", newCoins)
                            .apply()

                        val intent =
                            Intent(
                                this@YouTubeOverlayService,
                                TaskDetailActivity::class.java
                            ).apply {
                                addFlags(
                                    Intent.FLAG_ACTIVITY_NEW_TASK or
                                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                            Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                            Intent.FLAG_ACTIVITY_CLEAR_TASK
                                )
                                putExtra("TASK_COMPLETED", true)
                                putExtra("ALL_COMPLETED", allCompleted)
                            }
                        startActivity(intent)

                        removeOverlay()

                        stopForeground(
                            STOP_FOREGROUND_REMOVE
                        )

                        stopSelf()
                    }
                }

            }.start()
    }

    private fun removeOverlay() {

        timer?.cancel()
        timer = null

        try {

            overlayView?.let {

                if (::windowManager.isInitialized) {
                    windowManager.removeView(it)
                }
            }

        } catch (_: Exception) {
        }

        overlayView = null
    }

    private fun createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    "TaskBit Countdown",
                    NotificationManager.IMPORTANCE_LOW
                )

            val manager =
                getSystemService(
                    NotificationManager::class.java
                )

            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        isServiceRunning = false
        removeOverlay()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(
                STOP_FOREGROUND_REMOVE
            )
        }

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}