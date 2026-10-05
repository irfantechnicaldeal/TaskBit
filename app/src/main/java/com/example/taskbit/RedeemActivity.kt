package com.example.taskbit

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.taskbit.api.BankDetailsModel
import com.example.taskbit.api.RetrofitClient
import com.example.taskbit.api.UserModel
import com.example.taskbit.api.WithdrawalRequest
import com.example.taskbit.api.WithdrawalResponse
import com.google.android.material.button.MaterialButton
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class RedeemActivity : AppCompatActivity() {

    private lateinit var availableCoinsTextView: TextView
    private lateinit var requestRedeemButton: MaterialButton
    private lateinit var bankDetailsButton: MaterialButton
    private lateinit var historyRecyclerView: RecyclerView
    private lateinit var emptyHistoryTextView: TextView
    private val confirmedWithdrawals = mutableListOf<RedeemHistoryAdapter.RedeemItem>()
    private var currentCoins = 0.0
    private var profileLoaded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_redeem)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.redeemRoot)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        availableCoinsTextView = findViewById(R.id.availableCoinsTextView)
        requestRedeemButton = findViewById(R.id.requestRedeemButton)
        bankDetailsButton = findViewById(R.id.bankDetailsButton)
        historyRecyclerView = findViewById(R.id.historyRecyclerView)
        emptyHistoryTextView = findViewById(R.id.emptyHistoryTextView)
        historyRecyclerView.layoutManager = LinearLayoutManager(this)

        bankDetailsButton.setOnClickListener {
            startActivity(Intent(this, BankDetailsActivity::class.java))
        }
        requestRedeemButton.setOnClickListener { requestWithdrawal() }
    }

    override fun onResume() {
        super.onResume()
        loadDashboardData()
    }

    private fun loadDashboardData() {
        profileLoaded = false
        availableCoinsTextView.text = "Loading coins…"
        renderHistory()

        if (UserSession.getLoggedInUserId(this).isNullOrBlank()) {
            availableCoinsTextView.text = "Sign in to view coins"
            return
        }

        RetrofitClient.apiService.getCurrentUser().enqueue(object : Callback<UserModel> {
            override fun onResponse(call: Call<UserModel>, response: Response<UserModel>) {
                val profile = response.body()
                if (response.isSuccessful && profile != null) {
                    currentCoins = profile.points
                    profileLoaded = true
                    availableCoinsTextView.text = "${CoinFormatter.format(currentCoins)} Coins"
                } else {
                    availableCoinsTextView.text = "Coins unavailable"
                }
            }

            override fun onFailure(call: Call<UserModel>, t: Throwable) {
                availableCoinsTextView.text = "Coins unavailable"
            }
        })
    }

    private fun requestWithdrawal() {
        val userId = UserSession.getLoggedInUserId(this)
        if (userId.isNullOrBlank()) {
            Toast.makeText(this, "Please sign in again before requesting a withdrawal", Toast.LENGTH_LONG).show()
            return
        }

        if (!profileLoaded) {
            Toast.makeText(this, "Please wait while your coin balance loads", Toast.LENGTH_LONG).show()
            return
        }
        if (currentCoins < COINS_PER_WITHDRAWAL) {
            Toast.makeText(this, "Minimum 100 coins required to redeem!", Toast.LENGTH_LONG).show()
            return
        }

        setRequesting(true, "Checking payout details…")
        RetrofitClient.apiService.getBankDetails(userId).enqueue(object : Callback<BankDetailsModel> {
            override fun onResponse(call: Call<BankDetailsModel>, response: Response<BankDetailsModel>) {
                if (response.code() == 404) {
                    requirePayoutMethod()
                    return
                }
                val details = response.body()
                if (!response.isSuccessful || details == null) {
                    setRequesting(false)
                    Toast.makeText(this@RedeemActivity, "Could not verify your payout details. Please try again.", Toast.LENGTH_LONG).show()
                    return
                }

                val method = configuredMethod(details)
                if (method == null) {
                    requirePayoutMethod()
                    return
                }
                submitWithdrawal(userId, method)
            }

            override fun onFailure(call: Call<BankDetailsModel>, t: Throwable) {
                setRequesting(false)
                Toast.makeText(this@RedeemActivity, "Unable to check payout details. Please try again.", Toast.LENGTH_LONG).show()
            }
        })
    }

    private fun configuredMethod(details: BankDetailsModel): String? {
        val hasRequiredHolder = details.accountHolderName.isNotBlank()
        if (hasRequiredHolder && !details.upiId.isNullOrBlank()) return METHOD_UPI

        val completeBankAccount = hasRequiredHolder &&
            details.bankName.isNotBlank() &&
            details.accountNumber.isNotBlank() &&
            details.ifsc.isNotBlank()
        return if (completeBankAccount) METHOD_BANK_TRANSFER else null
    }

    private fun requirePayoutMethod() {
        setRequesting(false)
        Toast.makeText(this, "Add a UPI ID or complete bank details before withdrawing", Toast.LENGTH_LONG).show()
        startActivity(Intent(this, BankDetailsActivity::class.java))
    }

    private fun submitWithdrawal(userId: String, method: String) {
        setRequesting(true, "Submitting request…")
        val request = WithdrawalRequest(
            userId = userId,
            amount = WITHDRAWAL_AMOUNT_RUPEES,
            method = method
        )

        RetrofitClient.apiService.createWithdrawal(request).enqueue(object : Callback<WithdrawalResponse> {
            override fun onResponse(call: Call<WithdrawalResponse>, response: Response<WithdrawalResponse>) {
                setRequesting(false)
                val withdrawal = response.body()
                if (response.code() == 201 && withdrawal != null && !withdrawal.id.isNullOrBlank()) {
                    confirmedWithdrawals.add(
                        0,
                        RedeemHistoryAdapter.RedeemItem(
                            amount = "$COINS_PER_WITHDRAWAL Coins (₹$WITHDRAWAL_AMOUNT_RUPEES)",
                            date = withdrawal.createdAt ?: "Just now",
                            status = withdrawal.status.replaceFirstChar { it.uppercase() }
                        )
                    )
                    renderHistory()
                    Toast.makeText(this@RedeemActivity, "Withdrawal request submitted", Toast.LENGTH_LONG).show()
                } else {
                    val detail = response.errorBody()?.string()?.let(::extractErrorMessage)
                    val message = detail ?: "Withdrawal request was not created (HTTP ${response.code()})."
                    Toast.makeText(this@RedeemActivity, message, Toast.LENGTH_LONG).show()
                }
            }

            override fun onFailure(call: Call<WithdrawalResponse>, t: Throwable) {
                setRequesting(false)
                Toast.makeText(this@RedeemActivity, "Unable to submit withdrawal. Please check your connection and try again.", Toast.LENGTH_LONG).show()
            }
        })
    }

    private fun extractErrorMessage(errorBody: String): String? = try {
        JSONObject(errorBody).optString("error").takeIf { it.isNotBlank() }
    } catch (_: Exception) {
        null
    }

    private fun setRequesting(requesting: Boolean, label: String = "Redeem Now") {
        requestRedeemButton.isEnabled = !requesting
        requestRedeemButton.text = if (requesting) label else "Redeem Now"
    }

    private fun renderHistory() {
        if (confirmedWithdrawals.isEmpty()) {
            emptyHistoryTextView.visibility = View.VISIBLE
            historyRecyclerView.visibility = View.GONE
        } else {
            emptyHistoryTextView.visibility = View.GONE
            historyRecyclerView.visibility = View.VISIBLE
            historyRecyclerView.adapter = RedeemHistoryAdapter(confirmedWithdrawals.toList())
        }
    }

    private companion object {
        const val COINS_PER_WITHDRAWAL = 100
        const val WITHDRAWAL_AMOUNT_RUPEES = 10
        const val METHOD_UPI = "UPI"
        const val METHOD_BANK_TRANSFER = "Bank Transfer"
    }
}
