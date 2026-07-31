const jwt = require("jsonwebtoken");

const SECRET_KEY = "smartmetro123";

function auth(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Access Denied"
        });
    }

    // Remove "Bearer "
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    try {

        const verified = jwt.verify(token, SECRET_KEY);

        req.user = verified;

        next();

    }
    catch (err) {

        return res.status(401).json({
            message: "Invalid Token"
        });

    }

}

module.exports = auth;