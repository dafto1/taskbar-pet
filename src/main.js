const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron')
const path = require('node:path')

const CAT_SIZE = 40
const TASKBAR_POLL_MS = 500

let catWindow
let taskbarTimer
let tray

function getTaskbarState() {
  const display = screen.getPrimaryDisplay()
  const { bounds, workArea } = display

  // The first release deliberately supports the conventional bottom taskbar.
  // A reduced work area at the bottom is the reliable Electron-level signal
  // that the taskbar is currently visible; auto-hide returns the full bounds.
  const bottomInset = bounds.y + bounds.height - (workArea.y + workArea.height)
  const isBottomTaskbar = workArea.x === bounds.x && workArea.width === bounds.width
  const visible = isBottomTaskbar && bottomInset >= 2

  return {
    visible,
    supported: isBottomTaskbar,
    x: workArea.x,
    y: workArea.y + workArea.height,
    width: workArea.width,
    height: Math.max(bottomInset, CAT_SIZE),
    scaleFactor: display.scaleFactor
  }
}

function sendTaskbarState() {
  if (!catWindow || catWindow.isDestroyed()) return

  const state = getTaskbarState()
  catWindow.webContents.send('taskbar-state-changed', state)

  if (!state.visible || !state.supported) {
    catWindow.hide()
    return
  }

  if (!catWindow.isVisible()) catWindow.showInactive()
}

function createWindow() {
  catWindow = new BrowserWindow({
    width: CAT_SIZE,
    height: CAT_SIZE,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  catWindow.setAlwaysOnTop(true, 'floating')
  catWindow.loadFile(path.join(__dirname, 'index.html'))

  catWindow.webContents.once('did-finish-load', () => {
    sendTaskbarState()
    taskbarTimer = setInterval(sendTaskbarState, TASKBAR_POLL_MS)
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'sprites', 'awake.png'))
  tray = new Tray(icon)
  tray.setToolTip('Neko Taskbar Pet')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Neko Taskbar Pet', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]))
}

app.whenReady().then(() => {
  if (process.platform !== 'win32') {
    console.warn('Neko Taskbar Pet is currently designed for Windows.')
  }

  app.setLoginItemSettings({ openAtLogin: true })
  createWindow()
  createTray()

  screen.on('display-metrics-changed', sendTaskbarState)
  screen.on('display-added', sendTaskbarState)
  screen.on('display-removed', sendTaskbarState)
})

app.on('window-all-closed', (event) => {
  // This is a background pet; keep the process alive until the user exits it.
  event.preventDefault()
})

app.on('before-quit', () => {
  if (taskbarTimer) clearInterval(taskbarTimer)
})

ipcMain.on('cat-bounds', (_event, bounds) => {
  if (!catWindow || catWindow.isDestroyed()) return
  const state = getTaskbarState()
  if (!state.visible || !state.supported) return

  const x = Math.round(Math.max(state.x, Math.min(bounds.x, state.x + state.width - CAT_SIZE)))
  const y = Math.round(state.y - CAT_SIZE + 2)
  catWindow.setPosition(x, y, false)
})
