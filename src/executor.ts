/**
 * Local action executor - executes actions on the device
 *
 * This module uses Node.js child_process to execute platform-specific
 * commands for mouse/keyboard automation.
 *
 * Coordinates received from the agent are in physical (screenshot) space.
 * This module converts them to logical (click) space before executing.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { DesktopAction } from './types';

const execAsync = promisify(exec);

// Detect platform
const platform = process.platform;

// Cache for xdotool availability check
let xdotoolChecked = false;

// Cache for DPI scale factor
let cachedScaleFactor: number | null = null;

async function ensureXdotool(): Promise<void> {
  if (xdotoolChecked) return;
  try {
    await execAsync('which xdotool');
    xdotoolChecked = true;
  } catch {
    const distroHints = `
Install xdotool for your distribution:
  Ubuntu/Debian: sudo apt install xdotool
  Fedora/RHEL:   sudo dnf install xdotool
  Arch Linux:    sudo pacman -S xdotool
  openSUSE:      sudo zypper install xdotool`;
    throw new Error(`xdotool is required for Linux input simulation but was not found.${distroHints}`);
  }
}

/**
 * Get the DPI scale factor (physical pixels / logical pixels).
 * On retina/HiDPI displays this is typically 2.0.
 * On standard displays this is 1.0.
 */
export async function getScaleFactor(): Promise<number> {
  if (cachedScaleFactor !== null) {
    return cachedScaleFactor;
  }

  try {
    if (platform === 'darwin') {
      // macOS: Get the backing scale factor from the main display
      const jxaScript = `
        ObjC.import('Cocoa');
        var screen = $.NSScreen.mainScreen;
        screen.backingScaleFactor;
      `;
      const { stdout } = await execAsync(`osascript -l JavaScript -e '${jxaScript}'`);
      cachedScaleFactor = parseFloat(stdout.trim()) || 1.0;
    } else if (platform === 'win32') {
      // Windows: Get DPI scaling percentage
      const { stdout } = await execAsync(
        "powershell -Command \"(Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -Name AppliedDPI -ErrorAction SilentlyContinue).AppliedDPI\""
      );
      const dpi = parseInt(stdout.trim()) || 96;
      cachedScaleFactor = dpi / 96;
    } else {
      // Linux: Check for HiDPI via GDK_SCALE or assume 1.0
      const scale = process.env.GDK_SCALE;
      cachedScaleFactor = scale ? parseFloat(scale) : 1.0;
    }
  } catch {
    cachedScaleFactor = 1.0;
  }

  return cachedScaleFactor;
}

/**
 * Convert coordinates from physical (screenshot) space to logical (click) space.
 */
async function toLogicalCoords(x: number, y: number): Promise<{ x: number; y: number }> {
  const scale = await getScaleFactor();
  return {
    x: Math.round(x / scale),
    y: Math.round(y / scale),
  };
}

/**
 * Execute an action on the local device.
 *
 * @param action - The action to execute
 * @returns true if the action was executed successfully
 */
export async function executeAction(action: DesktopAction): Promise<boolean> {
  const actionType = action.type;

  switch (actionType) {
    case 'click':
    case 'double_click':
    case 'right_click':
    case 'triple_click':
      return executeClick(action);
    case 'hover':
      return executeHover(action);
    case 'type':
      return executeType(action);
    case 'key':
      return executeKey(action);
    case 'scroll':
      return executeScroll(action);
    case 'drag':
      return executeDrag(action);
    case 'wait':
      return executeWait(action);
    case 'finish':
    case 'fail':
      // Control actions, not device actions
      return true;
    default:
      console.warn(`Unknown action type: ${actionType}`);
      return false;
  }
}

/**
 * Execute multiple actions in sequence.
 *
 * @param actions - The actions to execute
 */
export async function executeActions(actions: DesktopAction[]): Promise<void> {
  for (const action of actions) {
    await executeAction(action);
  }
}

