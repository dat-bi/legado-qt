# Legado Engine Analysis: Technical Code Map

This document outlines the core architecture of the Legado engine, focusing on performance, anti-detection, and asynchronous processing.

---

## 1. WebView Pool (Efficiency & Memory Management)
**Location:** `app/src/main/java/io/legado/app/help/webView/WebViewPool.kt`

Legado avoids the overhead of creating new WebView instances by maintaining a "warm" pool.

### Key Functions & Logic:
- **`acquire(context)`**: 
  - Retrieves a WebView from the `idlePool` (Stack).
  - Uses `MutableContextWrapper` to update the new `Context` via the `upContext(context)` function.
- **`release(pooledWebView)`**: 
  - Resets the WebView to a "clean" state by loading `about:blank`.
  - Calls `onPause()` and `pauseTimers()` to stop all background activities.
  - Pushes the instance back into the `idlePool`.
- **`createNewWebView()`**: Initializes a new `VisibleWebView` with default configurations (JS enabled, DOM storage enabled, etc.).
- **`preInitWebView(webView)`**: Configures optimal `WebSettings` (Mixed content mode, Zoom controls, etc.).
- **`startCleanupTimer()`**: A background Coroutine that automatically calls `destroy()` on WebViews that have been idle for >5-30 minutes to free up memory.

---

## 2. Async/Await Bridge (Rhino ↔ Kotlin ↔ WebView)
**Location:** 
- `app/src/main/java/io/legado/app/help/JsExtensions.kt` (Rhino Entry Point)
- `app/src/main/java/io/legado/app/help/http/BackstageWebView.kt` (Async Implementation)
- `app/src/main/java/io/legado/app/help/webView/WebJsExtensions.kt` (WebView Interface)

Since Rhino is a synchronous engine (no native Event Loop), Legado uses Kotlin Coroutines to bridge the gap between sequential scripts and asynchronous WebView tasks.

### The Logic Flow & Key Functions:
1. **Rhino Script** calls `java.webViewAwait(url)`.
2. **Rhino Side (`JsExtensions.kt`)**: 
   - **Function**: `webView(...)`
   - **Logic**: Uses `runBlocking(context) { ... }` to **freeze** the Java thread running the Rhino script until the Coroutine completes.
3. **Async Handler (`BackstageWebView.kt`)**:
   - **Function**: `getStrResponse()`
   - **Logic**: Uses `suspendCancellableCoroutine` to transform the WebView's callback-based API (like `onPageFinished`) into a `suspend` function.
   - **Timeout**: Wrapped in `withTimeout(60000L)` to ensure the thread is released and resources are cleaned up even if the page hangs.
4. **WebView Bridge (`WebJsExtensions.kt`)**:
   - **Function**: `@JavascriptInterface fun request(...)`
   - **Logic**: Dispatches asynchronous requests (like `ajaxAwait` or `webViewAwait`) from the WebView's internal JS engine back to the Kotlin layer using `Coroutine.async`.
5. **Completion**: Once the WebView callback triggers `continuation.resume(result)`, the `runBlocking` block finishes and returns the data to the Rhino script.
6. **Result**: To the JS developer, it looks like a simple synchronous function call, but it's non-blocking for the rest of the application.

---

## 3. Anonymous WebJs Bridge (Anti-Detection)
**Location:** `app/src/main/java/io/legado/app/help/webView/WebJsExtensions.kt`

Legado hides the bridge to prevent websites (using Cloudflare Turnstile, reCAPTCHA, etc.) from detecting the scraping tool.

### Mechanisms & Specific Implementation:
- **`uuid` / `uuid2`**: Uses `UUID.randomUUID()` to generate unique, random identification strings for each session.
- **`nameJava` / `nameUrl`**: Lazy variables that create random property names (e.g., `window.qae52x`) instead of using fixed names like `window.java` or `window.android`.
- **`JS_INJECTION`**: The core Javascript snippet injected into the WebView:
  1. Captures the Bridge into a local variable: `const java = window.$nameJava;`.
  2. Immediately removes the Bridge from the global window: `delete window.$nameJava;`.
  3. Muffles console errors by overriding `console.log` to prevent debugging leakage.
- **`$JSBridgeResult`**: The callback function name is also randomized to prevent anti-crawler scripts from scanning for functions that receive results from the native layer.

---

## 4. Cronet Integration & Session Sync
**Location:** 
- `app/src/main/java/io/legado/app/help/http/BackstageWebView.kt` (Usage)
- `app/src/main/java/io/legado/app/help/http/Cronet.kt` (Configuration)

Legado uses Google's **Cronet** (Chromium Network Stack) instead of standard OkHttp for high-performance networking and better integration with WebView.

### Key Logic & Usage:
- **`loadDataWithBaseURL(url, html, ...)`**: Used in `BackstageWebView.kt` (approx. line 136) to load custom/modified HTML while assigning it a real website's identity (Base URL). This bypasses CORS and ensures relative assets (images/scripts) are loaded correctly.
- **`CronetEngine.Builder`**: Configured in `Cronet.kt` to enable HTTP/3 (QUIC), caching, and unified Cookie management with the `WebView` via the system `CookieManager`.
- **`loadUrl(url, headerMap)`**: Supports loading URLs with custom Headers (e.g., `Referer`, `Cookie`, `Origin`) to bypass initial server-side bot checks.

---

## 5. Native Crypto Bridge (Performance)
**Location:** `app/src/main/java/io/legado/app/help/JsEncodeUtils.kt`

Bypasses the slow Rhino JS execution for computationally heavy math tasks.

### Key Functions Exposed to JS:
- **`md5Encode(str)`**: Native MD5 hashing.
- **`createSymmetricCrypto(transformation, key, iv)`**: Creates symmetric encryption objects (AES, DES, 3DES). Supports methods like `.encryptBase64()` and `.decryptStr()`.
- **`createAsymmetricCrypto(transformation)`**: Creates RSA objects for encryption/decryption using Public/Private keys.
- **`createSign(algorithm)`**: Creates digital signatures (Sign).
- **`digestHex(data, algorithm)`**: Generates Message Digests (SHA-256, SHA-512, etc.).
- **`HMacHex(data, algorithm, key)`**: Generates Hash-based Message Authentication Codes.
- **Hutool Library**: Legado uses the `cn.hutool.crypto` library as the backend for all these native functions.

---

## Summary for Developers (vBook Roadmap)

1. **Implement a Global WebView Pool** with `MutableContextWrapper` to avoid Cold Start CPU spikes.
2. **Expose Native Crypto APIs** to avoid the performance hit of parsing large JS crypto libraries in Rhino.
3. **Use Coroutines (`runBlocking`)** to wrap asynchronous WebView/Network tasks for the synchronous script environment.
4. **Randomize Bridge Names** and delete global references immediately after injection to evade detection.
5. **Prioritize `loadDataWithBaseURL`** for all custom HTML injections to maintain the security context and Origin identity.
