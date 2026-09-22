// ============================================================
// /api/postback.js  —  Vercel Serverless Function
//
// OGAds calls this URL every time a user successfully completes
// an offer. Set this in your OGAds dashboard under:
//   Settings → Postback URL
//
// Recommended postback URL to paste in OGAds:
//   https://YOUR-VERCEL-DOMAIN.vercel.app/api/postback?offer_id={offer_id}&payout={payout}&ip={session_ip}&aff_sub={aff_sub}
// ============================================================

module.exports = function handler(req, res) {
  const {
    offer_id  = 'unknown',
    payout    = '0',
    ip        = 'unknown',
    aff_sub   = '',
    aff_sub2  = '',
  } = req.query;

  const lead = {
    timestamp:  new Date().toISOString(),
    offer_id,
    payout:     parseFloat(payout) || 0,
    ip,
    aff_sub,
    aff_sub2,
    user_agent: req.headers['user-agent'] || 'unknown',
  };

  console.log('=== NEW LEAD COMPLETED ===');
  console.log(JSON.stringify(lead, null, 2));

  // Always return 200 so OGAds knows we received the postback
  return res.status(200).json({ status: 'ok', lead });
};
