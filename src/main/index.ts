import { app, BrowserWindow, Menu, shell, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'

// ------------------------
// 右键菜单增强
// ------------------------
function createContextMenu(win: BrowserWindow) {
  win.webContents.on('context-menu', (event, params) => {
    event.preventDefault()

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '重新加载',
        accelerator: 'Ctrl+R',
        click: () => win.webContents.reload()
      },
      {
        label: '返回',
        accelerator: 'Alt+Left',
        enabled: win.webContents.canGoBack(),
        click: () => win.webContents.goBack()
      },
      {
        label: '前进',
        accelerator: 'Alt+Right',
        enabled: win.webContents.canGoForward(),
        click: () => win.webContents.goForward()
      },
      { type: 'separator' },
      {
        label: '开发者工具',
        accelerator: 'F12',
        click: () => win.webContents.toggleDevTools()
      }
    ]

    // 👉 【功能 1】选中内容可复制
    if (params.selectionText && params.selectionText.trim() !== '') {
      template.unshift({
        label: '复制',
        click: () => clipboard.writeText(params.selectionText)
      })
    }

    if (params.linkURL) {
      template.unshift(
        {
          label: '在新窗口打开',
          click: () => {
            const child = new BrowserWindow({
              width: 1000,
              height: 700,
              autoHideMenuBar: true,
              webPreferences: {
                sandbox: false,
                contextIsolation: true
              }
            })
            child.maximize()
            child.loadURL(params.linkURL)
            createContextMenu(child)
          }
        },
        {
          label: '在浏览器打开',
          click: () => shell.openExternal(params.linkURL)
        },
        {
          label: '复制链接',
          click: () => clipboard.writeText(params.linkURL)
        }
      )
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  })
}

function bindKeyboardShortcut(win: BrowserWindow) {
  win.webContents.on('before-input-event', (event, input) => {
    // 后退
    if (input.alt && input.code === 'ArrowLeft') {
      if (win.webContents.canGoBack()) {
        win.webContents.goBack()
      }
      event.preventDefault()
    }

    // 前进
    if (input.alt && input.code === 'ArrowRight') {
      if (win.webContents.canGoForward()) {
        win.webContents.goForward()
      }
      event.preventDefault()
    }
  })
}

// ------------------------
// 创建二级窗口（主窗口）
// ------------------------
function createSecondaryWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.maximize()

  win.on('ready-to-show', () => win.show())

  win.loadURL('https://oauth.swiftmm.cn/home')
  bindKeyboardShortcut(win)
  createContextMenu(win)

  // 拦截 window.open
  win.webContents.setWindowOpenHandler((details) => {
    const child = new BrowserWindow({
      width: 1000,
      height: 700,
      autoHideMenuBar: true,
      show: false,
      parent: win,
      webPreferences: {
        sandbox: false,
        contextIsolation: true
      }
    })

    child.maximize()
    child.loadURL(details.url)
    bindKeyboardShortcut(child)

    createContextMenu(child)

    child.on('ready-to-show', () => child.show())

    return { action: 'deny' }
  })
}

// ------------------------
// App 生命周期
// ------------------------
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // 自动开启 F12、Ctrl+R 等快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createSecondaryWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSecondaryWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
