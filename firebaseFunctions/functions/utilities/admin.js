const admin = require('firebase-admin');

const serviceAccount = require("./adminObj.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://reactsocialapp2.firebaseio.com"
  });

const db = admin.firestore()

module.exports = {admin, db}

// git reset HEAD~X
// git push origin -f