// vite.config.js
module.exports = {
  base: process.env.NODE_ENV === 'production'
    ? '/dice-box/'
    : '/'
}