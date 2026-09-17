# Neko Taskbar Pet

A small Windows Electron app that lets a pixel-art Neko cat sleep and run
across the primary taskbar.

## Development

```powershell
npm install
npm start
```

The app starts with Windows and lives in the system tray. Right-click the tray
icon and choose **Quit** to stop it.

## Behavior

- The cat automatically runs after a randomized idle period.
- Clicking the cat triggers one wake-up and one crossing.
- Clicks during a run are ignored.
- The cat is hidden while the taskbar is hidden, auto-hidden, or not a supported
  bottom taskbar.
- The first release uses the primary monitor only.

## Packaging

```powershell
npm run dist
```
