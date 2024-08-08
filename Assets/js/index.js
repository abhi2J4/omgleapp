let localStream;
let username;
let remoteUser;
let url = new URL(window.location.href);
username = url.searchParams.get("username");
remoteUser = url.searchParams.get("remoteuser");
let peerConnection;
let remoteStream;
let sendChannel;
let receiveChannel;
var msgInput = document.querySelector("#msg-input");
var msgSendBtn = document.querySelector(".msg-send-buton");
var chatTextArea = document.querySelector(".chat-text-area");


  
// var omeID = localStorage.getItem("omeID");
// if (omeID) {
//   username = omeID;
//   $.ajax({
//     url: "/new-user-update/" + omeID + "",
//     type: "PUT",
//     success:function (response) {
//       alert(response);
//     }
//     });
    
// } else {
//   var postData = "Demo Data";
//   $.ajax({
//     type: "POST",
//     url: "/api/users",
//     data: postData,
//     success: function (response) {
//       console.log(response);
//       localStorage.setItem("omeID", response);
//       username = response;
//     },
//     error: function (error) {
//       console.log(error);
//     }
//   });
// }


let init = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.getElementById("user-1").srcObject = localStream;
//   $.post("http://localhost:3000/get-remote-users",{omeID:omeID})
//   .done(function(data){
//     if(data[0]){
//       if(data[0]._id == remoteUser ||  data[0]._id == username){

//       }else{
//         remoteUser = data[0]._id
//       }
//     }
      createOffer();
//   })
//   .fail(function(xhr,textStatus,errorThrown){
//     console.log(xhr.responseText)
//   })

// };
}
init();

let socket = io.connect();

socket.on("connect", () => {
  if (socket.connected) {
    socket.emit("userconnect", {
      displayName: username,
    });
  }
});
let servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.goole.com:19302", "stun:stun2.1.goole.com:19302"],
    },
  ],
};

let createPeerConnection = async () => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();

  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
  peerConnection.ontrack = async (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  remoteStream.oninactive = () => {
    remoteStream.getTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    peerConnection.close();
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      socket.emit("candidateSentToUser", {
        username: username,
        remoteUser: remoteUser,
        iceCandidateData: event.candidate,
      });
    }
  };


  sendChannel = peerConnection.createDataChannel("sendDataChannel");
  sendChannel.onopen = () => {
    console.log("Data channel is know open and ready to use ");
    onSendChannelStateChange();
  };
  peerConnection.ondatachannel = receiveChannelCallback;
  // sendChannel.onmessage=onSendChannelMesssageCallBack;


};
function sendData() {
  const msgData = msgInput.value;
  chatTextArea.innerHTML += "<div style='margin-top:2px;margin-bottom:2px;'><b>Me: </b>" + msgData + "</div>";
  if (sendChannel) {
    onSendChannelStateChange();
    sendChannel.send(msgData);
    msgInput.value = "";
  } else {
    receiveChannel.send(msgData);
    msgInput.value = "";
  }
}
function receiveChannelCallback(event) {
  console.log("Receive Channel Callback");
  receiveChannel = event.channel;
  receiveChannel.onmesssage = onReceiveChannelMessageCallback;
  receiveChannel.onopen = onReceiveChannelStatechange;
  receiveChannel.onclose = onReceiveChannelStatechange;

}
function onReceiveChannelMessageCallback(event) {
  console.log("Received Message");
  chatTextArea.innerHTML += "<div style='margin-top:2px;margin-bottom:2px;'><b>Stranger:</b>"  +event.data+ "</div>"
}
function onReceivedChannelStateChange() {
  const readystate = receiveChannel.readystate;
  console.log("Receive channel state is:" + readystate);
  if (readystate === "open") {
    console.log("Data channel state is open - onReceivedChannelStateChange")
  } else {
    console.log("Data channel state is not open - onReceivedChannelStateChange")
  }
}
function onSendChannelStateChange() {
  
  const readystate = sendChannel.readystate;
  console.log("Send channel state is:" + readystate);
  if (readystate === "open") {
    console.log("Data channel state is open - onSendChannelStateChange");
  } else {
    console.log("Data channel state is not open - onSendChannelStateChange");
  }
}
// function fetchNextUser(remoteUser){
//   $.post("http://localhost:3000/get-next-user",
//   {omeID:omeID,remoteUser:remoteUser},
//   function(data){
//     console.log("Next user is:",data);
//     if(data[0]){
//       if(data[0]._id == remoteUser ||  data[0]._id == username){

//       }else{
//         remoteUser = data[0]._id;
//       }
//       createOffer();
//     }
//   })
// }
let createOffer = async () => {
  createPeerConnection();

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offerSentToRemote", {
    username: username,
    remoteUser: remoteUser,
    offer: peerConnection.localDescription,
  });
};
let createAnswer = async (data) => {
  remoteUser = data.username;
  createPeerConnection();

  await peerConnection.setRemoteDescription(data.offer);
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answerSentToUser1", {
    answer: answer,
    sender: data.remoteUser,
    receiver: data.username,
  });
//   $.ajax({
//     url:"/update-on-engagement/"+username+"",
//     type:"PUT",
//     success:function(response){

    }
//   })
// };
socket.on("ReceiveOffer", function (data) {
  createAnswer(data)
});

let addAnswer = async (data) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(data.answer);
  }
//   document.querySelector(".next-chat").style.pointerEvents = "auto";
//   $.ajax({
//     url:"/update-on-engagement/"+username+"",
//     type:"PUT",
//     success:function(response){

//     }
//   })
// }

socket.on("ReceiveAnswer", function (data) {
  addAnswer(data)
});
// socket.on("closedRemoteUser", function (data) {
//   $.ajax({
//     url:"/update-on-next/"+username+"",
//     type:"PUT",
//     success:function(response){
//       fetchNextUser(remoteUser);
//     }

//   })
// });
socket.on("candidateReceiver", function (data) {
  peerConnection.addIceCandidate(data.iceCandidateData)
});

msgSendBtn.addEventListener("click", function (event) {
  sendData();
});

// window.addEventListener("unload", function (event) {
//   $.ajax({
//     url: "/leaving-user-update/" + username + "",
//     type: "PUT",
//     success: function (response) {
//       alert(response);
//     },
//   });
// });
// async function closeConnection(){
//   await peerConnection.close();
//   await socket.emit("remoteUserClosed",{
//     username:username,
//     remoteUser:remoteUser
//   })
//   $.ajax({
//     url:"/update-on-next/"+username+"",
//     type:"PUT",
//     success:function(response){
//       fetchNextUser(remoteUser);
//     }

//   })
// }

// document.querySelector(".next-chat").onClick=function(){
//  document.querySelector(".chat-text-area").innerHTML = "";
//  if(peerConnection.connectionState === "connnted" ||
//   peerConnection.iceCandidateData === "connected"){
// closeConnection();
// console.log("User closed");
//  }else{
//   fetchNextUser(remoteUser);
//   console.log("Moving to next user");
//  }
}
