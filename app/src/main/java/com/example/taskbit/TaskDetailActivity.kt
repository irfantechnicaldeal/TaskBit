package com.example.taskbit

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class TaskDetailActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView

    private val youtubeLinks = listOf(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Task 1
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 2
        "https://www.youtube.com/watch?v=jNQXAC9IVRw", // Task 3
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 4
        "https://www.youtube.com/watch?v=9bZkp7q19f0", // Task 5
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 6
        "https://www.youtube.com/watch?v=kJQP7kiw5Fk", // Task 7
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 8
        "https://www.youtube.com/watch?v=3JZ_D3ELwOQ", // Task 9
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 10
        "https://www.youtube.com/watch?v=5NV6Rdv1a3I", // Task 11
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 12
        "https://www.youtube.com/watch?v=JGwWNGJdvx8", // Task 13
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 14
        "https://www.youtube.com/watch?v=fJ9rUzIMcZQ", // Task 15
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 16
        "https://www.youtube.com/watch?v=RgKAFK5djSk", // Task 17
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 18
        "https://www.youtube.com/watch?v=OPf0YbXqDm0", // Task 19
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 20
        "https://www.youtube.com/watch?v=CevxZBuZZk4", // Task 21
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 22
        "https://www.youtube.com/watch?v=hT_nvWreIhg", // Task 23
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 24
        "https://www.youtube.com/watch?v=YQHsXMglC9A", // Task 25
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 26
        "https://www.youtube.com/watch?v=2Vv-BfVoq4g", // Task 27
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 28
        "https://www.youtube.com/watch?v=RB-RcX5DS5A", // Task 29
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 30
        "https://www.youtube.com/watch?v=2X_iUBkgw7A", // Task 31
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 32
        "https://www.youtube.com/watch?v=kXYiU_JCYtU", // Task 33
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 34
        "https://www.youtube.com/watch?v=uelHwf8o7_U", // Task 35
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 36
        "https://www.youtube.com/watch?v=09R8_2nJtjg", // Task 37
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 38
        "https://www.youtube.com/watch?v=60ItHLz5WEA", // Task 39
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 40
        "https://www.youtube.com/watch?v=2KnYA6ZuVuU", // Task 41
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 42
        "https://www.youtube.com/watch?v=YqeW9_5kURI", // Task 43
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 44
        "https://www.youtube.com/watch?v=0J2QdDbelmY", // Task 45
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 46
        "https://www.youtube.com/watch?v=XQZ1JvYJq5Y", // Task 47
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe", // Task 48
        "https://www.youtube.com/watch?v=5qap5aO4i9A", // Task 49
        "https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe"  // Task 50
    )

    override fun onResume() {
        super.onResume()
        if (YouTubeOverlayService.isServiceRunning) {
            Toast.makeText(
                this,
                "Task failed! You left YouTube before 30 seconds.",
                Toast.LENGTH_LONG
            ).show()

            val serviceIntent =
                Intent(
                    this,
                    YouTubeOverlayService::class.java
                )
            stopService(serviceIntent)
            YouTubeOverlayService.isServiceRunning = false
        }

        if (intent.getBooleanExtra("TASK_COMPLETED", false)) {
            intent.removeExtra("TASK_COMPLETED")
            val allCompleted = intent.getBooleanExtra("ALL_COMPLETED", false)
            if (allCompleted) {
                Toast.makeText(this, "🎉 Amazing! All 50 tasks completed! +50 Bonus Coins! Restarting cycle.", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(this, "🎉 Task Completed! +5 Coins Added!", Toast.LENGTH_LONG).show()
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
                val intent = Intent(this@TaskDetailActivity, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
                startActivity(intent)
                finish()
            }
        })

        recyclerView = findViewById(R.id.tasksRecyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)
        loadTasksList()
    }

    private fun loadTasksList() {
        val prefs = UserSession.getUserPrefs(this)
        val completedSet = prefs.getStringSet("completed_tasks", emptySet()) ?: emptySet()

        var uncompletedTasks = (1..50).filter { it.toString() !in completedSet }

        // If all 50 tasks are completed, restart the cycle from 1 to 50!
        if (uncompletedTasks.isEmpty()) {
            prefs.edit().remove("completed_tasks").apply()
            uncompletedTasks = (1..50).toList()
            Toast.makeText(this, "All 50 tasks completed! Restarting cycle from 1 to 50.", Toast.LENGTH_LONG).show()
        }

        recyclerView.adapter = TaskAdapter(uncompletedTasks) { taskNum ->
            if (!Settings.canDrawOverlays(this)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
                Toast.makeText(
                    this,
                    "Overlay permission allow karo",
                    Toast.LENGTH_LONG
                ).show()
                return@TaskAdapter
            }

            prefs.edit().putInt("current_task_number", taskNum).apply()

            startCountdownOverlay()
            openYouTube(taskNum)
        }
    }

    private fun startCountdownOverlay() {
        val serviceIntent = Intent(this, YouTubeOverlayService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun openYouTube(taskNumber: Int) {
        val index = (taskNumber - 1).coerceIn(0, youtubeLinks.size - 1)
        val youtubeUrl = youtubeLinks[index]

        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(youtubeUrl))
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "YouTube open nahi ho pa raha",
                Toast.LENGTH_LONG
            ).show()
        }
    }
}