async function executeClick(action: DesktopAction): Promise<boolean> {
  const physicalX = action.x;
  const physicalY = action.y;
  if (physicalX === undefined || physicalY === undefined) return false;

  const scale = await getScaleFactor();
  const logical = await toLogicalCoords(physicalX, physicalY);
  const x = logical.x;
  const y = logical.y;
  const actionType = action.type;

  console.log(
    `[executor] ${actionType}: physical=(${physicalX}, ${physicalY}) -> logical=(${x}, ${y}) scale=${scale}`
  );

  if (platform === 'darwin') {
    const mouseButton = actionType === 'right_click' ? 'kCGMouseButtonRight' : 'kCGMouseButtonLeft';
    const mouseDownEvent = actionType === 'right_click' ? 'kCGEventRightMouseDown' : 'kCGEventLeftMouseDown';
    const mouseUpEvent = actionType === 'right_click' ? 'kCGEventRightMouseUp' : 'kCGEventLeftMouseUp';
    const clickCount = actionType === 'triple_click' ? 3 : actionType === 'double_click' ? 2 : 1;

    const jxaScript = `
      ObjC.import('Cocoa');
      var point = $.CGPointMake(${x}, ${y});
      for (var i = 0; i < ${clickCount}; i++) {
        var mouseDown = $.CGEventCreateMouseEvent($(), $.${mouseDownEvent}, point, $.${mouseButton});
        $.CGEventSetIntegerValueField(mouseDown, $.kCGMouseEventClickState, i + 1);
        $.CGEventPost($.kCGHIDEventTap, mouseDown);
        var mouseUp = $.CGEventCreateMouseEvent($(), $.${mouseUpEvent}, point, $.${mouseButton});
        $.CGEventSetIntegerValueField(mouseUp, $.kCGMouseEventClickState, i + 1);
        $.CGEventPost($.kCGHIDEventTap, mouseUp);
      }
    `;
    await execAsync(`osascript -l JavaScript -e '${jxaScript.replace(/'/g, "'\\''")}'`);
  } else if (platform === 'win32') {
    const repeatCount = actionType === 'triple_click' ? 3 : actionType === 'double_click' ? 2 : 1;
    const isRightClick = actionType === 'right_click';
    const downEvent = isRightClick ? '0x00000008' : '0x00000002';
    const upEvent = isRightClick ? '0x00000010' : '0x00000004';

    const clickCmd = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
      $signature = @'
[DllImport("user32.dll", CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
      $mouse = Add-Type -memberDefinition $signature -name "Win32MouseEventNew" -namespace Win32Functions -passThru
      for ($i = 0; $i -lt ${repeatCount}; $i++) {
        $mouse::mouse_event(${downEvent}, 0, 0, 0, 0)
        $mouse::mouse_event(${upEvent}, 0, 0, 0, 0)
        if ($i -lt ${repeatCount - 1}) { Start-Sleep -Milliseconds 50 }
      }
    `;
    await execAsync(`powershell -Command "${clickCmd.replace(/\n/g, ' ')}"`);
  } else {
    await ensureXdotool();
    const clickOpt = actionType === 'right_click' ? '3' : '1';
    const repeat = actionType === 'triple_click' ? '--repeat 3' : actionType === 'double_click' ? '--repeat 2' : '';
    await execAsync(`xdotool mousemove ${x} ${y} click ${repeat} ${clickOpt}`);
  }

  return true;
}

async function executeHover(action: DesktopAction): Promise<boolean> {
  const physicalX = action.x;
  const physicalY = action.y;
  if (physicalX === undefined || physicalY === undefined) return false;

  const scale = await getScaleFactor();
  const logical = await toLogicalCoords(physicalX, physicalY);
  const x = logical.x;
  const y = logical.y;

  console.log(
    `[executor] hover: physical=(${physicalX}, ${physicalY}) -> logical=(${x}, ${y}) scale=${scale}`
  );

  if (platform === 'darwin') {
    const jxaScript = `
      ObjC.import('Cocoa');
      var point = $.CGPointMake(${x}, ${y});
      var move = $.CGEventCreateMouseEvent($(), $.kCGEventMouseMoved, point, 0);
      $.CGEventPost($.kCGHIDEventTap, move);
    `;
    await execAsync(`osascript -l JavaScript -e '${jxaScript.replace(/'/g, "'\\''")}'`);
  } else if (platform === 'win32') {
    await execAsync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`
    );
  } else {
    await ensureXdotool();
    await execAsync(`xdotool mousemove ${x} ${y}`);
  }

  return true;
}

async function executeType(action: DesktopAction): Promise<boolean> {
  const text = action.text || action.content || '';
  if (!text) return false;

  if (platform === 'darwin') {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escaped}"'`);
  } else if (platform === 'win32') {
    const escaped = text.replace(/'/g, "''");
    await execAsync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')"`
    );
  } else {
    await ensureXdotool();
    await execAsync(`xdotool type "${text}"`);
  }

  return true;
}

