const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('neko', {
  onTaskbarState(callback) {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('taskbar-state-changed', listener)
    return () => ipcRenderer.removeListener('taskbar-state-changed', listener)
  },
  setBounds(bounds) {
    ipcRenderer.send('cat-bounds', bounds)
  }
})
