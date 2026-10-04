package com.example.taskbit

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText

class ForgotPasswordActivity : AppCompatActivity() {

    private lateinit var mobileEditText: TextInputEditText
    private lateinit var newPasswordEditText: TextInputEditText
    private lateinit var otpEditText: TextInputEditText
    private lateinit var resetPasswordButton: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_forgot_password)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.forgotRoot)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        mobileEditText = findViewById(R.id.forgotMobileEditText)
        newPasswordEditText = findViewById(R.id.newPasswordEditText)
        otpEditText = findViewById(R.id.forgotOtpEditText)
        resetPasswordButton = findViewById(R.id.resetPasswordButton)

        resetPasswordButton.setOnClickListener {
            val mobile = mobileEditText.text.toString().trim()
            val newPassword = newPasswordEditText.text.toString().trim()
            val otp = otpEditText.text.toString().trim()

            if (mobile.length != 10) {
                Toast.makeText(this, "Please enter a valid 10-digit mobile number", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (newPassword.length < 4) {
                Toast.makeText(this, "New password must be at least 4 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (otp != "1234") {
                Toast.makeText(this, "Invalid OTP! Use dummy OTP 1234", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val prefs = getSharedPreferences("TaskBitAuth", MODE_PRIVATE)
            val savedMobile = prefs.getString("mobile", "")

            if (mobile == savedMobile) {
                prefs.edit().putString("password", newPassword).apply()
                Toast.makeText(this, "Password reset successfully! Please login.", Toast.LENGTH_LONG).show()
                finish()
            } else {
                Toast.makeText(this, "Mobile number not found in registered accounts", Toast.LENGTH_LONG).show()
            }
        }
    }
}
