import fsAsync from "fs/promises";

import { Event, FullNode, IronfishSdk, Meter } from "@ironfish/sdk";
import log from "electron-log/main";

import {
  DownloadedSnapshot,
  SnapshotDownloader,
  getDefaultManifestUrl,
} from "./utils";
import { SnapshotUpdate } from "../../../shared/types";
import { SplitPromise, splitPromise } from "../utils/splitPromise";

export class SnapshotManager {
  onProgress: Event<[SnapshotUpdate]> = new Event();
  snapshotPromise: SplitPromise<void> = splitPromise();
  started = false;

  async run(sdk: IronfishSdk, node: FullNode): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    try {
      await this._run(sdk, node);
      this.snapshotPromise.resolve();
    } catch (e) {
      this.snapshotPromise.reject(e);
    } finally {
      this.started = false;
      this.snapshotPromise = splitPromise();
    }
  }

  result(): Promise<void> {
    return this.snapshotPromise.promise;
  }

  async _run(sdk: IronfishSdk, node: FullNode): Promise<void> {
    if (!node.chain.blockchainDb.db.isOpen) {
      await node.openDB();
    }
    const nodeChainDBVersion = await node.chain.blockchainDb.getVersion();
    await node.closeDB();

    log.log("Starting snapshot download");
    const networkId = sdk.internal.get("networkId");
    const manifestUrl = getDefaultManifestUrl(networkId);
    if (!manifestUrl) {
      throw new Error(
        `Manifest url for the snapshots are not available for network ID ${networkId}`,
      );
    }

    await fsAsync.mkdir(sdk.config.tempDir, { recursive: true });
    const dest = sdk.config.tempDir;

    const Downloader = new SnapshotDownloader(
      manifestUrl,
      dest,
      nodeChainDBVersion,
    );

    const manifest = await Downloader.manifest();

    const downloadSpeed = new Meter();
    downloadSpeed.start();

    await Downloader.download((prev, curr) => {
      log.debug(`Download progress: ${curr}/${manifest.file_size}`);
      downloadSpeed.add(curr - prev);

      this.onProgress.emit({
        step: "download",
        totalBytes: manifest.file_size,
        currBytes: curr,
        speed: downloadSpeed.rate1m,
      });
    }).finally(() => {
      downloadSpeed.stop();
    });

    const path = await Downloader.verifyChecksum({ cleanup: true });
    if (!path) {
      throw new Error("Snapshot checksum does not match");
    }

    const downloadedSnapshot = new DownloadedSnapshot(sdk, path);

    const unzipSpeed = new Meter();
    unzipSpeed.start();

    await downloadedSnapshot
      .unzip(
        (
          totalEntries: number,
          prevExtracted: number,
          currExtracted: number,
        ) => {
          log.debug(`Unzip progress: ${currExtracted}/${totalEntries}`);
          unzipSpeed.add(currExtracted - prevExtracted);

          this.onProgress.emit({
            step: "unzip",
            totalEntries,
            currEntries: currExtracted,
            speed: unzipSpeed.rate1m,
          });
        },
      )
      .finally(() => {
        unzipSpeed.stop();
      });

    await downloadedSnapshot.replaceDatabase();
    await fsAsync.rm(downloadedSnapshot.file);
    await node.openDB();
  }
}
