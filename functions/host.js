// Refer to https://stripe.com/docs/api/metadata
const siteToMetadata = (content) => {
  const chunkSize = 2;  // Stripe supports 500 characters per metadata key

  metadata = {};

  let i = 0;
  while (true) {
    s = content.substring(i * chunkSize, (i + 1) * chunkSize);

    if (!s) {
      break;
    }

    metadata['s' + i] = s;
    i++;
  }

  return metadata;
};

// const metadataToSite = (metadata) => {
//   let content = '';

//   const keys = Object.keys(metadata).sort(
//     (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
//   );
//   for (let k of keys) {
//     content += metadata[k];
//   }

//   return content;
// };

const stripe = require('stripe')(process.env.STRIPE_SK);
const functions = require('firebase-functions');

exports.checkout = functions.https.onRequest(async (req, res) => {
  if (!req.body.site) {
    res.status(400).send("No site provided");
    return;
  }

  console.log(req.body.site);

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
    metadata: siteToMetadata(req.body.site || ''),
    mode: 'payment',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });

  res.redirect(303, session.url);
});
