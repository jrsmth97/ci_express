module.exports = () => {
    global.CONFIG = {};
    global.ROUTE = {};
    return (req, res, next) => {
        next()
    };
}