package com.example.taskbit

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton

class TaskAdapter(
    private val taskList: List<Int>,
    private val onTaskClick: (Int) -> Unit
) : RecyclerView.Adapter<TaskAdapter.TaskViewHolder>() {

    class TaskViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val titleTextView: TextView = view.findViewById(R.id.itemTaskTitleTextView)
        val startButton: MaterialButton = view.findViewById(R.id.itemStartButton)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TaskViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_task, parent, false)
        return TaskViewHolder(view)
    }

    override fun onBindViewHolder(holder: TaskViewHolder, position: Int) {
        val taskNum = taskList[position]
        holder.titleTextView.text = "Task #$taskNum. Watch Task - Start"
        holder.startButton.setOnClickListener {
            onTaskClick(taskNum)
        }
        holder.itemView.setOnClickListener {
            onTaskClick(taskNum)
        }
    }

    override fun getItemCount(): Int = taskList.size
}
