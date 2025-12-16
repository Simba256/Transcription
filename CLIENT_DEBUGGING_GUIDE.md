# 🔍 Client Debugging Guide - Transcription Processing Issues

## For Clients Experiencing Upload/Processing Errors

If you're experiencing issues with transcription processing (405 errors, timeouts, stuck processing), follow these steps to help us diagnose the problem.

---

## 📋 Step-by-Step Debugging Instructions

### **Step 1: Open Browser Console**

1. **Chrome/Edge**: Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
2. **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
3. **Safari**: Enable Developer Menu in Preferences → Advanced, then press `Cmd+Option+C`

### **Step 2: Clear Previous Logs**

1. Click the "Clear console" button (🚫 icon) in the console
2. This ensures you only capture logs from your current session

### **Step 3: Reproduce the Issue**

1. Stay on the upload page with console open
2. Select your audio/video file(s)
3. Choose transcription mode (AI)
4. Click "Start Transcription"
5. **Keep the console open** - DO NOT close or refresh the page

### **Step 4: Look for These Log Sections**

You should see logs organized like this:

```
[Upload] ==================== UPLOAD SESSION START ====================
[Health Check] Starting API endpoint health check...
[Upload][client_XXXXX] ==================== TRANSCRIPTION PROCESSING START ====================
[Upload][client_XXXXX] Client Environment: {...}
[Upload][client_XXXXX][Attempt 1/3] Starting processing...
```

### **Step 5: Capture the Logs**

#### **If you see error messages:**

Look for logs marked with ❌ or containing:
- `[Attempt X/X] ❌ FAILED`
- `405` status code
- `Failed to fetch`
- `NetworkError`
- `CORS`
- `ALL ATTEMPTS FAILED`

#### **How to save the logs:**

**Method 1: Copy All Logs**
1. Right-click in the console
2. Select "Save as..." or "Export console logs"
3. Save as `console-logs-[YOUR-NAME]-[DATE].txt`

**Method 2: Screenshot**
1. Take screenshots of the error messages
2. Make sure the **client ID** is visible (format: `client_1234567890_abcdef`)

**Method 3: Copy Specific Logs**
1. Right-click on log entries
2. Select "Copy object" or "Copy"
3. Paste into a text file

---

## 🎯 What to Look For

### **Client ID** (CRITICAL)
Every session has a unique client ID like:
```
[Upload][client_1702938472_a8b9c]
```
**You MUST include this client ID when contacting support!**

### **Common Error Patterns**

#### **1. 405 Method Not Allowed**
```
[Upload][client_XXX][Attempt 1] Response not OK, status: 405
```
**Meaning**: The API endpoint isn't accepting POST requests
**Action**: Send us the full log with client ID

#### **2. Network Timeout**
```
[Upload][client_XXX][Attempt 1] Request timeout after 30 seconds
```
**Meaning**: Request took too long to respond
**Possible causes**: Slow internet, VPN issues, firewall blocking

#### **3. Failed to Fetch**
```
[Upload][client_XXX][Attempt 1] Network error - fetch failed (possible CORS, DNS, or connection issue)
```
**Meaning**: Browser couldn't reach the server
**Possible causes**: Network issue, DNS problem, corporate firewall, ad blocker

#### **4. CORS Error**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**Meaning**: Browser security blocking the request
**Action**: Check if you're using VPN, proxy, or have browser extensions blocking requests

---

## 🌐 Environment Information to Collect

The logs automatically capture:
- ✅ Your browser and version
- ✅ Your timezone and location
- ✅ Network status (online/offline)
- ✅ Request timing (how long each step took)
- ✅ All HTTP headers sent and received
- ✅ Your IP address (for geographical blocking analysis)

**Additional info you should note:**
- Are you on a corporate/office network?
- Are you using a VPN?
- Are you using any browser extensions (ad blockers, privacy tools)?
- What country/region are you in?
- What ISP (Internet Service Provider) are you using?

---

## 📧 What to Send to Support

### **Required Information:**

1. **Client ID** (from error message or logs)
   ```
   Example: client_1702938472_a8b9c
   ```

2. **Error Type**
   - "405 Method Not Allowed"
   - "Timeout"
   - "Network Error"
   - "Stuck in Processing"
   - Other (describe)

3. **Console Logs**
   - Full export if possible
   - OR screenshots of error sections
   - Must include lines with `[Upload][client_XXXXX]`

4. **Environment Details**
   - Browser (Chrome, Firefox, Safari, Edge)
   - Version number (Help → About)
   - Operating System (Windows, Mac, Linux)
   - Location/Country
   - Network type (Office, Home, Mobile, VPN)

### **Email Template:**

```
Subject: Transcription Processing Error - Client ID: [YOUR_CLIENT_ID]

Hi Support,

I'm experiencing issues uploading transcriptions. Here are the details:

Client ID: client_XXXXXXXXXXXXX
Error Type: [405 / Timeout / Network / Other]
Date/Time: [When the error occurred]

Browser: [Chrome 120 / Firefox 121 / etc.]
OS: [Windows 11 / macOS 14 / etc.]
Location: [Canada / USA / etc.]
Network: [Home / Office / VPN]

Attached/Pasted Console Logs:
[Paste logs here or attach file]

Additional Notes:
[Any other relevant information]
```

---

## 🔧 Quick Fixes to Try

### **Before Contacting Support:**

1. **Refresh the page** and try again
2. **Clear browser cache**:
   - Chrome: `Ctrl+Shift+Delete` → Clear cached images and files
   - Firefox: `Ctrl+Shift+Delete` → Cached Web Content
3. **Disable browser extensions** temporarily
4. **Try a different browser** (Chrome, Firefox, Edge)
5. **Try a different network** (mobile hotspot, home WiFi vs office)
6. **Disable VPN** if you're using one
7. **Check your internet connection** is stable

---

## 🆘 Emergency Workaround

If nothing works and you need urgent transcription:

1. **Contact support immediately** with your client ID
2. **Try from a different device** (phone, tablet, different computer)
3. **Try from a different location** (home vs office)
4. **Use a different browser in incognito/private mode**

---

## 📞 Support Contacts

- **Email**: [Your support email]
- **Include**: Client ID from error message
- **Subject**: Start with "Transcription Error - Client ID: XXX"

---

## 🎓 Technical Details (Optional Reading)

### What the Logs Mean:

**Client-Side** (`[Upload][client_XXX]`):
- These logs show what's happening in YOUR browser
- Includes network requests, responses, and errors
- Helps identify if the problem is on your side

**Server-Side** (`[POST][req_XXX]`):
- These logs (visible to support team) show what's happening on our servers
- They can see if your request reached us
- Helps identify if the problem is on our side

### Request Flow:

```
1. [Health Check] - Tests if API is reachable
2. [Upload] - Upload file to storage
3. [Create Job] - Create database entry
4. [Process Request] - Start transcription
   └─ Attempt 1 (immediate)
   └─ Attempt 2 (after 1 second)
   └─ Attempt 3 (after 2 seconds)
```

If all 3 attempts fail, we need your logs to investigate!

---

## ✅ Success Indicators

If everything works, you'll see:
```
[Upload][client_XXX][Attempt 1] ✅ SUCCESS - Processing started for job XXX
[Upload][client_XXX] ==================== TRANSCRIPTION PROCESSING END ====================
```

Then your transcription will show "Processing" status and complete within the expected time.

---

**Last Updated**: December 2025
**Version**: 2.0 (With extensive logging)
