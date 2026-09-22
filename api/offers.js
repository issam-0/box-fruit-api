// ============================================================
// /api/offers.js  —  Vercel Serverless Function
// Calls the OGAds Offer API v2, applies your whitelist filter,
// and returns clean offer data to the frontend.
// ============================================================

module.exports = async (req, res) => {
  // ── CORS ──────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── CONFIG ────────────────────────────────────────────────
  // Your OGAds API key (format: affiliateId|token)
  const API_KEY = '47479|ZiiV01pvJMDm0by3lYH6qX8pyWYwxeQza84XBid95d45c773';

  // ✅ WHITELIST — Add your approved Offer IDs from your OGAds dashboard here.
  // Go to OGAds → Offers → find the easy offers you want → copy their Offer ID numbers.
  // Example: [9164, 2993, 12345]
  // If this array is EMPTY, all offers from your account are shown (up to max below).
  const WHITELISTED_OFFER_IDS = [
    
    // 9164,
    // 2993,
    // ADD YOUR OFFER IDS HERE
  ];

  // Maximum offers to request from OGAds (keeps it fast)
  const MAX_OFFERS = 10;

  // ── GET VISITOR INFO ──────────────────────────────────────
  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '1.1.1.1';
  const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

  // ── BUILD OGAds API URL ───────────────────────────────────
  // Required params: ip, user_agent
  // Optional: max (how many to return)
  const params = new URLSearchParams({
    ip: clientIp,
    user_agent: userAgent,
    max: String(MAX_OFFERS),
  });

  const ogadsUrl = `https://appsave.store/api/v2?${params.toString()}`;

  // ── CALL OGAds API ────────────────────────────────────────
  let allOffers = [];
  try {
    const ogadsRes = await fetch(ogadsUrl, {
      headers: {
        // OGAds requires Bearer token auth
        'Authorization': `Bearer ${API_KEY}`,
        'User-Agent': userAgent,
        'X-Forwarded-For': clientIp,
      },
    });

    if (!ogadsRes.ok) {
      const errText = await ogadsRes.text();
      console.error(`[OGAds] HTTP ${ogadsRes.status}:`, errText.substring(0, 200));
      return res.status(200).json({ success: false, offers: [], error: `OGAds returned ${ogadsRes.status}` });
    }

    const text = await ogadsRes.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      console.error('[OGAds] Invalid JSON:', text.substring(0, 200));
      return res.status(200).json({ success: false, offers: [], error: 'Invalid JSON from OGAds' });
    }

    if (parsed.success === false) {
      console.error('[OGAds] API returned success:false:', parsed.error || '');
      return res.status(200).json({ success: false, offers: [], error: parsed.error || 'OGAds error' });
    }

    allOffers = parsed.offers || [];
  } catch (fetchErr) {
    console.error('[OGAds] Fetch error:', fetchErr.message);
    return res.status(200).json({ success: false, offers: [], error: fetchErr.message });
  }

  // ── APPLY WHITELIST ───────────────────────────────────────
  let filtered = allOffers;

  if (WHITELISTED_OFFER_IDS.length > 0) {
    // Only show offers whose offerid is in your whitelist
    filtered = allOffers.filter(offer => {
      const id = parseInt(offer.offerid || offer.offer_id || 0, 10);
      return WHITELISTED_OFFER_IDS.includes(id);
    });

    // Safety fallback: if whitelist IDs aren't available for this visitor's geo/device,
    // show up to 3 from the general pool so the page is never empty.
    if (filtered.length === 0) {
      console.warn('[OGAds] Whitelist yielded 0 offers — falling back to top 3 general offers');
      filtered = allOffers.slice(0, 3);
    }
  } else {
    // No whitelist configured — show up to 3 offers
    filtered = allOffers.slice(0, 3);
  }

  // ── MAP TO CLEAN FORMAT ───────────────────────────────────
  const cleanOffers = filtered.slice(0, 3).map(offer => ({
    offer_id:    String(offer.offerid  || offer.offer_id || ''),
    name:        offer.name_short      || offer.name      || 'Sponsor Offer',
    description: offer.adcopy         || offer.description || 'Complete this quick offer to unlock your coupon.',
    image:       offer.picture        || offer.icon        || '',
    link:        offer.link           || offer.url         || '#',
    payout:      offer.payout         || '0.00',
    cta:         'START OFFER →',
  }));

  console.log(`[OGAds] IP:${clientIp} | Total:${allOffers.length} | Whitelisted:${WHITELISTED_OFFER_IDS.length} | Returning:${cleanOffers.length}`);

  return res.status(200).json({ success: true, offers: cleanOffers });
};
