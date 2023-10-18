import { UI } from "./ui";
const { ipcRenderer } = require('electron');

const fwUpdateBtn = document.getElementById("btn-fw-update") as HTMLButtonElement;
const dbUpdateBtn = document.getElementById("btn-erc20-update") as HTMLButtonElement;

export function handleLog(event: string, msg: string): void {
  ipcRenderer.on(event, (_ : any) => {
    UI.updateStatusMessage(msg);
  });
}

export function handleUpdateProgress(event: string) : void {
  ipcRenderer.on(event, (_ : any, progress: number) => {
    let finished = UI.handleLoadProgress(progress);

    if(finished) {
      ipcRenderer.send("last-chunk");
    }
  });
}

export function enableUpdateBtns() : void {
  fwUpdateBtn.disabled = false;
  dbUpdateBtn.disabled = false;
}

ipcRenderer.on("kpro-connected", (_ : any, connected: boolean) => {
  UI.handleConnected(connected);
});

ipcRenderer.on("kpro-disconnected", (_ : any, connected: boolean) => {
  UI.handleConnected(connected);
  UI.disableProgressBar();
});

ipcRenderer.on("set-version", (_: any, db_ver: number, fw_ver: string) => {
  UI.setVersion(db_ver, fw_ver);
});

ipcRenderer.on("initialize-update", (_: any, length: number) => {
  UI.initializeProgressBar(length);
});

ipcRenderer.on("no-fw-update-needed", () => {
  dbUpdateBtn.disabled = false;
  UI.updateStatusMessage("Your firmware is up-to-date");
});

ipcRenderer.on("no-db-update-needed", () => {
  fwUpdateBtn.disabled = false;
  UI.updateStatusMessage("Your ERC20 database is up-to-date");
});

ipcRenderer.on("updating-firmware", () => {
  UI.enableProgressBar();
});

ipcRenderer.on("firmware-updated", () => {
  UI.disableProgressBar();
  dbUpdateBtn.disabled = false;
  UI.updateStatusMessage("Firmware updated successfully");
});

ipcRenderer.on("updating-db", () => {
  UI.enableProgressBar();
});

ipcRenderer.on("db-updated", () => {
  UI.disableProgressBar();
  fwUpdateBtn.disabled = false;
  UI.updateStatusMessage("ERC20 database updated successfully");
});

ipcRenderer.on("disable-db-update", () => {
  dbUpdateBtn.disabled = true;
});

ipcRenderer.on("disable-fw-update", () => {
  fwUpdateBtn.disabled = true;
});

ipcRenderer.on("card-exceptions", function (_ : any, err: any) {
  UI.updateStatusMessage(err);
  enableUpdateBtns();
});

ipcRenderer.on("changelog", (_: any, data: string, fwVersion: string) => {
  const modalWindow = window.open('', 'modal', `width=500,height=550, title=Keycard Pro | Release Notes | Version ${fwVersion}`);
  UI.handleChangelog(modalWindow as Window, data);
});

handleUpdateProgress("chunk-loaded");

fwUpdateBtn.addEventListener("click", (e) => {
  ipcRenderer.send("update-firmware");
  e.preventDefault();
});

dbUpdateBtn.addEventListener("click", (e) => {
  ipcRenderer.send("update-erc20");
  e.preventDefault();
});

document.getElementById("kpro-message-close")?.addEventListener("click", (e) => {
  UI.hideStatusMessage();
});

document.getElementById("btn-fw-changelog")?.addEventListener("click", (e) => {
  ipcRenderer.send("get-changelog");
  e.preventDefault();
});


