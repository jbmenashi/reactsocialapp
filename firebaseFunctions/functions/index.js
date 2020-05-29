const functions = require('firebase-functions');
const admin = require('firebase-admin');

const serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://reactsocialapp2.firebaseio.com"
});

const express = require('express');
const app = express();

const firebaseConfig = require("./config.json");

// Auth
// cd into the 'functions' folder and run 'npm install --save firebase'
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

// git reset HEAD~X
// git push origin -f

const db = admin.firestore()

// Get All Posts
app.get('/posts', (req, res) => {
    db.collection('posts').orderBy('createdAt', 'desc').get()
    .then(data => {
        let posts = [];
        data.forEach(doc => {
            posts.push({
                postId: doc.id,
                ...doc.data()
            });
        })
        return res.json(posts);
    })
    .catch(err => console.error(err)); 
})

// Middleware for authorization
const FBAuth = (req, res, next) => {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1]
    }
    else {
        console.error('No token found')
        return res.status(403).json({error: 'Unauthorized'})
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken
            console.log(decodedToken)
            return db.collection('users').where('userId', '==', req.user.uid).limit(1).get()
            // return db.collection('users').find(user => user.userId === req.user.uid).get() - this doesn't work
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle
            return next();
        })
        .catch(err => {
            console.error('Error while verifying token', err)
            return res.status(403).json(err)
        })
}

// Create Post
app.post('/post', FBAuth, (req, res) => {
    if (req.body.postText.trim() === '') {
        return res.status(400).json({postText: 'postText must not be empty'})
    }

    const newPost = {
        postText: req.body.postText,
        userHandle: req.user.handle,
        // createdAt: admin.firestore.Timestamp.fromDate(new Date())
        createdAt: new Date().toISOString()
    }

    db.collection('posts').add(newPost)
        .then(doc => {
            res.json({message: `document ${doc.id} created successfully`})
        })
        .catch(err => {
            res.status(500).json({error: 'something went wrong'})
            console.error(err);
        })
})

// Validations for signup

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) {
        return true
    }
    else {
        return false
    }
}

const isEmpty = (string) => {
    if (string.trim() === '') {
        return true;
    }
    else {
        return false;
    }
}
//Sign-Up Route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = 'Must not be empty'
    } 
    else if (!isEmail(newUser.email)) {
        errors.email = 'Must be a vaild email address'
    }

    if (isEmpty(newUser.password)) {
        errors.password = 'Must not be empty'
    }

    if (newUser.password !== newUser.confirmPassword) {
        errors.confirmPassword = 'Passwords must be the same'
    }

    if (isEmpty(newUser.handle)) {
        errors.handle = 'Must not be empty'
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors);
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
})

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    if (isEmpty(user.email)) {
        errors.email = 'Must not be empty'
    }

    if (isEmpty(user.password)) {
        errors.password = 'Must not be empty'
    }

    if (Object.keys(errors).length > 0) {
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
 })

exports.api = functions.https.onRequest(app);
// exports.api = functions.region('us-east-1).https.onRequest(app);

/*
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello world!");
});

exports.getPosts = functions.https.onRequest((req, res) => {
    db.collection('posts').get()
        .then(data => {
            let posts = [];
            data.forEach(doc => {
                posts.push(doc.data());
            })
            return res.json(posts);
        })
        .catch(err => console.error(err));
})

exports.createPost = functions.https.onRequest((req, res) => {
    const newPost = {
        postText: req.body.postText,
        userHandle: req.body.userHandle,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
    }

    admin.firestore().collection('posts').add(newPost)
        .then(doc => {
            res.json({message: `document ${doc.id} created successfully`})
        })
        .catch(err => {
            res.status(500).json({error: 'something went wrong'})
            console.error(err);
        })
})
*/