/* eslint-disable */ // to disable the linter

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const Stripe = require('stripe')
const bodyParser = require('body-parser');
const express = require('express')
const cors = require('cors')
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// initialize app, use cors and body parser
const app = express();
const corsOptions = {
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(bodyParser.json())
// app.use((req, res, next) => {
//     bodyParser.json()(req, res, next);
// });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//     logger.info("Hello logs!", { structuredData: true });
//     response.send("Hello from Firebase!");
// });



// change this once I figure out how to .env it
// const secret_stripe_key = process.env.STRIPE_SECRET_KEY
const secret_stripe_key = functions.config().stripe.secret_key;


app.post('/payment-sheet-setup-intent', async (req, res) => {
    const { email, payment_method_types = [] } = req.body;
    const stripe = new Stripe(secret_stripe_key, { apiVersion: '2020-08-27', typescript: false });

    try {
        const customer = await stripe.customers.create({ email });
        const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customer.id }, { apiVersion: '2020-08-27' });
        const setupIntent = await stripe.setupIntents.create({ customer: customer.id, payment_method_types });
        return res.json({ setupIntent: setupIntent.client_secret, ephemeralKey: ephemeralKey.secret, customer: customer.id });
    } catch (error) {
        return res.send({ error: error.raw.message });
    }
});

app.post('/payment-sheet', async (req, res) => {
    logger.info('Request received for payment-sheet', { body: req.body });
    const { email, totalPrice } = req.body;
    const stripe = new Stripe(secret_stripe_key, { apiVersion: '2020-08-27', typescript: false });

    try {
        const customer = await stripe.customers.create({ email });
        const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customer.id }, { apiVersion: '2020-08-27' });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalPrice * 100),
            // amount: 5099,
            currency: 'usd',
            payment_method_types: ['card', 'link'],
            setup_future_usage: 'off_session',
            // saved_payment_method: {
            //     payment_method_save: 'enabled',
            // },
        });
        return res.json({ paymentIntent: paymentIntent.client_secret, ephemeralKey: ephemeralKey.secret, customer: customer.id });
    } catch (error) {
        return res.send({ error: error.raw.message });
    }
});


// test function to ensure that things are being properly called in testflight
app.get('/test', (req, res) => {
    res.send('Hello from Firebase!');
})

// export our express app as a firebase cloud function???? Hopefully that works
exports.api = functions.https.onRequest(app);