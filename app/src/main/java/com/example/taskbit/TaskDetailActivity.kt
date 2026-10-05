package com.example.taskbit

import android.content.Intent
import android.content.ActivityNotFoundException
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.taskbit.api.RetrofitClient
import com.example.taskbit.api.TaskModel
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class TaskDetailActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "TaskVideoLaunch"
        const val EXTRA_TASK_COMPLETED = "TASK_COMPLETED"
        const val EXTRA_TASK_ALREADY_COMPLETED = "TASK_ALREADY_COMPLETED"
        const val EXTRA_TASK_COMPLETION_FAILED = "TASK_COMPLETION_FAILED"
        const val EXTRA_COMPLETION_ERROR = "TASK_COMPLETION_ERROR"
        const val EXTRA_REWARD_COINS = "TASK_REWARD_COINS"
        const val EXTRA_UPDATED_POINTS = "TASK_UPDATED_POINTS"
        const val EXTRA_CYCLE_COMPLETED = "TASK_CYCLE_COMPLETED"
    }

    private lateinit var recyclerView: RecyclerView
    private lateinit var emptyStateTextView: TextView
    private var tasksCall: Call<List<TaskModel>>? = null
    private var taskLoadGeneration = 0

    override fun onResume() {
        super.onResume()

        if (YouTubeOverlayService.isServiceRunning) {
            Toast.makeText(this, "Task failed! You left YouTube before 30 seconds.", Toast.LENGTH_LONG).show()
            stopService(Intent(this, YouTubeOverlayService::class.java))
            YouTubeOverlayService.isServiceRunning = false
        }

        when {
            intent.getBooleanExtra(EXTRA_TASK_COMPLETED, false) -> {
                val reward = intent.getDoubleExtra(EXTRA_REWARD_COINS, 0.5)
                val points = intent.getDoubleExtra(EXTRA_UPDATED_POINTS, 0.0)
                val cycleCompleted = intent.getBooleanExtra(EXTRA_CYCLE_COMPLETED, false)
                val message = if (cycleCompleted) {
                    "Cycle complete! +${CoinFormatter.format(reward)} coin. Coin total: ${CoinFormatter.format(points)}."
                } else {
                    "Task completed! +${CoinFormatter.format(reward)} coin. Coin total: ${CoinFormatter.format(points)}."
                }
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                intent.removeExtra(EXTRA_TASK_COMPLETED)
            }
            intent.getBooleanExtra(EXTRA_TASK_ALREADY_COMPLETED, false) -> {
                Toast.makeText(this, "This task was already completed in this cycle; no coins were added.", Toast.LENGTH_LONG).show()
                intent.removeExtra(EXTRA_TASK_ALREADY_COMPLETED)
            }
            intent.getBooleanExtra(EXTRA_TASK_COMPLETION_FAILED, false) -> {
                val message = intent.getStringExtra(EXTRA_COMPLETION_ERROR)
                    ?: "Task completion could not be confirmed. No coins were added."
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                intent.removeExtra(EXTRA_TASK_COMPLETION_FAILED)
                intent.removeExtra(EXTRA_COMPLETION_ERROR)
            }
        }

        loadTasksList()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_task_detail)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.detailRoot)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (YouTubeOverlayService.isServiceRunning) {
                    Toast.makeText(this@TaskDetailActivity, "Please wait for the countdown to complete before going back!", Toast.LENGTH_SHORT).show()
                    return
                }
                val backIntent = Intent(this@TaskDetailActivity, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
                startActivity(backIntent)
                finish()
            }
        })

        recyclerView = findViewById(R.id.tasksRecyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)
        emptyStateTextView = findViewById(R.id.tasksEmptyTextView)
    }

    private fun loadTasksList() {
        val requestGeneration = ++taskLoadGeneration
        tasksCall?.cancel()
        tasksCall = null
        recyclerView.adapter = TaskAdapter(emptyList()) {}

        showEmptyState("Loading tasks…")
        val call = RetrofitClient.apiService.getTasks()
        tasksCall = call
        call.enqueue(object : Callback<List<TaskModel>> {
            override fun onResponse(call: Call<List<TaskModel>>, response: Response<List<TaskModel>>) {
                if (call.isCanceled || requestGeneration != taskLoadGeneration) return
                if (response.isSuccessful && response.body() != null) {
                    val tasks = TaskCatalog.orderedBackendTasks(response.body().orEmpty())
                    val taskOne = tasks.firstOrNull { it.taskNumber == 1 }
                    Log.i(TAG, "Fresh backend GET /api/tasks applied ${tasks.size} usable tasks; Task #1 id=${taskOne?.id}, youtubeUrl=${taskOne?.youtubeUrl}")
                    recyclerView.adapter = TaskAdapter(tasks) { task -> startTask(task) }
                    if (tasks.isEmpty()) showEmptyState("No active tasks are available right now.")
                    else hideEmptyState()
                } else {
                    Log.e(TAG, "GET /api/tasks failed with HTTP ${response.code()}")
                    recyclerView.adapter = TaskAdapter(emptyList()) {}
                    showEmptyState("Could not load tasks. Please try again.")
                    Toast.makeText(this@TaskDetailActivity, "Could not load tasks. Please try again.", Toast.LENGTH_LONG).show()
                }
            }

            override fun onFailure(call: Call<List<TaskModel>>, t: Throwable) {
                if (call.isCanceled || requestGeneration != taskLoadGeneration) return
                Log.e(TAG, "GET /api/tasks failed", t)
                recyclerView.adapter = TaskAdapter(emptyList()) {}
                showEmptyState("Unable to connect. Please try again.")
                Toast.makeText(this@TaskDetailActivity, "Unable to connect to load tasks", Toast.LENGTH_LONG).show()
            }
        })
    }

    private fun startTask(task: TaskModel) {
        val taskId = task.id
        val videoUrl = TaskVideoUrl.normalize(task.youtubeUrl)
        if (taskId.isNullOrBlank() || videoUrl.isNullOrBlank()) {
            Log.e(TAG, "Cannot launch task: taskId/url missing or URL is not a supported YouTube URL; taskNumber=${task.taskNumber}, taskId=$taskId")
            Toast.makeText(this, "This task has no valid video configured", Toast.LENGTH_LONG).show()
            return
        }
        if (task.completed) {
            Toast.makeText(this, "This task is already complete for the current cycle", Toast.LENGTH_SHORT).show()
            return
        }
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Please enable 'Display over other apps' permission for TaskBit to show the reward timer", Toast.LENGTH_LONG).show()
            val permissionIntent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(permissionIntent)
            return
        } else {
            val serviceIntent = Intent(this, YouTubeOverlayService::class.java).apply {
                putExtra(YouTubeOverlayService.EXTRA_TASK_ID, taskId)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                Log.i(TAG, "Countdown service start requested for taskId=$taskId")
            } catch (error: Exception) {
                // The task URL must still open even if the optional countdown overlay cannot start.
                Log.e(TAG, "Countdown service could not start; continuing to YouTube", error)
            }
        }
        Log.i(TAG, "Task tap uses backend task response; taskNumber=${task.taskNumber}, taskId=$taskId, finalUrl=$videoUrl")
        openYouTube(videoUrl)
    }

    private fun openYouTube(videoUrl: String) {
        val trimmedUrl = videoUrl.trim()
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(trimmedUrl))
        try {
            Log.i(TAG, "Dispatching ACTION_VIEW with current task URL: $trimmedUrl")
            startActivity(intent)
            Log.i(TAG, "ACTION_VIEW dispatched successfully for URL: $trimmedUrl")
        } catch (error: ActivityNotFoundException) {
            Log.e(TAG, "No browser or YouTube app can handle ACTION_VIEW for URL: $trimmedUrl", error)
            Toast.makeText(this, "YouTube ya browser app nahi mila", Toast.LENGTH_LONG).show()
            stopService(Intent(this, YouTubeOverlayService::class.java))
        } catch (error: Exception) {
            Log.e(TAG, "ACTION_VIEW failed for URL: $trimmedUrl", error)
            Toast.makeText(this, "YouTube open nahi ho pa raha: ${error.message}", Toast.LENGTH_LONG).show()
            stopService(Intent(this, YouTubeOverlayService::class.java))
        }
    }

    private fun showEmptyState(message: String) {
        emptyStateTextView.text = message
        emptyStateTextView.visibility = View.VISIBLE
    }

    private fun hideEmptyState() {
        emptyStateTextView.visibility = View.GONE
    }

}
