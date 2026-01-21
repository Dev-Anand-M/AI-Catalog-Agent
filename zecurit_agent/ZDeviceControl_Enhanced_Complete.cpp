// ZDeviceControl_Enhanced_Complete.cpp
// Enhanced Device Access Control Module for Zecurit Agent
// Complete implementation with all security fixes and enterprise features
// Compile in Visual Studio (x64) - must run elevated (Administrator)

#pragma comment(lib, "setupapi.lib")
#pragma comment(lib, "cfgmgr32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")

#include <WinSock2.h>
#include <windows.h>
#include <cguid.h>
#define INITGUID
#include <initguid.h>
#include <setupapi.h>
#include <cfgmgr32.h>
#include <tlhelp32.h>
#include <devguid.h>
#include <dbt.h>
#include <lmcons.h>
#include <wbemidl.h>
#include <comdef.h>

#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <algorithm>
#include <memory>
#include <mutex>
#include <chrono>
#include <unordered_set>
#include <unordered_map>
#include <sstream>

#include "plog/Log.h"
#include "plog/Initializers/RollingFileInitializer.h"
#include <globalVars.h>
#include <JsonCppWrapper.h>
#include <AgentDetailsHandler.h>

// ============================================
// ENHANCED CONSTANTS AND CONFIGURATION
// ============================================
#define DEVICE_CONTROL_LOG_FILE "device_access_control.log"
#define WHITELIST_FILE L"device_whitelist.txt"
#define CONFIG_FILE L"device_control_config.json"
#define MAX_DEVICE_NAME_LENGTH 512
#define MAX_HARDWARE_ID_LENGTH 1024
#define MAX_INSTANCE_ID_LENGTH 512
#define DEFAULT_COMMAND_TIMEOUT_MS 10000
#define MAX_CHILD_PROCESSES 3
#define PROCESS_SYNC_MUTEX_NAME L"ZecuritDeviceControlMutex"

// ============================================
// ENHANCED CONFIGURATION STRUCTURE
// ============================================
struct DeviceControlConfig {
    int commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS;
    int maxRetryAttempts = 3;
    int deviceScanDelayMs = 1000;
    bool enableAuditLogging = true;
    bool enablePerformanceMonitoring = true;
    std::vector<int> childProcessDelays = {5000};  // Single child process after 5 seconds
    std::wstring logLevel = L"INFO";
};

// ============================================
// POLICY ACTIONS (UI Contract - 4 Actions Only)
// ============================================
typedef enum {
    ACTION_NOT_CONFIGURED = 0,
    ACTION_ALLOW = 1,
    ACTION_BLOCK = 2,
    ACTION_ALLOW_ON_TRUSTED = 3
} PolicyAction;

// ============================================
// ENHANCED DEVICE CATEGORY STRUCTURE
// ============================================
struct DeviceCategory {
    std::string jsonKey;
    std::wstring displayName;
    std::string enumerator;
    const GUID* classGuid;
    PolicyAction action;
    std::string vendorId;
    int priority;  // For enforcement order
    bool requiresReboot;  // Some changes need reboot

    DeviceCategory(const std::string& key, const std::wstring& name,
                   const std::string& enum_val, const GUID* guid,
                   PolicyAction act = ACTION_NOT_CONFIGURED,
                   const std::string& vid = "", int prio = 0, bool reboot = false)
        : jsonKey(key), displayName(name), enumerator(enum_val),
          classGuid(guid), action(act), vendorId(vid), priority(prio), requiresReboot(reboot) {}
};

// ============================================
// ENHANCED GLOBAL STATE WITH THREAD SAFETY
// ============================================
class DeviceControlState {
private:
    std::mutex stateMutex;
    std::vector<std::wstring> whitelist;
    std::vector<DeviceCategory> categories;
    DeviceControlConfig config;
    std::unordered_set<std::wstring> processedDevices;  // Prevent duplicate processing

public:
    // Thread-safe accessors
    std::vector<std::wstring> GetWhitelist() {
        std::lock_guard<std::mutex> lock(stateMutex);
        return whitelist;
    }

    void SetWhitelist(const std::vector<std::wstring>& newWhitelist) {
        std::lock_guard<std::mutex> lock(stateMutex);
        whitelist = newWhitelist;
    }

    std::vector<DeviceCategory> GetCategories() {
        std::lock_guard<std::mutex> lock(stateMutex);
        return categories;
    }

    void SetCategories(const std::vector<DeviceCategory>& newCategories) {
        std::lock_guard<std::mutex> lock(stateMutex);
        categories = newCategories;
    }

    DeviceControlConfig GetConfig() {
        std::lock_guard<std::mutex> lock(stateMutex);
        return config;
    }

    void SetConfig(const DeviceControlConfig& newConfig) {
        std::lock_guard<std::mutex> lock(stateMutex);
        config = newConfig;
    }

    bool IsDeviceProcessed(const std::wstring& deviceId) {
        std::lock_guard<std::mutex> lock(stateMutex);
        return processedDevices.find(deviceId) != processedDevices.end();
    }

    void MarkDeviceProcessed(const std::wstring& deviceId) {
        std::lock_guard<std::mutex> lock(stateMutex);
        processedDevices.insert(deviceId);
    }

    void ClearProcessedDevices() {
        std::lock_guard<std::mutex> lock(stateMutex);
        processedDevices.clear();
    }
};

// Global state instance
DeviceControlState g_deviceState;

// Process synchronization
HANDLE g_processMutex = nullptr;

// Cached system type detection (performance optimization)
bool g_isLaptop = false;
bool g_isLaptopCached = false;

// Cached internal device detection (performance optimization)
std::unordered_map<std::string, bool> g_internalDeviceCache;
std::mutex g_internalDeviceCacheMutex;

// GUIDs
DEFINE_GUID(GUID_DEVINTERFACE_USB_DEVICE, 0xA5DCBF10, 0x6530, 0x11D2, 0x90, 0x1F, 0x00, 0xC0, 0x4F, 0xB9, 0x51, 0xED);

// Enhanced mobile phone vendor IDs
const char* MOBILE_VIDS[] = {
    "2717", "18D1", "04E8", "22B8", "0BB4", "12D1", "2A70", "05C6",
    "1004", "0FCE", "2916", "19D2", "1BBB", "0E8D", "2D95", "2A45",
    "1782", "2970", "0489", "1F3A", "17EF", "0955", "2916", "1EBF", NULL
};

// ============================================
// FORWARD DECLARATIONS
// ============================================
bool IsInternalWirelessAdapter(const std::string& instanceIdUpper, const std::string& hardwareIdUpper);
LONG WINAPI EnhancedExceptionHandler(EXCEPTION_POINTERS* exceptionInfo);
void CleanupResources();
void EnforceAllPoliciesWithRetrySecure(int maxAttempts);
int CountEnabledKeyboardsSecure();

// ============================================
// ENHANCED UTILITY FUNCTIONS WITH SECURITY
// ============================================

// Secure string conversion with bounds checking
std::wstring SecureStringToWString(const std::string& str) {
    if (str.empty()) return std::wstring();

    // Use UTF-8 instead of system codepage for better international support
    int size = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, NULL, 0);
    if (size <= 0) {
        LOG_ERROR << "Failed to convert string to wide string";
        return std::wstring();
    }

    std::wstring wstr(size - 1, 0);
    int result = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &wstr[0], size);
    if (result == 0) {
        LOG_ERROR << "String conversion failed with error: " << GetLastError();
        return std::wstring();
    }

    return wstr;
}

std::string SecureWStringToString(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();

    int size = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, NULL, 0, NULL, NULL);
    if (size <= 0) {
        LOG_ERROR << "Failed to convert wide string to string";
        return std::string();
    }

    std::string str(size - 1, 0);
    int result = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, &str[0], size, NULL, NULL);
    if (result == 0) {
        LOG_ERROR << "Wide string conversion failed with error: " << GetLastError();
        return std::string();
    }

    return str;
}

// Secure input sanitization - Instance ID safe (allows backslashes and colons)
std::wstring SanitizeInstanceId(const std::wstring& input) {
    std::wstring out;
    for (wchar_t c : input) {
        // Drop control characters
        if (c < 0x20) continue;
        // Block obviously dangerous single characters but allow backslash and colon
        if (c == L'|' || c == L';' || c == L'&') continue;
        out.push_back(c);
    }
    if (out.length() > MAX_INSTANCE_ID_LENGTH) {
        out = out.substr(0, MAX_INSTANCE_ID_LENGTH);
        LOG_WARNING << L"Instance ID truncated for security: " << out;
    }
    return out;
}

// Secure path sanitization (allows path characters)
std::wstring SanitizePath(const std::wstring& input) {
    std::wstring out;
    for (wchar_t c : input) {
        // Drop control characters
        if (c < 0x20) continue;
        // Block dangerous characters but allow path characters
        if (c == L'|' || c == L';' || c == L'&' || c == L'<' || c == L'>') continue;
        out.push_back(c);
    }
    if (out.length() > MAX_PATH) {
        out = out.substr(0, MAX_PATH);
        LOG_WARNING << L"Path truncated for security: " << out;
    }
    return out;
}

// Legacy sanitizer for backward compatibility (deprecated - use specific sanitizers above)
std::wstring SanitizeInput(const std::wstring& input) {
    LOG_WARNING << L"Using deprecated SanitizeInput - use SanitizeInstanceId or SanitizePath instead";
    return SanitizeInstanceId(input);
}

// Enhanced VID/PID extraction with validation
bool SecureExtractVidPid(const std::string& hardwareId, std::string& vid, std::string& pid) {
    vid.clear();
    pid.clear();

    if (hardwareId.empty() || hardwareId.length() > MAX_HARDWARE_ID_LENGTH) {
        LOG_WARNING << "Invalid hardware ID length";
        return false;
    }

    // Convert to uppercase for consistent parsing
    std::string upperHwId = hardwareId;
    std::transform(upperHwId.begin(), upperHwId.end(), upperHwId.begin(), ::toupper);

    size_t vPos = upperHwId.find("VID_");
    size_t pPos = upperHwId.find("PID_");

    if (vPos != std::string::npos && vPos + 8 <= upperHwId.length()) {
        vid = upperHwId.substr(vPos + 4, 4);
        // Validate VID format (should be hex)
        if (vid.find_first_not_of("0123456789ABCDEF") != std::string::npos) {
            LOG_WARNING << "Invalid VID format: " << vid;
            vid.clear();
            return false;
        }
    }

    if (pPos != std::string::npos && pPos + 8 <= upperHwId.length()) {
        pid = upperHwId.substr(pPos + 4, 4);
        // Validate PID format (should be hex)
        if (pid.find_first_not_of("0123456789ABCDEF") != std::string::npos) {
            LOG_WARNING << "Invalid PID format: " << pid;
            pid.clear();
            return false;
        }
    }

    return !vid.empty() || !pid.empty();
}
// ============================================
// ENHANCED LAPTOP DETECTION WITH WMI
// ============================================
bool IsLaptopEnhanced() {
    // First try the simple battery check
    SYSTEM_POWER_STATUS powerStatus;
    if (GetSystemPowerStatus(&powerStatus)) {
        if (powerStatus.BatteryFlag != 128) {  // 128 = no battery
            LOG_DEBUG << L"Laptop detected via battery presence";
            return true;
        }
    }

    // Enhanced WMI-based chassis type detection
    HRESULT hr = CoInitializeEx(0, COINIT_MULTITHREADED);
    bool comInitialized = SUCCEEDED(hr);
    if (!comInitialized) {
        LOG_WARNING << L"Failed to initialize COM for WMI";
        return false;  // Default to desktop if WMI fails
    }

    bool isLaptop = false;
    IWbemLocator* pLoc = nullptr;
    IWbemServices* pSvc = nullptr;

    try {
        // Create WMI locator
        hr = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                             IID_IWbemLocator, (LPVOID*)&pLoc);
        if (FAILED(hr)) throw hr;

        // Connect to WMI
        hr = pLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0, NULL, 0, 0, &pSvc);
        if (FAILED(hr)) throw hr;

        // Set security levels
        hr = CoSetProxyBlanket(pSvc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, NULL,
                              RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE);
        if (FAILED(hr)) throw hr;

        // Query chassis information
        IEnumWbemClassObject* pEnumerator = nullptr;
        hr = pSvc->ExecQuery(bstr_t("WQL"),
                            bstr_t("SELECT ChassisTypes FROM Win32_SystemEnclosure"),
                            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
                            NULL, &pEnumerator);
        if (FAILED(hr)) throw hr;

        IWbemClassObject* pclsObj = nullptr;
        ULONG uReturn = 0;

        while (pEnumerator) {
            hr = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);
            if (uReturn == 0) break;

            VARIANT vtProp;
            VariantInit(&vtProp);

            hr = pclsObj->Get(L"ChassisTypes", 0, &vtProp, 0, 0);
            if (SUCCEEDED(hr) && vtProp.vt == (VT_ARRAY | VT_I4)) {
                SAFEARRAY* psa = vtProp.parray;
                long lBound, uBound;
                SafeArrayGetLBound(psa, 1, &lBound);
                SafeArrayGetUBound(psa, 1, &uBound);

                for (long i = lBound; i <= uBound; i++) {
                    long chassisType;
                    SafeArrayGetElement(psa, &i, &chassisType);

                    // Chassis types: 8=Portable, 9=Laptop, 10=Notebook, 14=Sub Notebook
                    if (chassisType == 8 || chassisType == 9 || chassisType == 10 || chassisType == 14) {
                        isLaptop = true;
                        LOG_INFO << L"Laptop detected via WMI chassis type: " << chassisType;
                        break;
                    }
                }
            }

            VariantClear(&vtProp);
            pclsObj->Release();
            if (isLaptop) break;
        }

        if (pEnumerator) pEnumerator->Release();

    } catch (HRESULT hr) {
        LOG_WARNING << L"WMI query failed with HRESULT: " << std::hex << hr;
    }

    if (pSvc) pSvc->Release();
    if (pLoc) pLoc->Release();
    if (comInitialized) {
        CoUninitialize();
    }

    // Fallback to registry-based detection if WMI fails
    if (!isLaptop) {
        HKEY hKey;
        if (RegOpenKeyExA(HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Control\\SystemInformation",
            0, KEY_READ, &hKey) == ERROR_SUCCESS) {

            char productName[256] = {0};
            DWORD size = sizeof(productName);
            DWORD type = REG_SZ;

            if (RegQueryValueExA(hKey, "SystemProductName", NULL, &type,
                (BYTE*)productName, &size) == ERROR_SUCCESS) {

                std::string product = productName;
                std::transform(product.begin(), product.end(), product.begin(), ::tolower);

                // Enhanced laptop keywords
                const std::vector<std::string> laptopKeywords = {
                    "laptop", "notebook", "portable", "thinkpad", "inspiron",
                    "pavilion", "elitebook", "probook", "zenbook", "vivobook",
                    "ideapad", "yoga", "surface", "macbook"
                };

                for (const auto& keyword : laptopKeywords) {
                    if (product.find(keyword) != std::string::npos) {
                        isLaptop = true;
                        LOG_INFO << L"Laptop detected via registry product name: " << SecureStringToWString(product);
                        break;
                    }
                }
            }
            RegCloseKey(hKey);
        }
    }

    LOG_INFO << L"System type determined: " << (isLaptop ? L"LAPTOP" : L"DESKTOP");
    return isLaptop;
}

