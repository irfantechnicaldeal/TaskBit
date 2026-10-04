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
import com.google.android.material.button.MaterialButton
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RedeemActivity : AppCompatActivity() {

    private lateinit var availableCoinsTextView: TextView
    private lateinit var requestRedeemButton: MaterialButton
    private lateinit var bankDetailsButton: MaterialButton
    private lateinit var historyRecyclerView: RecyclerView
    private lateinit var emptyHistoryTextView: TextView

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

        requestRedeemButton.setOnClickListener {
            val prefs = UserSession.getUserPrefs(this)
            val coins = prefs.getInt("coins", 0)
            val name = prefs.getString("name", "") ?: ""
            val upi = prefs.getString("upi", "") ?: ""
            val account = prefs.getString("account", "") ?: ""

            if (name.isEmpty() || (upi.isEmpty() && account.isEmpty())) {
                Toast.makeText(this, "Please add Bank or UPI details first!", Toast.LENGTH_LONG).show()
                startActivity(Intent(this, BankDetailsActivity::class.java))
                return@setOnClickListener
            }

            if (coins < 100) {
                Toast.makeText(this, "Minimum 100 coins required to redeem!", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val newCoins = coins - 100
            prefs.edit().putInt("coins", newCoins).apply()

            val dateFormat = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault())
            val dateStr = dateFormat.format(Date())

            val historyJsonStr = prefs.getString("redeem_history", "[]") ?: "[]"
            val jsonArray = JSONArray(historyJsonStr)
            val newObj = JSONObject().apply {
                put("amount", "100 Coins (Payout)")
                put("date", dateStr)
                put("status", "Success")
            }
            jsonArray.put(newObj)
            prefs.edit().putString("redeem_history", jsonArray.toString()).apply()

            Toast.makeText(this, "Redemption successful! 100 coins processed.", Toast.LENGTH_LONG).show()
            loadDashboardData()
        }
    }

    override fun onResume() {
        super.onResume()
        loadDashboardData()
    }

    private fun loadDashboardData() {
        val prefs = UserSession.getUserPrefs(this)
        val coins = prefs.getInt("coins", 0)
        availableCoinsTextView.text = "$coins Coins"

        val historyJsonStr = prefs.getString("redeem_history", "[]") ?: "[]"
        val jsonArray = JSONArray(historyJsonStr)
        val historyList = mutableListOf<RedeemHistoryAdapter.RedeemItem>()

        for (i in 0 until jsonArray.length()) {
            val obj = jsonArray.getJSONObject(i)
            historyList.add(
                RedeemHistoryAdapter.RedeemItem(
                    amount = obj.getString("amount"),
                    date = obj.getString("date"),
                    status = obj.getString("status")
                )
            )
        }

        if (historyList.isEmpty()) {
            emptyHistoryTextView.visibility = View.VISIBLE
            historyRecyclerView.visibility = View.GONE
        } else {
            emptyHistoryTextView.visibility = View.GONE
            historyRecyclerView.visibility = View.VISIBLE
            historyRecyclerView.adapter = RedeemHistoryAdapter(historyList)
        }
    }
}
