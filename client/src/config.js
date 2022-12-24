const hostname = process.env.REACT_APP_STAGE === 'development' ? 'http://localhost:5000' :'https://tictactoe-ghj6.onrender.com'
export default hostname;