// Cached version of IsLaptopEnhanced for performance
bool IsLaptopCached() {
    if (!g_isLaptopCached) {
        g_isLaptop = IsLaptopEnhanced();
        g_isLaptopCached = true;
        LOG_DEBUG << L"System type cached: " << (g_isLaptop ? L"LAPTOP" : L"DESKTOP");
    }
    return g_isLaptop;
}

// ============================================
// ENHANCED INTERNAL DEVICE DETECTION
// ============================================
bool IsInternalDeviceEnhanced(const std::string& instanceId, const std::string& hardwareId) {
    if (instanceId.empty()) {
        return false;
    }

    // Validate input lengths to prevent buffer overflows
    if (instanceId.length() > MAX_INSTANCE_ID_LENGTH ||
        (!hardwareId.empty() && hardwareId.length() > MAX_HARDWARE_ID_LENGTH)) {
        LOG_WARNING << "Device ID length exceeds maximum allowed";
        return false;
    }

    // Convert to uppercase for comparison
    std::string instUpper = instanceId;
    std::string hwUpper = hardwareId;
    std::transform(instUpper.begin(), instUpper.end(), instUpper.begin(), ::toupper);
    std::transform(hwUpper.begin(), hwUpper.end(), hwUpper.begin(), ::toupper);

    // Enhanced internal device patterns
    const std::vector<std::string> internalPatterns = {
        // ACPI devices (always internal)
        "ACPI\\",

        // I2C devices (modern laptop touchpads/keyboards)
        "I2C",

        // PS/2 devices
        "PNP030",  // PS/2 keyboard
        "PNP0F",   // PS/2 mouse

        // Common laptop touchpad vendors
        "SYN",      // Synaptics
        "ELAN",     // ELAN
        "VEN_04F3", // ELAN by vendor ID
        "VID_04F3", // ELAN USB touchpad
        "ALPS",     // Alps
        "CONVERTEDDEVICE",

        // Manufacturer-specific internal devices
        "DLLK",     // Dell internal keyboard
        "DLL0",     // Dell internal touchpad
        "LEN0",     // Lenovo internal devices
        "LEN1",     // Lenovo internal devices
        "LEN2",     // Lenovo internal devices
        "HPQ",      // HP internal devices
        "ASUE",     // ASUS internal devices
        "ASUP",     // ASUS precision touchpad
        "MSHW",     // Microsoft Surface devices
    };

    // Check for internal device patterns
    for (const auto& pattern : internalPatterns) {
        if (instUpper.find(pattern) != std::string::npos ||
            hwUpper.find(pattern) != std::string::npos) {
            return true;
        }
    }

    // Special case: Microsoft touchpad detection
    if (hwUpper.find("MSFT") != std::string::npos &&
        hwUpper.find("TOUCHPAD") != std::string::npos) {
        return true;
    }

    // Special case: Lenovo ACPI devices
    if (instUpper.find("ACPI\\LEN") != std::string::npos) {
        return true;
    }

    // ENHANCED: Internal wireless and Bluetooth adapter detection
    // These are built-in adapters, not external dongles
    if (IsInternalWirelessAdapter(instUpper, hwUpper)) {
        return true;
    }

    // HID devices without USB connection are likely internal
    if (instUpper.find("HID\\") == 0 && instUpper.find("USB") == std::string::npos) {
        if (instUpper.find("VID_") == std::string::npos) {
            return true;
        }
    }

    // If it's a Bluetooth service/remote device, it's not "internal" to the machine
    if (instUpper.find("BTHENUM\\") != std::string::npos) {
        return false;
    }

    // If no VID/PID and not USB, likely internal (PS/2, I2C, etc.)
    // But USB devices without VID might be external composite devices
    if (hwUpper.find("VID_") == std::string::npos &&
        instUpper.find("USB\\") == std::string::npos) {
        return true;
    }

    return false;
}

// Cached wrapper for IsInternalDeviceEnhanced (performance optimization)
bool IsInternalDeviceEnhancedCached(const std::string& instanceId, const std::string& hardwareId) {
    // Create cache key from instance ID (unique per device)
    std::string cacheKey = instanceId;

    // Check cache first
    {
        std::lock_guard<std::mutex> lock(g_internalDeviceCacheMutex);
        auto it = g_internalDeviceCache.find(cacheKey);
        if (it != g_internalDeviceCache.end()) {
            return it->second;
        }
    }

    // Not in cache, compute result
    bool result = IsInternalDeviceEnhanced(instanceId, hardwareId);

    // Store in cache
    {
        std::lock_guard<std::mutex> lock(g_internalDeviceCacheMutex);
        g_internalDeviceCache[cacheKey] = result;
    }

    return result;
}

// ============================================
// INTERNAL WIRELESS/BLUETOOTH ADAPTER DETECTION
// ============================================
bool IsInternalWirelessAdapter(const std::string& instanceIdUpper, const std::string& hardwareIdUpper) {
    // PCI-based adapters are typically internal (built into motherboard or M.2 slots)
    if (instanceIdUpper.find("PCI\\") == 0) {
        LOG_DEBUG << L"Internal adapter detected (PCI): " << SecureStringToWString(instanceIdUpper);
        return true;
    }

    // ACPI-enumerated wireless devices (integrated into system)
    if (instanceIdUpper.find("ACPI\\") == 0) {
        // Common ACPI wireless device patterns
        if (instanceIdUpper.find("BCM") != std::string::npos ||  // Broadcom
            instanceIdUpper.find("INT") != std::string::npos ||  // Intel
            instanceIdUpper.find("QCA") != std::string::npos ||  // Qualcomm Atheros
            instanceIdUpper.find("RTL") != std::string::npos) {  // Realtek
            LOG_DEBUG << L"Internal adapter detected (ACPI wireless): " << SecureStringToWString(instanceIdUpper);
            return true;
        }
    }

    // SDIO-based adapters (common in laptops and embedded systems)
    if (instanceIdUpper.find("SDIO\\") == 0) {
        LOG_DEBUG << L"Internal adapter detected (SDIO): " << SecureStringToWString(instanceIdUpper);
        return true;
    }

    // Internal USB adapters (some laptops have internal USB-connected wireless)
    // These have specific patterns that distinguish them from external dongles
    if (instanceIdUpper.find("USB\\") == 0) {
        // Check for internal USB wireless patterns
        const std::vector<std::string> internalUSBPatterns = {
            // Intel internal wireless modules
            "VID_8087",  // Intel Corporation (internal Bluetooth/WiFi modules)

            // Broadcom internal modules
            "VID_0A5C",  // Broadcom Corp (when used internally)

            // Realtek internal modules (when integrated)
            "VID_0BDA&PID_B812",  // Realtek internal WiFi
            "VID_0BDA&PID_C811",  // Realtek internal WiFi
            "VID_0BDA&PID_8812",  // Realtek internal WiFi

            // Qualcomm Atheros internal modules
            "VID_0CF3",  // Qualcomm Atheros (when used internally)

            // MediaTek internal modules
            "VID_0E8D",  // MediaTek Inc. (when used internally)
        };

        for (const auto& pattern : internalUSBPatterns) {
            if (hardwareIdUpper.find(pattern) != std::string::npos) {
                LOG_DEBUG << L"Internal USB adapter detected: " << SecureStringToWString(instanceIdUpper);
                return true;
            }
        }
    }

    // Check for manufacturer-specific internal wireless patterns
    const std::vector<std::string> internalWirelessPatterns = {
        // Dell internal wireless
        "DELL_",
        "DW1",      // Dell Wireless series

        // HP internal wireless
        "HP_",
        "HPQ",

        // Lenovo internal wireless
        "LENOVO_",
        "LEN_",

        // ASUS internal wireless
        "ASUS_",
        "ASU_",

        // Acer internal wireless
        "ACER_",
        "ACR_",

        // MSI internal wireless
        "MSI_",

        // Surface devices
        "MSHW",
        "SURFACE",

        // Apple internal (for Bootcamp scenarios)
        "APPLE_",
    };

    for (const auto& pattern : internalWirelessPatterns) {
        if (instanceIdUpper.find(pattern) != std::string::npos ||
            hardwareIdUpper.find(pattern) != std::string::npos) {
            LOG_DEBUG << L"Internal wireless adapter detected (manufacturer pattern): " << SecureStringToWString(instanceIdUpper);
            return true;
        }
    }

    return false;
}

// ============================================
// ENHANCED CONFIGURATION MANAGEMENT
// ============================================
bool LoadConfiguration(const std::wstring& configPath, DeviceControlConfig& config) {
    LOG_INFO << L"Loading configuration from: " << configPath;

    try {
        std::ifstream file(configPath);
        if (!file.is_open()) {
            LOG_WARNING << L"Configuration file not found, using defaults: " << configPath;
            return true;  // Use defaults
        }

        std::string jsonContent((std::istreambuf_iterator<char>(file)),
                                 std::istreambuf_iterator<char>());
        file.close();

        if (jsonContent.empty()) {
            LOG_WARNING << L"Empty configuration file, using defaults";
            return true;
        }

        // Parse JSON using JsonCppWrapper
        SmartPtr<JsonCppWrapper> jsonHandler = new JsonCppWrapper();
        Json::Value root = jsonHandler->EncodeRawStringToJsonObj(jsonContent);

        if (root.isNull()) {
            LOG_ERROR << L"Failed to parse configuration JSON";
            return false;
        }

        // Load configuration values with validation
        if (root.isMember("commandTimeoutMs")) {
            int timeout = root["commandTimeoutMs"].asInt();
            if (timeout > 0 && timeout <= 60000) {  // Max 60 seconds
                config.commandTimeoutMs = timeout;
            }
        }

        if (root.isMember("maxRetryAttempts")) {
            int retries = root["maxRetryAttempts"].asInt();
            if (retries >= 0 && retries <= 10) {  // Max 10 retries
                config.maxRetryAttempts = retries;
            }
        }

        if (root.isMember("deviceScanDelayMs")) {
            int delay = root["deviceScanDelayMs"].asInt();
            if (delay >= 0 && delay <= 10000) {  // Max 10 seconds
                config.deviceScanDelayMs = delay;
            }
        }

        if (root.isMember("enableAuditLogging")) {
            config.enableAuditLogging = root["enableAuditLogging"].asBool();
        }

        if (root.isMember("enablePerformanceMonitoring")) {
            config.enablePerformanceMonitoring = root["enablePerformanceMonitoring"].asBool();
        }

        if (root.isMember("childProcessDelays") && root["childProcessDelays"].isArray()) {
            config.childProcessDelays.clear();
            for (const auto& delay : root["childProcessDelays"]) {
                int delayMs = delay.asInt();
                if (delayMs >= 0 && delayMs <= 30000) {  // Max 30 seconds
                    config.childProcessDelays.push_back(delayMs);
                }
            }
        }

        if (root.isMember("logLevel")) {
            std::string level = root["logLevel"].asString();
            config.logLevel = SecureStringToWString(level);
        }

        LOG_INFO << L"Configuration loaded successfully";
        return true;

    } catch (const std::exception& e) {
        LOG_ERROR << "Exception loading configuration: " << e.what();
        return false;
    } catch (...) {
        LOG_ERROR << L"Unknown exception loading configuration";
        return false;
    }
}

