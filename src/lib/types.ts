export interface QueryPerformance {
    uri: string;
    database: string;
    collection: string;
    startTime: Date;
    endTime: Date;
    queryDuration: string;
    mongodVersion: string;
  }
  
  export interface MedianQueryDuration {
    uri: string;
    database: string;
    collection: string;
    medianDuration: number;
  }