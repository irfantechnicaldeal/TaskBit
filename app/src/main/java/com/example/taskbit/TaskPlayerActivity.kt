package com.example.taskbit

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.taskbit.api.RetrofitClient
import com.example.taskbit.api.TaskCompletionResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class TaskPlayerActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var touchBlockerView: View
    private lateinit var countdownTextView: TextView
    private lateinit var messageTextView: TextView
    private lateinit var finishTaskButton: Button

    private var countdownTimer: CountDownTimer? = null
    private var isCountdownFinished = false
    private var taskId: String? = null
    private var videoUrl: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_task_player)

        // Hide system navigation bars and status bar (Immersive Mode + Sticky)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        try {
            startLockTask()
        } catch (_: Exception) {}

        taskId = intent.getStringExtra("task_id")
        videoUrl = intent.getStringExtra("video_url")

        webView = findViewById(R.id.webView)
        touchBlockerView = findViewById(R.id.touchBlockerView)
        countdownTextView = findViewById(R.id.playerCountdownTextView)
        messageTextView = findViewById(R.id.playerMessageTextView)
        finishTaskButton = findViewById(R.id.finishTaskButton)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }
        }
        webView.webChromeClient = WebChromeClient()

        val targetUrl = getMobileYouTubeUrl(videoUrl)
        webView.loadUrl(targetUrl)

        // Block back button during countdown
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!isCountdownFinished) {
                    return
                }
                finish()
            }
        })

        startCountdown()
    }

    private fun getMobileYouTubeUrl(rawUrl: String?): String {
        if (rawUrl.isNullOrBlank()) return "https://m.youtube.com/watch?v=4hB4szPJ7BE"
        val videoId = when {
            rawUrl.contains("youtu.be/") -> rawUrl.substringAfter("youtu.be/").substringBefore("?").substringBefore("&")
            rawUrl.contains("watch?v=") -> rawUrl.substringAfter("watch?v=").substringBefore("&")
            rawUrl.contains("embed/") -> rawUrl.substringAfter("embed/").substringBefore("?").substringBefore("&")
            else -> null
        }
        return if (videoId != null) {
            "https://m.youtube.com/watch?v=$videoId"
        } else {
            rawUrl
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && !isCountdownFinished) {
            Toast.makeText(this, "Please wait for the 30-second countdown to complete!", Toast.LENGTH_SHORT).show()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun startCountdown() {
        countdownTimer = object : CountDownTimer(30_000L, 1_000L) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = ((millisUntilFinished + 999) / 1000).toInt()
                countdownTextView.text = seconds.toString()
            }

            override fun onFinish() {
                isCountdownFinished = true
                countdownTextView.text = "0"
                messageTextView.text = "Countdown finished! Processing reward…"

                // Remove touch blocker so user can interact if needed
                touchBlockerView.visibility = View.GONE

                val isLoggedIn = UserSession.isUserLoggedIn(this@TaskPlayerActivity)
                if (!isLoggedIn) {
                    messageTextView.text = "Watch complete! Log in to claim your coin reward."
                    finishTaskButton.text = "Login to Claim"
                    finishTaskButton.visibility = View.VISIBLE
                    finishTaskButton.setOnClickListener {
                        val intent = Intent(this@TaskPlayerActivity, LoginActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                        }
                        startActivity(intent)
                        finish()
                    }
                    return
                }

                // Logged in: submit completion
                if (!taskId.isNullOrBlank()) {
                    RetrofitClient.apiService.completeTask(taskId!!).enqueue(object : Callback<TaskCompletionResponse> {
                        override fun onResponse(call: Call<TaskCompletionResponse>, response: Response<TaskCompletionResponse>) {
                            if (response.isSuccessful && response.body()?.success == true) {
                                val rewardCoins = response.body()?.rewardCoins ?: 0.5
                                val totalPoints = response.body()?.points ?: 0.0
                                Toast.makeText(this@TaskPlayerActivity, "Success! +$rewardCoins coin added. Total: $totalPoints", Toast.LENGTH_LONG).show()
                            } else {
                                Toast.makeText(this@TaskPlayerActivity, "Task completed, but reward already claimed or processed.", Toast.LENGTH_SHORT).show()
                            }
                            finish()
                        }

                        override fun onFailure(call: Call<TaskCompletionResponse>, t: Throwable) {
                            Toast.makeText(this@TaskPlayerActivity, "Task completed! Returning to tasks.", Toast.LENGTH_SHORT).show()
                            finish()
                        }
                    })
                } else {
                    finish()
                }
            }
        }.start()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
    }

    override fun finish() {
        try {
            stopLockTask()
        } catch (_: Exception) {}
        super.finish()
    }

    override fun onPause() {
        super.onPause()
        if (!isCountdownFinished) {
            countdownTimer?.cancel()
            finish()
        }
    }

    override fun onDestroy() {
        countdownTimer?.cancel()
        webView.destroy()
        super.onDestroy()
    }
}
