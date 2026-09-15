import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ip = forwarded ? forwarded.split(',')[0].trim() : '';

    // Provider 1: ipwho.is
    try {
      const url = ip ? `https://ipwho.is/${ip}` : 'https://ipwho.is/';
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        return NextResponse.json({
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || 'Maracaibo',
          region: data.region || 'Zulia',
          country: data.country || 'Venezuela',
          source: 'ipwhois',
        });
      }
    } catch (e) {}

    // Provider 2: freeipapi.com
    try {
      const url = ip ? `https://freeipapi.com/api/json/${ip}` : 'https://freeipapi.com/api/json/';
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return NextResponse.json({
          lat: data.latitude,
          lng: data.longitude,
          city: data.cityName || 'Maracaibo',
          region: data.regionName || 'Zulia',
          country: data.countryName || 'Venezuela',
          source: 'freeipapi',
        });
      }
    } catch (e) {}

    // Default Coordinates for Maracaibo / Zulia
    return NextResponse.json({
      lat: 10.6427,
      lng: -71.6125,
      city: 'Maracaibo',
      region: 'Zulia',
      country: 'Venezuela',
      source: 'default_maracaibo',
    });
  } catch (err: any) {
    return NextResponse.json({
      lat: 10.3167,
      lng: -72.3167,
      city: 'Rosario de Perijá',
      region: 'Zulia',
      country: 'Venezuela',
      source: 'default_rosario',
    });
  }
}
