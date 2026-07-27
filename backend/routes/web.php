<?php

use App\Modules\Nucleo\Http\Controllers\AuthController;
use App\Modules\Nucleo\Http\Controllers\PasswordResetController;
use App\Modules\Nucleo\Http\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Sesion/cookie (Sanctum SPA): CSRF + guard 'web' -- nunca tokens Bearer.
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/login/2fa-verify', [TwoFactorController::class, 'verifyLogin'])->middleware('throttle:two-factor');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::post('/password/forgot', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:6,1');
Route::post('/password/reset', [PasswordResetController::class, 'reset'])->middleware('throttle:6,1');
