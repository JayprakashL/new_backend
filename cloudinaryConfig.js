// cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dbds2ipsb',
  api_key: '853192379538727',
  api_secret: 'PRKGH2NNVDnN_bLVqjMcuKp17HA'
});

module.exports = cloudinary;
