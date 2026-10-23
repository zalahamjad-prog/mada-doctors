// Moyasar payment gateway (pay.html, visit-pay.html, paid.html).
// key: Moyasar's publishable key (pk_test_... while testing, pk_live_... when live). It is safe in public files; it can only
// start a payment. The secret key is never here: it lives in Supabase > Edge Functions > Secrets (MOYASAR_SECRET_KEY).
// Empty key = the gateway is off and the pages keep the demo payment.
// methods: "creditcard" (mada, Visa, Mastercard), "applepay" (needs the site's domain registered in Moyasar first), "stcpay".
var MADA_PAY = {
  key: "pk_test_nz5VHMjB5K9C14A77GVqJ4FgDm8wtvsYRMBHMa7C",
  methods: ["creditcard"],
  label: "Mada Care",
  js: "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.14/dist/moyasar.umd.js",
  css: "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.14/dist/moyasar.css"
};
