// Modules to control application life and create native browser window
const { app, BrowserWindow } = require("electron");
const path = require("path");
const log = require("electron-log");
const url = require("url");
const { error } = require("console");

const { autoUpdater } = require("electron-updater");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

function createWindow() {
    // Create the browser window.
    if (process.platform === "win32") autoUpdater.checkForUpdatesAndNotify();

    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        frame: process.platform === "darwin",
        title: "DeepTrack 2.0",
        icon: path.join(__dirname, "favicon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            webSecurity: false,
        },
    });

    createPyProc();

    // and load the index.html of the app.
    console.log(path.join(__dirname, "../build/index.html"));
    const startUrl =
        process.env.ELECTRON_START_URL ||
        url.format({
            pathname: path.join(__dirname, "../build/index.html"),
            protocol: "file:",
            slashes: true,
        });

    mainWindow.loadURL(startUrl);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

let pyProc = null;
let pyProcMain = null;

const createPyProc = () => {
    try {
        const path = require("path");
        let script = path.join(__dirname, "../", "/python_src/server.py");

        let root = path.resolve(__dirname + "/../");
        console.log("Starting python from ", script, root);
        console.log(__dirname);

        let port = "" + 2734;

        if (false) {
        } else {
            if (process.platform === "win32") {
                let execScript = path.join(
                    __dirname,
                    "../",
                    "/python_src/dist/server/server.exe"
                );
                pyProcMain = require("child_process").spawn(
                    execScript,
                    ["-u"],
                    { cwd: root }
                );
            } else {
                let execScript = path.join(
                    __dirname,
                    "../",
                    "/python_src/dist/server/server"
                );
                console.log(execScript);
                pyProcMain = require("child_process").spawn(
                    execScript,
                    ["-u"],
                    { cwd: root }
                );
            }

            exports.logger = () => {
                return pyProcMain;
            };
            exports.restart_server = () => {
                pyProcMain.kill();
                if (process.platform === "win32") {
                    let execScript = path.join(
                        __dirname,
                        "../",
                        "/python_src/dist/server/server.exe"
                    );
                    pyProcMain = require("child_process").spawn(
                        execScript,
                        ["-u"],
                        { cwd: root }
                    );
                } else if (process.platform === "darwin") {
                    let execScript = path.join(
                        __dirname,
                        "../",
                        "/python_src/dist/server/server"
                    );
                    console.log(execScript);
                    pyProcMain = require("child_process").spawn(
                        execScript,
                        ["-u"],
                        { cwd: root }
                    );
                }
            };
        }
        if (pyProc != null) {
            console.log("child process success on port " + port);
        } else {
            console.log("Something is wrong");
        }
    } catch {
        console.log("Server may be down");
    }
};

const exitPyProc = () => {
    pyProcMain.kill();
    pyProcMain = null;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("will-quit", exitPyProc);
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
