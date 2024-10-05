import { Database } from "bun:sqlite";
import type { QueryPerformance, MedianQueryDuration } from "../lib/types";

export class DB {
  private db: Database;

  constructor(filename: string) {
    this.db = new Database(filename);
  }

  async init() {
    this.db.run(`CREATE TABLE IF NOT EXISTS query_performance (
      uri TEXT,
      database TEXT,
      collection TEXT,
      start_time TEXT,
      end_time TEXT,
      query_duration TEXT,
      mongod_version TEXT
    )`);
  }

  async insertQueryPerformance(data: QueryPerformance) {
    const stmt = this.db.prepare(`INSERT INTO query_performance 
      (uri, database, collection, start_time, end_time, query_duration, mongod_version) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      data.uri,
      data.database,
      data.collection,
      data.startTime.toISOString(),
      data.endTime.toISOString(),
      data.queryDuration,
      data.mongodVersion
    );
  }

  async getMedianQueryDurations(): Promise<MedianQueryDuration[]> {
    const query = `
      SELECT uri, database, collection, 
      AVG(query_duration) as median_duration
      FROM (
        SELECT uri, database, collection, query_duration,
        ROW_NUMBER() OVER (PARTITION BY uri, database, collection ORDER BY query_duration) as row_num,
        COUNT(*) OVER (PARTITION BY uri, database, collection) as count
        FROM query_performance
      ) ranked
      WHERE row_num IN ((count+1)/2, (count+2)/2)
      GROUP BY uri, database, collection
    `;
    return this.db.query(query).all() as MedianQueryDuration[];
  }
}
