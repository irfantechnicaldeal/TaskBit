package com.example.taskbit

import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.taskbit.api.BankDetailsModel
import com.example.taskbit.api.RetrofitClient
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class BankDetailsActivity : AppCompatActivity() {

    private lateinit var nameEditText: TextInputEditText
    private lateinit var upiEditText: TextInputEditText
    private lateinit var bankNameEditText: TextInputEditText
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
        bankNameEditText = findViewById(R.id.bankNameEditText)
        accountEditText = findViewById(R.id.accountEditText)
        ifscEditText = findViewById(R.id.ifscEditText)
        saveButton = findViewById(R.id.saveButton)

        val userId = UserSession.getLoggedInUserId(this)
        if (userId.isNullOrBlank()) {
            Toast.makeText(this, "Please sign in again before managing payout details", Toast.LENGTH_LONG).show()
            saveButton.isEnabled = false
        } else {
            loadBankDetails(userId)
        }

        saveButton.setOnClickListener {
            val currentUserId = UserSession.getLoggedInUserId(this)
            if (currentUserId.isNullOrBlank()) {
                Toast.makeText(this, "Please sign in again before saving payout details", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val name = nameEditText.text.toString().trim()
            val upi = upiEditText.text.toString().trim()
            val bankName = bankNameEditText.text.toString().trim()
            val account = accountEditText.text.toString().trim()
            val ifsc = ifscEditText.text.toString().trim()

            if (name.isEmpty()) {
                Toast.makeText(this, "Please enter your name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val anyBankFieldEntered = bankName.isNotEmpty() || account.isNotEmpty() || ifsc.isNotEmpty()
            val completeBankDetails = bankName.isNotEmpty() && account.isNotEmpty() && ifsc.isNotEmpty()
            if (upi.isEmpty() && !completeBankDetails) {
                Toast.makeText(this, "Enter a UPI ID or complete bank details", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            if (anyBankFieldEntered && !completeBankDetails) {
                Toast.makeText(this, "Complete all bank fields or clear them to use UPI only", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            setSaving(true)
            val bankDetails = BankDetailsModel(
                id = null,
                userId = currentUserId,
                accountHolderName = name,
                bankName = bankName,
                accountNumber = account,
                ifsc = ifsc,
                upiId = upi.ifEmpty { null }
            )
            RetrofitClient.apiService.saveBankDetails(bankDetails).enqueue(object : Callback<BankDetailsModel> {
                override fun onResponse(call: Call<BankDetailsModel>, response: Response<BankDetailsModel>) {
                    setSaving(false)
                    if (response.isSuccessful && response.body() != null) {
                        Toast.makeText(this@BankDetailsActivity, "Payout details saved successfully", Toast.LENGTH_LONG).show()
                        finish()
                    } else {
                        Toast.makeText(this@BankDetailsActivity, "Could not save payout details. Please try again.", Toast.LENGTH_LONG).show()
                    }
                }

                override fun onFailure(call: Call<BankDetailsModel>, t: Throwable) {
                    setSaving(false)
                    Toast.makeText(this@BankDetailsActivity, "Unable to connect. Payout details were not saved.", Toast.LENGTH_LONG).show()
                }
            })
        }
    }

    private fun loadBankDetails(userId: String) {
        setSaving(true, "Loading…")
        RetrofitClient.apiService.getBankDetails(userId).enqueue(object : Callback<BankDetailsModel> {
            override fun onResponse(call: Call<BankDetailsModel>, response: Response<BankDetailsModel>) {
                setSaving(false)
                val details = response.body()
                if (response.isSuccessful && details != null) {
                    nameEditText.setText(details.accountHolderName)
                    upiEditText.setText(details.upiId.orEmpty())
                    bankNameEditText.setText(details.bankName)
                    accountEditText.setText(details.accountNumber)
                    ifscEditText.setText(details.ifsc)
                } else if (response.code() != 404) {
                    Toast.makeText(this@BankDetailsActivity, "Could not load saved payout details", Toast.LENGTH_LONG).show()
                }
            }

            override fun onFailure(call: Call<BankDetailsModel>, t: Throwable) {
                setSaving(false)
                Toast.makeText(this@BankDetailsActivity, "Unable to load payout details. You can still enter them.", Toast.LENGTH_LONG).show()
            }
        })
    }

    private fun setSaving(saving: Boolean, label: String = "Saving…") {
        saveButton.isEnabled = !saving
        saveButton.text = if (saving) label else "Save & Update Details"
    }
}
