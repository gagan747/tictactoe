/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from "react";
import { socket } from "../socket";
import { Navigate } from "react-router-dom";
import Modal from "react-modal";
import { toast } from "react-toastify";
import messageCleaner from "../utils/messageCleaner";
import copyToClipboard from "../utils/copyToClipboard";
import qs from "query-string";
import hostname from "../config";

const customStyles = {
  content: {
    top: "40%",
    left: "49%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
  },
};
let myusername;
Modal.setAppElement("#root");
let subtitle;
class Home extends Component {
  roomIdFromParams = qs.parse(
    window.location.hash.slice(window.location.hash.indexOf("?")),
  ).roomId;
  container = React.createRef(null);
  state = {
    genratedRoomId: "",
    inputRoomId: null,
    redirectToGame: false,
    redirectToLogin: false,
    modalIsOpen: false,
    toggleInviteFriends: false,
    toggleOnlineFriends: false,
    alreadyInRoomModal: { value: false, roomId: null },
    playersOnline: [],
    username: "",
  };
  openModal = () => {
    this.setState({ ...this.state, modalIsOpen: true });
  };
  pushUserToRoom = async (roomId) => {
    try {
      const response = await fetch(hostname + "/api/joinRoom", {
        method: "POST",
        body: JSON.stringify({
          roomId,
        }),
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
      });
      const data = await response.json();
      if (response.status === 200) {
        socket.emit("joinRoom", roomId, myusername);
        socket.on("roomAvailable", () => {
          this.setState({ ...this.state, redirectToGame: true });
        });
        socket.on("roomFull", () => {
          this.openModal();
        });
      } else if (response.status === 307) {
        toast.error("Login to Continue");
        this.setState({ redirectToLogin: true });
      } else {
        toast.error(data.message);
        document.getElementsByClassName("parentloader")[0].style.display =
          "none";
      }
    } catch (err) {
      toast.error(messageCleaner("" + err));
      document.getElementsByClassName("parentloader")[0].style.display = "none";
    }
  };
  afterOpenModal = () => {
    subtitle.style.color = "#f00";
  };
  closeModal = () => {
    this.setState({ ...this.state, modalIsOpen: false });
  };
  handleAlreadyInRoomModal(roomId) {
    this.setState({ alreadyInRoomModal: { value: true, roomId } });
    this.container.current.style.opacity = "0.07";
    this.container.current.style.pointerEvents = "none";
  }

