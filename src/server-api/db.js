import mongoose from "mongoose";
import { config } from "./config.js";

let sharedConnection;
let adminConnection;

const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: config.production ? 1 : 0,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 20_000,
  maxIdleTimeMS: 30_000,
  autoIndex: !config.production,
};

export async function connectDatabases() {
  mongoose.set("strictQuery", true);
  const results = await Promise.allSettled([
    mongoose.createConnection(config.sharedMongoUri, connectionOptions).asPromise(),
    mongoose.createConnection(config.adminMongoUri, {
      ...connectionOptions,
      maxPoolSize: 5,
    }).asPromise(),
  ]);
  const failed = results.find((result) => result.status === "rejected");
  if (failed) {
    await Promise.allSettled(
      results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.close()),
    );
    throw failed.reason;
  }
  [sharedConnection, adminConnection] = results.map((result) => result.value);
  console.log(
    `[db] connected shared=${sharedConnection.name} admin=${adminConnection.name}`,
  );
}

export function getConnections() {
  if (!sharedConnection || !adminConnection) {
    throw new Error("Databases have not been connected.");
  }
  return { sharedConnection, adminConnection };
}

export async function closeDatabases() {
  await Promise.allSettled([
    sharedConnection?.close(),
    adminConnection?.close(),
  ]);
}
