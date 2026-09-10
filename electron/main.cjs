const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure app name is consistently 'prodtrack-flow' across all builds
app.name = 'prodtrack-flow';

/**
 * Configure and guarantee persistent userData path across versions
 * Supports both Installed (NSIS) and Portable (.exe) releases
 */
function setupUserDataDirectory() {
  const appData = app.getPath('appData');
  const canonicalUserData = path.join(appData, 'prodtrack-flow');
  const altUserData = path.join(appData, 'ProdTrack Flow');

  let chosenPath = canonicalUserData;

  // Portable mode check:
  // If the user created or placed a local 'data' folder next to the portable executable, use it.
  // Otherwise, default to canonical %APPDATA%\prodtrack-flow where v1.0.1 stored all its data.
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
    if (fs.existsSync(portableDataDir)) {
      chosenPath = portableDataDir;
    }
  }

  // Automatic data recovery/migration from alternative naming 'ProdTrack Flow' to 'prodtrack-flow'
  try {
    const canonicalIndexedDB = path.join(canonicalUserData, 'IndexedDB');
    const altIndexedDB = path.join(altUserData, 'IndexedDB');

    if (!fs.existsSync(canonicalIndexedDB) && fs.existsSync(altIndexedDB)) {
      if (!fs.existsSync(canonicalUserData)) {
        fs.mkdirSync(canonicalUserData, { recursive: true });
      }
      fs.cpSync(altUserData, canonicalUserData, { recursive: true });
    }
  } catch (err) {
    console.error('Data migration check notice:', err);
  }

  app.setPath('userData', chosenPath);
}

setupUserDataDirectory();

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#090e1f',
    title: 'ProdTrack Flow • Desktop Edition',
    icon: path.join(__dirname, '../public/Icon/LogoOBStudi512x512.png'),
    autoHideMenuBar: true,
    show: false, // Don't show until ready-to-show for smooth appearance
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged, // Completely disable DevTools in packaged .exe
    },
  });

  // Remove default menu bar for clean native modern UI
  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
