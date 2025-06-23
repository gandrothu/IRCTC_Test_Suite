
import { test, expect } from '@playwright/test'
import Tesseract from "tesseract.js";
import fs from "fs";
import { faker } from '@faker-js/faker'


test.describe('navigate PNR page and check PNR input box', () => {

    test('Navigate to PNR Status page', async ({ page }) => {
        const newTabPromise = page.waitForEvent("popup");

        await page.goto('https://www.irctc.co.in/');
        await page.getByText('PNR STATUS').first().click();

        const newTab = await newTabPromise;

        await newTab.waitForLoadState();

        await expect(newTab).toHaveURL('https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en');
    });


    test('Check for presence of PNR input box', async ({ page }) => {
        await page.goto('https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en');

        await expect(page.locator('#inputPnrNo')).toBeVisible();
    })

})

test("Enter invalid 10-digit PNR number", async ({ page }) => {
    await page.goto('https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en');
    test.setTimeout(2*60*1000);
    await page.locator("#inputPnrNo").waitFor();
    await page.locator('#inputPnrNo').pressSequentially('4737333500');
    await page.locator('#modal1').waitFor();
    await page.locator('#modal1').click();
    await page.locator('#inputCaptcha').waitFor();

    const screenshotBuffer = await page.locator("#CaptchaImgID").screenshot();
    const imagePath = "captcha-screenshot.png";

    fs.writeFileSync(imagePath, screenshotBuffer);

    const { data: { text } } = await Tesseract.recognize(imagePath, "eng");

    await page.locator("#inputCaptcha").pressSequentially(String(eval(text.trim().split("=")[0].trim())));
    await page.locator('#submitPnrNo').click();

    await expect(page.locator("#errorMessage")).toHaveText('Error! FLUSHED PNR / PNR NOT YET GENERATED');

});

test.describe('PNR number validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en');
    });

    test('Enter PNR number less than 10 digits', async ({ page }) => {
        await page.locator("#inputPnrNo").waitFor();
        await page.locator('#inputPnrNo').fill('47373335');
        await page.locator('#modal1').waitFor();
        await page.locator('#modal1').click();

        await expect(page.locator("#errorMessage")).toHaveText('Error! PNR Number should be 10 digit numeric number.');
    });

    test('Enter PNR number more than 10 digits', async ({ page }) => {
        await page.locator("#inputPnrNo").waitFor();

        const inputValueGivenMoreThanTenDigits = '4737333556789123';
        await page.locator('#inputPnrNo').fill(inputValueGivenMoreThanTenDigits);

        const inputValueTaken = await page.locator('#inputPnrNo').textContent();
        const lenOfInputValueTaken = inputValueTaken?.length;
        const lenOfinputValueGivenMoreThanTenDigits = inputValueGivenMoreThanTenDigits.length;

        expect(lenOfInputValueTaken).toBeLessThan(lenOfinputValueGivenMoreThanTenDigits);


    });
});

test.describe('captcha validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en');
    });

    test('Submit incorrect Captcha', async ({ page }) => {
        
        await page.locator("#inputPnrNo").waitFor();
        await page.locator('#inputPnrNo').pressSequentially('4737333512');
        await page.locator('#modal1').waitFor();
        await page.locator('#modal1').click();
        await page.locator('#inputCaptcha').waitFor();
        const randomValue = faker.number.int(10000);
        const extendedValue = `${randomValue}@#$`;
        await page.locator("#inputCaptcha").pressSequentially(extendedValue);
        await page.locator('#submitPnrNo').click();

        await expect(page.locator('#errorMessagemodal')).toHaveText('Error! Captcha not matched');
    });

    test('Refresh Captcha image', async ({ page }) => {
        await page.locator("#inputPnrNo").waitFor();
        await page.locator('#inputPnrNo').pressSequentially('4737333512');
        await page.locator('#modal1').waitFor();
        await page.locator('#modal1').click();
        await page.locator('#inputCaptcha').waitFor();

        const initialSrc = await page.evaluate(() => {
            const img = document.getElementById('CaptchaImgID') as HTMLImageElement;
            return img?.src;
        });

        await page.locator('#refreshCaptcha').click();

        const updatedSrc = await page.evaluate(() => {
            const img = document.getElementById('CaptchaImgID') as HTMLImageElement;
            return img?.src;
        });

        expect(updatedSrc).not.toBe(initialSrc);
    });
});

test('Multiple Tabs', async ({ page }) => {
    const newTabPromise = page.waitForEvent("popup");
    await page.goto('https://www.irctc.co.in/');

    await page.getByText('PNR STATUS').first().click();
    const newTab1 = await newTabPromise;
    await newTab1.waitForLoadState();

    await page.getByText('PNR STATUS').first().click();
    const newTab2 = await newTabPromise;
    await newTab2.waitForLoadState();

    await newTab1.locator("#inputPnrNo").waitFor();
    await newTab1.locator('#inputPnrNo').fill('47373335');
    await newTab1.locator('#modal1').click();

    await expect(newTab1.locator("#errorMessage")).toHaveText('Error! PNR Number should be 10 digit numeric number.');

    
    await newTab2.locator("#inputPnrNo").waitFor();
    await newTab2.locator('#inputPnrNo').pressSequentially('4737333512');
    await newTab2.locator('#modal1').click();
    await newTab2.locator('#refreshCaptcha').click();

    await newTab1.close();
    await newTab2.close();
})