async function executeKey(action: DesktopAction): Promise<boolean> {
  const key = (action.key || '').toLowerCase();
  if (!key) return false;

  if (platform === 'darwin') {
    const keyMap = translateKeyMac(key);
    await execAsync(`osascript -e 'tell application "System Events" to ${keyMap}'`);
  } else if (platform === 'win32') {
    const keyMap = translateKeyWindows(key);
    await execAsync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keyMap}')"`
    );
  } else {
    await ensureXdotool();
    const keyMap = translateKeyLinux(key);
    await execAsync(`xdotool key ${keyMap}`);
  }

  return true;
}

function translateKeyMac(key: string): string {
  if (key.includes('+')) {
    const parts = key.split('+').map((k) => k.trim());
    const modifiers: string[] = [];
    let mainKey = '';

    for (const part of parts) {
      if (['cmd', 'command', 'meta', 'super'].includes(part)) {
        modifiers.push('command down');
      } else if (['ctrl', 'control'].includes(part)) {
        modifiers.push('control down');
      } else if (['alt', 'option'].includes(part)) {
        modifiers.push('option down');
      } else if (['shift'].includes(part)) {
        modifiers.push('shift down');
      } else {
        mainKey = part;
      }
    }

    const modStr = modifiers.length > 0 ? `using {${modifiers.join(', ')}}` : '';
    return `keystroke "${mainKey}" ${modStr}`;
  }

  const specialKeys: Record<string, string> = {
    enter: 'key code 36',
    return: 'key code 36',
    tab: 'key code 48',
    escape: 'key code 53',
    esc: 'key code 53',
    backspace: 'key code 51',
    delete: 'key code 117',
    up: 'key code 126',
    down: 'key code 125',
    left: 'key code 123',
    right: 'key code 124',
    space: 'key code 49',
    home: 'key code 115',
    end: 'key code 119',
    pageup: 'key code 116',
    pagedown: 'key code 121',
    f1: 'key code 122',
    f2: 'key code 120',
    f3: 'key code 99',
    f4: 'key code 118',
    f5: 'key code 96',
    f6: 'key code 97',
    f7: 'key code 98',
    f8: 'key code 100',
    f9: 'key code 101',
    f10: 'key code 109',
    f11: 'key code 103',
    f12: 'key code 111',
  };

  return specialKeys[key] || `keystroke "${key}"`;
}

