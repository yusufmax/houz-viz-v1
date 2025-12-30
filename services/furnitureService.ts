
export interface FurnitureBrand {
    name: string;
    website: string;
    searchUrl?: (code: string) => string;
}

export const FURNITURE_BRANDS: FurnitureBrand[] = [
    { name: 'Ersa', website: 'https://www.ersa.com.tr', searchUrl: (code) => `https://www.ersa.com.tr/arama?q=${code}` },
    { name: 'Casa', website: 'https://www.casamobilya.com.tr', searchUrl: (code) => `https://www.casamobilya.com.tr/arama?q=${code}` },
    { name: 'Enza Home', website: 'https://www.enzahome.com.tr', searchUrl: (code) => `https://www.enzahome.com.tr/arama?q=${code}` },
    { name: 'Saloni', website: 'https://www.saloni.com', searchUrl: (code) => `https://www.saloni.com/search?q=${code}` },
    { name: 'Zivella', website: 'https://www.zivella.com', searchUrl: (code) => `https://www.zivella.com/?s=${code}` },
    { name: 'Papatya', website: 'https://www.papatya.com.tr', searchUrl: (code) => `https://www.papatya.com.tr/en/search?q=${code}` },
    { name: 'Nurus', website: 'https://nurus.com', searchUrl: (code) => `https://nurus.com/en/search?q=${code}` },
    { name: 'La Scala', website: 'https://www.lascalafurniture.com', searchUrl: (code) => `https://www.lascalafurniture.com/?s=${code}` },
    { name: 'Montel', website: 'https://www.montel.com.tr', searchUrl: (code) => `https://www.montel.com.tr/arama?q=${code}` },
];

export interface FurnitureItem {
    id: string;
    brand: string;
    name: string;
    image: string;
    url: string;
}

export async function fetchFurnitureByCode(brandName: string, code: string): Promise<FurnitureItem[]> {
    const brand = FURNITURE_BRANDS.find(b => b.name === brandName);
    if (!brand) return [];

    console.log(`Searching for ${code} on ${brandName}...`);

    // For demonstration purposes, we return a source.unsplash image if the code is not empty
    // In production, this would call a Supabase Edge function (/functions/furniture-search)
    if (code.length >= 2) {
        return [
            {
                id: Math.random().toString(36).substr(2, 9),
                brand: brandName,
                name: `${brandName} - ${code}`,
                image: `https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800&q=${code}`, // Default modern sofa
                url: brand.website
            }
        ];
    }

    // Actual Implementation:
    /*
    const { data, error } = await supabase.functions.invoke('furniture-search', {
        body: { brand: brandName, query: code }
    });
    if (error) throw error;
    return data.items;
    */

    return [];
}
