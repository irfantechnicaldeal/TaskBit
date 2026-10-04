package com.example.taskbit

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class RedeemHistoryAdapter(
    private val historyList: List<RedeemItem>
) : RecyclerView.Adapter<RedeemHistoryAdapter.HistoryViewHolder>() {

    data class RedeemItem(
        val amount: String,
        val date: String,
        val status: String
    )

    class HistoryViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val amountTextView: TextView = view.findViewById(R.id.historyAmountTextView)
        val dateTextView: TextView = view.findViewById(R.id.historyDateTextView)
        val statusTextView: TextView = view.findViewById(R.id.historyStatusTextView)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HistoryViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_redemption_history, parent, false)
        return HistoryViewHolder(view)
    }

    override fun onBindViewHolder(holder: HistoryViewHolder, position: Int) {
        val item = historyList[position]
        holder.amountTextView.text = item.amount
        holder.dateTextView.text = item.date
        holder.statusTextView.text = item.status
    }

    override fun getItemCount(): Int = historyList.size
}
