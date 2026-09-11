export interface ScrapedApartment {
  title?: string;
  address?: string;
  price?: number;
  rooms?: number;
  livingArea?: number;
  floor?: string;
  balcony?: boolean;
  elevator?: boolean;
  kitchen?: boolean;
  condition?: string;
  energieausweis?: string;
  hausgeld?: number;
  maklerprovisionPercent?: number;
  images: string[];
}

export interface Scraper {
  source: 'IMMOSCOUT24' | 'IMMOWELT';
  canHandle(url: string): boolean;
  fetchHtml(url: string): Promise<string>;
  parse(html: string, sourceUrl: string): ScrapedApartment;
}