void CreateDefaultConfiguration(const std::wstring& configPath) {
    LOG_INFO << L"Creating default configuration file: " << configPath;

    std::wofstream file(configPath);
    if (file.is_open()) {
        file << L"{\n";
        file << L"  \"commandTimeoutMs\": 10000,\n";
        file << L"  \"maxRetryAttempts\": 3,\n";
        file << L"  \"deviceScanDelayMs\": 1000,\n";
        file << L"  \"enableAuditLogging\": true,\n";
        file << L"  \"enablePerformanceMonitoring\": true,\n";
        file << L"  \"childProcessDelays\": [5000],\n";
        file << L"  \"logLevel\": \"INFO\"\n";
        file << L"}\n";
        file.close();
        LOG_INFO << L"Default configuration file created";
    } else {
        LOG_ERROR << L"Failed to create default configuration file";
    }
}

// ============================================
// ENHANCED DEVICE CATEGORIES INITIALIZATION
// ============================================
void InitializeCategoriesEnhanced() {
    std::vector<DeviceCategory> categories;

    // High Risk Devices (Priority 1 - Highest)
    categories.emplace_back("removable_storage_devices", L"Removable Storage Devices",
                           "USBSTOR", &GUID_DEVCLASS_DISKDRIVE, ACTION_NOT_CONFIGURED, "", 1);
    categories.emplace_back("windows_portable_devices", L"Windows Portable Devices",
                           "USB", &GUID_DEVCLASS_WPD, ACTION_NOT_CONFIGURED, "", 1);
    categories.emplace_back("cd_rom", L"CD ROM",
                           "", &GUID_DEVCLASS_CDROM, ACTION_NOT_CONFIGURED, "", 1);
    categories.emplace_back("tape_drivers", L"Tape Drivers",
                           "", &GUID_DEVCLASS_TAPEDRIVE, ACTION_NOT_CONFIGURED, "", 1);
    categories.emplace_back("floppy_disks", L"Floppy Disks",
                           "FDC", &GUID_DEVCLASS_FLOPPYDISK, ACTION_NOT_CONFIGURED, "", 1);

    // Network & Communication (Priority 2)
    categories.emplace_back("wireless_adapters", L"Wireless Adapters",
                           "", &GUID_DEVCLASS_NET, ACTION_NOT_CONFIGURED, "", 2);
    categories.emplace_back("bluetooth_adapters", L"Bluetooth Adapters",
                           "", &GUID_DEVCLASS_BLUETOOTH, ACTION_NOT_CONFIGURED, "", 2);
    categories.emplace_back("modems", L"Modems",
                           "", &GUID_DEVCLASS_MODEM, ACTION_NOT_CONFIGURED, "", 2);
    categories.emplace_back("infrared_devices", L"Infrared Devices",
                           "", &GUID_DEVCLASS_INFRARED, ACTION_NOT_CONFIGURED, "", 2);

    // Vendor-Specific Devices (Priority 2)
    categories.emplace_back("apple_devices", L"Apple Devices",
                           "USB", nullptr, ACTION_NOT_CONFIGURED, "05AC", 2);

    // Imaging and Biometric (Priority 3)
    categories.emplace_back("imaging_devices", L"Imaging Devices",
                           "", &GUID_DEVCLASS_IMAGE, ACTION_NOT_CONFIGURED, "", 3);
    categories.emplace_back("biometric_devices", L"Biometric Devices",
                           "", &GUID_DEVCLASS_BIOMETRIC, ACTION_NOT_CONFIGURED, "", 3);

    // Standard Peripherals (Priority 4 - Lowest, handle carefully)
    categories.emplace_back("mice", L"Mice",
                           "", &GUID_DEVCLASS_MOUSE, ACTION_NOT_CONFIGURED, "", 4);
    categories.emplace_back("keyboards", L"Keyboards",
                           "", &GUID_DEVCLASS_KEYBOARD, ACTION_NOT_CONFIGURED, "", 4);
    categories.emplace_back("printers", L"Printers",
                           "", &GUID_DEVCLASS_PRINTER, ACTION_NOT_CONFIGURED, "", 4);
    categories.emplace_back("smart_card_readers", L"Smart Card Readers",
                           "", &GUID_DEVCLASS_SMARTCARDREADER, ACTION_NOT_CONFIGURED, "", 4);
    categories.emplace_back("serial_ports", L"Serial Ports",
                           "", &GUID_DEVCLASS_PORTS, ACTION_NOT_CONFIGURED, "", 4);
    categories.emplace_back("parallel_ports", L"Parallel Ports",
                           "", &GUID_DEVCLASS_PORTS, ACTION_NOT_CONFIGURED, "", 4);
    categories.emplace_back("hid_devices", L"HID Devices",
                           "", &GUID_DEVCLASS_HIDCLASS, ACTION_NOT_CONFIGURED, "", 4);

    // Sort by priority (lower number = higher priority)
    std::sort(categories.begin(), categories.end(),
              [](const DeviceCategory& a, const DeviceCategory& b) {
                  return a.priority < b.priority;
              });

    g_deviceState.SetCategories(categories);
    LOG_INFO << L"Initialized " << categories.size() << L" device categories";
}
// ============================================
// ENHANCED WHITELIST MANAGEMENT
// ============================================
void CreateDefaultWhitelistEnhanced(const std::wstring& whitelistPath) {
    std::wofstream file(whitelistPath);
    if (file.is_open()) {
        file << L"# Zecurit Enhanced Device Whitelist\n";
        file << L"# Add trusted device IDs here (one per line)\n";
        file << L"# Devices in this list will be allowed when policy is \"allow_on_trusted\"\n";
        file << L"#\n";
        file << L"# Format options:\n";
        file << L"# 1. Full Instance ID: USBSTOR\\DISK&VEN_SANDISK&PROD_ULTRA&REV_1.00\\12345678\n";
        file << L"# 2. VID+PID pattern: VID_0781&PID_5591\n";
        file << L"# 3. Partial match: VID_0781 (matches all devices from this vendor)\n";
        file << L"# 4. Device serial: SERIAL_1234567890\n";
        file << L"#\n";
        file << L"# Security Notes:\n";
        file << L"# - Use full instance IDs for maximum security\n";
        file << L"# - VID-only patterns allow all devices from that vendor\n";
        file << L"# - Review this list regularly for unauthorized entries\n";
        file << L"# - Comments start with # and are ignored\n";
        file << L"#\n";
        file << L"# Common trusted vendors (uncomment as needed):\n";
        file << L"# VID_0781&PID_5591    # SanDisk USB drives\n";
        file << L"# VID_054C             # All Sony devices\n";
        file << L"# VID_04E8             # All Samsung devices\n";
        file << L"# VID_8087             # Intel devices\n";
        file << L"# VID_1058             # Western Digital\n";
        file << L"# VID_0930             # Toshiba\n";
        file.close();
        LOG_INFO << L"Created enhanced default whitelist file: " << whitelistPath;
    }
}

bool LoadWhitelistEnhanced(const std::wstring& agentDir) {
    std::vector<std::wstring> whitelist;

    // Ensure agent directory exists
    CreateDirectoryW(agentDir.c_str(), NULL);

    std::wstring whitelistPath = agentDir + L"\\" + WHITELIST_FILE;
    std::wifstream file(whitelistPath);

    if (!file.is_open()) {
        LOG_WARNING << L"Whitelist file not found, creating default: " << whitelistPath;
        CreateDefaultWhitelistEnhanced(whitelistPath);
        g_deviceState.SetWhitelist(whitelist);
        return true;
    }

    std::wstring line;
    int lineNumber = 0;

    while (std::getline(file, line)) {
        lineNumber++;

        // Trim whitespace
        size_t start = line.find_first_not_of(L" \t\r\n");
        if (start == std::wstring::npos) continue;
        size_t end = line.find_last_not_of(L" \t\r\n");
        line = line.substr(start, end - start + 1);

        // Skip empty lines and comments
        if (line.empty() || line[0] == L'#') continue;

        // Strip inline comments (everything after #)
        size_t commentPos = line.find(L'#');
        if (commentPos != std::wstring::npos) {
            line = line.substr(0, commentPos);
            // Trim trailing whitespace after removing comment
            end = line.find_last_not_of(L" \t\r\n");
            if (end != std::wstring::npos) {
                line = line.substr(0, end + 1);
            }
        }

        // Validate whitelist entry format
        if (line.length() > MAX_INSTANCE_ID_LENGTH) {
            LOG_WARNING << L"Whitelist entry too long at line " << lineNumber << L": " << line;
            continue;
        }

        // Basic format validation - enhanced to support more patterns
        bool validFormat = false;
        if (line.find(L"VID_") != std::wstring::npos ||
            line.find(L"USBSTOR\\") != std::wstring::npos ||
            line.find(L"SERIAL_") != std::wstring::npos ||
            line.find(L"HID\\") != std::wstring::npos ||
            line.find(L"USB\\") != std::wstring::npos ||
            line.find(L"PCI\\") != std::wstring::npos ||
            line.find(L"ACPI\\") != std::wstring::npos ||
            line.find(L"BTHENUM\\") != std::wstring::npos) {
            validFormat = true;
        }

        if (!validFormat) {
            LOG_WARNING << L"Invalid whitelist entry format at line " << lineNumber << L": " << line;
            continue;
        }

        whitelist.push_back(line);
    }

    g_deviceState.SetWhitelist(whitelist);
    LOG_INFO << L"Loaded " << whitelist.size() << L" trusted devices from whitelist";
    return true;
}

// SECURITY NOTE: Whitelist matching uses permissive substring matching
// This allows flexible patterns but can match unintended devices if admin enters short patterns
// Examples:
//   - Entry "VID_0781" matches ALL SanDisk devices (intended)
//   - Entry "USB" could match many devices (risky - not recommended)
// For high-security environments, use exact instance IDs or strict VID/PID patterns
bool IsWhitelistedEnhanced(const std::string& deviceId) {
    if (deviceId.empty()) return false;

    std::wstring wDeviceId = SecureStringToWString(deviceId);
    if (wDeviceId.empty()) return false;

    auto whitelist = g_deviceState.GetWhitelist();

    for (const auto& entry : whitelist) {
        // Exact match (case-insensitive)
        if (_wcsicmp(entry.c_str(), wDeviceId.c_str()) == 0) {
            LOG_DEBUG << L"Device whitelisted (exact match): " << wDeviceId;
            return true;
        }

        // Partial match (for VID patterns, etc.)
        if (wDeviceId.find(entry) != std::wstring::npos) {
            LOG_DEBUG << L"Device whitelisted (partial match): " << wDeviceId << L" matches " << entry;
            return true;
        }

        // Reverse partial match (for broader patterns)
        // NOTE: This is permissive matching - short whitelist entries can match broadly
        // For high-security environments, consider exact match or VID/PID only
        if (entry.find(wDeviceId) != std::wstring::npos) {
            LOG_DEBUG << L"Device whitelisted (reverse match): " << wDeviceId << L" matched by " << entry;
            return true;
        }
    }

    return false;
}

