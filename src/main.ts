import { KPro } from "./kpro"

export namespace Main {
  let mainWindow: Electron.BrowserWindow;
  let application: Electron.App;
  let BrowserWindow: any;
  let kpro: KPro;

  export function onWindowAllClosed() {
    application.quit();
  }

  export function onClose(): void {
    mainWindow.destroy();
  }

  export function onReady(): void {
    mainWindow = new BrowserWindow({
      width: 750, height: 570, minWidth: 750, minHeight: 570, maximizable: false, webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      }
    });
    mainWindow.removeMenu();
    mainWindow.loadFile(`${__dirname}/../index.html`);
    kpro = new KPro(mainWindow.webContents);
    mainWindow.webContents.once("dom-ready", async () => {
      await kpro.start();
    });
    mainWindow.webContents.openDevTools();
    mainWindow.on('closed', Main.onClose);
  }

  export function main(app: Electron.App, browserWindow: typeof BrowserWindow): void {
    BrowserWindow = browserWindow;
    application = app;
    application.setName("Keycard Shell Updater");
    application.on('window-all-closed', Main.onWindowAllClosed);
    application.on('ready', Main.onReady);
  }
}