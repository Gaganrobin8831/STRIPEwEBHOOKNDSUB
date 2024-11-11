require('dotenv').config()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.set('view engine', 'ejs')

app.get('/', async (req, res) => {
    res.send("Hello World")
})

// app.get('/subscribe', async (req, res) => {
//     const plan = req.query.plan

//     if (!plan) {
//         return res.send('Subscription plan not found')
//     }

//     let priceId

//     switch (plan.toLowerCase()) {
//         case 'starter': 
//             priceId = 'price_1QJANaCfLWrjW8WUzUHV6UZ8'
//             break

//         case 'pro':
//             priceId = 'price_1QJANqCfLWrjW8WUsRz58YSd'
//             break

//         default:
//             return res.send('Subscription plan not found')
//     }

//     const session = await stripe.checkout.sessions.create({
//         mode: 'subscription',
//         line_items: [
//             {
//                 price: priceId,
//                 quantity: 1
//             }
//         ],
//         success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${process.env.BASE_URL}/cancel`
//     })

//     res.redirect(session.url)
// })



app.post('/subscribe', async (req, res) => {
  
    
    const { planName, amount } = req.body;

    if (!planName || !amount ) {
        return res.status(400).json({ error: 'Missing required fields: planName, amount, or duration' });
    }

  
    const intervalCount = 1
    if (isNaN(amount) || isNaN(intervalCount) || intervalCount <= 0) {
        return res.status(400).json({ error: 'Invalid amount or duration format' });
    }

    try {
        const product = await stripe.products.create({ name: planName });

        const price = await stripe.prices.create({
            unit_amount: parseInt(amount) * 100,
            currency: 'usd',
            recurring: {
                interval: 'month',
                interval_count: intervalCount,
            },
            product: product.id,
        });

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
      
            
            success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL}/cancel`,
        });
       
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/success', async (req, res) => {
    //const session = await stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['subscription', 'subscription.plan.product'] })

    res.send('Subscribed successfully')
})

app.get('/cancel', (req, res) => {
    res.redirect('/')
})

app.get('/customers/:customerId', async (req, res) => {
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: req.params.customerId,
        return_url: `${process.env.BASE_URL}/`
    })

    res.redirect(portalSession.url)
})

app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
  
    let event;
  
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET_KEY);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  console.log(event.type);
  
    // Handle the event
    switch (event.type) {
        
        
      //Event when the subscription started
      case 'checkout.session.completed':
        console.log('New Subscription started!')
        console.log(event.data)
        break;

      // Event when the payment is successfull (every subscription interval)  
      case 'invoice.paid':
        console.log('Invoice paid')
        console.log(event.data)
        break;

      // Event when the payment failed due to card problems or insufficient funds (every subscription interval)  
      case 'invoice.payment_failed':  
        console.log('Invoice payment failed!')
        console.log(event.data)
        break;

      // Event when subscription is updated  
      case 'customer.subscription.updated':
        console.log('Subscription updated!')
        console.log(event.data)
        break

      default:
        console.log("Hello");
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
  });

app.listen(3000, () => console.log('Server started on port 3000'))