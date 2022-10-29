// Puppeteer is a high-level API to control headless Chrome or Chromium over the DevTools
// protocol. The docs: https://developer.chrome.com/docs/puppeteer/overview/
// These docs are extensive and very good, worth reading through at some point
const puppeteer = require("puppeteer");

// cheerio is essentially jQuery for the server side of things. It essentially parses
// html and xml on web pages, and it is not a browser itself, like Puppeteer. 
const cheerio = require("cheerio");

// CronJob is what we user from node-cron for script scheduling, the docs are all on
// GitHub and should be gone over: https://github.com/kelektiv/node-cron#readme
const CronJob = require("cron").CronJob;

// nodemailer allows you to user your Gmail account to send emails from a script. The
// basic setup is implemented in this file, but there are other options and features
// that I haven't dove into yet. Docs: https://nodemailer.com/message/
const nodemailer = require("nodemailer");

require('dotenv').config();

const url = "https://www.amazon.com/gp/product/B09CGB6VRR/";

const password = process.env.password

// The puppeteer configuration function, this function follows the boilerplate 
// setup to create an instance of a Chromium browser. 
async function configureBrowser() {
    // This is boilerplate code. We launch puppeteer, which creates a browser, 
    // and the browser then creates a new page for us, which we call page. 
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Boilerplate, we now direct our browser to go to our page.
    await page.goto(url);
    
    // We are now on the page we want to be on, and will begin scraping in 
    // the checkPrice() function
    return page;
};

// This is the web scraping bit of the application. It takes in the Puppeteer
// browser page as its argument.
async function checkPrice(page) {
    // We reload the page in case the price has changed, or in the future when 
    // we start building out 'in-stock' scrapers, to see if inventory has been
    // added. Without this reload, the page becomes stale. 
    await page.reload();

    // Evaluate essentially recrieves a DOM element, in this case the body's
    // inner HTML. We could skinny this down in the future, but for this brief
    // tutorial, I'm not going to mess with it. 
    let html = await page.evaluate(() => document.body.innerHTML);

    // Before we can use cheerio, we have to pass in the HTML that we're wanting 
    // it to interact with, which is what's going on here. This isn't exactly the
    // same as jQuery, so this bit is important to remember.
    $ = cheerio.load(html);
    
    // Now, it is looking more like a jQuery deal. We are checking the particular
    // html element with id bleh, from the html, and we are checking each instance
    // of that id. Normally, since IDs are supposed to be unique, we wouldn't need
    // the if e == 0, but here we are. 
    $("#corePriceDisplay_desktop_feature_div", html).each(function(e) {
        if (e === 0) {
            // The 'this' keyword is referencing our initial element identified by
            // its id. From that DOM element, we're finding the price class, and 
            // then we specify that we want its text. 
            let dollarPrice = $(this).find(".a-price-whole").text();
            // Length is used for our slice
            let length = dollarPrice.length;
            // Convert to int, slice off the decimal
            dollarPrice = parseInt(dollarPrice.slice(0, length - 1))

            // This is our logic. In this case, we created a 'on-sale' web scraper, 
            // so we are looking to see if the item has gone on sale. We could of course
            // Change the messages based on the price of the item, but in this case if it
            // is under $300, you're getting an email. 
            if (dollarPrice < 300) {
                console.log("The price is now under $300, time to send an email.")
                // Calling our nodemailer function
                sendEmail();
            }
        }
    });
};

async function startTracking() {
    const page = await configureBrowser();

    let job = new CronJob('*/5 * * * *', function() {
        checkPrice(page);
    }, null, true, null, null, true);
    
    job.start();
}

async function sendEmail() {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: 'false',
        auth: {
            user: 'js2340.dev@gmail.com', 
            pass: password
        }
    });
    
    const mailOptions = {
        from: 'jsm2340.dev@gmail.com',
        to: 'jwsmith2340@gmail.com',
        subject: 'Nodemailer Test Email',
        //text: 'This is the text key.',    The text field is overridden by the html field, you can't use both.
        html: `<html><body><p>This should be an A tag that links to the <a href=${url}>headphones</a>.</p></body></html>`
    };
    
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });

}
// async function monitor() {
//     let page = await configureBrowser();
//     await checkPrice(page);
// };

// monitor();

startTracking();