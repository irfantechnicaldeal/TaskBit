package com.example.taskbit.api

import retrofit2.Call
import retrofit2.http.*

interface ApiService {
    @GET("tasks")
    fun getTasks(): Call<List<TaskModel>>

    @POST("tasks")
    fun createTask(@Body task: TaskModel): Call<TaskModel>

    @PUT("tasks/{id}")
    fun updateTask(@Path("id") id: String, @Body task: TaskModel): Call<TaskModel>

    @DELETE("tasks/{id}")
    fun deleteTask(@Path("id") id: String): Call<Void>

    @POST("auth/register")
    fun register(@Body request: AuthRequest): Call<AuthResponse>

    @POST("auth/login")
    fun login(@Body request: AuthRequest): Call<AuthResponse>

    @POST("users")
    fun createUser(@Body user: UserModel): Call<UserModel>

    @GET("users")
    fun getUsers(): Call<List<UserModel>>

    @GET("users/{id}")
    fun getUser(@Path("id") id: String): Call<UserModel>

    @PUT("users/{id}")
    fun updateUser(@Path("id") id: String, @Body user: UserModel): Call<UserModel>

    @PUT("users/{id}/points")
    fun updatePoints(@Path("id") id: String, @Body pointsMap: Map<String, Any>): Call<UserModel>

    @POST("bank-details")
    fun saveBankDetails(@Body bankDetails: BankDetailsModel): Call<BankDetailsModel>

    @GET("bank-details/{userId}")
    fun getBankDetails(@Path("userId") userId: String): Call<BankDetailsModel>
}
