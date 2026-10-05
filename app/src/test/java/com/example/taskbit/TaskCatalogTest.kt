package com.example.taskbit

import com.example.taskbit.api.TaskModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TaskCatalogTest {
    @Test
    fun backendTasksArePreservedWithNumberedTasksSortedFirst() {
        val shuffled = (50 downTo 1).map { number ->
            TaskModel(
                id = "id-$number",
                title = "Task #$number",
                youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                taskNumber = number
            )
        } + TaskModel(id = "legacy", title = "Legacy task", youtubeUrl = "https://youtu.be/LJqPssrMGu0")

        val ordered = TaskCatalog.orderedBackendTasks(shuffled)

        assertEquals((1..50).toList(), ordered.take(50).map { it.taskNumber })
        assertEquals("id-1", ordered.first().id)
        assertEquals("id-50", ordered[49].id)
        assertEquals("legacy", ordered.last().id)
    }

    @Test
    fun supportedYouTubeUrlFormsAreTrimmedAndPreserved() {
        val watchUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        val shortUrl = "https://youtu.be/LJqPssrMGu0?si=source"

        assertEquals(watchUrl, TaskVideoUrl.normalize("  $watchUrl  "))
        assertEquals(shortUrl, TaskVideoUrl.normalize(shortUrl))
        assertNull(TaskVideoUrl.normalize("https://example.com/video"))
    }
}
