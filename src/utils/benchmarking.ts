import { MongoClient } from "mongodb";

export async function measureQueryPerformance(fn: () => Promise<void>) {
  const startTime = new Date();
  await fn();
  const endTime = new Date();
  const duration = formatDuration(endTime.getTime() - startTime.getTime());
  return { startTime, endTime, duration };
}

export async function getMongodVersion(client: MongoClient): Promise<string> {
  const adminDb = client.db("admin");
  const result = await adminDb.command({ buildInfo: 1 });
  return result.version;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
}

function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}