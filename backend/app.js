const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { deleteExpiredSessions } = require("./utils/sessionManager")
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: 'http://localhost:3000', // Only allow requests from the frontend (localhost:3000)
  credentials: true, // Allow cookies and credentials to be sent
};

app.use(cors(corsOptions));

setInterval(deleteExpiredSessions, 600000);

app.use("/", routes);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