// ============================================
// ENHANCED MOBILE DEVICE DETECTION
// ============================================
bool IsMobileVidEnhanced(const std::string& vid) {
    if (vid.empty() || vid.length() != 4) {
        return false;
    }

    // Convert to uppercase for comparison
    std::string upperVid = vid;
    std::transform(upperVid.begin(), upperVid.end(), upperVid.begin(), ::toupper);

    for (int i = 0; MOBILE_VIDS[i] != NULL; i++) {
        if (upperVid == MOBILE_VIDS[i]) {
            LOG_DEBUG << "Mobile device VID detected: " << vid;
            return true;
        }
    }
    return false;
}

// ============================================
// ENHANCED DEVICE CONTROL FUNCTIONS
// ============================================

// Secure device state checking with validation
BOOL IsDeviceDisabledSecure(SP_DEVINFO_DATA* deviceInfoData) {
    if (!deviceInfoData) {
        LOG_ERROR << L"Invalid device info data pointer";
        return FALSE;
    }

    DWORD status = 0, problem = 0;
    CONFIGRET result = CM_Get_DevNode_Status(&status, &problem, deviceInfoData->DevInst, 0);

    if (result != CR_SUCCESS) {
        LOG_WARNING << L"Failed to get device status, error: " << result;
        return FALSE;
    }

    bool isDisabled = (problem == CM_PROB_DISABLED);
    LOG_DEBUG << L"Device status check - Problem: " << problem << L", Disabled: " << isDisabled;

    return isDisabled ? TRUE : FALSE;
}

// Enhanced device disable with rollback capability
BOOL DisableDeviceSecure(HDEVINFO deviceInfoSet, SP_DEVINFO_DATA* deviceInfoData,
                        const std::string& deviceName) {
    if (!deviceInfoSet || deviceInfoSet == INVALID_HANDLE_VALUE || !deviceInfoData) {
        LOG_ERROR << L"Invalid parameters for device disable operation";
        return FALSE;
    }

    // Check if device is already disabled
    if (IsDeviceDisabledSecure(deviceInfoData)) {
        LOG_DEBUG << L"Device already disabled: " << SecureStringToWString(deviceName);
        return TRUE;
    }

    LOG_INFO << L"Attempting to disable device: " << SecureStringToWString(deviceName);

    SP_PROPCHANGE_PARAMS params = {0};
    params.ClassInstallHeader.cbSize = sizeof(SP_CLASSINSTALL_HEADER);
    params.ClassInstallHeader.InstallFunction = DIF_PROPERTYCHANGE;
    params.StateChange = DICS_DISABLE;
    params.Scope = DICS_FLAG_GLOBAL;
    params.HwProfile = 0;

    // Set class install parameters
    if (!SetupDiSetClassInstallParams(deviceInfoSet, deviceInfoData,
                                     &params.ClassInstallHeader, sizeof(params))) {
        DWORD error = GetLastError();
        LOG_ERROR << L"Failed to set class install params for device disable. Error: " << error;
        return FALSE;
    }

    // Call class installer
    if (!SetupDiCallClassInstaller(DIF_PROPERTYCHANGE, deviceInfoSet, deviceInfoData)) {
        DWORD error = GetLastError();
        LOG_ERROR << L"Failed to disable device via class installer. Error: " << error;
        return FALSE;
    }

    // Verify the operation succeeded
    Sleep(500);  // Give system time to process
    if (!IsDeviceDisabledSecure(deviceInfoData)) {
        LOG_WARNING << L"Device disable operation may have failed: " << SecureStringToWString(deviceName);
        return FALSE;
    }

    LOG_INFO << L"Successfully disabled device: " << SecureStringToWString(deviceName);
    return TRUE;
}

// Enhanced device enable with validation
BOOL EnableDeviceSecure(HDEVINFO deviceInfoSet, SP_DEVINFO_DATA* deviceInfoData,
                       const std::string& deviceName) {
    if (!deviceInfoSet || deviceInfoSet == INVALID_HANDLE_VALUE || !deviceInfoData) {
        LOG_ERROR << L"Invalid parameters for device enable operation";
        return FALSE;
    }

    // Check if device is already enabled
    if (!IsDeviceDisabledSecure(deviceInfoData)) {
        LOG_DEBUG << L"Device already enabled: " << SecureStringToWString(deviceName);
        return TRUE;
    }

    LOG_INFO << L"Attempting to enable device: " << SecureStringToWString(deviceName);

    SP_PROPCHANGE_PARAMS params = {0};
    params.ClassInstallHeader.cbSize = sizeof(SP_CLASSINSTALL_HEADER);
    params.ClassInstallHeader.InstallFunction = DIF_PROPERTYCHANGE;
    params.StateChange = DICS_ENABLE;
    params.Scope = DICS_FLAG_GLOBAL;
    params.HwProfile = 0;

    // Set class install parameters
    if (!SetupDiSetClassInstallParams(deviceInfoSet, deviceInfoData,
                                     &params.ClassInstallHeader, sizeof(params))) {
        DWORD error = GetLastError();
        LOG_ERROR << L"Failed to set class install params for device enable. Error: " << error;
        return FALSE;
    }

    // Call class installer
    if (!SetupDiCallClassInstaller(DIF_PROPERTYCHANGE, deviceInfoSet, deviceInfoData)) {
        DWORD error = GetLastError();
        LOG_ERROR << L"Failed to enable device via class installer. Error: " << error;
        return FALSE;
    }

    // Verify the operation succeeded
    Sleep(500);  // Give system time to process
    if (IsDeviceDisabledSecure(deviceInfoData)) {
        LOG_WARNING << L"Device enable operation may have failed: " << SecureStringToWString(deviceName);
        return FALSE;
    }

    LOG_INFO << L"Successfully enabled device: " << SecureStringToWString(deviceName);
    return TRUE;
}

// Secure PnPUtil execution with input sanitization and enhanced retry logic
BOOL ExecutePnpUtilSecure(const std::string& instanceId, bool disable) {
    if (instanceId.empty() || instanceId.length() > MAX_INSTANCE_ID_LENGTH) {
        LOG_ERROR << L"Invalid instance ID for PnPUtil operation";
        return FALSE;
    }

    // Sanitize the instance ID to prevent command injection
    std::wstring wInstanceId = SecureStringToWString(instanceId);
    std::wstring sanitizedId = SanitizeInstanceId(wInstanceId);

    if (sanitizedId.empty()) {
        LOG_ERROR << L"Instance ID sanitization failed: " << wInstanceId;
        return FALSE;
    }

    // Build secure command with quotes
    std::wstring operation = disable ? L"/disable-device" : L"/enable-device";
    std::wstring cmd = L"pnputil.exe " + operation + L" \"" + sanitizedId + L"\"";

    LOG_INFO << L"Executing PnPUtil command: " << cmd;

    // Get timeout from configuration
    auto config = g_deviceState.GetConfig();
    DWORD timeoutMs = static_cast<DWORD>(config.commandTimeoutMs);

    // CRITICAL FIX: Try multiple times with different approaches
    int maxAttempts = 3;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        LOG_DEBUG << L"PnPUtil attempt " << attempt << L"/" << maxAttempts << L" for: " << sanitizedId;

        STARTUPINFOW si = {0};
        PROCESS_INFORMATION pi = {0};
        si.cb = sizeof(si);
        si.dwFlags = STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_HIDE;

        // Create process with security attributes
        SECURITY_ATTRIBUTES sa = {0};
        sa.nLength = sizeof(sa);
        sa.bInheritHandle = FALSE;
        sa.lpSecurityDescriptor = NULL;

        // Use vector for safe command buffer
        std::vector<wchar_t> cmdBuf(cmd.begin(), cmd.end());
        cmdBuf.push_back(L'\0');

        if (!CreateProcessW(NULL, cmdBuf.data(), &sa, &sa, FALSE,
                           CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
                           NULL, NULL, &si, &pi)) {
            DWORD error = GetLastError();
            LOG_ERROR << L"Failed to create PnPUtil process (attempt " << attempt << L"). Error: " << error;

            if (attempt < maxAttempts) {
                Sleep(1000);  // Wait 1 second before retry
                continue;
            }
            return FALSE;
        }

        // Wait for process completion with timeout
        DWORD waitResult = WaitForSingleObject(pi.hProcess, timeoutMs);
        DWORD exitCode = 1;  // Default to failure

        if (waitResult == WAIT_OBJECT_0) {
            GetExitCodeProcess(pi.hProcess, &exitCode);
            LOG_DEBUG << L"PnPUtil process completed with exit code: " << exitCode << L" (attempt " << attempt << L")";
        } else if (waitResult == WAIT_TIMEOUT) {
            LOG_ERROR << L"PnPUtil process timed out after " << timeoutMs << L"ms (attempt " << attempt << L")";
            TerminateProcess(pi.hProcess, 1);
            exitCode = 1;
        } else {
            LOG_ERROR << L"PnPUtil process wait failed with result: " << waitResult << L" (attempt " << attempt << L")";
            exitCode = 1;
        }

        // Clean up handles
        CloseHandle(pi.hThread);
        CloseHandle(pi.hProcess);

        bool success = (exitCode == 0 || exitCode == 3010);  // 3010 = success + reboot required
        if (success) {
            if (exitCode == 3010) {
                LOG_INFO << L"PnPUtil operation completed successfully (reboot required) on attempt " << attempt;
            } else {
                LOG_INFO << L"PnPUtil operation completed successfully on attempt " << attempt;
            }
            return TRUE;
        } else {
            LOG_WARNING << L"PnPUtil operation failed with exit code: " << exitCode << L" (attempt " << attempt << L")";

            // If not the last attempt, wait and retry
            if (attempt < maxAttempts) {
                LOG_INFO << L"Retrying PnPUtil operation in 2 seconds...";
                Sleep(2000);  // Wait 2 seconds before retry
            }
        }
    }

    LOG_ERROR << L"PnPUtil operation failed after " << maxAttempts << L" attempts for: " << sanitizedId;
    return FALSE;
}

// Wrapper functions for backward compatibility
BOOL BlockByPnputilSecure(const std::string& instanceId) {
    return ExecutePnpUtilSecure(instanceId, true);
}

BOOL UnblockByPnputilSecure(const std::string& instanceId) {
    return ExecutePnpUtilSecure(instanceId, false);
}
// ============================================
// ENHANCED REGISTRY OPERATIONS WITH SECURITY
// ============================================

// Secure registry key creation with proper error handling
BOOL CreateRegistryKeySecure(const std::string& keyPath, const std::string& valueName,
                            bool allowAccess) {
    if (keyPath.empty() || keyPath.length() > 512) {
        LOG_ERROR << L"Invalid registry key path";
        return FALSE;
    }

    HKEY hKey = nullptr;
    DWORD disposition = 0;

    // Create or open the registry key
    LONG result = RegCreateKeyExA(HKEY_LOCAL_MACHINE, keyPath.c_str(), 0, NULL,
                                 REG_OPTION_NON_VOLATILE, KEY_WRITE, NULL, &hKey, &disposition);

    if (result != ERROR_SUCCESS) {
        LOG_ERROR << L"Failed to create/open registry key: " << SecureStringToWString(keyPath)
                  << L", Error: " << result;
        return FALSE;
    }

    // Set the registry value
    DWORD regValue = allowAccess ? 0 : 1;  // 0 = allow, 1 = deny
    result = RegSetValueExA(hKey, valueName.c_str(), 0, REG_DWORD,
                           (const BYTE*)&regValue, sizeof(regValue));

    if (result != ERROR_SUCCESS) {
        LOG_ERROR << L"Failed to set registry value: " << SecureStringToWString(valueName)
                  << L", Error: " << result;
        RegCloseKey(hKey);
        return FALSE;
    }

    RegCloseKey(hKey);

    LOG_INFO << L"Registry operation completed - Key: " << SecureStringToWString(keyPath)
             << L", Value: " << SecureStringToWString(valueName)
             << L", Access: " << (allowAccess ? L"ALLOW" : L"DENY");

    return TRUE;
}

// Enhanced WPD class control with validation
BOOL SetWPDClassAccess(bool allowAccess) {
    const std::string wpdPath = "SOFTWARE\\Policies\\Microsoft\\Windows\\RemovableStorageDevices\\{6AC27878-A6FA-4155-BA85-F98F491D4F33}";

    LOG_INFO << L"Setting WPD class access: " << (allowAccess ? L"ALLOW" : L"BLOCK");

    bool success = true;
    success &= CreateRegistryKeySecure(wpdPath, "Deny_Read", allowAccess);
    success &= CreateRegistryKeySecure(wpdPath, "Deny_Write", allowAccess);
    success &= CreateRegistryKeySecure(wpdPath, "Deny_Execute", allowAccess);

    if (success) {
        LOG_INFO << L"WPD class access updated successfully";
    } else {
        LOG_ERROR << L"Failed to update WPD class access";
    }

    return success ? TRUE : FALSE;
}

