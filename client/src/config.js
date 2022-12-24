const hostname = process.env.REACT_APP_STAGE === 'development' ? 'http://localhost:5000' :'https://tictactoe-zj8e.onrender.com'
export default hostname;