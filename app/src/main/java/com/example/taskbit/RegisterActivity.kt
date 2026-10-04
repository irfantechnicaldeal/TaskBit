package com.example.taskbit

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText

class RegisterActivity : AppCompatActivity() {

    private lateinit var nameEditText: TextInputEditText
    private lateinit var mobileEditText: TextInputEditText
    private lateinit var passwordEditText: TextInputEditText
    private lateinit var getOtpButton: MaterialButton
    private lateinit var backToLoginTextView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_register)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.registerRoot)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        nameEditText = findViewById(R.id.regNameEditText)
        mobileEditText = findViewById(R.id.regMobileEditText)
        passwordEditText = findViewById(R.id.regPasswordEditText)
        getOtpButton = findViewById(R.id.getOtpButton)
        backToLoginTextView = findViewById(R.id.backToLoginTextView)

        getOtpButton.setOnClickListener {
            val name = nameEditText.text.toString().trim()
            val mobile = mobileEditText.text.toString().trim()
            val password = passwordEditText.text.toString().trim()

            if (name.isEmpty()) {
                Toast.makeText(this, "Please enter your full name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (mobile.length != 10) {
                Toast.makeText(this, "Please enter a valid 10-digit mobile number", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password.length < 4) {
                Toast.makeText(this, "Password must be at least 4 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val intent = Intent(this, OtpActivity::class.java).apply {
                putExtra("name", name)
                putExtra("mobile", mobile)
                putExtra("password", password)
            }
            startActivity(intent)
        }

        backToLoginTextView.setOnClickListener {
            finish()
        }
    }
}
