package com.example.taskbit

import com.example.taskbit.api.TaskModel
import java.net.URI

object TaskCatalog {
    fun orderedBackendTasks(tasks: List<TaskModel>): List<TaskModel> {
        return tasks.sortedBy { task ->
            task.taskNumber
                ?: extractNumberFromTitle(task.title)
                ?: Int.MAX_VALUE
        }
    }

    private fun extractNumberFromTitle(title: String?): Int? {
        if (title.isNullOrBlank()) return null
        val regex = Regex("""#(\d+)""")
        val match = regex.find(title)
        return match?.groupValues?.get(1)?.toIntOrNull()
    }
}

object TaskVideoUrl {
    fun normalize(rawUrl: String?): String? {
        val value = rawUrl?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val uri = runCatching { URI(value) }.getOrNull() ?: return null
        if (!uri.scheme.equals("https", ignoreCase = true)) return null

        val host = uri.host?.lowercase() ?: return null
        val path = uri.path.orEmpty().trim('/')
        val isValidYouTubeUrl = when (host) {
            "youtu.be" -> path.isNotEmpty()
            "youtube.com", "www.youtube.com", "m.youtube.com" -> when {
                path == "watch" -> uri.rawQuery.orEmpty().split('&').any {
                    it.substringBefore('=') == "v" && it.substringAfter('=', "").isNotBlank()
                }
                else -> path.substringAfter('/', "").isNotBlank()
            }
            else -> false
        }
        return value.takeIf { isValidYouTubeUrl }
    }
}
