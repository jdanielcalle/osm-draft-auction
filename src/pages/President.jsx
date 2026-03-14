import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function President() {
  const [players, setPlayers] = useState([]);
  const [auction, setAuction] = useState(null);
  const [president, setPresident] = useState(null);
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bidAmount, setBidAmount] = useState(0);
  const [allPresidents, setAllPresidents] = useState([]);
  const [bidWarning, setBidWarning] = useState("");
  const [outbidMessage, setOutbidMessage] = useState("");
  const [wasLeader, setWasLeader] = useState(false);

  // 🔐 Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // 🔄 Listeners generales
  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      setPlayers(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    const unsubAuction = onSnapshot(
      doc(db, "auction", "current"),
      (docSnap) => {
        setAuction(docSnap.data());
      }
    );

    const unsubPresidents = onSnapshot(
      collection(db, "presidents"),
      (snapshot) => {
        setAllPresidents(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    return () => {
      unsubPlayers();
      unsubAuction();
      unsubPresidents();
    };
  }, []);

  // 👤 Datos del presidente actual
  useEffect(() => {
    if (!user) return;

    const unsubPresident = onSnapshot(
      doc(db, "presidents", user.uid),
      (docSnap) => {
        setPresident(docSnap.data());
      }
    );

    return () => unsubPresident();
  }, [user]);

  const activePlayer = players.find(
    (p) => p.id === auction?.activePlayerId
  );

  const leader = allPresidents.find(
    (p) => p.id === activePlayer?.currentLeader
  );

  // 🧠 Detectar si te superan
  useEffect(() => {
    if (!activePlayer || !user) return;

    const iAmLeader = activePlayer.currentLeader === user.uid;

    if (wasLeader && !iAmLeader && auction?.status === "active") {
      setOutbidMessage("⚠ Te han superado en la subasta!");
      setTimeout(() => setOutbidMessage(""), 3000);
    }

    setWasLeader(iAmLeader);
  }, [activePlayer?.currentLeader]);

  // 🟡 Advertencia si tu puja es menor
  useEffect(() => {
    if (!activePlayer || !user) return;

    if (
      bidAmount <= activePlayer.currentBid &&
      activePlayer.currentLeader !== user.uid &&
      auction?.status === "active"
    ) {
      setBidWarning("Tu puja debe ser mayor a la actual.");
    } else {
      setBidWarning("");
    }
  }, [bidAmount, activePlayer?.currentBid]);

  // 🧹 Limpiar cuando termina subasta
  useEffect(() => {
    if (!activePlayer || auction?.status !== "active") {
      setBidWarning("");
      setOutbidMessage("");
      setWasLeader(false);
    }
  }, [auction?.status, activePlayer]);

  // ⏱ Timer
  useEffect(() => {
    if (!activePlayer?.auctionEndTime) return;

    const interval = setInterval(() => {
      const remaining = Math.floor(
        (activePlayer.auctionEndTime - Date.now()) / 1000
      );
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [activePlayer]);

  // Reset bid cuando cambia jugador
  useEffect(() => {
    if (activePlayer) {
      setBidAmount(activePlayer.currentBid);
    }
  }, [activePlayer?.id]);

  const isAuctionClosed =
    !activePlayer ||
    auction?.status !== "active" ||
    timeLeft <= 0;

  const increaseBid = (amount) => {
    if (isAuctionClosed) return;

    const newBid = bidAmount + amount;
    if (newBid > president?.budget) return;

    setBidAmount(newBid);
  };

  const decreaseBid = (amount) => {
    if (isAuctionClosed) return;

    const newBid = bidAmount - amount;
    if (newBid < activePlayer.currentBid) return;

    setBidAmount(newBid);
  };

  const confirmBid = async () => {
    if (!activePlayer || !president || !user) return;
    if (isAuctionClosed) return;

    const freshSnap = await getDoc(doc(db, "players", activePlayer.id));
    const freshData = freshSnap.data();
    if (!freshData) return;

    if (bidAmount <= freshData.currentBid) return;
    if (president.budget < bidAmount) return;
    if (president.playersCount >= president.maxPlayers) return;

    const now = Date.now();
    let newEndTime = freshData.auctionEndTime;

    if (freshData.auctionEndTime - now <= 10000) {
      newEndTime = now + 10000;
    }

    await updateDoc(doc(db, "players", activePlayer.id), {
      currentBid: bidAmount,
      currentLeader: user.uid,
      auctionEndTime: newEndTime,
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white text-xl">
        Inicia sesión para continuar
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-10 relative">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">
          {president?.name || "Presidente"}
        </h1>

        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold transition"
        >
          Cerrar sesión
        </button>
      </div>

      {/* EQUIPO */}
      <div className="absolute left-10 top-32 w-64 bg-gray-800 p-6 rounded-2xl shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-center">
          {president?.teamName || "Mi Equipo"}
        </h3>

        {president?.players?.length > 0 ? (
          president.players.map((player, index) => (
            <div
              key={index}
              className="bg-gray-700 p-2 mb-2 rounded text-sm text-center"
            >
              {player}
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm text-center">
            Sin jugadores
          </p>
        )}
      </div>

      {/* SUBASTA */}
      {activePlayer ? (
        <div className="max-w-3xl mx-auto bg-gray-800 rounded-2xl p-10 shadow-2xl text-center">

          <h2 className="text-4xl font-bold mb-6">
            {activePlayer.name}
          </h2>

          <p className="text-5xl text-green-400 font-bold mb-6">
            {activePlayer.currentBid}M
          </p>

          <p className="text-lg text-yellow-400 mb-4">
            Líder actual: {leader?.name || "Nadie"}
          </p>

          <p className="text-3xl font-bold text-yellow-400 mb-6">
            Tu puja: {bidAmount}M
          </p>

          {bidWarning && (
            <div className="mb-4 text-yellow-400 font-semibold animate-pulse">
              {bidWarning}
            </div>
          )}

          {outbidMessage && (
            <div className="mb-4 text-red-400 font-bold animate-bounce">
              {outbidMessage}
            </div>
          )}

          <p className="text-red-400 text-xl mb-6">
            ⏱ {timeLeft}s
          </p>

          <div className="flex justify-center gap-4 mb-4">
            <button disabled={isAuctionClosed} onClick={() => increaseBid(1)} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600">+1M</button>
            <button disabled={isAuctionClosed} onClick={() => increaseBid(5)} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600">+5M</button>
            <button disabled={isAuctionClosed} onClick={() => increaseBid(10)} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600">+10M</button>
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <button disabled={isAuctionClosed} onClick={() => decreaseBid(1)} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600">-1M</button>
            <button disabled={isAuctionClosed} onClick={() => decreaseBid(5)} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600">-5M</button>
            <button disabled={isAuctionClosed} onClick={() => decreaseBid(10)} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600">-10M</button>
          </div>

          <button
            disabled={isAuctionClosed}
            onClick={confirmBid}
            className="px-8 py-3 rounded-xl text-xl font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
          >
            Confirmar Puja
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-400 text-xl">
          No hay subasta activa
        </div>
      )}

      {/* PRESUPUESTOS */}
      <div className="absolute right-10 top-32 w-64 bg-gray-800 p-6 rounded-2xl shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-center">
          Presupuestos
        </h3>

        {allPresidents.map((p) => (
          <div key={p.id} className="flex justify-between mb-2 text-sm">
            <span>{p.name}</span>
            <span className="text-green-400">{p.budget}M</span>
          </div>
        ))}
      </div>

    </div>
  );
}