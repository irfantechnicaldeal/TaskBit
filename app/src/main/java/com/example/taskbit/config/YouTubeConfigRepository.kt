package com.example.taskbit.config

class YouTubeConfigRepository {
    private var youtubeUrl: String = ""

    fun getYouTubeUrl(): String = youtubeUrl

    fun setYouTubeUrl(url: String) {
        youtubeUrl = url
    }
}
