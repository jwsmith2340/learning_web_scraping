// Puppeteer is a 
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const CronJob = require("cron").CronJob;
const nodemailer = require("nodemailer");
require('dotenv').config();

const url = "https://www.amazon.com/gp/product/B09CGB6VRR/";

const password = process.env.password

async function configureBrowser() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);

    return page;
};

async function checkPrice(page) {
    await page.reload();
    console.log('checking price');
    let html = await page.evaluate(() => document.body.innerHTML);
    $ = cheerio.load(html);
    
    // $(".a-price-whole", html).each(function() {
    $("#corePriceDisplay_desktop_feature_div", html).each(function(e) {
        if (e === 0) {
            let dollarPrice = $(this).find(".a-price-whole").text();
            let length = dollarPrice.length;

            dollarPrice = parseInt(dollarPrice.slice(0, length - 1))

            if (dollarPrice < 300) {
                console.log("The price is now under $300, time to send an email.")
                sendEmail();
            }
        }
    });
};

async function startTracking() {
    console.log(password)
    const page = await configureBrowser();

    let job = new CronJob('*/1 * * * *', function() {
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