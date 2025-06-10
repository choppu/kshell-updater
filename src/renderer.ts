import { UI } from "./ui";
const { ipcRenderer } = require('electron');

const fwUpdateOnlineBtn = document.getElementById("btn-fw-update") as HTMLButtonElement;
const dbUpdateOnlineBtn = document.getElementById("btn-erc20-update") as HTMLButtonElement;
const fwUpdateLocalBtn = document.getElementById("fw-upload-local") as HTMLButtonElement;
const dbUpdateLocalBtn = document.getElementById("erc20-upload-local") as HTMLButtonElement;

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
  fwUpdateOnlineBtn.disabled = false;
  dbUpdateOnlineBtn.disabled = false;
  fwUpdateLocalBtn.disabled = false;
  dbUpdateLocalBtn.disabled = false;
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
  dbUpdateOnlineBtn.disabled = false;
  dbUpdateLocalBtn.disabled = false;
  fwUpdateLocalBtn.disabled = false;
  fwUpdateOnlineBtn.disabled = false;
  UI.updateStatusMessage("Your firmware is up-to-date");
});

ipcRenderer.on("no-db-update-needed", () => {
  dbUpdateOnlineBtn.disabled = false;
  dbUpdateLocalBtn.disabled = false;
  fwUpdateLocalBtn.disabled = false;
  fwUpdateOnlineBtn.disabled = false;
  UI.updateStatusMessage("Your ERC20 database is up-to-date");
});

ipcRenderer.on("updating-firmware", () => {
  UI.enableProgressBar();
});

ipcRenderer.on("firmware-updated", (_: any, localUpdate: boolean) => {
  UI.disableProgressBar();
  localUpdate ? (fwUpdateOnlineBtn.disabled = false) : (fwUpdateLocalBtn.disabled = false);
  dbUpdateOnlineBtn.disabled = false;
  dbUpdateLocalBtn.disabled = false;
  UI.updateStatusMessage("Firmware updated successfully");
});

ipcRenderer.on("updating-db", () => {
  UI.enableProgressBar();
});

ipcRenderer.on("db-updated", (_: any, localUpdate: boolean) => {
  UI.disableProgressBar();
  localUpdate ? (dbUpdateOnlineBtn.disabled = false) : (dbUpdateLocalBtn.disabled = false);
  fwUpdateOnlineBtn.disabled = false;
  fwUpdateLocalBtn.disabled = false;
  UI.updateStatusMessage("ERC20 database updated successfully");
});

ipcRenderer.on("update-error", (_: any, err: string) => {
    UI.updateStatusMessage(err);
    UI.disableProgressBar();
    fwUpdateOnlineBtn.disabled = false;
    fwUpdateLocalBtn.disabled = false;
    dbUpdateOnlineBtn.disabled = false;
    dbUpdateLocalBtn.disabled = false;
})

ipcRenderer.on("fw-online-update-start", () => {
  dbUpdateOnlineBtn.disabled = true;
  dbUpdateLocalBtn.disabled = true;
  fwUpdateOnlineBtn.disabled = true;
});

ipcRenderer.on("fw-local-update-start", () => {
  dbUpdateOnlineBtn.disabled = true;
  dbUpdateLocalBtn.disabled = true;
  fwUpdateLocalBtn.disabled = true;
});

ipcRenderer.on("db-online-update-start", () => {
  dbUpdateLocalBtn.disabled = true;
  fwUpdateLocalBtn.disabled = true;
  fwUpdateOnlineBtn.disabled = true;
});

ipcRenderer.on("db-local-update-start", () => {
  dbUpdateOnlineBtn.disabled = true;
  fwUpdateLocalBtn.disabled = true;
  fwUpdateOnlineBtn.disabled = true;
});

ipcRenderer.on("card-exceptions", function (_ : any, err: any) {
  UI.updateStatusMessage(err);
  enableUpdateBtns();
});

ipcRenderer.on("changelog", (_: any, data: string, fwVersion: string) => {
  const modalWindow = window.open('', 'modal', `width=500,height=550, title=Keycard Shell | Release Notes | Version ${fwVersion}`);
  UI.handleChangelog(modalWindow as Window, data);
});

fwUpdateOnlineBtn.addEventListener("click", (e) => {
  ipcRenderer.send("update-firmware");
  e.preventDefault();
});

fwUpdateLocalBtn.addEventListener("change",  async (e: any) => {
   ipcRenderer.send("update-firmware", await e.target.files[0].arrayBuffer());
   fwUpdateLocalBtn.value = "";
   e.preventDefault();
});

dbUpdateOnlineBtn.addEventListener("click", (e) => {
  ipcRenderer.send("update-erc20");
  e.preventDefault();
});

dbUpdateLocalBtn.addEventListener("change", async (e: any) => {
  ipcRenderer.send("update-erc20", await e.target.files[0].arrayBuffer());
  dbUpdateLocalBtn.value = "";
  e.preventDefault();
});

document.getElementById("kpro-message-close")?.addEventListener("click", (e) => {
  UI.hideStatusMessage();
});

document.getElementById("btn-fw-changelog")?.addEventListener("click", (e) => {
  ipcRenderer.send("get-changelog");
  e.preventDefault();
});

handleUpdateProgress("chunk-loaded");

