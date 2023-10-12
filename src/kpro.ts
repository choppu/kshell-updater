import { IpcMainEvent, WebContents, ipcMain } from "electron";
import KProJS from "kprojs";
import KProJSNodeHID from "kprojs-node-hid";
import TransportNodeHidSingleton from "kprojs-node-hid/lib/transport-node-hid";
import Eth from "kprojs/lib/eth";

const fetch = require("node-fetch");
const MarkdownIt = require('markdown-it');


const fwContextPath = "https://172.16.80.18:8000/firmware/context";
const dbContextPath = "https://172.16.80.18:8000/context";
const folderPath = "https://172.16.80.18:8000/uploads/";

export class KPro {
  window: WebContents;
  transport?: TransportNodeHidSingleton | null;
  appEth?: Eth | null;
  firmware_context?: {fw_path: string, changelog_path: string, version: string};
  db_context?: {db_path: string, version: number}
  fw?: ArrayBuffer;
  db?: ArrayBuffer;
  changelog?: string;
  deviceFound: boolean;

  constructor(window: WebContents) {
    this.window = window;
    this.deviceFound = false;
    this.installEventHandlers();
  }

  async start() : Promise<void> {
    try {
      this.firmware_context = await fetch(fwContextPath).then((r: any) => r.json());
      this.db_context = await fetch(dbContextPath).then((r: any) => r.json());
      this.window.send("set-version", this.db_context?.version, this.firmware_context?.version);
    } catch(err) {
      throw(err)
    }

    KProJSNodeHID.TransportNodeHid.default.listen({
      next: async (e) => {
        if (e.type === 'add') {
          this.deviceFound = true;
          this.transport = await this.connect();
          this.appEth = await new KProJS.Eth(this.transport);
          this.window.send("kpro-connected", this.deviceFound);
        } else if (e.type === 'remove') {
          this.stop();
          this.deviceFound = false;
          this.window.send("kpro-disconnected", this.deviceFound);
          this.transport = null;
          this.appEth = null;
        }
      },
      error: (error) => {
        if (error instanceof KProJS.KProError.TransportOpenUserCancelled) {
          throw("Error connecting to device. Connect Keycard Pro");
        } else {
          throw("Error");
        }
      },
      complete: () => {}
    });
  }

  stop() : void {
    if(this.transport) {
      this.transport.close();
    }
  }

  async connect() : Promise<TransportNodeHidSingleton> {
    return KProJSNodeHID.TransportNodeHid.default.open()
    .then(transport => {
      transport.on("chunk-loaded", (progress: any) => {
        this.window.send("chunk-loaded", progress);
      });
      return transport;
    }).catch((err: any) => {
      console.warn(err);
      return new Promise(s => setTimeout(s, 1000)).then(() => this.connect());
    });
  }

  async updateFirmware() : Promise<void> {
    this.window.send("disable-db-update");
    this.fw = await fetch(folderPath + this.firmware_context?.fw_path).then((r: any) => r.arrayBuffer());
    this.window.send("firmware-length", this.fw?.byteLength);

    if(this.appEth) {
      try {
        let { fwVersion } = await this.appEth.getAppConfiguration();

        if (fwVersion == this.firmware_context?.version) {
         this.window.send("no-fw-update-needed");
        } else {
          this.window.send("updating-firmware");
          await this.appEth.loadFirmware(this.fw as ArrayBuffer);
          this.window.send("firmware-updated");
        }
      } catch (err) {
        console.log(err);
        throw("Error: Failed to update the firmware");
      }
    }
  }

  async updateERC20() : Promise<void> {
    this.window.send("disable-fw-update");
    this.db = await fetch(folderPath + this.db_context?.db_path).then((r: any) => r.arrayBuffer());
    this.window.send("db-length", this.db?.byteLength);

    if(this.appEth) {
      try {
        let { erc20Version } = await this.appEth.getAppConfiguration();

       // if (erc20Version == this.db_context?.version) {
        // this.window.send("no-db-update-needed");
        //} else {
          this.window.send("updating-db");
          await this.appEth.loadERC20DB(this.db as ArrayBuffer);
          this.window.send("db-updated");
        //}
      } catch (err) {
        console.log(err);
        throw("Error: Failed to update the ERC20 database");
      }
    }
  }

  async getChangelog() : Promise<void> {
    let md = new MarkdownIt();
    this.changelog = await fetch(folderPath + this.firmware_context?.changelog_path).then((r: any) => r.text());
    if(this.changelog) {
      this.window.send("changelog", md.render(this.changelog), this.firmware_context?.version);
    }
  }

  transportStopListening() : void {
    this.transport?.off("chunk-loaded", () => {});
  }

  withErrorHandler(fn: (...args: any) => Promise<void>): (ev: IpcMainEvent) => void {
    return async (_: IpcMainEvent, ...args: any) => {
      try {
        await fn.call(this, ...args);
      } catch (err: any) {
        this.window.send("card-exceptions", err);
      }
    }
  }

  installEventHandlers(): void {
    ipcMain.on("update-firmware", this.withErrorHandler(this.updateFirmware));
    ipcMain.on("update-erc20", this.withErrorHandler(this.updateERC20));
    ipcMain.on("show-changelog", this.getChangelog);
    ipcMain.on("last-chunck", this.transportStopListening);
    ipcMain.on("get-changelog", this.withErrorHandler(this.getChangelog));
  }
}