function translateKeyWindows(key: string): string {
  if (key.includes('+')) {
    const parts = key.split('+').map((k) => k.trim());
    let result = '';

    for (const part of parts) {
      if (['cmd', 'command', 'meta', 'super', 'ctrl', 'control'].includes(part)) {
        result += '^';
      } else if (['alt', 'option'].includes(part)) {
        result += '%';
      } else if (['shift'].includes(part)) {
        result += '+';
      } else {
        result += part;
      }
    }

    return result;
  }

  const specialKeys: Record<string, string> = {
    enter: '{ENTER}',
    return: '{ENTER}',
    tab: '{TAB}',
    escape: '{ESC}',
    esc: '{ESC}',
    backspace: '{BACKSPACE}',
    delete: '{DELETE}',
    up: '{UP}',
    down: '{DOWN}',
    left: '{LEFT}',
    right: '{RIGHT}',
    space: ' ',
    home: '{HOME}',
    end: '{END}',
    pageup: '{PGUP}',
    pagedown: '{PGDN}',
    f1: '{F1}',
    f2: '{F2}',
    f3: '{F3}',
    f4: '{F4}',
    f5: '{F5}',
    f6: '{F6}',
    f7: '{F7}',
    f8: '{F8}',
    f9: '{F9}',
    f10: '{F10}',
    f11: '{F11}',
    f12: '{F12}',
  };

  return specialKeys[key] || key;
}

function translateKeyLinux(key: string): string {
  if (key.includes('+')) {
    const parts = key.split('+').map((k) => k.trim());
    const mapped = parts.map((part) => {
      if (['cmd', 'command', 'meta', 'super'].includes(part)) return 'super';
      if (['ctrl', 'control'].includes(part)) return 'ctrl';
      if (['alt', 'option'].includes(part)) return 'alt';
      return part;
    });
    return mapped.join('+');
  }

  const specialKeys: Record<string, string> = {
    enter: 'Return',
    return: 'Return',
    tab: 'Tab',
    escape: 'Escape',
    esc: 'Escape',
    backspace: 'BackSpace',
    delete: 'Delete',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    space: 'space',
    home: 'Home',
    end: 'End',
    pageup: 'Page_Up',
    pagedown: 'Page_Down',
  };

  return specialKeys[key] || key;
}

async function executeScroll(action: DesktopAction): Promise<boolean> {
  const physicalX = action.x ?? 0;
  const physicalY = action.y ?? 0;
  const direction = action.direction || 'down';
  const amount = action.amount || 3;

  const scale = await getScaleFactor();
  const logical = await toLogicalCoords(physicalX, physicalY);
  const x = logical.x;
  const y = logical.y;

  console.log(
    `[executor] scroll ${direction}: physical=(${physicalX}, ${physicalY}) -> logical=(${x}, ${y}) scale=${scale}`
  );

  if (platform === 'darwin') {
    const scrollDeltaY = direction === 'up' ? amount * 10 : direction === 'down' ? -amount * 10 : 0;
    const scrollDeltaX = direction === 'left' ? amount * 10 : direction === 'right' ? -amount * 10 : 0;

    const jxaScript = `
      ObjC.import('Cocoa');
      var point = $.CGPointMake(${x}, ${y});
      var move = $.CGEventCreateMouseEvent($(), $.kCGEventMouseMoved, point, 0);
      $.CGEventPost($.kCGHIDEventTap, move);
      var scroll = $.CGEventCreateScrollWheelEvent($(), $.kCGScrollEventUnitLine, 2, ${scrollDeltaY}, ${scrollDeltaX});
      $.CGEventPost($.kCGHIDEventTap, scroll);
    `;
    await execAsync(`osascript -l JavaScript -e '${jxaScript.replace(/'/g, "'\\''")}'`);
  } else if (platform === 'win32') {
    const scrollAmount = (direction === 'up' || direction === 'left' ? 120 : -120) * amount;
    await execAsync(`powershell -Command "
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
      $signature = @'
[DllImport(\\"user32.dll\\", CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
      $mouse = Add-Type -memberDefinition $signature -name \\"Win32MouseEventNew\\" -namespace Win32Functions -passThru
      $mouse::mouse_event(0x00000800, 0, 0, ${scrollAmount}, 0)
    "`);
  } else {
    await ensureXdotool();
    await execAsync(`xdotool mousemove ${x} ${y}`);
    const button = direction === 'up' ? 4 : direction === 'down' ? 5 : direction === 'left' ? 6 : 7;
    await execAsync(`xdotool click --repeat ${amount} ${button}`);
  }

  return true;
}

