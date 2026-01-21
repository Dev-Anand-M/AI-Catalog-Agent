# Zecurit Agent - Device Control Module

This directory contains the C++ implementation of the Enhanced Device Access Control Module for Zecurit Agent.

## Overview

The `ZDeviceControl_Enhanced_Complete.cpp` file contains a complete implementation of a Windows-based device control agent with the following features:

- **Enhanced Security**: Buffer overflow prevention, command injection prevention, and secure input validation.
- **Enterprise Features**: JSON configuration, whitelist support, priority-based policy enforcement, and audit logging.
- **System Compatibility**: Enhanced laptop/desktop detection and internal device protection.
- **Device Management**: Support for controlling removable storage, WPD (phones), Bluetooth, wireless adapters, and more.

## Compilation

This code is designed to be compiled in Visual Studio (x64) on Windows. It requires the Windows SDK.

**Dependencies:**
- `setupapi.lib`
- `cfgmgr32.lib`
- `user32.lib`
- `advapi32.lib`
- `wbemuuid.lib`
- `ole32.lib`
- `oleaut32.lib`

**Headers:**
- `plog/Log.h` (Plog logging library)
- `JsonCppWrapper.h` (JSON handling)
- `AgentDetailsHandler.h` (Agent details)
- `globalVars.h`

## Usage

```bash
ZDeviceControl.exe <policy_json_path>
```

Example:
```bash
ZDeviceControl.exe "C:\Policies\device_policy.json"
```

The agent runs as a standalone executable and enforces policies defined in the JSON configuration file.