// Enhanced removable storage class control
BOOL SetRemovableStorageClassAccess(bool allowAccess) {
    const std::string usbPath = "SOFTWARE\\Policies\\Microsoft\\Windows\\RemovableStorageDevices\\{53F5630D-B6BF-11D0-94F2-00A0C91EFB8B}";

    LOG_INFO << L"Setting removable storage class access: " << (allowAccess ? L"ALLOW" : L"BLOCK");

    bool success = true;
    success &= CreateRegistryKeySecure(usbPath, "Deny_Read", allowAccess);
    success &= CreateRegistryKeySecure(usbPath, "Deny_Write", allowAccess);
    success &= CreateRegistryKeySecure(usbPath, "Deny_Execute", allowAccess);

    if (success) {
        LOG_INFO << L"Removable storage class access updated successfully";
    } else {
        LOG_ERROR << L"Failed to update removable storage class access";
    }

    return success ? TRUE : FALSE;
}

// Wrapper functions for backward compatibility
BOOL BlockWPDClassSecure() {
    return SetWPDClassAccess(false);
}

BOOL AllowWPDClassSecure() {
    return SetWPDClassAccess(true);
}

BOOL BlockRemovableStorageClassSecure() {
    return SetRemovableStorageClassAccess(false);
}

BOOL AllowRemovableStorageClassSecure() {
    return SetRemovableStorageClassAccess(true);
}

// ============================================
// ENHANCED BLUETOOTH AUDIO DEVICE HANDLING
// ============================================
// Bluetooth audio pseudo-category key for deduplication consistency
constexpr wchar_t BT_AUDIO_CATEGORY_KEY[] = L"bluetooth_audio";

int EnforceBluetoothAudioDevicesSecure(PolicyAction action) {
    // NOTE: Internal Bluetooth adapters are filtered earlier via adapter enforcement.
    // This function assumes only external BT contexts reach here.
    // The coupling ensures internal BT adapters are never touched by audio enforcement.

    if (action == ACTION_NOT_CONFIGURED) {
        return 0;
    }

    LOG_INFO << L"Enforcing Bluetooth audio devices policy";

    // Get ALL devices and filter by BTHENUM prefix
    HDEVINFO deviceInfoSet = SetupDiGetClassDevs(NULL, L"BTHENUM", NULL, DIGCF_ALLCLASSES);
    if (deviceInfoSet == INVALID_HANDLE_VALUE) {
        LOG_WARNING << L"Failed to enumerate BTHENUM devices";
        return 0;
    }

    SP_DEVINFO_DATA deviceInfoData;
    deviceInfoData.cbSize = sizeof(SP_DEVINFO_DATA);
    DWORD idx = 0;
    int count = 0;

    // Enhanced Bluetooth audio profile GUIDs
    const std::vector<std::string> audioProfileGUIDs = {
        "0000110B",  // A2DP Audio Sink
        "0000110E",  // AVRCP
        "0000111E",  // Hands-Free AG
        "0000110C",  // AVRCP Controller
        "0000110A",  // A2DP Source
        "00001108",  // Headset
        "0000111F",  // Hands-Free Unit
        "0000110D",  // A2DP
        "00001124",  // HID
        "00001200"   // PnP Information
    };

    while (SetupDiEnumDeviceInfo(deviceInfoSet, idx++, &deviceInfoData)) {
        // Use secure buffer allocation
        std::vector<char> deviceNameBuffer(MAX_DEVICE_NAME_LENGTH, 0);
        std::vector<char> instanceIdBuffer(MAX_INSTANCE_ID_LENGTH, 0);

        // Get device description
        if (!SetupDiGetDeviceRegistryPropertyA(deviceInfoSet, &deviceInfoData,
            SPDRP_DEVICEDESC, NULL, (PBYTE)deviceNameBuffer.data(),
            deviceNameBuffer.size(), NULL)) {
            continue;
        }

        // Get hardware ID
        std::vector<char> hardwareIdBuffer(MAX_HARDWARE_ID_LENGTH, 0);
        SetupDiGetDeviceRegistryPropertyA(deviceInfoSet, &deviceInfoData,
            SPDRP_HARDWAREID, NULL, (PBYTE)hardwareIdBuffer.data(),
            hardwareIdBuffer.size(), NULL);

        // Get instance ID
        if (!SetupDiGetDeviceInstanceIdA(deviceInfoSet, &deviceInfoData,
            instanceIdBuffer.data(), instanceIdBuffer.size(), NULL)) {
            continue;
        }

        std::string deviceName(deviceNameBuffer.data());
        std::string hardwareId(hardwareIdBuffer.data());
        std::string instanceId(instanceIdBuffer.data());

        // Defensive check: Skip internal devices (prevents future refactor breakage)
        // CENTRALIZED SAFETY GATE: Every enforcement path must pass through this check
        if (IsInternalDeviceEnhancedCached(instanceId, hardwareId)) {
            LOG_DEBUG << L"SKIP INTERNAL BT AUDIO: " << SecureStringToWString(deviceName);
            continue;
        }

        // Check for keyboard safety if this is an HID profile device
        bool isHIDProfile = (instanceId.find("00001124") != std::string::npos);
        if (isHIDProfile && !IsLaptopCached()) {
            // DESKTOP: Never block the last enabled keyboard
            if (action == ACTION_BLOCK && !IsDeviceDisabledSecure(&deviceInfoData)) {
                if (CountEnabledKeyboardsSecure() <= 1) {
                    LOG_WARNING << L"SAFETY: Skipping last (Bluetooth) keyboard on desktop: " << SecureStringToWString(deviceName);
                    continue;
                }
            }
        }

        // Check if this is a Bluetooth audio profile device
        std::string instUpper = instanceId;
        std::transform(instUpper.begin(), instUpper.end(), instUpper.begin(), ::toupper);

        bool isAudioProfile = false;
        for (const auto& guid : audioProfileGUIDs) {
            if (instUpper.find(guid) != std::string::npos) {
                isAudioProfile = true;
                break;
            }
        }

        if (!isAudioProfile) continue;

        // Check if already processed to avoid duplicates
        // Key includes category to allow same device in different categories
        std::wstring deviceKey = SecureStringToWString(instanceId) + L"|" + BT_AUDIO_CATEGORY_KEY;
        if (g_deviceState.IsDeviceProcessed(deviceKey)) {
            continue;
        }

        BOOL isDisabled = IsDeviceDisabledSecure(&deviceInfoData);
        bool actionTaken = false;

        switch (action) {
            case ACTION_BLOCK:
                if (!isDisabled) {
                    LOG_INFO << L"BLOCK BT AUDIO: " << SecureStringToWString(deviceName)
                             << L" (" << SecureStringToWString(instanceId) << L")";
                    if (DisableDeviceSecure(deviceInfoSet, &deviceInfoData, deviceName)) {
                        actionTaken = true;
                    } else {
                        // Fallback to PnPUtil
                        actionTaken = BlockByPnputilSecure(instanceId);
                    }
                }
                break;

            case ACTION_ALLOW:
            case ACTION_ALLOW_ON_TRUSTED:  // For BT audio, treat trusted same as allow
                if (isDisabled) {
                    LOG_INFO << L"ALLOW BT AUDIO: " << SecureStringToWString(deviceName)
                             << L" (" << SecureStringToWString(instanceId) << L")";
                    if (EnableDeviceSecure(deviceInfoSet, &deviceInfoData, deviceName)) {
                        actionTaken = true;
                    } else {
                        // Fallback to PnPUtil
                        actionTaken = UnblockByPnputilSecure(instanceId);
                    }
                }
                break;

            default:
                break;
        }

        if (actionTaken) {
            g_deviceState.MarkDeviceProcessed(deviceKey);
            count++;
        }
    }

    SetupDiDestroyDeviceInfoList(deviceInfoSet);

    if (count > 0) {
        LOG_INFO << L"Processed " << count << L" Bluetooth audio profile devices";
    }

    return count;
}

// ============================================
// ENHANCED POLICY PARSING WITH VALIDATION
// ============================================
PolicyAction ParseActionSecure(const std::string& actionStr) {
    if (actionStr.empty() || actionStr.length() > 50) {
        return ACTION_NOT_CONFIGURED;
    }

    std::string lower = actionStr;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);

    // Remove any whitespace
    lower.erase(std::remove_if(lower.begin(), lower.end(), ::isspace), lower.end());

    // UI Contract - Only 4 supported actions
    if (lower == "allow") return ACTION_ALLOW;
    if (lower == "block") return ACTION_BLOCK;
    if (lower == "allow_on_trusted" || lower == "allowontrusted") return ACTION_ALLOW_ON_TRUSTED;
    if (lower == "not_configured" || lower == "notconfigured") return ACTION_NOT_CONFIGURED;

    // Reject any unsupported actions with warning
    LOG_WARNING << L"Unsupported policy action rejected: " << SecureStringToWString(actionStr)
                << L" (UI supports only: allow, block, allow_on_trusted, not_configured)";
    return ACTION_NOT_CONFIGURED;
}

