const path = require("path");

window.addEventListener("DOMContentLoaded", () => {
    if (process.platform !== "darwin") {
        const customTitlebar = require("custom-electron-titlebar");
        document.title = "DeepTrack 2.0";
        new customTitlebar.Titlebar({
            backgroundColor: customTitlebar.Color.fromHex("#0a0c0f"),
            icon: path.join(__dirname, "favicon.png"),
            shadow: true,
        });
    }
});
