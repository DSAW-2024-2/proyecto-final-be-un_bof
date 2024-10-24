// firebase.js
const admin = require('firebase-admin');

const firebaseConfig = {
    apiKey: "AIzaSyD3TsyMHJDgNzGFNDdKxXn8vqu8k433QnE",
    authDomain: "drive2u2.firebaseapp.com",
    projectId: "drive2u2",
    storageBucket: "drive2u2.appspot.com",
    messagingSenderId: "849234998709",
    appId: "1:849234998709:web:77152e8a4f21fb7bae95fc",
    measurementId: "G-BB1KJPFBV7"
};

// Inicializa la app de Firebase
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: firebaseConfig.storageBucket,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
