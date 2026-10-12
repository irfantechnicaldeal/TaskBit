package com.example.taskbit

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.taskbit.api.TaskModel
import com.google.android.material.button.MaterialButton

class TaskAdapter(
    private val taskList: List<TaskModel>,
    private val onTaskClick: (TaskModel) -> Unit
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
        val task = taskList[position]
        holder.titleTextView.text = task.title
        holder.startButton.text = if (task.completed) "Completed" else "Start"
        holder.startButton.isEnabled = !task.completed
        holder.startButton.setOnClickListener {
            if (!task.completed) onTaskClick(task)
        }
        holder.itemView.setOnClickListener {
            if (!task.completed) onTaskClick(task)
        }
    }

    override fun getItemCount(): Int = taskList.size
}
