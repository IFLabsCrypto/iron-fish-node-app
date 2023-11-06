import fsAsync from "fs/promises";

import {
  ALL_API_NAMESPACES,
  FullNode,
  HOST_FILE_NAME,
  IronfishSdk,
  NodeUtils,
  RpcClient,
  RpcMemoryClient,
  getPackageFrom,
} from "@ironfish/sdk";
import log from "electron-log";
import { v4 as uuid } from "uuid";

import { logger } from "./logger";
import packageJson from "../../../package.json";
import { SnapshotManager } from "../snapshot/snapshotManager";
import { SplitPromise, splitPromise } from "../utils";

export class Ironfish {
  public snapshotManager: SnapshotManager = new SnapshotManager();

  private rpcClientPromise: SplitPromise<RpcClient> = splitPromise();
  private sdkPromise: SplitPromise<IronfishSdk> = splitPromise();
  private _started: boolean = false;
  private _fullNode: FullNode | null = null;
  private _initialized: boolean = false;
  private _dataDir: string;

  constructor(dataDir: string) {
    this._dataDir = dataDir;
  }

  rpcClient(): Promise<RpcClient> {
    return this.rpcClientPromise.promise;
  }

  sdk(): Promise<IronfishSdk> {
    return this.sdkPromise.promise;
  }

  async downloadSnapshot(): Promise<void> {
    if (this._started) {
      throw new Error("Cannot download snapshot after node has started");
    }

    const sdk = await this.sdk();
    await this.snapshotManager.run(sdk);
  }

  async init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;

    console.log("Initializing IronFish SDK...");

    const sdk = await IronfishSdk.init({
      dataDir: this._dataDir,
      logger: logger,
      pkg: getPackageFrom(packageJson),
      configOverrides: {
        databaseMigrate: true,
      },
    });

    this.sdkPromise.resolve(sdk);
  }

  async start() {
    if (this._started) {
      return;
    }
    this._started = true;

    if (this.snapshotManager.started) {
      await this.snapshotManager.result();
    }

    console.log("Starting IronFish Node...");

    const sdk = await this.sdk();
    const node = await sdk.node({
      privateIdentity: sdk.getPrivateIdentity(),
      autoSeed: true,
    });

    await NodeUtils.waitForOpen(node);

    const newSecretKey = Buffer.from(
      node.peerNetwork.localPeer.privateIdentity.secretKey,
    ).toString("hex");
    node.internal.set("networkIdentity", newSecretKey);
    await node.internal.save();

    if (node.internal.get("isFirstRun")) {
      node.internal.set("isFirstRun", false);
      node.internal.set("telemetryNodeId", uuid());
      await node.internal.save();
    }

    await node.start();
    this._fullNode = node;

    const rpcClient = new RpcMemoryClient(
      node.logger,
      node.rpc.getRouter(ALL_API_NAMESPACES),
    );

    this.rpcClientPromise.resolve(rpcClient);
  }

  async stop() {
    if (this._fullNode) {
      await this._fullNode.shutdown();
      await this._fullNode.closeDB();
      this._fullNode = null;
    }

    this._started = false;

    this._initialized = false;
    this.rpcClientPromise = splitPromise();
    this.sdkPromise = splitPromise();
  }

  async restart() {
    await this.stop();
    await this.init();
    await this.start();
  }

  async reset() {
    // Implementation references the CLI reset command:
    // https://github.com/iron-fish/ironfish/blob/master/ironfish-cli/src/commands/reset.ts
    let sdk = await this.sdk();

    const chainDatabasePath = sdk.config.chainDatabasePath;
    const hostFilePath: string = sdk.config.files.join(
      sdk.config.dataDir,
      HOST_FILE_NAME,
    );

    await this.stop();

    log.log("Deleting databases...");

    await Promise.all([
      fsAsync.rm(chainDatabasePath, { recursive: true, force: true }),
      fsAsync.rm(hostFilePath, { recursive: true, force: true }),
    ]);

    await this.init();
    sdk = await this.sdk();

    const node = await sdk.node();
    await node.openDB();

    await node.wallet.reset();

    await node.closeDB();

    log.log("Databases deleted successfully");

    await this.start();
  }
}