  handleLogout = () => {
    localStorage.clear("token");
    this.setState({ redirectToLogin: true });
  };
  handleOnlinePlayers = (roomId) => {
    this.pushUserToRoom(roomId);
  };
  handleAlreadyInRoom = () => {
    this.pushUserToRoom(this.state.alreadyInRoomModal.roomId);
  };
  handleQuitRoom = () => {
    socket.emit("quitRoom", this.state.alreadyInRoomModal.roomId);
  };
  handleOnlineFriends = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(hostname + "/api/getFriendsInWaiting");
      const responseData = await response.json();
      if (response.status.toString().startsWith("4"))
        throw new Error(responseData.message);
      this.setState({ playersOnline: responseData.data });
      this.setState({ toggleOnlineFriends: true });
      this.container.current.style.opacity = "0.07";
    } catch (err) {
      console.log("meow", err.toString());
      toast.error(messageCleaner("" + err));
    }
  };
  closeOnlineFriendDialogue = () => {
    this.setState({ toggleOnlineFriends: false });
    this.container.current.style.opacity = "1";
  };
  generateRoomId = () => {
    const digits = "0abc1def3gH4IJ5KL6M8N7OP9qS";
    let genratedRoomId = "";
    for (let i = 0; i < 4; i++) {
      genratedRoomId += digits[Math.floor(Math.random() * 100) % 27];
    }
    this.setState({
      ...this.state,
      toggleInviteFriends: !this.state.toggleInviteFriends,
      genratedRoomId: genratedRoomId,
    });
  };
  joinRoom = (e, roomId) => {
    e.preventDefault();
    roomId && this.pushUserToRoom(roomId);
  };
  componentDidMount() {
    socket.on("updatedOnlinePlayers", (playersOnline) => {
      this.setState({ playersOnline });
    });
    socket.on("refreshPage", () => {
      window.location.reload();
    });
    this.getUserDetails();
  }
  componentWillUnmount() {
    socket.off("refreshPage");
    socket.off("updatedOnlinePlayers");
  }
  getUserDetails = async () => {
    try {
      const response = await fetch(hostname + "/api/home", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
      });
      const data = await response.json();
      if (response.status === 200) {
        myusername = data.username;
        this.setState({ username: myusername });
        if (data.roomId) this.handleAlreadyInRoomModal(data.roomId);
        else if (
          this.roomIdFromParams ||
          localStorage.getItem("roomIdFromParams")
        ) {
          localStorage.removeItem("timer");
          if (this.roomIdFromParams) {
            this.pushUserToRoom(this.roomIdFromParams);
            localStorage.removeItem("roomIdFromParams");
            return;
          }
          if (localStorage.getItem("roomIdFromParams")) {
            this.pushUserToRoom(localStorage.getItem("roomIdFromParams"));
            localStorage.removeItem("roomIdFromParams");
            return;
          }
        } else localStorage.removeItem("timer");
      } else if (response.status === 307) {
        toast.error("Login to Continue");
        this.roomIdFromParams &&
          localStorage.setItem("roomIdFromParams", this.roomIdFromParams);
        this.setState({ ...this.state, redirectToLogin: true });
      } else toast.error(data.message);
      document.getElementsByClassName("parentloader")[0].style.display = "none";
    } catch (err) {
      toast.error(messageCleaner("" + err));
      document.getElementsByClassName("parentloader")[0].style.display = "none";
      this.setState({ redirectToLogin: true });
    }
  };

  render() {
    // const search = this.props.location.search;
    // const name = new URLSearchParams(search).get("roomId");

    return (
      <>
        <div className="parentloader">
          <div className="spinner-border spinner"></div>
        </div>
        {this.state.redirectToGame && <Navigate to="/game" replace={true} />}
        {this.state.redirectToLogin && <Navigate to="/" replace={true} />}
        <Modal
          isOpen={this.state.modalIsOpen}
          onRequestClose={this.closeModal}
          style={customStyles}
          contentLabel="Example Modal"
          shouldCloseOnOverlayClick={false}
        >
          <h5 style={{ textAlign: "center" }}>
            ROOM FULL
            <br />
            Join Another Room
          </h5>
          <div className="text-center">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                this.closeModal();
              }}
            >
              Close
            </button>
          </div>
        </Modal>
        {this.state.toggleOnlineFriends && (
          <div className="online-friends">
            <h3
              className="text-center"
              style={{ fontSize: "2rem", overflow: "auto" }}
            >
              in Waiting...
            </h3>
            <span
              className="fa fa-times close-icon"
              style={{ cursor: "pointer" }}
              onClick={this.closeOnlineFriendDialogue}
            ></span>
            {this.state.playersOnline.length > 0 &&
              this.state.playersOnline.map((player) => {
                return (
                  <>
                    <div
                      className="d-flex justify-content-between p-3"
                      key={player.users[0].username}
                    >
                      <span>{player.users[0].username}</span>
                      <button
                        className="btn btn-sm btn-success fw-bold"
                        onClick={() => this.handleOnlinePlayers(player.roomId)}
                      >
                        JOIN
                      </button>
                    </div>
                  </>
                );
              })}
          </div>
        )}
        {this.state.alreadyInRoomModal.value && (
          <div className="in-room-modal  d-flex flex-column align-items-center justify-content-center">
            <h1
              style={{ cursor: "pointer" }}
              className="text-center"
              onClick={this.handleAlreadyInRoom}
            >
              Continue to room {this.state.alreadyInRoomModal.roomId}
            </h1>
            <button
              className="btn btn-danger btn-sm mt-4"
              onClick={this.handleQuitRoom}
            >
              Leave
            </button>
          </div>
        )}
        <div
          className="d-flex flex-column justify-content-center align-items-center container"
          ref={this.container}
        >
          <div className="username">Hello {this.state.username}</div>
          <form className="d-flex flex-column justify-content-center align-items-center form p-5 ">
            <span className="logout" onClick={this.handleLogout}>
              Logout
            </span>
            <div className="form-outline  ">
              <h1 className="text-center mb-4">Enter Room Id</h1>
            </div>
            <div className="form-outline mt-2 mb-4 w-25">
              <input
                type="text"
                id="form1Example2"
                className="form-control"
                onChange={(e) => {
                  this.setState({ ...this.state, inputRoomId: e.target.value });
                }}
              />
            </div>

            <div className="row  d-flex justify-content-center ">
              <div className="text-center mb-5">
                <button
                  type="submit"
                  className="btn btn-primary btn-block mb-5"
                  onClick={(e) => this.joinRoom(e, this.state.inputRoomId)}
                >
                  JOIN
                </button>
              </div>
            </div>

            <h5
              className="text-center mt-4 mb-2"
              style={{ cursor: "pointer" }}
              onClick={this.generateRoomId}
            >
              Invite Friends?
            </h5>
            {this.state.toggleInviteFriends && (
              <>
                <div className="invite-link m-3">
                  <p className="link ">
                    {hostname}/#/home?roomId=
                    {this.state.genratedRoomId}
                  </p>
                  <p
                    className="copy-link btn btn-success d-flex align-items-center text-center fw-bold"
                    onClick={(e) => {
                      copyToClipboard(e.target.previousSibling.innerHTML);
                      toast.success("Link Copied");
                    }}
                  >
                    Copy
                  </p>
                </div>{" "}
                <button
                  type="submit"
                  className="btn btn-primary mb-5 fw-bold"
                  onClick={(e) => this.joinRoom(e, this.state.genratedRoomId)}
                >
                  JOIN
                </button>
              </>
            )}
            <div className="d-flex justify-content-center text-center">
              <a
                href="#"
                style={{ fontWeight: "bold", color: "black", margin: "20px" }}
                onClick={this.handleOnlineFriends}
              >
                Online Friends
              </a>
            </div>
          </form>
        </div>
      </>
    );
  }
}
export default Home;
