const functions = require('firebase-functions');

const express = require('express');
const app = express();

const { getAllPosts, createPost } = require('./handlers/posts');
const { signUp, logIn, uploadImage } = require('./handlers/users');
const { FBAuth } = require('./utilities/fbAuth')

// Post Routes
app.get('/posts', getAllPosts)
app.post('/post', FBAuth, createPost)

// User Posts
app.post('/signup', signUp)
app.post('/login', logIn)
app.post('/user/image', FBAuth, uploadImage)



exports.api = functions.https.onRequest(app);
// exports.api = functions.region('us-east-1).https.onRequest(app);