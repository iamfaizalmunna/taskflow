import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27017,
    ip: "127.0.0.1",
    dbName: "taskflow",
  },
});

console.log(`TaskFlow local MongoDB ready at ${mongod.getUri("taskflow")}`);

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
