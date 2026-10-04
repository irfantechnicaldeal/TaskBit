package com.example.taskbit

import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText

class BankDetailsActivity : AppCompatActivity() {

    private lateinit var nameEditText: TextInputEditText
    private lateinit var upiEditText: TextInputEditText
    private lateinit var accountEditText: TextInputEditText
    private lateinit var ifscEditText: TextInputEditText
    private lateinit var saveButton: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_bank_details)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.bankRoot)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        nameEditText = findViewById(R.id.nameEditText)
        upiEditText = findViewById(R.id.upiEditText)
        accountEditText = findViewById(R.id.accountEditText)
        ifscEditText = findViewById(R.id.ifscEditText)
        saveButton = findViewById(R.id.saveButton)

        val prefs = UserSession.getUserPrefs(this)
        nameEditText.setText(prefs.getString("name", ""))
        upiEditText.setText(prefs.getString("upi", ""))
        accountEditText.setText(prefs.getString("account", ""))
        ifscEditText.setText(prefs.getString("ifsc", ""))

        saveButton.setOnClickListener {
            val name = nameEditText.text.toString().trim()
            val upi = upiEditText.text.toString().trim()
            val account = accountEditText.text.toString().trim()
            val ifsc = ifscEditText.text.toString().trim()

            if (name.isEmpty()) {
                Toast.makeText(this, "Please enter your name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (upi.isEmpty() && (account.isEmpty() || ifsc.isEmpty())) {
                Toast.makeText(this, "Please enter either UPI ID or Bank Details", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            prefs.edit().apply {
                putString("name", name)
                putString("upi", upi)
                putString("account", account)
                putString("ifsc", ifsc)
                apply()
            }

            Toast.makeText(this, "Bank & UPI details saved successfully!", Toast.LENGTH_LONG).show()
            finish()
        }
    }
}
