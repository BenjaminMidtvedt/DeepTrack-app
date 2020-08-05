// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const { error } = require('console')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      webSecurity:false
    }
  })

  createPyProc()

  // and load the index.html of the app.
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '/build/index.html'),
    protocol: 'file:',
    slashes: true
  });
  
  mainWindow.loadURL(startUrl);
  

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

let pyProc = null
let pyProcMain = null

const createPyProc = () => {
  try {
    const path = require("path")
    let script = path.join(__dirname, "/python_src/server.py")
    let execScript = path.join(__dirname, "/python_src/dist/server/server.exe")
    let root = path.resolve(__dirname)
    console.log("Starting python from ", script, root)
    
    let port = '' + 2734

    if (false) {
      
    } else {
      if (process.platform === "win32") pyProcMain = require('child_process').execFile(execScript, ['-u'], {cwd: root})
    }
    if (pyProc != null) {
      console.log('child process success on port ' + port)
    } else {
      console.log("Something is wrong")
    }
  } catch {
    console.log("Server may be down")
  }
}

const exitPyProc = () => {
  pyProcMain.kill()
  pyProc.kill()
  pyProc = null
  pyProcMain = null
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})


app.on('will-quit', exitPyProc)
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.