package com.example.taskbit.config

class YouTubeConfigRepository {
    private var youtubeUrl: String = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    fun getYouTubeUrl(): String = youtubeUrl

    fun setYouTubeUrl(url: String) {
        youtubeUrl = url
    }
}
