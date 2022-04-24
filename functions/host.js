const stripe = require('stripe')(process.env.STRIPE_SK);
const functions = require('firebase-functions');
const Thirds = require('./thirds.min.node.js');

const ITTY_BITTY_BASE_URL = process.env.ITTY_BITTY_BASE_URL;
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET;

let _paymentIncompleteToken;
const getPaymentIncompleteToken = () => {
  if (!_paymentIncompleteToken) {
    _paymentIncompleteToken = Thirds.jwtEncode(
      {
        content: "eNolysENgCAQBMBWtgBjJTaBcoELwhLueNC9Gt8zB1kMtxbB4hzoYVVpjqgRjY5EeB6cKW8w/sfUBVdon5+CTHOJCP5ONbhW2R99cR+h",
        info: {
          encoding: 'gzip64',
          mediaType: 'text/plain'
        },
        title: "Payment Incomplete"
      },
      'EdDSA',
      {key: VERIFICATION_SECRET}
    );
  }

  return _paymentIncompleteToken;
}

exports.checkout = functions.https.onRequest(async (req, res) => {
  if (!req.body.siteDataUrl) {
    res.status(400).send("No site provided");
    return;
  }

  functions.logger.debug('Site data URL: ', req.body.siteDataUrl);

  const splitDataUrl = req.body.siteDataUrl.split(';');
  const [encoding, content] = splitDataUrl[splitDataUrl.length - 1].split(',');

  const token = Thirds.jwtEncode(
    {
      content: content,
      info: {
        encoding: encoding,
        mediaType: splitDataUrl[0].replace('data:', '')
      },
      ...(req.body.siteTitle ? {title: req.body.siteTitle} : {})
    },
    'EdDSA',
    {key: VERIFICATION_SECRET}
  );

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Website',
          },
          unit_amount: 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${ITTY_BITTY_BASE_URL}/#${req.body.siteTitle || ''}/?${token}`,
    cancel_url: `${ITTY_BITTY_BASE_URL}/#Payment_Incomplete/?${getPaymentIncompleteToken()}`,
  });

  res.redirect(303, session.url);
});
