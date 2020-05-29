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

// Create Post
app.post('/post', (req, res) => {
    const newPost = {
        postText: req.body.postText,
        userHandle: req.body.userHandle,
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

//Sign-Up Route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle

    }

    // Validate data
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