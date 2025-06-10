import { IpcMainEvent, WebContents, ipcMain } from "electron";
import KProJS from "kprojs";
import KProJSNodeHID from "kprojs-node-hid";
import TransportNodeHidSingleton from "kprojs-node-hid/lib/transport-node-hid";
import { StatusCodes } from "kprojs/lib/errors";
import Eth from "kprojs/lib/eth";
import fetch from 'node-fetch';

const MarkdownIt = require('markdown-it');


const fwContextPath = "https://shell.keycard.tech/firmware/context";
const dbContextPath = "https://shell.keycard.tech/db/context";
const folderPath = "https://shell.keycard.tech/uploads/";

export class KPro {
  window: WebContents;
  firmware_context?: { fw_path: string, changelog_path: string, version: string };
  db_context?: { db_path: string, version: number }
  fw?: ArrayBuffer;
  db?: ArrayBuffer;
  changelog?: string;
  deviceFound: boolean;

  constructor(window: WebContents) {
    this.window = window;
    this.deviceFound = false;
    this.installEventHandlers();
  }

  async start(): Promise<void> {
    try {
      this.firmware_context = await fetch(fwContextPath).then((r: any) => r.json());
      this.db_context = await fetch(dbContextPath).then((r: any) => r.json());
      this.window.send("set-version", this.db_context?.version, this.firmware_context?.version);
    } catch (err) {
      throw (err)
    }

    KProJSNodeHID.TransportNodeHid.default.listen({
      next: async (e) => {
        if (e.type === 'add') {
          this.deviceFound = true;
          this.window.send("kpro-connected", this.deviceFound);
        } else if (e.type === 'remove') {
          this.deviceFound = false;
          this.window.send("kpro-disconnected", this.deviceFound);
        }
      },
      error: (error) => {
        if (error instanceof KProJS.KProError.TransportOpenUserCancelled) {
          throw ("Error connecting to device. Connect Keycard Shell");
        } else {
          throw ("Error");
        }
      },
      complete: () => { }
    });
  }

  async connect(): Promise<TransportNodeHidSingleton> {
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

  async updateFirmware(fw?: ArrayBuffer): Promise<void> {
    let localUpdate = false;
    if (fw) {
      this.fw = fw;
      this.window.send("fw-local-update-start");
      localUpdate = true;
    } else {
      this.fw = await fetch(folderPath + this.firmware_context?.fw_path).then((r: any) => r.arrayBuffer());
      this.window.send("fw-online-update-start");
    }
    this.window.send("initialize-update", this.fw?.byteLength);

    if (this.deviceFound) {
      let transport = await this.connect();
      let appEth = await new KProJS.Eth(transport);

      try {
        let { fwVersion } = await appEth.getAppConfiguration();

        if ((fwVersion >= this.firmware_context!.version) && !localUpdate) {
          this.window.send("no-fw-update-needed");
        } else {
          this.window.send("updating-firmware");
          await appEth.loadFirmware(this.fw as ArrayBuffer);
          this.window.send("firmware-updated", localUpdate);
        }
      } catch (err: any) {
        if (err.statusCode == StatusCodes.SECURITY_STATUS_NOT_SATISFIED) {
          this.window.send("update-error", "Firmware update canceled by user");
        } else {
          this.window.send("update-error", "Error: Invalid data. Failed to update firmware");
        }
      }

      transport.close();
    }
  }

  async updateERC20(db?: ArrayBuffer): Promise<void> {
    let localUpdate = false;
    if (db) {
      this.db = db;
      this.window.send("db-local-update-start");
      localUpdate = true;
    } else {
      this.db = await fetch(folderPath + this.db_context?.db_path).then((r: any) => r.arrayBuffer());
      this.window.send("db-online-update-start");
    }

    this.window.send("initialize-update", this.db?.byteLength);

    if (this.deviceFound) {
      let transport = await this.connect();
      let appEth = await new KProJS.Eth(transport);

      try {
        let { erc20Version } = await appEth.getAppConfiguration();

        if ((erc20Version >= this.db_context!.version) && !localUpdate) {
          this.window.send("no-db-update-needed");
        } else {
          this.window.send("updating-db");
          await appEth.loadERC20DB(this.db as ArrayBuffer);
          this.window.send("db-updated", localUpdate);
        }
      } catch (err: any) {
        if (err.statusCode == StatusCodes.SECURITY_STATUS_NOT_SATISFIED) {
          this.window.send("update-error", "ERC20 database update canceled by user");
        } else {
          this.window.send("update-error", "Error: Invalid data. Failed to update the ERC20 database");
        }
      }

      transport.close();
    }
  }

  async getChangelog(): Promise<void> {
    let md = new MarkdownIt();
    this.changelog = await fetch(folderPath + this.firmware_context?.changelog_path).then((r: any) => r.text());
    if (this.changelog) {
      this.window.send("changelog", md.render(this.changelog), this.firmware_context?.version);
    }
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
    ipcMain.on("get-changelog", this.withErrorHandler(this.getChangelog));
  }
}