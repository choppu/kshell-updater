const fs = require('fs');

export namespace UI {
  const updateFWBtn = document.getElementById("btn-fw-update") as HTMLButtonElement;
  const updateDBBtn = document.getElementById("btn-erc20-update") as HTMLButtonElement;
  const fwUpdateLabel = document.getElementById("fw-update-label");
  const progressBar = document.getElementById("update-progress") as HTMLDivElement;
  const fwLoad = document.getElementById("progress-bar") as HTMLProgressElement;
  const messContainer = document.getElementById("kpro-message-field") as HTMLDivElement;
  const message = document.getElementById('kpro-message') as HTMLElement;
  const dbVersion = document.getElementById('kpro__db-version') as HTMLSpanElement;
  const fwVersion = document.getElementById('kpro__fw-version') as HTMLSpanElement;

  let pBarProgress: number;

  export function setVersion(db_v: number, fw_v: string) : void {
    dbVersion.innerHTML = "DB version " + db_v.toString();
    fwVersion.innerHTML = "Version " + fw_v + " | ";
  }

  export function enableProgressBar() : void {
    progressBar.classList.remove("kpro__display-none");
  }

  export function disableProgressBar() : void {
    progressBar.classList.add("kpro__display-none");
  }

  export function initializeProgressBar(l: number) : void {
    fwLoad.max = l;
    fwLoad.value = 0;
    pBarProgress = 0;
  }

  export function handleLoadProgress(progress: number) : boolean {
    if (pBarProgress < fwLoad.max) {
      pBarProgress += progress;
      fwLoad.value = pBarProgress;
      return false;
    }

    return true;
  }

  export function updateStatusMessage(mess: string): void {
    messContainer.classList.remove("kpro__display-none");
    message.innerHTML = mess;
  }

  export function hideStatusMessage() : void {
    messContainer.classList.add("kpro__display-none");
  }

  export function handleConnected(connected: boolean) : void {
    if(connected) {
      fwUpdateLabel?.classList.add("kpro__display-none");
      updateFWBtn.disabled = false;
      updateDBBtn.disabled = false;
    } else {
      fwUpdateLabel?.classList.remove("kpro__display-none");
      updateFWBtn.disabled = false;
      updateDBBtn.disabled = true;
    }
  }

  export function handleChangelog(win: Window, data: string) {
    win.document.write(data);
    win.document.write('<link rel="stylesheet" type="text/css" href="css/modal.css">');
  }

}
