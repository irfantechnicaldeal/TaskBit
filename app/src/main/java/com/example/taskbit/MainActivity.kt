package com.example.taskbit

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton

class MainActivity : AppCompatActivity() {

    private lateinit var helloTextView: TextView
    private lateinit var coinsTextView: TextView
    private lateinit var viewTasksButton: MaterialButton
    private lateinit var redeemButton: MaterialButton
    private lateinit var authActionButton: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        helloTextView = findViewById(R.id.helloTextView)
        coinsTextView = findViewById(R.id.coinsTextView)
        viewTasksButton = findViewById(R.id.viewTasksButton)
        redeemButton = findViewById(R.id.redeemButton)
        authActionButton = findViewById(R.id.logoutButton)

        viewTasksButton.setOnClickListener {
            val intent = Intent(this, TaskDetailActivity::class.java)
            startActivity(intent)
        }

        redeemButton.setOnClickListener {
            val intent = Intent(this, RedeemActivity::class.java)
            startActivity(intent)
        }

        authActionButton.setOnClickListener {
            val isLoggedIn = UserSession.isUserLoggedIn(this)
            if (isLoggedIn) {
                // Logout
                val authPrefs = getSharedPreferences("TaskBitAuth", MODE_PRIVATE)
                authPrefs.edit().putBoolean("isLoggedIn", false).remove("logged_in_mobile").apply()
                onResume()
            } else {
                // Login
                val intent = Intent(this, LoginActivity::class.java)
                startActivity(intent)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val isLoggedIn = UserSession.isUserLoggedIn(this)
        val userPrefs = UserSession.getUserPrefs(this)
        val coins = userPrefs.getInt("coins", 0)
        coinsTextView.text = "$coins Coins"

        if (isLoggedIn) {
            val authPrefs = getSharedPreferences("TaskBitAuth", MODE_PRIVATE)
            val name = authPrefs.getString("name", "User") ?: "User"
            helloTextView.text = "Welcome, $name"
            authActionButton.text = "Logout"
        } else {
            helloTextView.text = "Welcome to TaskBit"
            authActionButton.text = "Login / Register Account"
        }
    }
}
