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
import com.example.taskbit.api.AuthRequest
import com.example.taskbit.api.AuthResponse
import com.example.taskbit.api.RetrofitClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class OtpActivity : AppCompatActivity() {

    private lateinit var otpEditText: TextInputEditText
    private lateinit var verifyOtpButton: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_otp)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.otpRoot)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        otpEditText = findViewById(R.id.otpEditText)
        verifyOtpButton = findViewById(R.id.verifyOtpButton)

        val name = intent.getStringExtra("name") ?: ""
        val mobile = intent.getStringExtra("mobile") ?: ""
        val password = intent.getStringExtra("password") ?: ""

        verifyOtpButton.setOnClickListener {
            val otp = otpEditText.text.toString().trim()

            if (otp == "1234") {
                verifyOtpButton.isEnabled = false
                val authRequest = AuthRequest(
                    name = name,
                    email = "$mobile@taskbit.com",
                    phone = mobile,
                    password = password
                )
                RetrofitClient.apiService.register(authRequest).enqueue(object : Callback<AuthResponse> {
                    override fun onResponse(call: Call<AuthResponse>, response: Response<AuthResponse>) {
                        val authResp = response.body()
                        if (response.isSuccessful && authResp != null && !authResp.token.isNullOrBlank()) {
                            val prefs = getSharedPreferences("TaskBitAuth", MODE_PRIVATE)
                            val editor = prefs.edit()
                                .putString("name", name)
                                .putString("mobile", mobile)
                                .putBoolean("isLoggedIn", true)
                                .putString("logged_in_mobile", mobile)
                                .putString("auth_token", authResp.token)
                            authResp.user?.id?.let { userId -> editor.putString("user_id", userId) }
                            editor.apply()

                            Toast.makeText(this@OtpActivity, "Account created successfully!", Toast.LENGTH_LONG).show()
                            val intent = Intent(this@OtpActivity, MainActivity::class.java).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                            }
                            startActivity(intent)
                            finish()
                        } else {
                            verifyOtpButton.isEnabled = true
                            Toast.makeText(
                                this@OtpActivity,
                                "Account create nahi hua (server error ${response.code()}). Render settings check karein.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                    override fun onFailure(call: Call<AuthResponse>, t: Throwable) {
                        verifyOtpButton.isEnabled = true
                        Toast.makeText(
                            this@OtpActivity,
                            "Server se connect nahi hua. Internet check karke dobara try karein.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                })
            } else {
                Toast.makeText(this, "Invalid OTP! Use dummy OTP 1234", Toast.LENGTH_LONG).show()
            }
        }
    }
}
