package com.example.taskbit

import com.example.taskbit.api.TaskModel

object TaskCatalog {
    fun orderedBackendTasks(tasks: List<TaskModel>): List<TaskModel> =
        tasks.asSequence()
            .sortedWith(compareBy<TaskModel> { it.taskNumber == null }.thenBy { it.taskNumber ?: Int.MAX_VALUE })
            .toList()
}

object TaskVideoUrl {
    fun normalize(rawUrl: String?): String? {
        val value = rawUrl?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val uri = runCatching { java.net.URI(value) }.getOrNull() ?: return null
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
