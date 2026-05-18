import Dexie, { type Table } from "dexie";

export interface HistoricalSlide {
  id?: number;
  newsId: string;
  originalText: string;
  slideText: string;
  type: string;
}

export class NewsroomDatabase extends Dexie {
  historicalSlides!: Table<HistoricalSlide>;

  constructor() {
    super("NewsroomDatabase");
    this.version(1).stores({
      historicalSlides: "++id, newsId, slideText, type"
    });
  }
}

export const db = new NewsroomDatabase();