bool LoadPolicyFromJsonSecure(const std::wstring& jsonPath) {
    LOG_INFO << L"Loading policy from: " << jsonPath;

    // Validate file path
    if (jsonPath.empty() || jsonPath.length() > MAX_PATH) {
        LOG_ERROR << L"Invalid policy file path";
        return false;
    }

    try {
        // Read file content with size limit
        std::ifstream file(jsonPath, std::ios::binary);
        if (!file.is_open()) {
            LOG_ERROR << L"Failed to open policy file: " << jsonPath;
            return false;
        }

        // Check file size (limit to 1MB for security)
        file.seekg(0, std::ios::end);
        std::streamsize fileSize = file.tellg();
        file.seekg(0, std::ios::beg);

        if (fileSize <= 0 || fileSize > 1024 * 1024) {
            LOG_ERROR << L"Policy file size invalid or too large: " << fileSize << L" bytes";
            return false;
        }

        std::string jsonContent(fileSize, '\0');
        if (!file.read(&jsonContent[0], fileSize)) {
            LOG_ERROR << L"Failed to read policy file content";
            return false;
        }
        file.close();

        // Parse JSON using JsonCppWrapper
        SmartPtr<JsonCppWrapper> jsonHandler = new JsonCppWrapper();
        Json::Value root = jsonHandler->EncodeRawStringToJsonObj(jsonContent);

        if (root.isNull()) {
            LOG_ERROR << L"Failed to parse JSON - invalid format";
            return false;
        }

        // Check for policy_data nested object
        Json::Value policyData = root;
        if (root.isMember("policy_data")) {
            policyData = root["policy_data"];
        }

        // Get current categories
        auto categories = g_deviceState.GetCategories();
        int policiesLoaded = 0;

        // Parse each device category with validation
        for (auto& category : categories) {
            if (policyData.isMember(category.jsonKey)) {
                std::string actionStr;

                Json::Value val = policyData[category.jsonKey];
                if (val.isString()) {
                    actionStr = val.asString();
                } else if (val.isObject() && val.isMember("action")) {
                    actionStr = val["action"].asString();
                } else {
                    LOG_WARNING << L"Invalid policy format for: " << category.displayName;
                    continue;
                }

                PolicyAction newAction = ParseActionSecure(actionStr);
                if (newAction != ACTION_NOT_CONFIGURED) {
                    category.action = newAction;
                    policiesLoaded++;
                    LOG_INFO << L"Policy: " << category.displayName << L" = " << SecureStringToWString(actionStr);
                }
            }
        }

        // Update categories in global state
        g_deviceState.SetCategories(categories);

        LOG_INFO << L"Policy loaded successfully - " << policiesLoaded << L" policies configured";
        return true;

    } catch (const std::exception& e) {
        LOG_ERROR << "Exception loading policy: " << e.what();
        return false;
    } catch (...) {
        LOG_ERROR << L"Unknown exception loading policy";
        return false;
    }
}
// ============================================
// ENHANCED DEVICE POLICY ENFORCEMENT
// ============================================
void EnforceDevicePolicySecure(HDEVINFO deviceInfoSet, SP_DEVINFO_DATA* deviceInfoData,
                              const std::string& deviceName, const std::string& hardwareId,
                              const std::string& instanceId, PolicyAction action,
                              const std::string& categoryKey) {

    if (!deviceInfoSet || deviceInfoSet == INVALID_HANDLE_VALUE || !deviceInfoData) {
        LOG_ERROR << L"Invalid parameters for device policy enforcement";
        return;
    }

    std::string vid, pid;
    if (!SecureExtractVidPid(hardwareId, vid, pid)) {
        LOG_DEBUG << L"Could not extract VID/PID from: " << SecureStringToWString(hardwareId);
    }

    BOOL isDisabled = IsDeviceDisabledSecure(deviceInfoData);
    BOOL isTrusted = IsWhitelistedEnhanced(instanceId) ? TRUE : FALSE;

    // REMOVED: "Already processed" check - we need to retry failed disables
    // This allows the system to keep trying to disable devices that failed initially

    bool actionTaken = false;
    auto config = g_deviceState.GetConfig();

    switch (action) {
        case ACTION_NOT_CONFIGURED:
            return;

        case ACTION_ALLOW:
            if (isDisabled) {
                LOG_INFO << L"ALLOW: Enabling device " << SecureStringToWString(deviceName)
                         << L" (VID_" << SecureStringToWString(vid) << L"&PID_" << SecureStringToWString(pid) << L")";

                // ARCHITECTURE REQUIREMENT: Try SetupAPI first, use PnPUtil as fallback
                if (EnableDeviceSecure(deviceInfoSet, deviceInfoData, deviceName)) {
                    actionTaken = true;
                    LOG_INFO << L"Device enabled successfully via SetupAPI: " << SecureStringToWString(instanceId);
                } else {
                    LOG_WARNING << L"SetupAPI failed, trying PnPUtil for: " << SecureStringToWString(instanceId);
                    if (UnblockByPnputilSecure(instanceId)) {
                        actionTaken = true;
                        LOG_INFO << L"Device enabled successfully via PnPUtil: " << SecureStringToWString(instanceId);
                    } else {
                        LOG_ERROR << L"Both SetupAPI and PnPUtil failed to enable device: " << SecureStringToWString(instanceId);
                    }
                }
            }
            break;

        case ACTION_BLOCK:
            if (!isDisabled) {
                LOG_INFO << L"BLOCK: Disabling device " << SecureStringToWString(deviceName)
                         << L" (VID_" << SecureStringToWString(vid) << L"&PID_" << SecureStringToWString(pid) << L")";

                // ARCHITECTURE REQUIREMENT: Try SetupAPI first, use PnPUtil as fallback
                if (DisableDeviceSecure(deviceInfoSet, deviceInfoData, deviceName)) {
                    actionTaken = true;
                    LOG_INFO << L"Device blocked successfully via SetupAPI: " << SecureStringToWString(instanceId);
                } else {
                    LOG_WARNING << L"SetupAPI failed, trying PnPUtil for: " << SecureStringToWString(instanceId);
                    if (BlockByPnputilSecure(instanceId)) {
                        actionTaken = true;
                        LOG_INFO << L"Device blocked successfully via PnPUtil: " << SecureStringToWString(instanceId);
                    } else {
                        LOG_ERROR << L"Both SetupAPI and PnPUtil failed to block device: " << SecureStringToWString(instanceId);
                    }
                }
            }
            break;

        case ACTION_ALLOW_ON_TRUSTED:
            if (isTrusted) {
                if (isDisabled) {
                    LOG_INFO << L"TRUSTED: Enabling whitelisted device " << SecureStringToWString(deviceName)
                             << L" (VID_" << SecureStringToWString(vid) << L"&PID_" << SecureStringToWString(pid) << L")"
                             << L" | Instance: " << SecureStringToWString(instanceId);

                    // Try SetupAPI first
                    if (EnableDeviceSecure(deviceInfoSet, deviceInfoData, deviceName)) {
                        actionTaken = true;
                        LOG_INFO << L"Trusted device enabled via SetupAPI: " << SecureStringToWString(instanceId);
                    } else {
                        if (UnblockByPnputilSecure(instanceId)) {
                            actionTaken = true;
                            LOG_INFO << L"Trusted device enabled via PnPUtil: " << SecureStringToWString(instanceId);
                        } else {
                            LOG_ERROR << L"Failed to enable trusted device: " << SecureStringToWString(instanceId);
                        }
                    }
                }
            } else {
                if (!isDisabled) {
                    LOG_INFO << L"NOT TRUSTED: Blocking non-whitelisted device " << SecureStringToWString(deviceName)
                             << L" (VID_" << SecureStringToWString(vid) << L"&PID_" << SecureStringToWString(pid) << L")"
                             << L" | Instance: " << SecureStringToWString(instanceId);

                    // Try SetupAPI first
                    if (DisableDeviceSecure(deviceInfoSet, deviceInfoData, deviceName)) {
                        actionTaken = true;
                        LOG_INFO << L"Non-trusted device blocked via SetupAPI: " << SecureStringToWString(instanceId);
                    } else {
                        if (BlockByPnputilSecure(instanceId)) {
                            actionTaken = true;
                            LOG_INFO << L"Non-trusted device blocked via PnPUtil: " << SecureStringToWString(instanceId);
                        } else {
                            LOG_ERROR << L"Failed to block non-trusted device: " << SecureStringToWString(instanceId);
                        }
                    }
                }
            }
            break;
    }

    // Log result but don't mark as "processed" - allow retries
    if (actionTaken) {
        LOG_DEBUG << L"Action taken on device: " << SecureStringToWString(instanceId);
    }
}

// Enhanced keyboard safety check
int CountEnabledKeyboardsSecure() {
    HDEVINFO deviceInfoSet = SetupDiGetClassDevs(&GUID_DEVCLASS_KEYBOARD, NULL, NULL, DIGCF_PRESENT);
    if (deviceInfoSet == INVALID_HANDLE_VALUE) {
        LOG_WARNING << L"Failed to enumerate keyboards for safety check";
        return 0;
    }

    SP_DEVINFO_DATA deviceInfoData;
    deviceInfoData.cbSize = sizeof(SP_DEVINFO_DATA);
    DWORD idx = 0;
    int enabledCount = 0;

    while (SetupDiEnumDeviceInfo(deviceInfoSet, idx++, &deviceInfoData)) {
        if (!IsDeviceDisabledSecure(&deviceInfoData)) {
            enabledCount++;
        }
    }

    SetupDiDestroyDeviceInfoList(deviceInfoSet);

    LOG_DEBUG << L"Enabled keyboards count: " << enabledCount;
    return enabledCount;
}