async function executeDrag(action: DesktopAction): Promise<boolean> {
  const physicalStartX = action.start_x;
  const physicalStartY = action.start_y;
  const physicalEndX = action.end_x;
  const physicalEndY = action.end_y;

  if (
    physicalStartX === undefined ||
    physicalStartY === undefined ||
    physicalEndX === undefined ||
    physicalEndY === undefined
  ) {
    return false;
  }

  const scale = await getScaleFactor();
  const logicalStart = await toLogicalCoords(physicalStartX, physicalStartY);
  const logicalEnd = await toLogicalCoords(physicalEndX, physicalEndY);
  const startX = logicalStart.x;
  const startY = logicalStart.y;
  const endX = logicalEnd.x;
  const endY = logicalEnd.y;

  console.log(
    `[executor] drag: physical start=(${physicalStartX}, ${physicalStartY}) end=(${physicalEndX}, ${physicalEndY}) -> logical start=(${startX}, ${startY}) end=(${endX}, ${endY}) scale=${scale}`
  );

  if (platform === 'darwin') {
    const jxaScript = `
      ObjC.import('Cocoa');
      var startPoint = $.CGPointMake(${startX}, ${startY});
      var endPoint = $.CGPointMake(${endX}, ${endY});
      var mouseDown = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseDown, startPoint, $.kCGMouseButtonLeft);
      $.CGEventPost($.kCGHIDEventTap, mouseDown);
      delay(0.05);
      var drag = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseDragged, endPoint, $.kCGMouseButtonLeft);
      $.CGEventPost($.kCGHIDEventTap, drag);
      delay(0.05);
      var mouseUp = $.CGEventCreateMouseEvent($(), $.kCGEventLeftMouseUp, endPoint, $.kCGMouseButtonLeft);
      $.CGEventPost($.kCGHIDEventTap, mouseUp);
    `;
    await execAsync(`osascript -l JavaScript -e '${jxaScript.replace(/'/g, "'\\''")}'`);
  } else if (platform === 'win32') {
    await execAsync(`powershell -Command "
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${startX}, ${startY})
      $signature = @'
[DllImport(\\"user32.dll\\", CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
      $mouse = Add-Type -memberDefinition $signature -name \\"Win32MouseEventNew\\" -namespace Win32Functions -passThru
      $mouse::mouse_event(0x00000002, 0, 0, 0, 0)
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${endX}, ${endY})
      Start-Sleep -Milliseconds 100
      $mouse::mouse_event(0x00000004, 0, 0, 0, 0)
    "`);
  } else {
    await ensureXdotool();
    await execAsync(
      `xdotool mousemove ${startX} ${startY} mousedown 1 mousemove ${endX} ${endY} mouseup 1`
    );
  }

  return true;
}

async function executeWait(action: DesktopAction): Promise<boolean> {
  const duration = (action.duration || 1.0) * 1000;
  await new Promise((resolve) => setTimeout(resolve, duration));
  return true;
}

/**
 * Get the current screen size in physical pixels.
 */
export async function getScreenSize(): Promise<{ width: number; height: number }> {
  if (platform === 'darwin') {
    const { stdout } = await execAsync(
      "osascript -e 'tell application \"Finder\" to get bounds of window of desktop'"
    );
    const [, , width, height] = stdout.trim().split(', ').map(Number);
    return { width, height };
  } else if (platform === 'win32') {
    const { stdout } = await execAsync(
      'powershell -Command "[System.Windows.Forms.Screen]::PrimaryScreen.Bounds | Select-Object Width,Height | ConvertTo-Json"'
    );
    const bounds = JSON.parse(stdout);
    return { width: bounds.Width, height: bounds.Height };
  } else {
    const { stdout } = await execAsync('xdpyinfo | grep dimensions');
    const match = stdout.match(/(\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 1920, height: 1080 };
  }
}
