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
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import com.example.taskbit.api.RetrofitClient
import com.example.taskbit.api.TaskCompletionResponse
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class YouTubeOverlayService : Service() {

    private lateinit var windowManager: WindowManager

    private var overlayView: View? = null
    private var timer: CountDownTimer? = null
    private var isCountdownFinished = false
    private var currentTaskId: String? = null

    companion object {
        private const val TAG = "TaskVideoLaunch"
        private const val CHANNEL_ID = "taskbit_overlay"
        private const val NOTIFICATION_ID = 1001
        const val EXTRA_TASK_ID = "taskbit_task_id"
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
        currentTaskId = intent?.getStringExtra(EXTRA_TASK_ID)
        Log.i(TAG, "Countdown service started for taskId=$currentTaskId")

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
            Log.e(TAG, "Could not promote countdown service to foreground", e)
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
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
            }

        try {

            val inflater =
                LayoutInflater.from(this)

            overlayView =
                inflater.inflate(
                    R.layout.layout_youtube_overlay,
                    null
                )

            windowManager.addView(
                overlayView,
                params
            )
            Log.i(TAG, "Non-focusable countdown card shown; it will not redirect or cover YouTube taskId=$currentTaskId")

        } catch (e: Exception) {
            Log.e(TAG, "Could not show countdown overlay; YouTube playback remains independent", e)

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
                        backToAppButton.isEnabled = false
                        backToAppButton.text = "Submitting completion…"
                        submitTaskCompletion()
                    }
                }

            }.start()
    }

    private fun submitTaskCompletion() {
        val taskId = currentTaskId
        if (taskId.isNullOrBlank()) {
            returnToTasks(completionError = "Task could not be identified. No coins were added.")
            return
        }

        val isLoggedIn = try {
            UserSession.isUserLoggedIn(this) && !UserSession.getLoggedInUserId(this).isNullOrBlank()
        } catch (_: Exception) {
            false
        }

        if (!isLoggedIn) {
            val view = overlayView
            if (view != null) {
                val backToAppButton = view.findViewById<Button>(R.id.backToAppButton)
                backToAppButton.isEnabled = true
                backToAppButton.text = "Login to Collect 0.5 Coin"
                backToAppButton.setOnClickListener {
                    val intent = Intent(this, LoginActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    }
                    startActivity(intent)
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                }
                view.findViewById<TextView>(R.id.overlayMessageTextView).text = "Watch complete! Log in to claim your 0.5 coin reward."
            }
            return
        }

        RetrofitClient.apiService.completeTask(taskId).enqueue(object : Callback<TaskCompletionResponse> {
            override fun onResponse(
                call: Call<TaskCompletionResponse>,
                response: Response<TaskCompletionResponse>
            ) {
                val completion = response.body()
                if (response.isSuccessful && completion?.success == true) {
                    returnToTasks(completion = completion)
                } else if (response.code() == 409 && isAlreadyCompleted(response.errorBody()?.string())) {
                    returnToTasks(alreadyCompleted = true)
                } else {
                    val message = when (response.code()) {
                        401 -> "Please login or register to collect coins."
                        404 -> "This task is no longer available."
                        else -> completion?.message ?: "Task completion could not be confirmed. Please try again."
                    }
                    returnToTasks(completionError = message)
                }
            }

            override fun onFailure(call: Call<TaskCompletionResponse>, t: Throwable) {
                returnToTasks(completionError = "Unable to connect to server to collect coins.")
            }
        })
    }

    private fun isAlreadyCompleted(errorBody: String?): Boolean = try {
        errorBody?.let { JSONObject(it).optBoolean("alreadyCompleted") } ?: false
    } catch (_: Exception) {
        false
    }

    private fun returnToTasks(
        completion: TaskCompletionResponse? = null,
        alreadyCompleted: Boolean = false,
        completionError: String? = null
    ) {
        isServiceRunning = false
        val returnIntent = Intent(this, TaskDetailActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TASK
            )
            if (completion != null) {
                putExtra(TaskDetailActivity.EXTRA_TASK_COMPLETED, true)
                putExtra(TaskDetailActivity.EXTRA_REWARD_COINS, completion.rewardCoins)
                putExtra(TaskDetailActivity.EXTRA_UPDATED_POINTS, completion.points)
                putExtra(TaskDetailActivity.EXTRA_CYCLE_COMPLETED, completion.cycleCompleted)
            }
            if (alreadyCompleted) putExtra(TaskDetailActivity.EXTRA_TASK_ALREADY_COMPLETED, true)
            if (completionError != null) {
                putExtra(TaskDetailActivity.EXTRA_TASK_COMPLETION_FAILED, true)
                putExtra(TaskDetailActivity.EXTRA_COMPLETION_ERROR, completionError)
            }
        }
        startActivity(returnIntent)
        removeOverlay()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
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