// Enhanced category policy enforcement with performance monitoring
int EnforceCategoryPolicySecure(DeviceCategory& category) {
    if (category.action == ACTION_NOT_CONFIGURED) {
        return 0;
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    auto config = g_deviceState.GetConfig();

    LOG_INFO << L"Enforcing policy for: " << category.displayName
             << L" (Priority: " << category.priority << L")";

    HDEVINFO deviceInfoSet;
    SP_DEVINFO_DATA deviceInfoData;
    DWORD idx = 0;
    int count = 0;

    bool isWPD = (category.jsonKey == "windows_portable_devices");
    bool isKeyboard = (category.jsonKey == "keyboards");
    bool isMouse = (category.jsonKey == "mice");
    bool isHID = (category.jsonKey == "hid_devices");
    bool isLaptopSystem = IsLaptopCached();

    // Get devices - use DIGCF_ALLCLASSES for parent to catch all devices including initializing ones
    // Child processes can use DIGCF_PRESENT for better performance since devices are fully initialized
    // For ALLOW actions, always use DIGCF_ALLCLASSES to include disabled devices
    // For keyboards, also scan HID class to catch HID keyboards
    DWORD flags = DIGCF_ALLCLASSES;  // Always use ALLCLASSES to catch all devices

    if (!category.enumerator.empty()) {
        std::wstring enumW = SecureStringToWString(category.enumerator);
        deviceInfoSet = SetupDiGetClassDevs(NULL, enumW.c_str(), NULL, flags);
    } else if (category.classGuid) {
        deviceInfoSet = SetupDiGetClassDevs(category.classGuid, NULL, NULL, flags);

        // For keyboards, also scan HID class to catch HID keyboards that might be missed
        if (category.jsonKey == "keyboards") {
            // We'll scan HID class after the main keyboard class scan
            // This ensures we catch keyboards that appear as HID devices
        }
    } else {
        LOG_WARNING << L"No enumerator or class GUID for category: " << category.displayName;
        return 0;
    }

    if (deviceInfoSet == INVALID_HANDLE_VALUE) {
        LOG_ERROR << L"Failed to get device info set for: " << category.displayName;
        return 0;
    }

    deviceInfoData.cbSize = sizeof(SP_DEVINFO_DATA);

    while (SetupDiEnumDeviceInfo(deviceInfoSet, idx++, &deviceInfoData)) {
        // Use secure buffer allocation
        std::vector<char> deviceNameBuffer(MAX_DEVICE_NAME_LENGTH, 0);
        std::vector<char> hardwareIdBuffer(MAX_HARDWARE_ID_LENGTH, 0);
        std::vector<char> instanceIdBuffer(MAX_INSTANCE_ID_LENGTH, 0);

        // Get device description
        if (!SetupDiGetDeviceRegistryPropertyA(deviceInfoSet, &deviceInfoData,
            SPDRP_DEVICEDESC, NULL, (PBYTE)deviceNameBuffer.data(),
            deviceNameBuffer.size(), NULL)) {
            continue;
        }

        // Get hardware ID
        SetupDiGetDeviceRegistryPropertyA(deviceInfoSet, &deviceInfoData,
            SPDRP_HARDWAREID, NULL, (PBYTE)hardwareIdBuffer.data(),
            hardwareIdBuffer.size(), NULL);

        // Get instance ID
        if (!SetupDiGetDeviceInstanceIdA(deviceInfoSet, &deviceInfoData,
            instanceIdBuffer.data(), instanceIdBuffer.size(), NULL)) {
            continue;
        }

        std::string deviceName(deviceNameBuffer.data());
        std::string hardwareId(hardwareIdBuffer.data());
        std::string instanceId(instanceIdBuffer.data());

        // CENTRALIZED SAFETY GATE: Every enforcement path must pass through IsInternalDeviceEnhancedCached
        // If it's an internal device, we must skip it immediately regardless of category.
        bool isInternal = IsInternalDeviceEnhancedCached(instanceId, hardwareId);
        if (isInternal) {
            LOG_DEBUG << L"SKIP INTERNAL DEVICE (Global Gate): " << SecureStringToWString(deviceName)
                      << L" (" << SecureStringToWString(instanceId) << L")";
            continue;
        }

        // Validate extracted data
        if (deviceName.empty() || instanceId.empty()) {
            continue;
        }

        std::string vid, pid;
        SecureExtractVidPid(hardwareId, vid, pid);

        // For Apple devices, check VID
        if (!category.vendorId.empty()) {
            if (vid.empty() || _stricmp(vid.c_str(), category.vendorId.c_str()) != 0) {
                continue;
            }
        }

        // For WPD (mobile phones), check if VID is a known mobile vendor
        if (isWPD && !vid.empty()) {
            if (!IsMobileVidEnhanced(vid)) {
                continue;
            }
        }

        // Enhanced device blocking logic based on system type
        if (isKeyboard) {
            if (isLaptopSystem) {
                // LAPTOP: Only block external USB keyboards, protect internal keyboard
                if (isInternal) {
                    LOG_DEBUG << L"SKIP INTERNAL KEYBOARD (Laptop): " << SecureStringToWString(deviceName)
                              << L" (" << SecureStringToWString(instanceId) << L")";
                    continue;
                }
                LOG_DEBUG << L"EXTERNAL KEYBOARD (Laptop): " << SecureStringToWString(deviceName);
            } else {
                // DESKTOP: Enhanced safety check - don't block if this is the last enabled keyboard
                if (category.action == ACTION_BLOCK && !IsDeviceDisabledSecure(&deviceInfoData)) {
                    int enabledKBs = CountEnabledKeyboardsSecure();
                    if (enabledKBs <= 1) {
                        LOG_WARNING << L"SAFETY: Skipping last keyboard on desktop: " << SecureStringToWString(deviceName);
                        continue;
                    }
                }
                LOG_DEBUG << L"KEYBOARD (Desktop): " << SecureStringToWString(deviceName);
            }
        } else if (isMouse) {
            // MICE: Always protect internal touchpads on laptops
            if (isLaptopSystem && isInternal) {
                LOG_DEBUG << L"SKIP INTERNAL TOUCHPAD (Laptop): " << SecureStringToWString(deviceName)
                          << L" (" << SecureStringToWString(instanceId) << L")";
                continue;
            }
        } else if (isHID) {
            // HID DEVICES: Protect internal HID devices on laptops
            if (isLaptopSystem && isInternal) {
                LOG_DEBUG << L"SKIP INTERNAL HID (Laptop): " << SecureStringToWString(deviceName)
                          << L" (" << SecureStringToWString(instanceId) << L")";
                continue;
            }
        }

        // ENHANCED: Wireless and Bluetooth adapter filtering
        bool isWireless = (category.jsonKey == "wireless_adapters");
        bool isBluetooth = (category.jsonKey == "bluetooth_adapters");

        if (isWireless || isBluetooth) {
            // Always protect internal wireless/Bluetooth adapters
            if (isInternal) {
                LOG_DEBUG << L"SKIP INTERNAL " << (isWireless ? L"WIRELESS" : L"BLUETOOTH")
                          << L" ADAPTER: " << SecureStringToWString(deviceName)
                          << L" (" << SecureStringToWString(instanceId) << L")";
                continue;
            }

            // Log external adapters (dongles) that will be affected
            LOG_DEBUG << L"EXTERNAL " << (isWireless ? L"WIRELESS" : L"BLUETOOTH")
                      << L" DONGLE: " << SecureStringToWString(deviceName)
                      << L" (VID_" << SecureStringToWString(vid) << L"&PID_" << SecureStringToWString(pid) << L")";
        }

        // Apply device policy
        EnforceDevicePolicySecure(deviceInfoSet, &deviceInfoData, deviceName,
                                 hardwareId, instanceId, category.action, category.jsonKey);
        count++;

        // Add small delay to prevent overwhelming the system
        if (config.deviceScanDelayMs > 0 && count % 10 == 0) {
            Sleep(config.deviceScanDelayMs / 10);
        }
    }

    SetupDiDestroyDeviceInfoList(deviceInfoSet);

    // Supplementary scan: For keyboards, also scan HID class to catch HID keyboards
    if (category.jsonKey == "keyboards") {
        LOG_DEBUG << L"Performing supplementary HID scan for keyboards";

        HDEVINFO hidDeviceInfoSet = SetupDiGetClassDevs(&GUID_DEVCLASS_HIDCLASS, NULL, NULL, flags);
        if (hidDeviceInfoSet != INVALID_HANDLE_VALUE) {
            SP_DEVINFO_DATA hidDeviceInfoData;
            hidDeviceInfoData.cbSize = sizeof(SP_DEVINFO_DATA);
            DWORD hidIdx = 0;

            while (SetupDiEnumDeviceInfo(hidDeviceInfoSet, hidIdx++, &hidDeviceInfoData)) {
                // Use secure buffer allocation
                std::vector<char> deviceNameBuffer(MAX_DEVICE_NAME_LENGTH, 0);
                std::vector<char> hardwareIdBuffer(MAX_HARDWARE_ID_LENGTH, 0);
                std::vector<char> instanceIdBuffer(MAX_INSTANCE_ID_LENGTH, 0);

                // Get device name
                if (!SetupDiGetDeviceRegistryPropertyA(hidDeviceInfoSet, &hidDeviceInfoData,
                                                      SPDRP_FRIENDLYNAME, NULL,
                                                      (PBYTE)deviceNameBuffer.data(),
                                                      deviceNameBuffer.size(), NULL)) {
                    if (!SetupDiGetDeviceRegistryPropertyA(hidDeviceInfoSet, &hidDeviceInfoData,
                                                          SPDRP_DEVICEDESC, NULL,
                                                          (PBYTE)deviceNameBuffer.data(),
                                                          deviceNameBuffer.size(), NULL)) {
                        continue;
                    }
                }

                std::string deviceName(deviceNameBuffer.data());

                // Only process HID devices that are keyboards
                if (deviceName.find("Keyboard") == std::string::npos &&
                    deviceName.find("keyboard") == std::string::npos &&
                    deviceName.find("KEYBOARD") == std::string::npos) {
                    continue;
                }

                // Get hardware ID and instance ID
                std::string hardwareId, instanceId;
                if (SetupDiGetDeviceRegistryPropertyA(hidDeviceInfoSet, &hidDeviceInfoData,
                                                     SPDRP_HARDWAREID, NULL,
                                                     (PBYTE)hardwareIdBuffer.data(),
                                                     hardwareIdBuffer.size(), NULL)) {
                    hardwareId = hardwareIdBuffer.data();
                }

                if (SetupDiGetDeviceInstanceIdA(hidDeviceInfoSet, &hidDeviceInfoData,
                                               instanceIdBuffer.data(),
                                               instanceIdBuffer.size(), NULL)) {
                    instanceId = instanceIdBuffer.data();
                }

                // CENTRALIZED SAFETY GATE: Check if internal before processing HID keyboard
                if (IsInternalDeviceEnhancedCached(instanceId, hardwareId)) {
                    LOG_DEBUG << L"SKIP INTERNAL HID Keyboard: " << SecureStringToWString(deviceName);
                    continue;
                }

                // Process this HID keyboard device
                LOG_DEBUG << L"HID Keyboard found: " << SecureStringToWString(deviceName);
                EnforceDevicePolicySecure(hidDeviceInfoSet, &hidDeviceInfoData, deviceName,
                                         hardwareId, instanceId, category.action, category.jsonKey);
                count++;
            }

            SetupDiDestroyDeviceInfoList(hidDeviceInfoSet);
        }
    }

    // Supplementary scan: For mice, also scan HID class to catch HID mice
    if (category.jsonKey == "mice") {
        LOG_DEBUG << L"Performing supplementary HID scan for mice";

        HDEVINFO hidDeviceInfoSet = SetupDiGetClassDevs(&GUID_DEVCLASS_HIDCLASS, NULL, NULL, flags);
        if (hidDeviceInfoSet != INVALID_HANDLE_VALUE) {
            SP_DEVINFO_DATA hidDeviceInfoData;
            hidDeviceInfoData.cbSize = sizeof(SP_DEVINFO_DATA);
            DWORD hidIdx = 0;

            while (SetupDiEnumDeviceInfo(hidDeviceInfoSet, hidIdx++, &hidDeviceInfoData)) {
                // Use secure buffer allocation
                std::vector<char> deviceNameBuffer(MAX_DEVICE_NAME_LENGTH, 0);
                std::vector<char> hardwareIdBuffer(MAX_HARDWARE_ID_LENGTH, 0);
                std::vector<char> instanceIdBuffer(MAX_INSTANCE_ID_LENGTH, 0);

                // Get device name
                if (!SetupDiGetDeviceRegistryPropertyA(hidDeviceInfoSet, &hidDeviceInfoData,
                                                      SPDRP_FRIENDLYNAME, NULL,
                                                      (PBYTE)deviceNameBuffer.data(),
                                                      deviceNameBuffer.size(), NULL)) {
                    if (!SetupDiGetDeviceRegistryPropertyA(hidDeviceInfoSet, &hidDeviceInfoData,
                                                          SPDRP_DEVICEDESC, NULL,
                                                          (PBYTE)deviceNameBuffer.data(),
                                                          deviceNameBuffer.size(), NULL)) {
                        continue;
                    }
                }

                std::string deviceName(deviceNameBuffer.data());

                // Only process HID devices that are mice
                if (deviceName.find("Mouse") == std::string::npos &&
                    deviceName.find("mouse") == std::string::npos &&
                    deviceName.find("MOUSE") == std::string::npos) {
                    continue;
                }

                // Get hardware ID and instance ID
                std::string hardwareId, instanceId;
                if (SetupDiGetDeviceRegistryPropertyA(hidDeviceInfoSet, &hidDeviceInfoData,
                                                     SPDRP_HARDWAREID, NULL,
                                                     (PBYTE)hardwareIdBuffer.data(),
                                                     hardwareIdBuffer.size(), NULL)) {
                    hardwareId = hardwareIdBuffer.data();
                }

                if (SetupDiGetDeviceInstanceIdA(hidDeviceInfoSet, &hidDeviceInfoData,
                                               instanceIdBuffer.data(),
                                               instanceIdBuffer.size(), NULL)) {
                    instanceId = instanceIdBuffer.data();
                }

                // CENTRALIZED SAFETY GATE: Check if internal before processing HID mouse
                if (IsInternalDeviceEnhancedCached(instanceId, hardwareId)) {
                    LOG_DEBUG << L"SKIP INTERNAL HID Mouse: " << SecureStringToWString(deviceName);
                    continue;
                }

                // Process this HID mouse device
                LOG_DEBUG << L"HID Mouse found: " << SecureStringToWString(deviceName);
                EnforceDevicePolicySecure(hidDeviceInfoSet, &hidDeviceInfoData, deviceName,
                                         hardwareId, instanceId, category.action, category.jsonKey);
                count++;
            }

            SetupDiDestroyDeviceInfoList(hidDeviceInfoSet);
        }
    }

    // Performance monitoring
    if (config.enablePerformanceMonitoring) {
        auto endTime = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
        LOG_INFO << L"Category " << category.displayName << L" processed " << count
                 << L" devices in " << duration.count() << L"ms";
    }

    return count;
}
// ============================================
// ENHANCED POLICY ENFORCEMENT WITH RETRY AND SYNCHRONIZATION
// ============================================
void EnforceAllPoliciesSecure() {
    EnforceAllPoliciesWithRetrySecure(1);  // Single pass by default
}

void EnforceAllPoliciesWithRetrySecure(int maxAttempts) {
    // Acquire process mutex to prevent conflicts
    if (g_processMutex) {
        DWORD waitResult = WaitForSingleObject(g_processMutex, 30000);  // 30 second timeout
        if (waitResult != WAIT_OBJECT_0) {
            LOG_WARNING << L"Failed to acquire process mutex, continuing anyway";
        }
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    auto config = g_deviceState.GetConfig();

    LOG_INFO << L"========================================";
    LOG_INFO << L"  ENFORCING DEVICE POLICIES (ENHANCED)";
    LOG_INFO << L"  Multiple attempts: " << maxAttempts;
    LOG_INFO << L"========================================";

    // CRITICAL FIX: Do NOT clear processed devices between attempts
    // This allows the system to retry failed operations on already-connected devices
    // Only clear at the very beginning
    g_deviceState.ClearProcessedDevices();

    // Get categories sorted by priority
    auto categories = g_deviceState.GetCategories();

    // IMPORTANT: Registry policies are GLOBAL (not per-device).
    // Never apply registry changes for ACTION_ALLOW_ON_TRUSTED.
    // Trust is enforced ONLY at device level.
    // Apply registry-based blocking first (highest priority)
    for (auto& category : categories) {
        if (category.jsonKey == "windows_portable_devices") {
            if (category.action == ACTION_BLOCK) {
                BlockWPDClassSecure();
            } else if (category.action == ACTION_ALLOW) {
                AllowWPDClassSecure();
            }
            // ACTION_ALLOW_ON_TRUSTED: Do not touch registry - trust logic happens at device level only
        }

        if (category.jsonKey == "removable_storage_devices") {
            if (category.action == ACTION_BLOCK) {
                BlockRemovableStorageClassSecure();
            } else if (category.action == ACTION_ALLOW) {
                AllowRemovableStorageClassSecure();
            }
            // ACTION_ALLOW_ON_TRUSTED: Do not touch registry - trust logic happens at device level only
        }

        // Handle Bluetooth audio devices when Bluetooth adapter policy is set
        if (category.jsonKey == "bluetooth_adapters" && category.action != ACTION_NOT_CONFIGURED) {
            LOG_INFO << L"Enforcing Bluetooth audio profile devices...";
            EnforceBluetoothAudioDevicesSecure(category.action);
        }
    }

    // Apply device-level blocking with retry and performance monitoring
    int totalDevicesProcessed = 0;

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        LOG_INFO << L"[ATTEMPT " << attempt << L"/" << maxAttempts << L"] Scanning for devices...";

        int attemptDevicesProcessed = 0;

        // Process categories by priority (lower number = higher priority)
        for (auto& category : categories) {
            if (category.action == ACTION_NOT_CONFIGURED) continue;

            // Skip registry-based categories after first attempt (they don't need retries)
            // Registry changes are global and instant - retrying causes flickering
            bool isRegistryBased = (category.jsonKey == "windows_portable_devices" ||
                                   category.jsonKey == "removable_storage_devices");
            if (isRegistryBased && attempt > 1) {
                continue;
            }

            std::wstring actionName = L"NOT_CONFIGURED";
            switch (category.action) {
                case ACTION_ALLOW: actionName = L"ALLOW"; break;
                case ACTION_BLOCK: actionName = L"BLOCK"; break;
                case ACTION_ALLOW_ON_TRUSTED: actionName = L"ALLOW_ON_TRUSTED"; break;
                default: continue;
            }

            if (attempt == 1) {
                LOG_INFO << L"[" << actionName << L"] " << category.displayName
                         << L" (Priority: " << category.priority << L")";
            }

            int count = EnforceCategoryPolicySecure(category);
            attemptDevicesProcessed += count;

            if (count > 0) {
                LOG_DEBUG << L"  Attempt " << attempt << L" - Devices processed: " << count;
            }

            // Add delay between categories to prevent system overload
            if (config.deviceScanDelayMs > 0 && count > 0) {
                Sleep(config.deviceScanDelayMs / 2);
            }
        }

        totalDevicesProcessed += attemptDevicesProcessed;

        // If we have more attempts, wait for devices to initialize and retry failed operations
        if (attempt < maxAttempts) {
            LOG_INFO << L"[WAIT] Waiting " << config.deviceScanDelayMs << L"ms before retry...";
            Sleep(config.deviceScanDelayMs);
        }
    }

    // Performance summary
    if (config.enablePerformanceMonitoring) {
        auto endTime = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
        LOG_INFO << L"Policy enforcement completed - " << totalDevicesProcessed
                 << L" devices processed in " << duration.count() << L"ms";
    }

    LOG_INFO << L"========================================";
    LOG_INFO << L"  Policy enforcement complete!";
    LOG_INFO << L"  Scanned " << maxAttempts << L" times to catch all devices.";
    LOG_INFO << L"========================================";

    // Release process mutex
    if (g_processMutex) {
        ReleaseMutex(g_processMutex);
    }
}

// ============================================
// ENHANCED STATUS FILE WRITING
// ============================================
void WriteStatusFileSecure(const std::wstring& statusDir) {
    std::wstring statusPath = statusDir + L"\\device_control_status.json";

    try {
        auto categories = g_deviceState.GetCategories();
        auto config = g_deviceState.GetConfig();

        // Create JSON status report
        Json::Value statusReport;
        statusReport["timestamp"] = std::time(nullptr);
        statusReport["version"] = "Enhanced v2.0";
        statusReport["system_type"] = IsLaptopCached() ? "laptop" : "desktop";

        // Policy summary
        Json::Value policies;
        std::wstring blocked, allowed, trusted;
        int totalPolicies = 0;

        for (const auto& category : categories) {
            Json::Value policyInfo;
            policyInfo["display_name"] = SecureWStringToString(category.displayName);
            policyInfo["priority"] = category.priority;

            switch (category.action) {
                case ACTION_BLOCK:
                    policyInfo["action"] = "block";
                    if (!blocked.empty()) blocked += L", ";
                    blocked += category.displayName;
                    totalPolicies++;
                    break;
                case ACTION_ALLOW:
                    policyInfo["action"] = "allow";
                    if (!allowed.empty()) allowed += L", ";
                    allowed += category.displayName;
                    totalPolicies++;
                    break;
                case ACTION_ALLOW_ON_TRUSTED:
                    policyInfo["action"] = "allow_on_trusted";
                    if (!trusted.empty()) trusted += L", ";
                    trusted += category.displayName;
                    totalPolicies++;
                    break;
                default:
                    policyInfo["action"] = "not_configured";
                    break;
            }

            policies[category.jsonKey] = policyInfo;
        }

        statusReport["policies"] = policies;
        statusReport["total_policies_configured"] = totalPolicies;

        // Configuration summary
        Json::Value configInfo;
        configInfo["command_timeout_ms"] = config.commandTimeoutMs;
        configInfo["max_retry_attempts"] = config.maxRetryAttempts;
        configInfo["device_scan_delay_ms"] = config.deviceScanDelayMs;
        configInfo["audit_logging_enabled"] = config.enableAuditLogging;
        configInfo["performance_monitoring_enabled"] = config.enablePerformanceMonitoring;
        statusReport["configuration"] = configInfo;

        // Summary text for backward compatibility
        std::wstring remarks;
        if (!blocked.empty()) {
            remarks = L"Blocked: " + blocked;
        }
        if (!allowed.empty()) {
            if (!remarks.empty()) remarks += L" | ";
            remarks += L"Allowed: " + allowed;
        }
        if (!trusted.empty()) {
            if (!remarks.empty()) remarks += L" | ";
            remarks += L"Allow on Trusted: " + trusted;
        }

        if (remarks.empty()) {
            remarks = L"No policies configured";
        }

        statusReport["summary"] = SecureWStringToString(remarks);

        // Write JSON status file
        std::ofstream statusFile(statusPath);
        if (statusFile.is_open()) {
            Json::StreamWriterBuilder builder;
            builder["indentation"] = "  ";
            std::unique_ptr<Json::StreamWriter> writer(builder.newStreamWriter());
            writer->write(statusReport, &statusFile);
            statusFile.close();

            LOG_INFO << L"Enhanced status file written: " << statusPath;
        }

        // Also write simple text file for backward compatibility
        std::wstring textStatusPath = statusDir + L"\\device_control_status.txt";
        std::wofstream textStatusFile(textStatusPath);
        if (textStatusFile.is_open()) {
            textStatusFile << remarks;
            textStatusFile.close();
        }

        LOG_INFO << L"Status: " << remarks;

    } catch (const std::exception& e) {
        LOG_ERROR << "Exception writing status file: " << e.what();
    } catch (...) {
        LOG_ERROR << L"Unknown exception writing status file";
    }
}

// ============================================
// ENHANCED ERROR HANDLING AND CLEANUP
// ============================================
int wmain(int argc, wchar_t* argv[]) {
    // Set global exception filter for EXE
    SetUnhandledExceptionFilter(EnhancedExceptionHandler);

    // Initialize process mutex for synchronization
    g_processMutex = CreateMutexW(NULL, FALSE, PROCESS_SYNC_MUTEX_NAME);
    if (!g_processMutex) {
        // Continue without mutex if creation fails
        LOG_WARNING << L"Failed to create process synchronization mutex";
    }

    // Initialize plog for Device Control logging
    try {
        plog::init(plog::debug, GetLogPath(DEVICE_CONTROL_LOG_FILE).c_str(),
                  MAX_LOG_SIZE_BYES, MAX_LOG_FILE_COUNT);
    } catch (...) {
        // Fallback to console logging if file logging fails
        std::wcerr << L"Failed to initialize file logging, using console" << std::endl;
    }

    // Check if running as a child process
    bool isChildProcess = false;
    int childDelayMs = 0;
    for (int i = 1; i < argc; i++) {
        if (_wcsicmp(argv[i], L"/child") == 0 && i + 1 < argc) {
            isChildProcess = true;
            childDelayMs = _wtoi(argv[i + 1]);
            break;
        }
    }

    if (isChildProcess) {
        LOG_INFO << L"CHILD PROCESS: Waiting " << childDelayMs << L"ms before enforcement...";
        Sleep(childDelayMs);
        LOG_INFO << L"CHILD PROCESS: Starting delayed enforcement";
    } else {
        LOG_INFO << L"PARENT PROCESS: Running main enforcement";
    }

    // Normal parent process mode
    LOG_INFO << L"========================================";
    LOG_INFO << L"  ZECURIT DEVICE ACCESS CONTROL";
    LOG_INFO << L"  Version 2.0 - " << (isChildProcess ? L"Child Mode" : L"Parent Mode");
    LOG_INFO << L"========================================";

    // Detect system type with enhanced detection
    bool isLaptopSystem = IsLaptopCached();
    LOG_INFO << L"System Type: " << (isLaptopSystem ? L"LAPTOP" : L"DESKTOP");
    if (isLaptopSystem) {
        LOG_INFO << L"Laptop Mode: Internal keyboard/touchpad will be protected";
    } else {
        LOG_INFO << L"Desktop Mode: All keyboards/mice subject to policy with safety checks";
    }

    // Initialize enhanced device categories
    InitializeCategoriesEnhanced();

    // Validate command line arguments
    if (argc < 2) {
        LOG_ERROR << L"Usage: ZDeviceControl.exe <policy_json_path>";
        LOG_ERROR << L"Example: ZDeviceControl.exe \"C:\\Policies\\device_policy.json\"";
        return 1;
    }

    std::wstring jsonPath = argv[1];
    if (jsonPath.empty() || jsonPath.length() > MAX_PATH) {
        LOG_ERROR << L"Invalid policy file path";
        return 1;
    }

    LOG_INFO << L"Policy file: " << jsonPath;

    // Get agent directory for configuration and whitelist
    LPTSTR agentDirPtr = NULL;
    SmartPtr<AgentDetailsHandler> agentHandler = new AgentDetailsHandler();
    agentHandler->GetAgentInstalledDir(&agentDirPtr);

    std::wstring agentDir;
    if (agentDirPtr != NULL && wcslen(agentDirPtr) > 0) {
        agentDir = agentDirPtr;
    } else {
        // Fallback to default path
        agentDir = L"C:\\Program Files\\Zecurit\\Agent";
    }

    LOG_INFO << L"Agent directory: " << agentDir;

    // Load enhanced configuration
    std::wstring configPath = agentDir + L"\\" + CONFIG_FILE;
    DeviceControlConfig config;
    if (!LoadConfiguration(configPath, config)) {
        LOG_WARNING << L"Using default configuration";
        CreateDefaultConfiguration(configPath);
    }
    g_deviceState.SetConfig(config);

    // Load enhanced whitelist
    if (!LoadWhitelistEnhanced(agentDir)) {
        LOG_ERROR << L"Failed to load whitelist";
        return 1;
    }

    // Load policy from JSON with enhanced validation
    if (!LoadPolicyFromJsonSecure(jsonPath)) {
        LOG_ERROR << L"Failed to load policy";
        return 1;
    }

    // Enhanced policy enforcement with multiple retry attempts
    LOG_INFO << L"Applying device access control policy...";
    LOG_INFO << L"Using multiple scan attempts to catch already-connected devices";

    // Use multiple attempts to catch devices in different states
    // This addresses the port-specific blocking issue by retrying failed operations
    int maxAttempts = config.maxRetryAttempts;  // Use configured retry attempts (default: 3)
    EnforceAllPoliciesWithRetrySecure(maxAttempts);

    LOG_INFO << L"Device Control policy execution completed";

    // Child processes disabled - they cause conflicts when policies change
    // and cannot handle already-connected devices anyway (Windows limitation)

    LOG_INFO << L"For already-connected devices: Unplug and replug to apply policy";

    // Small delay to ensure all operations complete before exit
    Sleep(500);

    // Cleanup
    CleanupResources();

    LOG_INFO << L"Process exiting with code 0 (SUCCESS)";
    return 0;
}

// ============================================
// ENHANCED ERROR HANDLING AND CLEANUP
// ============================================
void CleanupResources() {
    if (g_processMutex) {
        CloseHandle(g_processMutex);
        g_processMutex = nullptr;
    }

    // Clear global state
    g_deviceState.ClearProcessedDevices();

    LOG_INFO << L"Resources cleaned up successfully";
}

// Enhanced exception handler
LONG WINAPI EnhancedExceptionHandler(EXCEPTION_POINTERS* pExceptionInfo) {
    LOG_ERROR << L"Unhandled exception occurred - Code: "
              << std::hex << pExceptionInfo->ExceptionRecord->ExceptionCode;

    CleanupResources();
    return EXCEPTION_EXECUTE_HANDLER;
}

// ============================================
// END OF ENHANCED DEVICE CONTROL MODULE
// ============================================

/*
 * SECURITY ENHANCEMENTS SUMMARY:
 *
 * 1. Buffer Overflow Prevention:
 *    - Dynamic buffer allocation with size validation
 *    - Bounds checking for all string operations
 *    - Maximum length constants for security
 *
 * 2. Command Injection Prevention:
 *    - Input sanitization for all external data
 *    - Command parameter validation
 *    - Secure process creation with proper escaping
 *
 * 3. Enhanced Input Validation:
 *    - UTF-8 encoding support
 *    - Format validation for device IDs
 *    - Length limits and character filtering
 *
 * 4. Thread Safety:
 *    - Mutex-based protection for global state
 *    - Thread-safe accessors and mutators
 *    - Process synchronization
 *
 * 5. Error Handling:
 *    - Comprehensive error checking
 *    - Graceful failure handling
 *    - Resource cleanup on exceptions
 *
 * 6. Performance Monitoring:
 *    - Execution time tracking
 *    - Resource usage monitoring
 *    - Configurable delays and timeouts
 *
 * 7. Enterprise Features:
 *    - JSON configuration management
 *    - Enhanced whitelist support
 *    - Priority-based policy enforcement
 *    - Detailed status reporting
 *    - UI-aligned policy actions (allow/block/allow_on_trusted/not_configured)
 *
 * 8. System Compatibility:
 *    - Enhanced laptop/desktop detection
 *    - WMI-based system identification
 *    - Internal device protection
 *    - Safety checks for critical devices
 *
 * This enhanced version addresses all critical security vulnerabilities
 * while adding enterprise-grade features for better manageability,
 * monitoring, and reliability in production environments.lol
 */