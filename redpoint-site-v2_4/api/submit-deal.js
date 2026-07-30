// /api/submit-deal.js
// Vercel serverless function. Receives the lender's deal submission,
// emails the borrower a link to finish their part (in the same language
// the lender used), and emails REDPOINT a copy of the full deal.
//
// Requires the RESEND_API_KEY environment variable to be set in Vercel,
// and the sending domain (redpointmtg.com) verified in Resend.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const FROM_EMAIL = 'REDPOINT Mortgage <deals@redpointmtg.com>';
const BROKER_EMAIL = 'redpointpllc@yahoo.com';
const SITE_URL = 'https://redpointmtg.com';

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error (${res.status}): ${errText}`);
  }
  return res.json();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!RESEND_API_KEY) {
    res.status(500).json({ error: 'Server email is not configured yet (missing RESEND_API_KEY).' });
    return;
  }

  try {
    const data = req.body;
    const isSpanish = data.lang === 'es';

    const buyerName = escapeHtml(data.buyer_name);
    const buyerEmail = data.buyer_email;
    const propertyAddress = escapeHtml(data.property_address);
    const lenderName = escapeHtml(data.lender_name);
    const lenderCompany = escapeHtml(data.lender_company);
    const salePrice = escapeHtml(data.sale_price);
    const loanAmount = escapeHtml(data.amount_financed);
    const monthlyPayment = escapeHtml(data.monthly_payment);

    if (!buyerEmail || !buyerName) {
      res.status(400).json({ error: 'Missing buyer name or email.' });
      return;
    }

    const borrowerLink = isSpanish
      ? `${SITE_URL}/es/apply-borrower.html`
      : `${SITE_URL}/apply-borrower.html`;

    // 1. Email the borrower, in the language the lender used
    const borrowerHtml = isSpanish ? `
        <p>Hola ${buyerName},</p>
        <p>${lenderName || 'Su prestamista'} envió la propiedad y los términos para su expediente de préstamo con REDPOINT Mortgage${propertyAddress ? ' — ' + propertyAddress : ''}.</p>
        <p>Por favor complete su parte de la solicitud aquí:</p>
        <p><a href="${borrowerLink}">${borrowerLink}</a></p>
        <p>Después recibirá un enlace seguro para subir su identificación y terminar la verificación de identidad.</p>
        <p>— REDPOINT Mortgage PLLC (NMLS #2572321)</p>
      ` : `
        <p>Hi ${buyerName},</p>
        <p>${lenderName ? lenderName + ' has submitted' : 'Your lender has submitted'} the property and terms for your loan file with REDPOINT Mortgage${propertyAddress ? ' — ' + propertyAddress : ''}.</p>
        <p>Please complete your part of the application here:</p>
        <p><a href="${borrowerLink}">${borrowerLink}</a></p>
        <p>You'll get a secure link afterward to upload your ID and finish identity verification.</p>
        <p>— REDPOINT Mortgage PLLC (NMLS #2572321)</p>
      `;

    await sendEmail({
      to: buyerEmail,
      subject: isSpanish
        ? `${lenderName ? lenderName + ' lo refirió a' : 'Su siguiente paso con'} REDPOINT Mortgage`
        : `${lenderName ? lenderName + ' referred you to' : 'Your next step with'} REDPOINT Mortgage`,
      html: borrowerHtml
    });

    // 2. Notify the broker with the full deal details (always in English, internal use)
    await sendEmail({
      to: BROKER_EMAIL,
      subject: `New deal submitted (${isSpanish ? 'ES' : 'EN'}): ${buyerName}${propertyAddress ? ' — ' + propertyAddress : ''}`,
      html: `
        <h3>Lender</h3>
        <p>${lenderName} ${lenderCompany ? '(' + lenderCompany + ')' : ''}<br>${escapeHtml(data.lender_email)} · ${escapeHtml(data.lender_phone)}</p>
        <h3>Buyer</h3>
        <p>${buyerName}<br>${escapeHtml(buyerEmail)} · ${escapeHtml(data.buyer_phone)}</p>
        <h3>Property</h3>
        <p>${propertyAddress}<br>Lot ${escapeHtml(data.lot_number)}, ${escapeHtml(data.subdivision)}, ${escapeHtml(data.county)} County<br>Sale price: $${salePrice}</p>
        <h3>Terms</h3>
        <p>Loan amount: $${loanAmount}<br>Rate: ${escapeHtml(data.interest_rate)}%<br>Term: ${escapeHtml(data.years_financed)} years<br>Monthly payment: $${monthlyPayment}<br>Monthly tax escrow: $${escapeHtml(data.monthly_tax_escrow)}<br>Late charge: ${escapeHtml(data.late_charge)}<br>Second lien: ${escapeHtml(data.second_lien)}</p>
        <h3>Closing costs</h3>
        <p>Origination: $${escapeHtml(data.origination_fee)} · Recording: $${escapeHtml(data.recording_fee)} · Admin: $${escapeHtml(data.admin_fee)} · Tax escrow (upfront): $${escapeHtml(data.tax_escrow_upfront)} · Insurance: $${escapeHtml(data.insurance_cost)}<br><b>Total: $${escapeHtml(data.total_closing_costs)}</b></p>
        <p>${escapeHtml(data.term_notes)}</p>
      `
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong sending the emails.' });
  }
};
