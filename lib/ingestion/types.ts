export interface ScrapedApartment {
  title?: string;
  address?: string;
  price?: number;
  rooms?: number;
  livingArea?: number;
  floor?: string;
  balcony?: boolean;
  elevator?: boolean;
  kitchen?: string;
  condition?: string;
  hausgeld?: number;
  maklerprovision?: string;
  images: string[];
}

export interface Scraper {
  source: 'IMMOSCOUT24' | 'IMMOWELT';
  canHandle(url: string): boolean;
  fetchHtml(url: string): Promise<string>;
  parse(html: string, sourceUrl: string): ScrapedApartment;
}
