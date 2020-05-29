const { db } = require('../utilities/admin')

exports.getAllPosts = (req, res) => {
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
}

exports.createPost = (req, res) => {
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
}