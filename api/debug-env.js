module.exports = (req, res) => {
  res.status(200).json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    keyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
    nodeEnv: process.env.VERCEL_ENV || 'unknown'
  });
};