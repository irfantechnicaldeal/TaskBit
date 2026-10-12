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
import com.example.taskbit.api.MyWithdrawal
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
    private lateinit var minimumInfoTextView: TextView
    private lateinit var requestRedeemButton: MaterialButton
    private lateinit var bankDetailsButton: MaterialButton
    private lateinit var historyRecyclerView: RecyclerView
    private lateinit var emptyHistoryTextView: TextView
    private val confirmedWithdrawals = mutableListOf<RedeemHistoryAdapter.RedeemItem>()
    private var currentCoins = 0.0
    private var profileLoaded = false

    // Duplicate-request prevention: a user may have only one pending withdrawal
    // at a time (the backend enforces the same rule). While a request is in
    // flight or already pending, the redeem button stays disabled.
    private var requestInFlight = false
    private var hasPendingWithdrawal = false
    private var inFlightLabel = "Submitting…"

    // Withdrawal minimum ladder, provided by the backend for this user's NEXT
    // request (100 coins for the first, +50 per approved withdrawal, max 500).
    private var withdrawalMinimumCoins = 0.0
    private var withdrawalMinimumRupees = 0.0
    private var lastRequestCoins = 0.0
    private var lastRequestRupees = 0.0

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
        minimumInfoTextView = findViewById(R.id.minimumInfoTextView)
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
                    // Next-withdrawal minimum comes from the backend ladder.
                    withdrawalMinimumCoins = profile.withdrawalMinimumCoins
                    withdrawalMinimumRupees = profile.withdrawalMinimumRupees
                    availableCoinsTextView.text = "${CoinFormatter.format(currentCoins)} Coins"
                    updateMinimumDisplay()
                    updateRedeemButtonState()
                } else {
                    availableCoinsTextView.text = "Coins unavailable"
                }
            }

            override fun onFailure(call: Call<UserModel>, t: Throwable) {
                availableCoinsTextView.text = "Coins unavailable"
            }
        })

        // Check for an existing pending withdrawal so the redeem button stays
        // disabled while one is awaiting processing (prevents a second request).
        RetrofitClient.apiService.getMyWithdrawals().enqueue(object : Callback<List<MyWithdrawal>> {
            override fun onResponse(call: Call<List<MyWithdrawal>>, response: Response<List<MyWithdrawal>>) {
                val history = response.body()
                hasPendingWithdrawal = history?.any {
                    it.status.equals("pending", ignoreCase = true) && it.archived != true
                } == true
                updateRedeemButtonState()
            }

            override fun onFailure(call: Call<List<MyWithdrawal>>, t: Throwable) {
                hasPendingWithdrawal = false
                updateRedeemButtonState()
            }
        })
    }

    private fun requestWithdrawal() {
        if (requestInFlight) return

        val userId = UserSession.getLoggedInUserId(this)
        if (userId.isNullOrBlank()) {
            Toast.makeText(this, "Please sign in again before requesting a withdrawal", Toast.LENGTH_LONG).show()
            return
        }

        if (hasPendingWithdrawal) {
            Toast.makeText(this, "You already have a pending withdrawal request. Please wait for it to be processed.", Toast.LENGTH_LONG).show()
            return
        }

        if (!profileLoaded) {
            Toast.makeText(this, "Please wait while your coin balance loads", Toast.LENGTH_LONG).show()
            return
        }
        if (currentCoins + 1e-9 < effectiveMinimumCoins()) {
            Toast.makeText(
                this,
                "Minimum ${CoinFormatter.format(effectiveMinimumCoins())} coins (₹${CoinFormatter.format(effectiveMinimumRupees())}) required to redeem!",
                Toast.LENGTH_LONG
            ).show()
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
        // Request exactly the user's current minimum (>= backend ladder), so one
        // tap stays sufficient while the minimum grows with approved payouts.
        val requestCoins = effectiveMinimumCoins()
        val requestRupees = effectiveMinimumRupees()
        lastRequestCoins = requestCoins
        lastRequestRupees = requestRupees
        val request = WithdrawalRequest(
            userId = userId,
            amount = requestRupees,
            method = method
        )

        RetrofitClient.apiService.createWithdrawal(request).enqueue(object : Callback<WithdrawalResponse> {
            override fun onResponse(call: Call<WithdrawalResponse>, response: Response<WithdrawalResponse>) {
                setRequesting(false)
                val withdrawal = response.body()
                if (response.code() == 201 && withdrawal != null && !withdrawal.id.isNullOrBlank()) {
                    hasPendingWithdrawal = true
                    updateRedeemButtonState()
                    confirmedWithdrawals.add(
                        0,
                        RedeemHistoryAdapter.RedeemItem(
                            amount = "${CoinFormatter.format(lastRequestCoins)} Coins (₹${CoinFormatter.format(lastRequestRupees)})",
                            date = withdrawal.createdAt ?: "Just now",
                            status = withdrawal.status.replaceFirstChar { it.uppercase() }
                        )
                    )
                    renderHistory()
                    Toast.makeText(this@RedeemActivity, WITHDRAWAL_SUCCESS_MESSAGE, Toast.LENGTH_LONG).show()
                } else {
                    if (response.code() == 409) {
                        // A pending request already exists: reflect that in the UI.
                        hasPendingWithdrawal = true
                        updateRedeemButtonState()
                    }
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

    private fun setRequesting(requesting: Boolean, label: String = "Submitting…") {
        requestInFlight = requesting
        if (requesting) inFlightLabel = label
        updateRedeemButtonState()
    }

    // Single source of truth for the redeem button state: disabled while a
    // request is in flight, while a pending withdrawal is awaiting processing,
    // or while the balance is below the user's current minimum.
    private fun updateRedeemButtonState() {
        when {
            requestInFlight -> {
                requestRedeemButton.isEnabled = false
                requestRedeemButton.text = inFlightLabel
            }
            hasPendingWithdrawal -> {
                requestRedeemButton.isEnabled = false
                requestRedeemButton.text = "Withdrawal Pending…"
            }
            profileLoaded && currentCoins + 1e-9 < effectiveMinimumCoins() -> {
                requestRedeemButton.isEnabled = false
                requestRedeemButton.text = "Need ${CoinFormatter.format(effectiveMinimumCoins())} Coins"
            }
            else -> {
                requestRedeemButton.isEnabled = true
                requestRedeemButton.text = "Redeem Now"
            }
        }
    }

    // Backend-provided minimum for this user's next withdrawal; falls back to
    // the base 100-coin minimum when not available (e.g. older backend).
    private fun effectiveMinimumCoins(): Double =
        if (withdrawalMinimumCoins > 0) withdrawalMinimumCoins else DEFAULT_MINIMUM_COINS

    private fun effectiveMinimumRupees(): Double =
        if (withdrawalMinimumRupees > 0) withdrawalMinimumRupees else effectiveMinimumCoins() * RUPEES_PER_COIN

    private fun updateMinimumDisplay() {
        minimumInfoTextView.text = "Minimum withdrawal: ${CoinFormatter.format(effectiveMinimumCoins())} coins " +
            "(₹${CoinFormatter.format(effectiveMinimumRupees())})"
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
        val RUPEES_PER_COIN = 0.1
        val DEFAULT_MINIMUM_COINS = 100.0
        val DEFAULT_MINIMUM_RUPEES = 10.0
        val METHOD_UPI = "UPI"
        val METHOD_BANK_TRANSFER = "Bank Transfer"
        const val WITHDRAWAL_SUCCESS_MESSAGE =
            "Withdrawal request submitted successfully! Your payment is expected within 24 hours. " +
                "Please wait while we process your request. You can check your withdrawal status in Withdrawal History."
    }
}
