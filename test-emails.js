const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);
const to = 'yashvardhansingh0904@gmail.com';
const from = process.env.EMAIL_FROM || 'ACM Squid Game <onboarding@resend.dev>';

const emails = [
    {
        subject: '⚠️ Strike 1 - ACM Squid Game',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;"><div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; border-radius: 12px; padding: 40px;"><h1 style="color: #ff6b6b; margin: 0 0 20px;">⚠️ First Strike Warning</h1><p style="color: #ccc; font-size: 16px;">Hi <strong>Yash Vardhan</strong>,</p><p style="color: #ccc; font-size: 16px;">You missed Day <strong>5</strong>'s challenge on ACM Squid Game.</p><div style="background: #1a1a1a; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0;"><p style="color: #ff6b6b; font-size: 20px; margin: 0;">Strike 1 of 3</p><p style="color: #888; margin: 5px 0 0;">You have <strong>2 more chances</strong> before elimination.</p></div><p style="color: #ff2e88;">Stay in the game! Complete today's challenge to reset your streak.</p><a href="https://www.hackerrank.com/contests" style="display: inline-block; background: #ff2e88; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Go to HackerRank</a></div></body></html>`
    },
    {
        subject: '⚠️⚠️ Strike 2 - ACM Squid Game',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;"><div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #ff6b6b; border-radius: 12px; padding: 40px;"><h1 style="color: #ff2e88; margin: 0 0 20px;">⚠️⚠️ Second Strike Warning</h1><p style="color: #ccc; font-size: 16px;">Hi <strong>Yash Vardhan</strong>,</p><p style="color: #ccc; font-size: 16px;">You missed Day <strong>6</strong>'s challenge.</p><div style="background: #2a0a0a; border: 2px solid #ff2e88; padding: 20px; margin: 20px 0; text-align: center;"><p style="color: #ff2e88; font-size: 28px; margin: 0;">⚠️ DANGER ZONE</p><p style="color: #ff6b6b; font-size: 18px; margin: 10px 0 0;">ONE MORE MISS = ELIMINATION!</p></div><p style="color: #ff6b6b;">This is your <strong>2nd consecutive strike</strong>. Don't let it end here!</p><a href="https://www.hackerrank.com/contests" style="display: inline-block; background: #ff2e88; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">SOLVE NOW</a></div></body></html>`
    },
    {
        subject: '❌ ELIMINATED - ACM Squid Game',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;"><div style="max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 3px solid #ff2e88; border-radius: 12px; padding: 40px; text-align: center;"><div style="font-size: 64px; margin-bottom: 20px;">💀</div><h1 style="color: #ff2e88; margin: 0 0 20px; font-size: 36px;">ELIMINATED</h1><p style="color: #ccc; font-size: 18px;">Hi <strong>Yash Vardhan</strong>,</p><p style="color: #888; font-size: 16px;">You have been eliminated from ACM Squid Game after 3 consecutive misses.</p><div style="background: #111; padding: 20px; margin: 30px 0; border-radius: 8px;"><p style="color: #888; margin: 0;">Final Score</p><p style="color: #ff2e88; font-size: 36px; margin: 5px 0; font-weight: bold;">250</p><p style="color: #666; margin: 0;">Day Eliminated: 7</p></div><p style="color: #666;">Better luck next time! 🎮</p></div></body></html>`
    }
];

async function sendAll() {
    console.log('Sending 3 test emails to', to);
    console.log('Using API key:', process.env.RESEND_API_KEY ? 'set ✅' : 'MISSING ❌');
    console.log('---');

    for (let i = 0; i < emails.length; i++) {
        const { data, error } = await resend.emails.send({ from, to, ...emails[i] });
        if (error) {
            console.error('❌ FAIL:', emails[i].subject, '-', error.message);
        } else {
            console.log('✅ SENT:', emails[i].subject, '→', data.id);
        }
        await new Promise(r => setTimeout(r, 1500));
    }
    console.log('---');
    console.log('Done! Check your inbox at', to);
}

sendAll();
