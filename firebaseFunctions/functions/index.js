const functions = require('firebase-functions');

const express = require('express');
const app = express();

const { getAllPosts, createPost, getPost, likePost, unlikePost, commentOnPost } = require('./handlers/posts');
const { signUp, logIn, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');
const { FBAuth } = require('./utilities/fbAuth')

// Post Routes
app.get('/posts', getAllPosts)
app.post('/post', FBAuth, createPost)
app.get('/post/:postId', getPost)
app.get('/post/:postId/like', FBAuth, likePost)
app.get('/post/:postId/unlike', FBAuth, unlikePost)
app.post('/post/:postId/comment', FBAuth, commentOnPost)

// User Posts
app.post('/signup', signUp)
app.post('/login', logIn)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)



exports.api = functions.https.onRequest(app);
// exports.api = functions.region('us-east-1).https.onRequest(app);