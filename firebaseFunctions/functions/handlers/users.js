const { db } = require('../utilities/admin')

const firebaseConfig = require("../utilities/config");

// Auth
// cd into the 'functions' folder and run 'npm install --save firebase'
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const { validateSignUpData, validateLoginData } = require('../utilities/vailidators')

exports.signUp = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    const { valid, errors } = validateSignUpData(newUser) 

    if (!valid) {
        return res.status(400).json(errors)
    }

    // No repeat userHandles
    let token
    let userId

    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({handle: 'this handle is already taken'})
            }
            else {
               return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid
            return data.user.getIdToken()
        })
        .then(idToken => {
            token = idToken
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId: userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            console.error(err)
            if (err.code === "auth/email-already-in-use") {
                return res.status(400).json({email: 'Email is already in use'})
            }
            else {
                return res.status(500).json({error: err.code})
            }
        })
}

exports.logIn = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { valid, errors } = validateLoginData(user) 

    if (!valid) {
        return res.status(400).json(errors)
    }

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({token})
        })
        .catch(err => {
            console.error(err)
            if (err.code === 'auth/wrong-password') {
                return res.status(403).json({general: 'Wrong password, please try again'})
            }
            else {
                return res.status(500).json({error: err.code})
            }
            
        })
 }