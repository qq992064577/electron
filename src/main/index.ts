import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
// Use the absolute path to the icon file

// 右键菜单模板
function createContextMenu(win: BrowserWindow) {
  win.webContents.on('context-menu', (event, params) => {
    event.preventDefault()
    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      { label: '重新加载', accelerator: 'Ctrl+R', click: () => win.webContents.reload() },
      { label: '返回', accelerator: 'Alt+Left', click: () => win.webContents.goBack() },
      { label: '前进', accelerator: 'Alt+Right', click: () => win.webContents.goForward() },
      { type: 'separator' },
      { label: '开发者工具', accelerator: 'F12', click: () => win.webContents.toggleDevTools() }
    ]
    if (params.linkURL) {
      menuTemplate.unshift({
        label: '复制链接',
        click: () => {
          require('electron').clipboard.writeText(params.linkURL)
        }
      })
    }
    const menu = Menu.buildFromTemplate(menuTemplate)
    menu.popup({ window: win })
  })
}

function createSecondaryWindow(): void {
  // Create the window that loads the external URL
  const secondaryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  secondaryWindow.maximize() // 打开时自动最大化

  secondaryWindow.on('ready-to-show', () => {
    secondaryWindow.show()
  })

  // Load the external URL
  secondaryWindow.loadURL('https://oauth.swiftmm.cn/home')

  createContextMenu(secondaryWindow)

  secondaryWindow.webContents.setWindowOpenHandler((details) => {
    // 每次网页尝试打开新窗口时，用我们自定义窗口打开
    const childWin = new BrowserWindow({
      width: 1000,
      height: 700,
      show: true,
      autoHideMenuBar: true, // <== 这里隐藏菜单
      parent: secondaryWindow,
      webPreferences: {
        sandbox: false,
        contextIsolation: true
      }
    })
    childWin.maximize()
    childWin.loadURL(details.url) // 加载新打开的网页
    createContextMenu(childWin) // 为新窗口创建右键菜单
    return { action: 'deny' } // 拒绝默认行为
  })
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.electron')

  // Optional: watch shortcuts for dev tools
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Create only the secondary window
  createSecondaryWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createSecondaryWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
