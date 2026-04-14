/**
 * Simple CSV Import for Property Data
 * 
 * Usage:
 * 1. Prepare a CSV file with property data
 * 2. Call importPropertiesFromCSV(csvString)
 * 3. Data is inserted into database
 * 
 * CSV Format (header row required):
 * pin,address,city,zip,owner,mailing_address,assessed_value,market_value,tax_amount,status
 * 
 * Example:
 * 01-01-100-001,123 Main St,Wheaton,60187,"Smith John",123 Main St Wheaton IL,250000,375000,4500,active
 */

import { db } from '../db';
import { properties } from '../db/src/schema'; // Adjust path as needed

export interface PropertyRow {
  pin: string;
  address: string;
  city: string;
  zip: string;
  owner: string;
  mailing_address: string;
  assessed_value: number;
  market_value: number;
  tax_amount: number;
  status: 'active' | 'foreclosure' | 'tax-lien' | 'sold';
}

/**
 * Parse CSV string into property records
 */
export function parseCSV(csvString: string): PropertyRow[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: PropertyRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== header.length) {
      console.warn(`Skipping row ${i + 1}: column count mismatch`);
      continue;
    }

    const row: any = {};
    header.forEach((h, index) => {
      row[h] = values[index]?.trim() || '';
    });

    rows.push({
      pin: row.pin,
      address: row.address,
      city: row.city,
      zip: row.zip,
      owner: row.owner,
      mailing_address: row.mailing_address || row.owner,
      assessed_value: parseInt(row.assessed_value) || 0,
      market_value: parseInt(row.market_value) || 0,
      tax_amount: parseInt(row.tax_amount) || 0,
      status: row.status || 'active'
    });
  }

  return rows;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Import properties from CSV string
 * Returns count of imported records
 */
export async function importPropertiesFromCSV(csvString: string): Promise<number> {
  const rows = parseCSV(csvString);
  
  let imported = 0;
  
  for (const row of rows) {
    try {
      await db.insert(properties).values({
        pin: row.pin,
        address: row.address,
        city: row.city,
        zip: row.zip,
        county: 'cook', // Default to Cook County
        owner: row.owner,
        mailingAddress: row.mailing_address,
        assessedValue: row.assessed_value,
        marketValue: row.market_value,
        taxAmount: row.tax_amount,
        status: row.status
      }).onConflictDoNothing();
      
      imported++;
    } catch (error) {
      console.error(`Failed to import PIN ${row.pin}:`, error);
    }
  }

  return imported;
}

/**
 * Sample CSV data - 20 Cook County properties
 * Use this to test your API immediately
 */
export const SAMPLE_CSV = `pin,address,city,zip,owner,mailing_address,assessed_value,market_value,tax_amount,status
01-01-100-001,123 Main St,Chicago,60601,"Johnson Michael",123 Main St Chicago IL,250000,375000,4500,active
01-01-100-002,456 Oak Ave,Evanston,60201,"Williams Sarah",456 Oak Ave Evanston IL,320000,480000,5800,active
01-01-100-003,789 Elm Dr,Skokie,60077,"Brown David",789 Elm Dr Skokie IL,180000,270000,3200,active
01-01-100-004,321 Maple Ln,Oak Park,60302,"Garcia Maria",321 Maple Ln Oak Park IL,410000,615000,7400,active
01-01-100-005,555 Pine Rd,Cicero,60804,"Miller Robert",555 Pine Rd Cicero IL,195000,290000,3500,active
01-01-100-006,888 Cedar Ln,Berwyn,60402,"Davis Jennifer",888 Cedar Ln Berwyn IL,225000,340000,4100,active
01-01-100-007,111 Birch Blvd,Des Plaines,60016,"Wilson James",111 Birch Blvd Des Plaines IL,275000,410000,5000,active
01-01-100-008,222 Walnut St,Mount Prospect,60056,"Moore Thomas",222 Walnut St Mount Prospect IL,310000,465000,5600,active
01-01-100-009,333 Cherry Ave,Palatine,60067,"Taylor Ann",333 Cherry Ave Palatine IL,350000,525000,6300,active
01-01-100-010,444 Spruce Dr,Schaumburg,60173,"Anderson Christopher",444 Spruce Dr Schaumburg IL,290000,435000,5200,active
01-01-100-011,555 Aspen Rd,Elk Grove Village,60007,"Thomas Mark",555 Aspen Rd Elk Grove IL,265000,395000,4800,active
01-01-100-012,666 Willow Ln,Hoffman Estates,60169,"Jackson Barbara",666 Willow Ln Hoffman Estates IL,305000,455000,5500,active
01-01-100-013,777 Ash Blvd,Arlington Heights,60005,"White Steven",777 Ash Blvd Arlington Heights IL,340000,510000,6100,active
01-01-100-014,888 Poplar St,Buffalo Grove,60089,"Harris Nancy",888 Poplar St Buffalo Grove IL,375000,560000,6800,active
01-01-100-015,999 Hickory Ave,Naperville,60540,"Martin Kevin",999 Hickory Ave Naperville IL,425000,635000,7700,active
01-01-100-016,123 Sycamore Dr,Lombard,60148,"Thompson Paul",123 Sycamore Dr Lombard IL,285000,425000,5100,active
01-01-100-017,234 Beech Rd,Glenview,60025,"Thompson Linda",234 Beech Rd Glenview IL,395000,590000,7200,active
01-01-100-018,345 Magnolia Ln,Downers Grove,60515,"Clark Ruth",345 Magnolia Ln Downers Grove IL,310000,465000,5600,active
01-01-100-019,456 Chestnut Blvd,Wheaton,60187,"Lewis Donald",456 Chestnut Blvd Wheaton IL,360000,540000,6500,active
01-01-100-020,567 Redwood St,Naperville,60565,"Lee Susan",567 Redwood St Naperville IL,440000,660000,8000,active`;