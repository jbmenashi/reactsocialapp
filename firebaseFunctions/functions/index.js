const functions = require('firebase-functions');

const express = require('express');
const app = express();

const { getAllPosts, createPost } = require('./handlers/posts');
const { signUp, logIn } = require('./handlers/users');
const { FBAuth } = require('./utilities/fbAuth')

// Get All Posts
app.get('/posts', getAllPosts)

// Create Post
app.post('/post', FBAuth, createPost)

//Sign Up
app.post('/signup', signUp)

// Log In
app.post('/login', logIn)

exports.api = functions.https.onRequest(app);
// exports.api = functions.region('us-east-1).https.onRequest(app);