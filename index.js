const mongoose = require("mongoose");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");
const app = express();
const path = require("path");
const cors = require("cors");
const setheader = require("./utils/setheader");
const httpServer = createServer(app);
const joinRoom = require("./routes/joinroom");
const userAuth = require("./routes/auth");
const home = require("./routes/home");
const getFriendsInWaiting = require("./routes/getFriendsInWaiting");
const Gamedata = require("./models/gamedata");
const onConnectionRefresh = require("./controllers/connectionRefreshController");
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    credentials: true,
  },
});
require("./controllers/polling")(io);
const PORT = process.env.port || 5000;
mongoose
  .connect(
    "mongodb+srv://dbuser:Waheguru747477%40@cluster0.pkxnk.mongodb.net/tictactoe?retryWrites=true&w=majority",
  )
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error(`${err}`));

instrument(io, {
  auth: false,
});

app.use(express.json());
app.use(setheader);
app.use(
  cors({
    origin: "*",
    credentials: "true",
  }),
);
app.use(express.static(path.join(__dirname, "/client/build")));
app.use("/api", home);
app.use("/api", userAuth);
app.use("/api", joinRoom);
app.use("/api", getFriendsInWaiting);

io.on("connection", (socket) => {
  console.log(socket.id);
  socket.on("gameComponentRefresh", (jwtoken, obj) => {
    onConnectionRefresh(jwtoken, obj)
      .then((message) => {
        socket.emit("afterGameComponentRefresh", message.toString());
      })
      .catch((err) => {
        socket.emit("afterGameComponentRefresh", err.toString());
      });
  });
  socket.on("joinRoom", (roomId, username) => {
    console.log("joinRoom", roomId);
    const room = roomId.toString();

    socket.emit("roomAvailable");
    socket.join(room);

    socket.on("leaveRoom", async (user_id) => {
      try {
        const data = await Gamedata.findOneAndUpdate(
          { roomId: room },
          { $pull: { users: user_id } },
          { new: true },
        );
        data &&
          data.users.length === 0 &&
          (await Gamedata.deleteOne({ roomId: room }));
        socket.leave(room);
        socket.removeAllListeners("onGameComponentMount");
        socket.removeAllListeners("opponentTurnPayload");
        socket.removeAllListeners("disconnect");
        socket.removeAllListeners("leaveRoom");
      } catch (err) {
        console.log(err);
      }
    });
    socket.on("leaveRoomBothOpponents", async () => {
      try {
        await Gamedata.deleteOne({ roomId: room });
        socket.broadcast.to(room).emit("opponentTimeOver");
        setTimeout(() => io.in(room).emit("redirectToHome"), 700);
      } catch (err) {
        console.log(err);
      }
    });
    socket.on("opponentTurnPayload", async (gamedata, user_id) => {
      try {
        const data = await Gamedata.findOne({ roomId: room });
        if (data) {
          data.gamedata = gamedata;
          data.turn = data.users
            .filter((user) => user.toString() !== user_id)[0]
            .toString();
          await data.save();
          socket.to(room).emit("message", gamedata, data.turn);
        }
      } catch (err) {
        console.log(err);
      }
    });
    socket.on("onGameComponentMount", async () => {
      console.log("gamecomponentmount");
      io.sockets.adapter.rooms.get(room) && //room is accessed as js follows closure such that the instance of socket in which join room is fired ,when that same instance of socket emits gamecomponentmount the room is accessed from join room as it is protected because of closure
        io.sockets.adapter.rooms.get(room).size === 1 &&
        socket.emit("inWaiting");
      if (
        io.sockets.adapter.rooms.get(room) &&
        io.sockets.adapter.rooms.get(room).size >= 2
      ) {
        const data = await Gamedata.findOne({ roomId: room });
        if (data.turn === "") {
          data.turn = data.users[0];
          await data.save();
        }
        if (data.users.length === 1) return socket.emit("inWaiting");
        io.in(room).emit("startGame", data.gamedata, data.turn);
        socket.to(room).emit("opponentjoined", username);
      }
    });
    socket.on("disconnect", () => {
      socket.to(room).emit("anotherplayerdisconnected");
    });
  });
  socket.on("quitRoom", async (roomId) => {
    const result = await Gamedata.deleteOne({ roomId });
    if (result.acknowledged)
      socket.to(roomId).emit("refreshPage", "Opponent left");
    socket.emit("refreshPage");
  });
});
httpServer.listen(PORT, () => {
  console.log("listening on " + PORT);
});
process
  .on("unhandledRejection", (reason, p) => {
    console.error(reason, "Unhandled Rejection at Promise", p);
  })
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });
app.get("/*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
});
