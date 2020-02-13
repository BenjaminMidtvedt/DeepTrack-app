// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')

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
    pathname: path.join(__dirname, '/../build/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);
  

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

let pyProc = null

const createPyProc = () => {
  console.log("Starting python....")
  let script = "./python_src/server.py"
  let port = '' + 2734

  if (false) {
    pyProc = require('child_process').execFile(script, [port])
  } else {
    pyProc = require('child_process').spawn('py', [script])
  }
  if (pyProc != null) {
    //console.log(pyProc)
    console.log('child process success on port ' + port)
  } else {
    console.log("Something is wrong")
  }
}

const exitPyProc = () => {
  pyProc.kill()
  pyProc = null
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